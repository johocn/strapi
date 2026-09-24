# zhao_market_pos 聚合码支付并发资损修复设计

- **日期**: 2026-07-30
- **状态**: 已批准
- **范围**: zhao_market_pos 模块聚合码支付流程的并发安全修复
- **关联**: [zhao_market_pos 实施计划](../plans/2026-07-29-zhao-market-pos.md)

## 1. 背景与问题

### 1.1 当前实现

聚合码支付流程分三步：

1. 顾客扫码 → `create_pending_payment` 创建孤儿 payment（`pay_status='pending'`, `order_id=null`）
2. 收银台轮询 `get_pending_payments` → 收银员点"确认收款" → `confirm_payment` 改 `pay_status='confirmed'`（幂等）
3. 收银员提交订单 → `submit_order` → `_apply_payment` 用 `write({order_id})` 关联到新订单

### 1.2 资损场景

两个收银台同时轮询到同一笔 pending payment：

```
收银台 A: confirm_payment(#100) → pay_status='confirmed'
收银台 B: confirm_payment(#100) → 幂等返回 True（已 confirmed）
收银台 A: submit_order → _apply_payment → payment#100.write({order_id: 1})
收银台 B: submit_order → _apply_payment → payment#100.write({order_id: 2})  ← 覆盖！
```

**结果**：订单 #1 丢失支付记录（资损 + 对账不平），订单 #2 关联了本属于 #1 的支付。

### 1.3 根因

- `confirm_payment` 只改 `pay_status`，不绑定订单
- `_apply_payment` 用 `write` 覆盖 `order_id`，无"已被占用"检查
- 整个流程无行锁，`confirm` 与 `submit` 之间存在时间窗口

## 2. 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 确认与提交是否合并 | **合并为原子操作** | 消除中间窗口，最简方案 |
| 失败处理策略 | **B' 后端回滚 + 前端保留** | 后端干净（事务回滚），前端友好（购物车保留） |
| 并发认领机制 | **A 条件 UPDATE** | 单条 SQL 原子完成，无死锁，DB 级保证 |
| 废弃策略 | **C 删后端+前端，测试改为验证新逻辑** | 无死代码，新逻辑有完整测试覆盖 |

## 3. 架构改动

### 3.1 核心思路

删除独立的 `confirm_payment` 步骤，将"认领 pending payment"合并到 `submit_order` 的 `_apply_payment` 中，用条件 UPDATE 实现原子认领。

### 3.2 数据流（新）

```
顾客扫码 → pending payment（pay_status='pending', order_id=null）
     ↓
收银台轮询 get_pending_payments → 显示待确认列表
     ↓
收银员选该支付 + 提交订单 → submit_order
     ↓
_apply_payment 条件 UPDATE WHERE pay_status='pending'
     ├─ rowcount=1：认领成功，order+lines+payment 提交
     └─ rowcount=0：抛 PosServiceError → 事务回滚（order 撤销）→ 前端保留 cart，提示换支付方式
```

## 4. 组件改动

### 4.1 后端 `controllers/pos_service.py`

**修改 `_apply_payment`**（pending payment 分支）：

```python
def _apply_payment(self, order, pay):
    pending_id = pay.get('pending_payment_id')
    if pending_id:
        # 聚合码：条件 UPDATE 原子认领，避免并发覆盖
        # WHERE pay_status='pending' 确保只有第一个事务能认领
        # 不修改 amount（防篡改）：顾客扫码时已锁定金额，submit 时仅校验一致
        self.env.cr.execute("""
            UPDATE zhao_market_pos_payment
            SET order_id=%s, pay_status='confirmed', pay_time=NOW(),
                poll_status='success', payment_method=%s
            WHERE id=%s AND pay_status='pending' AND amount=%s
        """, (order.id, pay.get('payment_method', 'mixed'),
              pending_id, pay['amount']))
        if self.env.cr.rowcount == 0:
            # 认领失败：可能已被其他订单认领，或金额不匹配
            payment = self.env['zhao.market.pos.payment'].browse(pending_id)
            if payment.exists() and payment.pay_status != 'pending':
                raise PosServiceError("聚合码支付已被其他订单认领")
            raise PosServiceError("聚合码支付金额不匹配或状态异常")
        # 失效 ORM 缓存，确保后续读取拿到 UPDATE 后的值
        # 注意：必须在 browse(id) 的具体 recordset 上调用，空 recordset 不失效任何缓存
        self.env['zhao.market.pos.payment'].browse(pending_id).invalidate_recordset(
            ['order_id', 'pay_status', 'pay_time', 'poll_status', 'payment_method']
        )
        return
    # 普通支付：直接创建（config_id 从 order 取）—— 保持不变
    self.env['zhao.market.pos.payment'].create({
        'order_id': order.id,
        'config_id': order.config_id.id,
        'payment_method': pay['payment_method'],
        'amount': pay['amount'],
        'pay_code': pay.get('pay_code', ''),
        'scan_direction': pay.get('scan_direction', 'b_scan_c'),
        'pay_status': 'confirmed',
        'pay_time': fields.Datetime.now(),
    })
```

**关键设计决策**：
- **不修改 amount**：WHERE 条件加 `AND amount=%s`，金额不匹配时认领失败。顾客扫码输入 100 元，收银员 submit 时 amount 必须也是 100 元，否则报错。防止收银员篡改金额导致对账不平。
- **同时更新 poll_status='success'**：保持字段语义一致。
- **invalidate_recordset**：条件 UPDATE 走 `cr.execute` 不经 ORM，需手动失效缓存。

**删除 `confirm_payment` 方法**（第 342-354 行）。

### 4.2 后端 `controllers/pos_controller.py`

**删除 `/v1/payment/confirm` 端点**（第 216-224 行）。

### 4.3 前端 `frontend/src/api/client.ts`

**删除 `confirmPending` 函数**（第 102 行附近）。

### 4.4 前端 `frontend/src/stores/payment.ts`

**删除 `confirmPending` 方法**（第 70 行附近）。

聚合码支付在 `payments[]` 中保留 `pending_payment_id` 字段，submit 时随 payload 提交即可。

### 4.5 前端 `frontend/src/components/AggregatePayPanel.vue`

**UI 改动**：
- 按钮文案"确认收款" → "选择该支付"（点击即加入 paymentStore.payments，不调后端）
- 删除 `onConfirm` 中的 `payment.confirmPending(paymentId)` 调用
- 改为直接 `payment.addPayment({ pending_payment_id, payment_method: 'mixed', amount, scan_direction: 'c_scan_b' })` 并从 `pendingList` 移除
- `emit('confirm', ...)` 保留，通知父组件已选择

```typescript
async function onSelect(paymentId: number) {
  const item = payment.pendingList.find(p => p.payment_id === paymentId)
  if (!item) return
  // 直接加入 payments，不调后端（认领在 submit 时原子完成）
  payment.addPayment({
    pending_payment_id: paymentId,
    payment_method: 'mixed',
    amount: item.amount,
    scan_direction: 'c_scan_b',
  })
  payment.pendingList = payment.pendingList.filter(p => p.payment_id !== paymentId)
  payment.selectedPendingId = null
  emit('confirm', {
    payment_id: paymentId,
    amount: item.amount,
    pay_code: item.pay_code || '',
    create_date: item.create_date,
  })
}
```

### 4.6 前端 `frontend/src/views/CheckoutView.vue`

**submit 失败处理**（对齐现有 `if/else` 结构，非 try/catch）：

```typescript
async function submitOrder() {
  // ... payload 构造保持不变
  const resp = await api.orderSubmit(payload)
  if (resp.ok) {
    // 成功：打印小票 + 清理 + 返回
    lastOrder.value = { ... }
    await nextTick()
    const html = renderReceiptHtml(lastOrder.value, receiptConfig.value)
    print(html)
    cart.clear()
    payment.reset()
    emitBack()
  } else {
    // 失败：cart 不清空（保留购物车），payment.reset() 清空支付方式
    // 提示收银员换支付方式重提
    payment.reset()
    alert(resp.error || '提交失败，请选择其他支付方式重试')
  }
}
```

**关键点**：
- 成功分支：`cart.clear()` + `payment.reset()`（原逻辑保持）
- 失败分支：**不调 `cart.clear()`**（保留购物车）+ `payment.reset()`（清空支付方式）+ 提示换支付方式
- 收银员改选现金/扫码后，重新点"提交订单"会创建新 order（前一个失败的 order 已被后端事务回滚撤销）

## 5. 错误处理（B' 策略）

| 层 | 失败行为 |
|----|----------|
| 后端 `_apply_payment` | 抛 `PosServiceError` |
| 后端 `submit_order` | `savepoint` 回滚，order/lines 全部撤销 |
| controller | `PosServiceError` → 400 响应 `{ok: false, error: "聚合码支付已被其他订单认领"}` |
| 前端 `submitOrder` | `resp.ok=false` 分支 → 不调 `cart.clear()` → `payment.reset()` → 提示换支付方式 |

## 6. 测试改动

### 6.1 `tests/test_pos_service.py`

**删除**：
- `test_confirm_payment_idempotent`
- `test_confirm_payment_*` 相关用例

**新增**：
- `test_apply_payment_atomic_claim_success`：正常认领 pending → pay_status 变 confirmed, order_id 绑定, poll_status='success'
- `test_apply_payment_concurrent_claim_second_fails`：模拟并发——先用 SQL 把 pay_status 改成 confirmed，再调 `_apply_payment` 应抛 `PosServiceError`("已被其他订单认领")
- `test_apply_payment_amount_mismatch_fails`：pending amount=100，submit 时 pay['amount']=99 → WHERE amount=%s 不匹配 → rowcount=0 → 抛 `PosServiceError`("金额不匹配")，且 pending payment 状态不变（仍 pending）
- `test_submit_order_rollback_on_payment_claim_conflict`：submit_order 中 `_apply_payment` 失败时，order 应不存在（事务回滚验证），pending payment 状态仍为 pending

### 6.2 `tests/test_pos_controller.py`

**删除**：`test_payment_confirm_missing_payment_id`（端点已删）

### 6.3 `tests/test_cashier_e2e.py`

**修改聚合码 E2E 流程**：原"confirm + submit"两步改为"submit 时直接认领"单步：
- 删除 `self.service.confirm_payment(pid)` 调用
- submit_order payload 中带 `pending_payment_id`，验证一次性认领成功

## 7. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| 前端残留 confirm 调用 | 删除 api/store/组件三层，构建后 grep 验证无残留 |
| 原生 SQL 维护成本 | service 层已有原生 SQL 先例（如 hold_key 唯一检查），此处条件 UPDATE 是必要权衡，注释说明 |
| 前端轮询列表清洁 | 被认领的 payment `pay_status` 已不是 `pending`，`get_pending_payments` 自然过滤 |
| submit 失败后购物车状态 | cartStore 不清空，收银员可直接改支付方式重提（创建新 order） |

## 8. 不在范围内

- 聚合码支付孤儿记录清理 cron（独立问题，扫描发现的风险点 #3，后续处理）
- `hold_key` TOCTOU 竞态（独立问题，风险点 #4，后续处理）
- F1-F12 快捷键冲突（独立问题，风险点 #5，后续处理）
- 聚合码支付速率限制（独立问题，风险点 #3，后续处理）

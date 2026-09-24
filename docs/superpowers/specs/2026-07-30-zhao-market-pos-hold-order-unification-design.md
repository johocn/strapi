# zhao_market_pos 挂单前后端统一状态机设计

- **日期**: 2026-07-30
- **状态**: 已批准
- **范围**: zhao_market_pos 挂单/取单流程的前后端统一
- **关联**: [zhao_market_pos 实施计划](../plans/2026-07-29-zhao-market-pos.md)、[聚合码并发资损修复](2026-07-30-zhao-market-pos-aggregate-pay-concurrency-fix-design.md) §8 风险点 #2

## 1. 背景与问题

### 1.1 当前实现

挂单流程前后端割裂：

- **后端** `hold_order(order_id, hold_key)` 要求传入 `order_id`（先有订单才能挂单），`resume_order` 返回 `_order_to_payload`
- **前端** `CashierView.confirmHold` 绕过 `pendingStore.hold()`（不调后端 `/order/hold`），直接 `pendingStore.orders.push({...})` 落到内存
- **前端** `pendingStore.hold()`/`resume()` 方法虽正确调用后端 API，但从未被 `CashierView` 调用，是死代码

### 1.2 资损/数据丢失场景

- 收银员挂单 5 笔 → 刷新页面 / 重登 → 全部挂单丢失（仅存内存）
- 顾客回头取单 → 无法取回 → 需重新录入 → 排队堵塞
- 后端 `hold_key` 唯一约束、`hold_order`/`resume_order` 逻辑从未生效

### 1.3 根因

后端缺少"创建 draft 订单"接口。`submit_order` 直接创建 paid 订单，前端无法在挂单阶段获得 `order_id`，只能退化为内存存储。

## 2. 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 后端如何持久化挂单 | **A. draft 订单方案** | 符合 Odoo pos.order 原生生命周期（draft→paid），复用现有 hold/resume 逻辑，无孤儿订单风险 |
| draft 订单存哪些字段 | **完整购物车快照** | 含 lines + 会员，取单时返回完整 payload 重建购物车 |
| 取单后结账如何处理 draft | **A. draft 转 paid** | 同一 order_id 更新 state+lines+payments，前后端一致，无孤儿 |

## 3. 架构改动

### 3.1 核心思路

后端新增 `create_draft_order` 接口，前端挂单走"创建 draft 订单 → hold_order"标准流程；结账时 `submit_order` 支持传入 `order_id` 把 draft 转 paid。复用现有 `hold_order`/`resume_order` 后端逻辑，删除前端的内存 push。

### 3.2 数据流（新）

```
挂单：
  cart → create_draft_order（后端创建 draft 订单 + lines + 会员）
       → hold_order(order_id, hold_key)（写 is_held + hold_key）
       → pendingStore.orders push（含真实 order_id）
       → cart.clear()

取单：
  resume_order(hold_key) → 后端清 is_held，返回 _order_to_payload
       → cart.setLines(payload.lines) + cart.setMember(payload.member)
       → pendingStore.remove(hold_key)

结账（正常或取单后）：
  submit_order(payload)
    ├─ payload 无 order_id：创建新 paid 订单（原逻辑）
    └─ payload 有 order_id：把 draft 订单转 paid（更新 state + lines + payments）
```

## 4. 组件改动

### 4.1 后端 `controllers/pos_service.py`

**新增 `create_draft_order(payload, session_id, user_id)`**：

```python
def create_draft_order(self, payload, session_id, user_id):
    """创建 draft 订单（挂单前置）：订单 + 明细 + 会员，无支付。
    不开 savepoint（由调用方控制事务，前端 hold 流程中 create_draft + hold_order 应原子）。
    """
    try:
        order = self._create_order_core(payload, session_id, user_id, state='draft')
        return {'order_id': order.id, 'name': order.name}
    except PosServiceError:
        raise
    except Exception as e:
        raise PosServiceError(f"创建 draft 订单失败: {e}") from e
```

**事务边界说明**：
- `create_draft_order` 不开 savepoint，由调用方控制事务
- 前端 `pendingStore.hold()` 调用 `create_draft` + `hold_order` 是两次独立 HTTP 请求，无法在后端做成原子事务
- MVP 接受 hold 失败后 draft 残留（后续 cron 清理），不阻塞流程

**重构 `_create_order` 为 `_create_order_core`**：

将现有 `_create_order` 中订单 + lines 创建逻辑抽取为 `_create_order_core(payload, session_id, user_id, state='paid')`，`state` 参数控制订单状态。支付逻辑移到 `submit_order` 中。原 `_create_order` 方法删除（逻辑合并到 `submit_order`）。

```python
def _create_order_core(self, payload, session_id, user_id, state='paid'):
    """订单创建核心逻辑（不含支付）。state='draft' 用于挂单，'paid' 用于正常提交。"""
    session = self.env['pos.session'].browse(session_id)
    if not session.exists():
        raise PosServiceError(f"session {session_id} 不存在")
    if session.state != 'opened':
        raise PosServiceError(f"session 非 opened 状态：{session.state}")
    member_id = payload.get('member_id')
    member_level_id = False
    if member_id:
        member = self.env['zhao.member'].browse(member_id)
        if not member.exists():
            raise PosServiceError(f"会员 {member_id} 不存在")
        member_level_id = member.level_id.id if member.level_id else False
    order = self.env['zhao.market.pos.order'].create({
        'session_id': session_id,
        'zhao_member_id': member_id or False,
        'member_level_id': member_level_id,
        'salesman_id': user_id,
        'state': state,
    })
    # 明细（内联 create，复用现有 _create_order 中的 line 创建逻辑）
    for line in payload.get('lines', []):
        self.env['zhao.market.pos.order.line'].create({
            'order_id': order.id,
            'product_id': line['product_id'],
            'qty': line['qty'],
            'price_unit': line['price_unit'],
            'original_price': line.get('original_price', line['price_unit']),
            'discount': line.get('discount', 100.0),
            'is_gift': line.get('is_gift', False),
            'member_price_applied': line.get('member_price_applied', False),
            'note': line.get('note', ''),
        })
    return order
```

**修改 `submit_order` 支持 draft 转 paid**：

```python
def submit_order(self, payload, session_id, user_id):
    """订单提交：支持新建 paid 订单 或 draft 转 paid。"""
    with self.env.cr.savepoint():
        try:
            order_id = payload.get('order_id')
            if order_id:
                # draft 转 paid：更新现有 draft 订单
                order = self.env['zhao.market.pos.order'].browse(order_id)
                if not order.exists():
                    raise PosServiceError(f"订单 {order_id} 不存在")
                if order.state != 'draft':
                    raise PosServiceError(f"订单 {order_id} 状态非 draft，无法转换")
                # 重写 lines（先删旧再建新）。注意：字段名是 line_ids（One2many）
                order.line_ids.unlink()
                for line in payload.get('lines', []):
                    self.env['zhao.market.pos.order.line'].create({
                        'order_id': order.id,
                        'product_id': line['product_id'],
                        'qty': line['qty'],
                        'price_unit': line['price_unit'],
                        'original_price': line.get('original_price', line['price_unit']),
                        'discount': line.get('discount', 100.0),
                        'is_gift': line.get('is_gift', False),
                        'member_price_applied': line.get('member_price_applied', False),
                        'note': line.get('note', ''),
                    })
                # 写支付
                for pay in payload.get('payments', []):
                    self._apply_payment(order, pay)
                order.write({'state': 'paid'})
                order.invalidate_recordset()
                return order
            # 新建 paid 订单（原逻辑：_create_order_core + 支付）
            order = self._create_order_core(payload, session_id, user_id, state='paid')
            for pay in payload.get('payments', []):
                self._apply_payment(order, pay)
            order.invalidate_recordset()
            return order
        except PosServiceError:
            raise
        except Exception as e:
            raise PosServiceError(f"订单提交失败: {e}") from e
```

**关键修正**：
- 字段名是 `line_ids`（One2many），不是 `order_line`
- 两条分支（draft 转 paid / 新建）都显式调用 `_apply_payment`，原 `_create_order` 中的支付逻辑移到 `submit_order` 中
- `_create_order_core` 只负责订单 + lines 创建，不含支付

**`hold_order`/`resume_order`/`_order_to_payload`**：保持不变（已是正确实现）。

### 4.2 后端 `controllers/pos_controller.py`

**新增 `/v1/order/create_draft` 端点**：

```python
@http.route('/zhao_market_pos/v1/order/create_draft',
            type='http', auth='user', methods=['POST'], csrf=True)
def order_create_draft(self, **kw):
    """创建 draft 订单（挂单前置）：{session_id, lines, member_id} → {order_id, name}"""
    payload = self._payload()
    if not payload.get('session_id'):
        return self._err('session_id 必填')
    return self._call(
        self._service().create_draft_order,
        payload, int(payload['session_id']), self.env.uid,
    )
```

### 4.3 前端 `frontend/src/api/client.ts`

**新增 `orderCreateDraft` 函数**（第 92 行后插入）：

```typescript
async orderCreateDraft(payload: {
  session_id: number
  lines: CartLine[]
  member_id: number | null
}): Promise<ApiResponse<{ order_id: number; name: string }>> {
  return postJson('/order/create_draft', payload)
}
```

**修改 `orderSubmit` payload 类型**（第 78-82 行）：

```typescript
async orderSubmit(payload: {
  session_id: number; member_id?: number | null
  order_id?: number | null  // 新增：draft 转 paid 时传入
  lines: CartLine[]; payments: PaymentItem[]
}): Promise<ApiResponse<OrderResult>> {
  return postJson('/order/submit', payload)
}
```

### 4.4 前端 `frontend/src/stores/pending.ts`

**修改 `hold()` 方法**：先调 `orderCreateDraft` 拿 order_id，再调 `orderHold`。

```typescript
async function hold(
  holdKey: string,
  lines: CartLine[],
  memberId: number | null,
  sessionId: number,
): Promise<boolean> {
  loading.value = true
  error.value = ''
  try {
    // 1. 创建 draft 订单
    const draftResp = await api.orderCreateDraft({
      session_id: sessionId,
      lines: lines.map(l => ({
        product_id: l.product_id,
        product_tmpl_id: l.product_tmpl_id,
        qty: l.qty,
        price_unit: l.price_unit,
        original_price: l.original_price,
        discount: l.discount,
        is_gift: l.is_gift,
        member_price_applied: l.member_price_applied,
        note: l.note,
      })),
      member_id: memberId,
    })
    if (!draftResp.ok) {
      error.value = draftResp.error
      return false
    }
    const orderId = draftResp.data.order_id
    // 2. 挂单（hold_order 与 create_draft 是两次独立请求，hold 失败时 draft 残留，MVP 接受）
    const holdResp = await api.orderHold(orderId, holdKey)
    if (!holdResp.ok) {
      error.value = holdResp.error
      return false
    }
    orders.value.push({
      hold_key: holdKey,
      order_id: orderId,
      member_id: memberId,
      lines: lines.map(l => ({ ...l })),
      create_date: new Date().toISOString(),
    })
    return true
  } finally {
    loading.value = false
  }
}
```

**`resume()` 方法**：保持不变（已正确调用后端 `orderResume`，返回 `{order_id, member_id, lines}`）。

### 4.5 前端 `frontend/src/views/CashierView.vue`

**修改 `confirmHold`**：删除内存 push，改为调 `pendingStore.hold()`。

```typescript
async function confirmHold() {
  if (!holdKeyInput.value) return
  if (!session.sessionId) {
    alert('无 session')
    return
  }
  const ok = await pendingStore.hold(
    holdKeyInput.value,
    cart.lines,
    cart.member?.member_id || null,
    session.sessionId,
  )
  if (ok) {
    cart.clear()
    selectedLineIndex.value = -1
    showHoldDialog.value = false
  } else {
    alert(pendingStore.error || '挂单失败')
  }
}
```

**修改 `doResume`**：删除直接读 `pendingStore.orders.find`，改为调 `pendingStore.resume()`。

```typescript
async function doResume(holdKey: string) {
  const held = await pendingStore.resume(holdKey)
  if (!held) {
    alert(pendingStore.error || '取单失败')
    return
  }
  cart.clear()
  cart.setLines(held.lines)
  // 保存 draft order_id，结账时 submit_order 传给后端做 draft→paid 转换
  cart.pendingOrderId = held.order_id
  // 会员恢复：resume 返回 member_id，若需完整 MemberInfo 则调 /member/lookup
  // MVP 简化：仅恢复 lines，会员需收银员重新扫或输入手机号
  showResumeDialog.value = false
}
```

**修改 `submitOrder`**（CheckoutView.vue）：payload 中加入 `order_id`（从 `cart.pendingOrderId` 取）。

```typescript
async function submitOrder() {
  // ... 现有 payload 构造
  const payload = {
    session_id: session.sessionId,
    order_id: cart.pendingOrderId,  // 取单后的 draft order_id，null 表示新建
    lines: [...],
    payments: [...],
  }
  const resp = await api.orderSubmit(payload)
  if (resp.ok) {
    // ... 成功处理
    cart.clear()  // clear 会重置 pendingOrderId = null
  } else {
    // ... 失败处理（聚合码修复已有）
  }
}
```

**关键点**：
- `cart.pendingOrderId` 已存在（cart.ts 第 9 行），取单时赋值，结账成功后 `cart.clear()` 自动重置
- `submitOrder` 在 CheckoutView.vue 中（不在 CashierView），需同步修改

### 4.6 前端 `frontend/src/stores/cart.ts`

**已有方法（无需新增）**：
- `setLines(lines: CartLine[])`：第 85-87 行，已存在
- `pendingOrderId`：第 9 行，已存在
- `clear()`：第 78-83 行，已重置 `pendingOrderId = null`

**会员恢复简化**：MVP 不在 resume 时恢复会员（`_order_to_payload` 返回 member_id 但无 MemberInfo），收银员需重新扫会员。后续优化可在 `_order_to_payload` 中增加会员详情字段。

## 5. 错误处理

| 场景 | 失败行为 |
|------|----------|
| `create_draft_order` 失败 | 前端提示"挂单失败"，购物车不清空，收银员可重试 |
| `hold_order` 失败（hold_key 重复） | 前端提示"挂单编号重复"，draft 订单残留（MVP 不清理，后续 cron） |
| `resume_order` 失败 | 前端提示"取单失败"，挂单列表不变 |
| `submit_order` draft 转 paid 失败 | 事务回滚，draft 订单状态不变，前端提示"提交失败"并保留购物车 |
| draft 订单堆积 | MVP 不处理，后续加 cron 清理超时（如 24 小时未转 paid）draft 订单 |

## 6. 测试改动

### 6.1 `tests/test_pos_service.py`

**新增**：
- `test_create_draft_order_success`：创建 draft 订单，验证 state='draft' + lines + 无 payments + member 关联
- `test_submit_order_draft_to_paid`：先 create_draft，再 submit 传 order_id，验证 state='paid' + lines 更新 + payments 创建
- `test_submit_order_draft_to_paid_lines_replaced`：draft 有 2 条 lines，submit 时传 3 条新 lines，验证最终为 3 条（旧 lines 删除，用 `order.line_ids` 验证）
- `test_hold_and_resume_with_draft_order`：create_draft → hold → resume → 验证返回 payload 含 lines + member_id
- `test_submit_order_non_draft_fails`：order_id 对应订单 state='paid' 时 submit 应抛错
- `test_submit_order_nonexistent_order_id_fails`：order_id 不存在时 submit 应抛错

### 6.2 `tests/test_cashier_e2e.py`

**修改 `test_hold_and_resume_order`**：改为走 create_draft → hold → resume → submit（draft 转 paid）完整流程。

### 6.3 `tests/test_pos_controller.py`

**新增**：
- `test_order_create_draft_missing_session`：POST /v1/order/create_draft 无 session_id 返回 400
- `test_order_create_draft_success`：正常创建 draft，返回 order_id + name

## 7. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| draft 订单堆积 | MVP 不处理，§8 后续优化。超市场景挂单频率低，短期堆积可接受 |
| submit_order 逻辑分叉 | 有 order_id vs 无 order_id 两条路径，测试覆盖两条路径 + lines 重写 + 状态校验 |
| hold_order 失败后 draft 残留 | MVP 不清理，后续 cron。短期内收银员可手动取消或忽略 |
| cart.setMember 方法 | 需确认 cart store 有此方法，若无则在 resume 时用 member_id 调 `/member/lookup` 获取详情 |
| _order_to_payload 完整性 | 需验证返回的 lines 含 product_id/qty/price_unit/discount 等字段，前端能重建购物车 |

## 8. 不在范围内

- draft 订单超时清理 cron（独立问题，后续处理）
- hold_key TOCTOU 竞态（独立问题，复盘风险点 #3，后续处理）
- F1-F12 快捷键冲突（独立问题，复盘风险点 #4，后续处理）
- 聚合码安全风险（独立问题，复盘风险点 #2，后续处理）

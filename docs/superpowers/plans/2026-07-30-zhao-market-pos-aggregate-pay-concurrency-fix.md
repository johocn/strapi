# zhao_market_pos 聚合码支付并发资损修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除聚合码支付并发认领导致的资损风险，将"确认收款+提交订单"合并为原子操作。

**Architecture:** 删除独立 `confirm_payment` 步骤，在 `_apply_payment` 中用条件 `UPDATE ... WHERE pay_status='pending' AND amount=%s` 原子认领 pending payment。失败时 `savepoint` 回滚 order，前端保留购物车让收银员换支付方式重提。

**Tech Stack:** Odoo 19 (Python) + Vue3 (TypeScript) + Pinia + 原生 SQL 条件 UPDATE

**Spec:** `docs/superpowers/specs/2026-07-30-zhao-market-pos-aggregate-pay-concurrency-fix-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `controllers/pos_service.py` | `_apply_payment` 改条件 UPDATE；删 `confirm_payment` | 修改 |
| `controllers/pos_controller.py` | 删 `/v1/payment/confirm` 端点 | 修改 |
| `frontend/src/api/client.ts` | 删 `paymentConfirm` 函数 | 修改 |
| `frontend/src/stores/payment.ts` | 删 `confirmPending`；暴露 `removePendingFromList` | 修改 |
| `frontend/src/components/AggregatePayPanel.vue` | `onConfirm`→`onSelect`，按钮文案，不调后端 | 修改 |
| `frontend/src/views/CheckoutView.vue` | submitOrder 失败分支加 `payment.reset()` | 修改 |
| `tests/test_pos_service.py` | 删 confirm 测试；加 atomic claim 3 个测试 | 修改 |
| `tests/test_pos_controller.py` | 删 `test_payment_confirm_missing_payment_id` | 修改 |
| `tests/test_cashier_e2e.py` | 聚合码 E2E 改为单步 submit 认领 | 修改 |

---

## Task 1: 后端 — _apply_payment 改条件 UPDATE 原子认领

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py:208-234`

- [x] **Step 1: 替换 `_apply_payment` 的 pending 分支**

将 `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py` 第 208-234 行（`def _apply_payment` 整个方法体）替换为：

```python
    def _apply_payment(self, order, pay):
        pending_id = pay.get('pending_payment_id')
        if pending_id:
            # 聚合码：条件 UPDATE 原子认领，避免并发覆盖
            # WHERE pay_status='pending' AND amount=%s 确保只有第一个事务能认领且金额一致
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
        # 普通支付：直接创建（config_id 从 order 取）
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

- [x] **Step 2: 删除 `confirm_payment` 方法**

删除 `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py` 第 342-354 行的 `confirm_payment` 方法（含方法上方的空行）：

```python
    def confirm_payment(self, payment_id):
        """收银员手点确认：幂等。返回 True"""
        payment = self.env['zhao.market.pos.payment'].browse(payment_id)
        if not payment.exists():
            raise PosServiceError(f"payment {payment_id} 不存在")
        if payment.pay_status == 'confirmed':
            return True  # 幂等
        payment.write({
            'pay_status': 'confirmed',
            'pay_time': fields.Datetime.now(),
            'poll_status': 'success',
        })
        return True
```

删除后保留 `get_pending_payments` 方法结尾与 `get_shift_summary` 方法之间的空行分隔。

- [x] **Step 3: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_service.py
git commit -m "refactor(zhao_market_pos): atomic claim pending payment via conditional UPDATE"
```

---

## Task 2: 后端 — 删除 /v1/payment/confirm 端点

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_controller.py:216-224`

- [x] **Step 1: 删除 `payment_confirm` 端点**

删除 `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_controller.py` 第 216-224 行：

```python
    @http.route('/zhao_market_pos/v1/payment/confirm',
                type='http', auth='user', methods=['POST'], csrf=True)
    def payment_confirm(self, **kw):
        """收银员手点确认：{payment_id} → {ok}"""
        payload = self._payload()
        payment_id = payload.get('payment_id')
        if not payment_id:
            return self._err('payment_id 必填')
        return self._call(self._service().confirm_payment, int(payment_id))
```

- [x] **Step 2: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_controller.py
git commit -m "refactor(zhao_market_pos): remove deprecated /payment/confirm endpoint"
```

---

## Task 3: 后端测试 — 删旧测试 + 加原子认领测试

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py`

- [x] **Step 1: 删除 `test_submit_order_with_aggregate_payment` 旧测试**

删除 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py` 第 388-402 行（依赖 `confirm_payment` 的旧聚合码测试）：

```python
    def test_submit_order_with_aggregate_payment(self):
        """聚合码支付：先 create_pending → confirm → submit_order 关联"""
        pid = self.service.create_pending_payment(self.config.id, 8.0, '')
        self.service.confirm_payment(pid)
        payments = [{
            'payment_method': 'mixed', 'amount': 8.0,
            'pending_payment_id': pid,
        }]
        result = self.service.submit_order(
            self._make_payload(payments=payments), self.session.id, self.env.uid,
        )
        order = self.env['zhao.market.pos.order'].browse(result['order_id'])
        self.assertEqual(order.payment_ids[0].payment_method, 'mixed')
        self.assertEqual(order.payment_ids[0].scan_direction, 'c_scan_b')
        self.assertEqual(order.payment_ids[0].pay_status, 'confirmed')
```

- [x] **Step 2: 删除 `test_get_pending_payments` 中对 confirm_payment 的依赖**

找到第 458-466 行的 `test_get_pending_payments`：

```python
    def test_get_pending_payments(self):
        """待确认列表：只返回 pending 状态"""
        p1 = self.service.create_pending_payment(self.config.id, 5.0, '')
        self.service.create_pending_payment(self.config.id, 8.0, '')
        self.service.confirm_payment(p1)
        items = self.service.get_pending_payments(self.config.id)
        # 1 个已确认被过滤，剩 1 个 pending
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['amount'], 8.0)
```

替换为（用直接 write 代替 `confirm_payment`）：

```python
    def test_get_pending_payments(self):
        """待确认列表：只返回 pending 状态"""
        p1 = self.service.create_pending_payment(self.config.id, 5.0, '')
        self.service.create_pending_payment(self.config.id, 8.0, '')
        # 直接 write 模拟已认领（confirm_payment 已删除）
        self.env['zhao.market.pos.payment'].browse(p1).write({
            'pay_status': 'confirmed', 'poll_status': 'success',
        })
        items = self.service.get_pending_payments(self.config.id)
        # 1 个已确认被过滤，剩 1 个 pending
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['amount'], 8.0)
```

- [x] **Step 3: 删除 `test_confirm_payment_idempotent`**

删除第 468-473 行：

```python
    def test_confirm_payment_idempotent(self):
        """重复确认同一 payment 不报错"""
        pid = self.service.create_pending_payment(self.config.id, 5.0, '')
        self.service.confirm_payment(pid)
        # 第二次确认应该幂等返回 True
        self.assertTrue(self.service.confirm_payment(pid))
```

- [x] **Step 4: 新增 `test_apply_payment_atomic_claim_success`**

在 `test_get_pending_payments` 方法后追加（原 `test_confirm_payment_idempotent` 的位置）：

```python
    def test_apply_payment_atomic_claim_success(self):
        """原子认领成功：pending → confirmed, order_id 绑定, poll_status=success"""
        pid = self.service.create_pending_payment(self.config.id, 10.0, '')
        payments = [{
            'payment_method': 'mixed', 'amount': 10.0,
            'pending_payment_id': pid,
        }]
        result = self.service.submit_order(
            self._make_payload(payments=payments), self.session.id, self.env.uid,
        )
        order = self.env['zhao.market.pos.order'].browse(result['order_id'])
        payment = order.payment_ids[0]
        self.assertEqual(payment.pay_status, 'confirmed')
        self.assertEqual(payment.poll_status, 'success')
        self.assertEqual(payment.payment_method, 'mixed')
        self.assertEqual(payment.scan_direction, 'c_scan_b')
        self.assertEqual(payment.amount, 10.0)
        self.assertEqual(payment.order_id, order)
```

- [x] **Step 5: 新增 `test_apply_payment_concurrent_claim_second_fails`**

紧接上一测试后追加：

```python
    def test_apply_payment_concurrent_claim_second_fails(self):
        """并发认领：第二个 submit 应抛 PosServiceError（已被认领）"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosServiceError
        pid = self.service.create_pending_payment(self.config.id, 10.0, '')
        # 模拟第一个收银台已认领：直接 UPDATE 改 pay_status
        self.env.cr.execute(
            "UPDATE zhao_market_pos_payment SET pay_status='confirmed' WHERE id=%s",
            (pid,)
        )
        self.env['zhao.market.pos.payment'].invalidate_recordset(['pay_status'])
        # 第二个收银台 submit 应失败
        payments = [{
            'payment_method': 'mixed', 'amount': 10.0,
            'pending_payment_id': pid,
        }]
        with self.assertRaises(PosServiceError) as ctx:
            self.service.submit_order(
                self._make_payload(payments=payments),
                self.session.id, self.env.uid,
            )
        self.assertIn("已被其他订单认领", str(ctx.exception))
```

- [x] **Step 6: 新增 `test_apply_payment_amount_mismatch_fails`**

紧接上一测试后追加：

```python
    def test_apply_payment_amount_mismatch_fails(self):
        """金额不匹配：pending=100，submit amount=99 → 抛 PosServiceError，状态仍 pending"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosServiceError
        pid = self.service.create_pending_payment(self.config.id, 100.0, '')
        payments = [{
            'payment_method': 'mixed', 'amount': 99.0,  # 金额不匹配
            'pending_payment_id': pid,
        }]
        with self.assertRaises(PosServiceError) as ctx:
            self.service.submit_order(
                self._make_payload(payments=payments),
                self.session.id, self.env.uid,
            )
        self.assertIn("金额不匹配", str(ctx.exception))
        # 验证 pending payment 状态不变（未被动）
        payment = self.env['zhao.market.pos.payment'].browse(pid)
        self.assertEqual(payment.pay_status, 'pending')
        self.assertFalse(payment.order_id)
```

- [x] **Step 7: 新增 `test_submit_order_rollback_on_payment_claim_conflict`**

紧接上一测试后追加：

```python
    def test_submit_order_rollback_on_payment_claim_conflict(self):
        """认领冲突时事务回滚：order 不存在，pending 状态仍 pending"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosServiceError
        pid = self.service.create_pending_payment(self.config.id, 10.0, '')
        # 模拟已被认领
        self.env.cr.execute(
            "UPDATE zhao_market_pos_payment SET pay_status='confirmed' WHERE id=%s",
            (pid,)
        )
        self.env['zhao.market.pos.payment'].invalidate_recordset(['pay_status'])
        order_count_before = self.env['zhao.market.pos.order'].search_count([])
        payments = [{
            'payment_method': 'mixed', 'amount': 10.0,
            'pending_payment_id': pid,
        }]
        with self.assertRaises(PosServiceError):
            self.service.submit_order(
                self._make_payload(payments=payments),
                self.session.id, self.env.uid,
            )
        # 验证：order 未创建（事务回滚）
        order_count_after = self.env['zhao.market.pos.order'].search_count([])
        self.assertEqual(order_count_after, order_count_before)
```

- [x] **Step 8: 运行测试验证全部通过**

Run:
```bash
cd /d e:\code\odoo
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，日志中包含新增的 4 个测试用例名。

- [x] **Step 9: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/tests/test_pos_service.py
git commit -m "test(zhao_market_pos): replace confirm_payment tests with atomic claim tests"
```

---

## Task 4: 后端测试 — 修复 controller 测试和 E2E 测试

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py`

- [x] **Step 1: 删除 controller 中 `test_payment_confirm_missing_payment_id`**

删除 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py` 第 185-188 行：

```python
    def test_payment_confirm_missing_payment_id(self):
        """POST /v1/payment/confirm 缺 payment_id 返回 400"""
        code, data = self._post('/zhao_market_pos/v1/payment/confirm', {})
        self.assertEqual(code, 400)
```

- [x] **Step 2: 修改 E2E `test_e2e_aggregate_pay_full_flow`**

将 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py` 第 200-240 行的整个 `test_e2e_aggregate_pay_full_flow` 方法替换为：

```python
    def test_e2e_aggregate_pay_full_flow(self):
        """E2E-6: 顾客扫码 → 收银台轮询 → 提交订单时原子认领"""
        # 1. 顾客扫码提交（创建 pending payment）
        pid = self.service.create_pending_payment(self.config.id, 10.0, '')
        self.assertEqual(pid > 0, True)

        # 2. 收银台轮询发现待确认
        pending = self.service.get_pending_payments(self.config.id)
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0]['payment_id'], pid)
        self.assertEqual(pending[0]['amount'], 10.0)

        # 3. 提交订单时一次性原子认领（不再单独 confirm）
        payload = {
            'session_id': self.session.id,
            'lines': [{
                'product_id': self.product.id,
                'product_tmpl_id': self.product.product_tmpl_id.id,
                'qty': 1, 'price_unit': 10.0, 'original_price': 10.0,
                'discount': 100.0, 'member_price_applied': False,
                'is_gift': False, 'note': '',
            }],
            'payments': [{
                'payment_method': 'mixed', 'amount': 10.0,
                'pending_payment_id': pid,
            }],
        }
        result = self.service.submit_order(payload, self.session.id, self.env.uid)
        order = self.env['zhao.market.pos.order'].browse(result['order_id'])

        # 验证：payment 已原子认领到 order
        self.assertEqual(len(order.payment_ids), 1)
        self.assertEqual(order.payment_ids[0].scan_direction, 'c_scan_b')
        self.assertEqual(order.payment_ids[0].pay_status, 'confirmed')
        self.assertEqual(order.payment_ids[0].poll_status, 'success')
        self.assertEqual(order.payment_ids[0].payment_method, 'mixed')

        # 4. 验证：pending 列表已清空（该 payment 不再 pending）
        pending_after = self.service.get_pending_payments(self.config.id)
        self.assertEqual(len(pending_after), 0)
```

- [x] **Step 3: 修复 E2E 中其他对 `confirm_payment` 的调用**

在 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py` 第 359 行附近查找 `create_pending_payment` + `confirm_payment` 组合，将所有 `self.service.confirm_payment(pid)` 调用删除（这些场景在新流程中由 submit_order 自动认领，无需单独 confirm）。具体搜索：

```
grep -n "confirm_payment" e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py
```

预期输出应只剩 0 行（全部已删除）。若仍有残留，逐个删除该行。

- [x] **Step 4: 运行全部测试验证**

Run:
```bash
cd /d e:\code\odoo
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，全部测试通过。

- [x] **Step 5: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/tests/test_pos_controller.py custom-addons/zhao_market_pos/tests/test_cashier_e2e.py
git commit -m "test(zhao_market_pos): fix controller and E2E tests for atomic claim flow"
```

---

## Task 5: 前端 — 删除 confirmPending API 和 store 方法

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\api\client.ts:101-103`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\stores\payment.ts:70-88,114-120`

- [x] **Step 1: 删除 client.ts 中 `paymentConfirm` 函数**

删除 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\api\client.ts` 第 101-103 行：

```typescript
  async paymentConfirm(payment_id: number): Promise<ApiResponse<{ payment_id: number; confirmed: boolean }>> {
    return postJson('/payment/confirm', { payment_id })
  }
```

- [x] **Step 2: 修改 payment.ts — 删除 `confirmPending` 方法，新增 `removePendingFromList`**

在 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\stores\payment.ts` 中：

**删除**第 70-88 行的 `confirmPending` 方法：

```typescript
  async function confirmPending(paymentId: number): Promise<boolean> {
    const resp = await api.paymentConfirm(paymentId)
    if (resp.ok) {
      const item = pendingList.value.find(p => p.payment_id === paymentId)
      if (item) {
        addPayment({
          pending_payment_id: paymentId,
          payment_method: 'mixed',
          amount: item.amount,
          scan_direction: 'c_scan_b',
        })
        pendingList.value = pendingList.value.filter(p => p.payment_id !== paymentId)
        selectedPendingId.value = null
      }
      return true
    }
    error.value = resp.error
    return false
  }
```

**新增** `selectPending` 方法（在 `stopPoll` 方法后）：

```typescript
  // 聚合码：选择待支付项加入 payments（不调后端，认领在 submit 时原子完成）
  function selectPending(paymentId: number): boolean {
    const item = pendingList.value.find(p => p.payment_id === paymentId)
    if (!item) return false
    addPayment({
      pending_payment_id: paymentId,
      payment_method: 'mixed',
      amount: item.amount,
      scan_direction: 'c_scan_b',
    })
    pendingList.value = pendingList.value.filter(p => p.payment_id !== paymentId)
    selectedPendingId.value = null
    return true
  }
```

- [x] **Step 3: 修改 payment.ts — 更新 return 暴露**

将第 114-120 行的 return 对象中：

```typescript
  return {
    currentMethod, payments, pendingList, polling, selectedPendingId, error,
    amountPaid,
    reset, addPayment, removePayment,
    startPoll, stopPoll, confirmPending,
    confirmCash, confirmBScanC,
  }
```

替换为（删除 `confirmPending`，新增 `selectPending`）：

```typescript
  return {
    currentMethod, payments, pendingList, polling, selectedPendingId, error,
    amountPaid,
    reset, addPayment, removePayment,
    startPoll, stopPoll, selectPending,
    confirmCash, confirmBScanC,
  }
```

- [x] **Step 4: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/api/client.ts custom-addons/zhao_market_pos/frontend/src/stores/payment.ts
git commit -m "refactor(zhao_market_pos): replace confirmPending with selectPending (no backend call)"
```

---

## Task 6: 前端 — AggregatePayPanel 改为选择交互

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\components\AggregatePayPanel.vue:28,63-77`

- [x] **Step 1: 修改按钮文案和事件绑定**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\components\AggregatePayPanel.vue` 第 28 行：

```html
        <button @click="onConfirm(p.payment_id)">确认收款</button>
```

替换为：

```html
        <button @click="onSelect(p.payment_id)">选择该支付</button>
```

- [x] **Step 2: 替换 `onConfirm` 方法为 `onSelect`**

将第 63-77 行的 `onConfirm` 方法：

```typescript
async function onConfirm(paymentId: number) {
  const ok = await payment.confirmPending(paymentId)
  if (ok) {
    const confirmed = payment.payments.find(p => p.pending_payment_id === paymentId)
    if (confirmed) {
      // 通知父组件已确认一笔
      emit('confirm', {
        payment_id: paymentId,
        amount: confirmed.amount,
        pay_code: confirmed.pay_code || '',
        create_date: new Date().toISOString(),
      })
    }
  }
}
```

替换为：

```typescript
function onSelect(paymentId: number) {
  // 直接加入 payments，不调后端（认领在 submit 时原子完成）
  const ok = payment.selectPending(paymentId)
  if (ok) {
    const selected = payment.payments.find(p => p.pending_payment_id === paymentId)
    if (selected) {
      emit('confirm', {
        payment_id: paymentId,
        amount: selected.amount,
        pay_code: selected.pay_code || '',
        create_date: new Date().toISOString(),
      })
    }
  }
}
```

- [x] **Step 3: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/components/AggregatePayPanel.vue
git commit -m "refactor(zhao_market_pos): AggregatePayPanel select instead of confirm"
```

---

## Task 7: 前端 — CheckoutView submitOrder 失败处理

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CheckoutView.vue:206-208`

- [x] **Step 1: 修改 submitOrder 的 else 分支**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CheckoutView.vue` 第 206-208 行：

```typescript
  } else {
    alert('提交失败：' + resp.error)
  }
```

替换为：

```typescript
  } else {
    // 失败：cart 不清空（保留购物车），payment.reset() 清空支付方式
    // 收银员改选现金/扫码后重新 submit 会创建新 order（前一个失败 order 已被后端事务回滚）
    payment.reset()
    alert(resp.error || '提交失败，请选择其他支付方式重试')
  }
```

- [x] **Step 2: Commit**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/views/CheckoutView.vue
git commit -m "fix(zhao_market_pos): preserve cart on submit failure, reset payment for retry"
```

---

## Task 8: 前端构建 + 全量测试验证

**Files:**
- Build output: `e:\code\odoo\custom-addons\zhao_market_pos\static\src\pos\pos.umd.js`
- Build output: `e:\code\odoo\custom-addons\zhao_market_pos\static\src\pos\pos.css`

- [x] **Step 1: 前端构建**

Run:
```bash
cd /d e:\code\odoo\custom-addons\zhao_market_pos\frontend
npm run build
```
Expected: 构建成功，`pos.umd.js` 和 `pos.css` 生成时间戳更新。

- [x] **Step 2: 验证无残留 `confirmPending` / `paymentConfirm` 引用**

Run:
```bash
grep -r "confirmPending\|paymentConfirm\|/payment/confirm" e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\
```
Expected: 无任何匹配输出。

- [x] **Step 3: 运行后端全量测试**

Run:
```bash
cd /d e:\code\odoo
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，全部测试通过。

- [x] **Step 4: Commit 构建产物**

```bash
cd /d e:\code\odoo
git add custom-addons/zhao_market_pos/static/src/pos/pos.umd.js custom-addons/zhao_market_pos/static/src/pos/pos.css
git commit -m "build(zhao_market_pos): rebuild frontend with atomic claim flow"
```

---

## Task 9: 最终验证与提交

- [x] **Step 1: 全局 grep 确认无残留**

Run:
```bash
grep -rn "confirm_payment\|confirmPayment\|paymentConfirm" e:\code\odoo\custom-addons\zhao_market_pos\
```
Expected: 只匹配到 `__pycache__` 和 `static/src/pos/pos.umd.js`（构建产物，无需处理），源码中无残留。

- [x] **Step 2: 检查 git 状态**

Run:
```bash
cd /d e:\code\odoo
git status
```
Expected: working tree clean，所有改动已提交。

- [x] **Step 3: 最终全量测试**

Run:
```bash
cd /d e:\code\odoo
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，所有测试通过。

- [x] **Step 4: 勾选本计划所有 checkbox（完成后统一勾选）**

人工验收后，将本计划中所有 `- [ ]` 改为 `- [x]`。

---

## Self-Review 清单

- [x] Spec §2 设计决策全部实现（合并原子操作、B' 策略、条件 UPDATE、删+改测试）
- [x] Spec §4.1 后端 _apply_payment 条件 UPDATE + amount 不修改 + poll_status + invalidate_recordset
- [x] Spec §4.2 删除 /v1/payment/confirm 端点
- [x] Spec §4.3 删除 client.ts paymentConfirm
- [x] Spec §4.4 删除 payment.ts confirmPending，新增 selectPending
- [x] Spec §4.5 AggregatePayPanel onSelect 不调后端
- [x] Spec §4.6 CheckoutView 失败分支 payment.reset() + 保留 cart
- [x] Spec §6.1 删除 3 个旧测试，新增 4 个原子认领测试
- [x] Spec §6.2 删除 controller confirm 测试
- [x] Spec §6.3 E2E 改为单步 submit 认领
- [x] 无 placeholder
- [x] 类型一致：selectPending / onSelect / pending_payment_id 命名统一

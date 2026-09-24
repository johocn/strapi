# zhao_market_pos 挂单前后端统一状态机 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除挂单前后端割裂导致的数据丢失风险，前端挂单走"创建 draft 订单→hold_order"标准流程，结账时 submit_order 支持 draft 转 paid。

**Architecture:** 后端新增 `create_draft_order` 接口 + 重构 `submit_order` 支持传入 `order_id` 做 draft→paid 转换。前端 `confirmHold` 改为调 `pendingStore.hold()`（内部先 create_draft 再 hold_order），`doResume` 改为调 `pendingStore.resume()`。删除前端内存 push 死代码。

**Tech Stack:** Odoo 19 (Python) + Vue3 (TypeScript) + Pinia

**Spec:** `docs/superpowers/specs/2026-07-30-zhao-market-pos-hold-order-unification-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `controllers/pos_service.py` | 新增 `create_draft_order` + `_create_order_core`；重构 `submit_order` 支持 draft 转 paid；删除 `_create_order` | 修改 |
| `controllers/pos_controller.py` | 新增 `/v1/order/create_draft` 端点 | 修改 |
| `frontend/src/api/client.ts` | 新增 `orderCreateDraft`；`orderSubmit` payload 加 `order_id` | 修改 |
| `frontend/src/stores/pending.ts` | `hold()` 改为先 create_draft 再 hold_order | 修改 |
| `frontend/src/views/CashierView.vue` | `confirmHold` 调 `pendingStore.hold()`；`doResume` 调 `pendingStore.resume()` + 设置 `cart.pendingOrderId` | 修改 |
| `frontend/src/views/CheckoutView.vue` | `submitOrder` payload 加 `order_id: cart.pendingOrderId` | 修改 |
| `tests/test_pos_service.py` | 新增 6 个 draft/hold/resume 测试 | 修改 |
| `tests/test_pos_controller.py` | 新增 2 个 create_draft controller 测试 | 修改 |
| `tests/test_cashier_e2e.py` | 修改 `test_e2e_hold_and_resume` 走 draft 流程 | 修改 |

---

## Task 1: 后端 — 重构 _create_order 为 _create_order_core + 新增 create_draft_order

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py:155-206`

- [x] **Step 1: 重构 _create_order 为 _create_order_core**

将 `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py` 第 167-206 行的 `_create_order` 方法替换为 `_create_order_core`（不含支付逻辑，新增 state 参数）：

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
        # 明细
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

- [x] **Step 2: 重构 submit_order 支持 draft 转 paid**

将第 155-165 行的 `submit_order` 方法替换为：

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
                    return {'order_id': order.id, 'name': order.name}
                # 新建 paid 订单（原逻辑：_create_order_core + 支付）
                order = self._create_order_core(payload, session_id, user_id, state='paid')
                for pay in payload.get('payments', []):
                    self._apply_payment(order, pay)
                order.invalidate_recordset()
                return {'order_id': order.id, 'name': order.name}
            except PosServiceError:
                raise
            except Exception as e:
                raise PosServiceError(f"订单提交失败: {e}") from e
```

- [x] **Step 3: 新增 create_draft_order 方法**

在 `submit_order` 方法后（原 `_create_order` 的位置之后，`_apply_payment` 之前）插入：

```python
    def create_draft_order(self, payload, session_id, user_id):
        """创建 draft 订单（挂单前置）：订单 + 明细 + 会员，无支付。
        不开 savepoint（由调用方控制事务）。
        """
        try:
            order = self._create_order_core(payload, session_id, user_id, state='draft')
            return {'order_id': order.id, 'name': order.name}
        except PosServiceError:
            raise
        except Exception as e:
            raise PosServiceError(f"创建 draft 订单失败: {e}") from e
```

- [x] **Step 4: 运行现有测试验证无回归**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`。现有 71 个测试应全部通过（submit_order 新建分支行为与原 _create_order 一致）。

- [x] **Step 5: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_service.py
git commit -m "refactor(zhao_market_pos): extract _create_order_core, add create_draft_order, submit_order supports draft-to-paid"
```

---

## Task 2: 后端 — 新增 /v1/order/create_draft 端点

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_controller.py:152-153`

- [x] **Step 1: 在 order_submit 端点后插入 create_draft 端点**

在 `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_controller.py` 第 152 行（`order_submit` 方法的 `return self._call(...)` 之后，`@http.route('/zhao_market_pos/v1/order/hold'` 之前）插入：

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
            payload, int(payload['session_id']), request.env.uid,
        )
```

- [x] **Step 2: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_controller.py
git commit -m "feat(zhao_market_pos): add /v1/order/create_draft endpoint"
```

---

## Task 3: 后端测试 — 新增 6 个 draft/hold/resume 单元测试

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py`

- [x] **Step 1: 新增 test_create_draft_order_success**

在 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py` 的 `TestPosServiceSubmit` 类中，`test_submit_order_basic_cash` 方法后插入：

```python
    def test_create_draft_order_success(self):
        """创建 draft 订单：state='draft' + lines + 无 payments + member 关联"""
        member = self.env['zhao.member'].create({
            'name': 'draft 测试会员',
            'mobile': '13900000001',
            'warehouse_id': self.env['stock.warehouse'].search([], limit=1).id,
        })
        payload = self._make_payload(member_id=member.id)
        result = self.service.create_draft_order(
            payload, self.session.id, self.env.uid,
        )
        self.assertTrue(result['order_id'])
        order = self.env['zhao.market.pos.order'].browse(result['order_id'])
        self.assertEqual(order.state, 'draft')
        self.assertEqual(len(order.line_ids), 1)
        self.assertEqual(order.payment_ids.ids, [])  # draft 无支付
        self.assertEqual(order.zhao_member_id, member)
```

- [x] **Step 2: 新增 test_submit_order_draft_to_paid**

紧接上一测试后插入：

```python
    def test_submit_order_draft_to_paid(self):
        """draft 转 paid：先 create_draft，再 submit 传 order_id"""
        draft = self.service.create_draft_order(
            self._make_payload(), self.session.id, self.env.uid,
        )
        order_id = draft['order_id']
        # submit 时传 order_id，draft 转 paid
        payload = self._make_payload()
        payload['order_id'] = order_id
        result = self.service.submit_order(
            payload, self.session.id, self.env.uid,
        )
        self.assertEqual(result['order_id'], order_id)
        order = self.env['zhao.market.pos.order'].browse(order_id)
        self.assertEqual(order.state, 'paid')
        self.assertEqual(len(order.payment_ids), 1)  # 支付已写入
        self.assertEqual(order.payment_ids[0].payment_method, 'cash')
```

- [x] **Step 3: 新增 test_submit_order_draft_to_paid_lines_replaced**

紧接上一测试后插入：

```python
    def test_submit_order_draft_to_paid_lines_replaced(self):
        """draft 转 paid 时 lines 被重写：旧 lines 删除，新 lines 创建"""
        # draft 时 1 条 line
        draft_payload = self._make_payload()
        draft = self.service.create_draft_order(
            draft_payload, self.session.id, self.env.uid,
        )
        order_id = draft['order_id']
        # submit 时传 2 条新 lines（替换原 1 条）
        product2 = self.env['product.product'].create({
            'name': '雪碧', 'list_price': 4.0,
            'available_in_pos': True, 'type': 'consu',
        })
        new_lines = [
            {
                'product_id': self.product.id,
                'product_tmpl_id': self.product.product_tmpl_id.id,
                'qty': 1, 'price_unit': 5.0, 'original_price': 5.0,
                'discount': 100.0, 'member_price_applied': False,
                'is_gift': False, 'note': '',
            },
            {
                'product_id': product2.id,
                'product_tmpl_id': product2.product_tmpl_id.id,
                'qty': 3, 'price_unit': 4.0, 'original_price': 4.0,
                'discount': 100.0, 'member_price_applied': False,
                'is_gift': False, 'note': '',
            },
        ]
        submit_payload = self._make_payload(lines=new_lines)
        submit_payload['order_id'] = order_id
        self.service.submit_order(
            submit_payload, self.session.id, self.env.uid,
        )
        order = self.env['zhao.market.pos.order'].browse(order_id)
        # 验证：最终 2 条 lines（旧 1 条已删除）
        self.assertEqual(len(order.line_ids), 2)
        product_ids = set(order.line_ids.mapped('product_id.id'))
        self.assertEqual(product_ids, {self.product.id, product2.id})
```

- [x] **Step 4: 新增 test_hold_and_resume_with_draft_order**

紧接上一测试后插入：

```python
    def test_hold_and_resume_with_draft_order(self):
        """draft 订单挂单 + 取单：返回 payload 含 lines + member_id"""
        member = self.env['zhao.member'].create({
            'name': '挂单测试会员',
            'mobile': '13900000002',
            'warehouse_id': self.env['stock.warehouse'].search([], limit=1).id,
        })
        # 1. create_draft
        payload = self._make_payload(member_id=member.id)
        draft = self.service.create_draft_order(
            payload, self.session.id, self.env.uid,
        )
        order_id = draft['order_id']
        # 2. hold
        self.service.hold_order(order_id, 'D01')
        order = self.env['zhao.market.pos.order'].browse(order_id)
        self.assertTrue(order.is_held)
        self.assertEqual(order.hold_key, 'D01')
        # 3. resume
        resumed = self.service.resume_order('D01')
        self.assertEqual(resumed['order_id'], order_id)
        self.assertEqual(resumed['member_id'], member.id)
        self.assertEqual(len(resumed['lines']), 1)
        self.assertEqual(resumed['lines'][0]['product_id'], self.product.id)
        # 4. 验证 is_held 已清
        order.invalidate_recordset()
        self.assertFalse(order.is_held)
```

- [x] **Step 5: 新增 test_submit_order_non_draft_fails**

紧接上一测试后插入：

```python
    def test_submit_order_non_draft_fails(self):
        """submit 传 order_id 但订单状态非 draft 时抛错"""
        # 先正常 submit 一个 paid 订单
        result = self.service.submit_order(
            self._make_payload(), self.session.id, self.env.uid,
        )
        order_id = result['order_id']
        # 再传 order_id 试图转 paid（但已是 paid）
        payload = self._make_payload()
        payload['order_id'] = order_id
        with self.assertRaises(PosServiceError) as ctx:
            self.service.submit_order(
                payload, self.session.id, self.env.uid,
            )
        self.assertIn("状态非 draft", str(ctx.exception))
```

- [x] **Step 6: 新增 test_submit_order_nonexistent_order_id_fails**

紧接上一测试后插入：

```python
    def test_submit_order_nonexistent_order_id_fails(self):
        """submit 传不存在的 order_id 时抛错"""
        payload = self._make_payload()
        payload['order_id'] = 999999
        with self.assertRaises(PosServiceError) as ctx:
            self.service.submit_order(
                payload, self.session.id, self.env.uid,
            )
        self.assertIn("不存在", str(ctx.exception))
```

- [x] **Step 7: 导入 PosServiceError**

确认 `TestPosServiceSubmit.setUp` 中已导入 `PosServiceError`（第 303-305 行已有）：
```python
from odoo.addons.zhao_market_pos.controllers.pos_service import (
    PosService, PosServiceError,
)
```
若已存在则跳过此步。若 Step 5/6 用到 `PosServiceError` 但未导入，在 setUp 中补充导入。

- [x] **Step 8: 运行测试验证全部通过**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，测试数从 71 增加到 77（+6 个新测试）。

- [x] **Step 9: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/tests/test_pos_service.py
git commit -m "test(zhao_market_pos): add 6 draft/hold/resume unit tests"
```

---

## Task 4: 后端测试 — 修改 E2E 测试 + 新增 controller 测试

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py:129-156`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py`

- [x] **Step 1: 修改 test_e2e_hold_and_resume 走 draft 流程**

将 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_cashier_e2e.py` 第 129-156 行的整个 `test_e2e_hold_and_resume` 方法替换为：

```python
    def test_e2e_hold_and_resume(self):
        """E2E-4: create_draft → hold → resume → submit（draft 转 paid）"""
        # 1. create_draft（挂单前置）
        draft_payload = {
            'session_id': self.session.id,
            'lines': [{
                'product_id': self.product.id,
                'product_tmpl_id': self.product.product_tmpl_id.id,
                'qty': 1, 'price_unit': 8.0, 'original_price': 8.0,
                'discount': 100.0, 'member_price_applied': False,
                'is_gift': False, 'note': '',
            }],
            'member_id': None,
        }
        draft = self.service.create_draft_order(
            draft_payload, self.session.id, self.env.uid,
        )
        order_id = draft['order_id']
        order = self.env['zhao.market.pos.order'].browse(order_id)
        self.assertEqual(order.state, 'draft')

        # 2. 挂单
        self.service.hold_order(order_id, 'H01')
        self.assertTrue(order.is_held)
        self.assertEqual(order.hold_key, 'H01')

        # 3. 取单
        resumed = self.service.resume_order('H01')
        self.assertEqual(resumed['order_id'], order_id)
        self.assertEqual(len(resumed['lines']), 1)
        order.invalidate_recordset()
        self.assertFalse(order.is_held)

        # 4. submit（draft 转 paid，传 order_id）
        submit_payload = {
            'session_id': self.session.id,
            'order_id': order_id,
            'lines': resumed['lines'],
            'payments': [{'payment_method': 'cash', 'amount': 8.0}],
        }
        result = self.service.submit_order(
            submit_payload, self.session.id, self.env.uid,
        )
        self.assertEqual(result['order_id'], order_id)
        order.invalidate_recordset()
        self.assertEqual(order.state, 'paid')
        self.assertEqual(len(order.payment_ids), 1)
```

- [x] **Step 2: 新增 controller test_order_create_draft_missing_session**

在 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py` 的 `test_order_submit_missing_session` 方法后插入：

```python
    def test_order_create_draft_missing_session(self):
        """POST /v1/order/create_draft 无 session_id 返回 400"""
        code, data = self._post('/zhao_market_pos/v1/order/create_draft', {})
        self.assertEqual(code, 400)
        self.assertFalse(data['ok'])
        self.assertIn('session_id', data['error'])
```

- [x] **Step 3: 新增 controller test_order_create_draft_success**

紧接上一测试后插入：

```python
    def test_order_create_draft_success(self):
        """POST /v1/order/create_draft 正常创建 draft，返回 order_id + name"""
        payload = {
            'session_id': self.session_id_for_draft,
            'lines': [{
                'product_id': self.product.id,
                'product_tmpl_id': self.product.product_tmpl_id.id,
                'qty': 1, 'price_unit': 5.0, 'original_price': 5.0,
                'discount': 100.0, 'member_price_applied': False,
                'is_gift': False, 'note': '',
            }],
            'member_id': None,
        }
        code, data = self._post(
            '/zhao_market_pos/v1/order/create_draft', payload,
        )
        self.assertEqual(code, 200)
        self.assertTrue(data['ok'])
        self.assertTrue(data['data']['order_id'])
        self.assertTrue(data['data']['name'].startswith('ZMP'))
```

- [x] **Step 4: 在 controller test setUp 中创建 session**

在 `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py` 的 `setUp` 方法末尾（`self._csrf_token = ''` 之前）插入：

```python
        # 为 create_draft 测试创建 opened session
        self.draft_config = self.env['pos.config'].create({'name': 'draft 测试台'})
        self.draft_session = self.env['pos.session'].create({
            'config_id': self.draft_config.id, 'user_id': self.env.uid,
        })
        self.draft_session.action_pos_session_open()
        self.draft_session._set_opening_control_data(0.0, 'test')
        self.session_id_for_draft = self.draft_session.id
```

- [x] **Step 5: 运行全部测试验证**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，全部测试通过。

- [x] **Step 6: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/tests/test_cashier_e2e.py custom-addons/zhao_market_pos/tests/test_pos_controller.py
git commit -m "test(zhao_market_pos): E2E hold/resume via draft flow + controller create_draft tests"
```

---

## Task 5: 前端 — api/client.ts 新增 orderCreateDraft + orderSubmit 加 order_id

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\api\client.ts:78-92`

- [x] **Step 1: 修改 orderSubmit payload 类型加 order_id**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\api\client.ts` 第 78-83 行：

```typescript
  async orderSubmit(payload: {
    session_id: number; member_id?: number | null
    lines: CartLine[]; payments: PaymentItem[]
  }): Promise<ApiResponse<OrderResult>> {
    return postJson('/order/submit', payload)
  },
```

替换为：

```typescript
  async orderSubmit(payload: {
    session_id: number; member_id?: number | null
    order_id?: number | null
    lines: CartLine[]; payments: PaymentItem[]
  }): Promise<ApiResponse<OrderResult>> {
    return postJson('/order/submit', payload)
  },
```

- [x] **Step 2: 新增 orderCreateDraft 函数**

在第 83 行（`orderSubmit` 方法的 `},` 之后，`async orderHold` 之前）插入：

```typescript
  async orderCreateDraft(payload: {
    session_id: number
    lines: CartLine[]
    member_id: number | null
  }): Promise<ApiResponse<{ order_id: number; name: string }>> {
    return postJson('/order/create_draft', payload)
  },
```

- [x] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/api/client.ts
git commit -m "feat(zhao_market_pos): add orderCreateDraft API, orderSubmit payload add order_id"
```

---

## Task 6: 前端 — pending.ts hold() 改为先 create_draft 再 hold_order

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\stores\pending.ts:19-37`

- [x] **Step 1: 重写 hold() 方法**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\stores\pending.ts` 第 19-37 行的 `hold` 方法替换为：

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

- [x] **Step 2: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/stores/pending.ts
git commit -m "refactor(zhao_market_pos): pending.hold() calls create_draft then hold_order"
```

---

## Task 7: 前端 — CashierView confirmHold 和 doResume 改调后端

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CashierView.vue:312-327`

- [x] **Step 1: 重写 confirmHold 方法**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CashierView.vue` 第 312-327 行的 `confirmHold` 方法替换为：

```typescript
async function confirmHold() {
  if (!holdKeyInput.value) return
  if (!session.sessionId) {
    alert('无 session，无法挂单')
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

- [x] **Step 2: 修改 doResume 方法**

查找 `doResume` 方法（应在 `confirmHold` 之后或挂单相关区域）。将其替换为：

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
  // MVP 简化：仅恢复 lines，会员需收银员重新扫或输入手机号
  showResumeDialog.value = false
}
```

**注意**：若现有 `doResume` 方法体与上述不同，保留原有的 dialog 关闭和 UI 状态逻辑，仅替换核心取单逻辑（从直接读 `pendingStore.orders.find` 改为调 `pendingStore.resume`）。

- [x] **Step 3: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/views/CashierView.vue
git commit -m "refactor(zhao_market_pos): confirmHold and doResume call backend via pendingStore"
```

---

## Task 8: 前端 — CheckoutView submitOrder payload 加 order_id

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CheckoutView.vue:161-182`

- [x] **Step 1: 在 payload 中加 order_id**

将 `e:\code\odoo\custom-addons\zhao_market_pos\frontend\src\views\CheckoutView.vue` 第 161-182 行的 `const payload = {...}` 中：

```typescript
  const payload = {
    session_id: session.sessionId,
    member_id: cart.member?.member_id || null,
    lines: cart.lines.map(l => ({
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
    payments: payment.payments.map(p => ({
      payment_method: p.payment_method,
      amount: p.amount,
      pay_code: p.pay_code || '',
      scan_direction: p.scan_direction || 'b_scan_c',
      pending_payment_id: p.pending_payment_id,
    })),
  }
```

替换为（仅加 `order_id: cart.pendingOrderId` 一行）：

```typescript
  const payload = {
    session_id: session.sessionId,
    member_id: cart.member?.member_id || null,
    order_id: cart.pendingOrderId,
    lines: cart.lines.map(l => ({
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
    payments: payment.payments.map(p => ({
      payment_method: p.payment_method,
      amount: p.amount,
      pay_code: p.pay_code || '',
      scan_direction: p.scan_direction || 'b_scan_c',
      pending_payment_id: p.pending_payment_id,
    })),
  }
```

- [x] **Step 2: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/frontend/src/views/CheckoutView.vue
git commit -m "feat(zhao_market_pos): submitOrder payload include order_id for draft-to-paid"
```

---

## Task 9: 前端构建 + 全量测试验证

**Files:**
- Build output: `e:\code\odoo\custom-addons\zhao_market_pos\static\src\pos\pos.umd.js`
- Build output: `e:\code\odoo\custom-addons\zhao_market_pos\static\src\pos\pos.css`

- [x] **Step 1: 前端构建**

Run:
```
cd e:\code\odoo\custom-addons\zhao_market_pos\frontend
npm run build
```
Expected: 构建成功，`pos.umd.js` 和 `pos.css` 生成时间戳更新。

- [x] **Step 2: 验证前端无类型错误**

检查构建输出无 TypeScript 错误。若报错，修复后重新构建。

- [x] **Step 3: 运行后端全量测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，全部测试通过。

- [x] **Step 4: Commit 构建产物**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/static/src/pos/pos.umd.js custom-addons/zhao_market_pos/static/src/pos/pos.css
git commit -m "build(zhao_market_pos): rebuild frontend with hold order unification"
```

---

## Task 10: 最终验证与收尾

- [x] **Step 1: 检查 git 状态**

Run:
```
cd e:\code\odoo
git status
```
Expected: working tree clean，所有改动已提交。

- [x] **Step 2: 最终全量测试**

Run:
```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -u zhao_market_pos --test-enable --stop-after-init --test-tags=/zhao_market_pos
```
Expected: `0 failed, 0 error(s)`，所有测试通过。

- [x] **Step 3: 勾选本计划所有 checkbox（完成后统一勾选）**

人工验收后，将本计划中所有 `- [ ]` 改为 `- [x]`。

---

## Self-Review 清单

- [x] Spec §3.2 数据流：挂单 create_draft→hold_order→push（Task 1, 2, 5, 6, 7）
- [x] Spec §3.2 数据流：取单 resume→setLines+pendingOrderId（Task 7）
- [x] Spec §3.2 数据流：结账 submit_order 传 order_id 做 draft→paid（Task 1, 8）
- [x] Spec §4.1 _create_order_core 抽取 + submit_order 双分支 + create_draft_order（Task 1）
- [x] Spec §4.2 /v1/order/create_draft 端点（Task 2）
- [x] Spec §4.3 orderCreateDraft + orderSubmit order_id（Task 5）
- [x] Spec §4.4 pending.hold() 先 create_draft 再 hold_order（Task 6）
- [x] Spec §4.5 confirmHold 调 pendingStore.hold + doResume 调 pendingStore.resume（Task 7）
- [x] Spec §4.6 cart.setLines/pendingOrderId/clear 已有（无需新增）
- [x] Spec §6.1 6 个新增单元测试（Task 3）
- [x] Spec §6.2 E2E 改为 draft 流程（Task 4）
- [x] Spec §6.3 2 个 controller 测试（Task 4）
- [x] 无 placeholder
- [x] 类型一致：hold(holdKey, lines, memberId, sessionId) / selectPending 已删除 / pendingOrderId 命名统一

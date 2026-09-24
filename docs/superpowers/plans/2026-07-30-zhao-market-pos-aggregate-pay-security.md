# zhao_market_pos 聚合码支付安全加固 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `public_payment_submit` 端点的 `request.jsonrequest` bug，新增 IP 速率限制、cron 孤儿清理、config 启用校验，加固聚合码支付安全。

**Architecture:** 改动集中在 4 层：模型层（新增字段 + cron 入口）、service 层（速率限制 + 清理 + config 校验）、controller 层（bug 修复 + IP 提取 + 429 响应）、data 层（cron 注册）。遵循设计文档 `docs/superpowers/specs/2026-07-30-zhao-market-pos-aggregate-pay-security-design.md`。

**Tech Stack:** Odoo 19, Python 3, XML, TransactionCase/HttpCase 测试

---

## 设计文档修正（实施时遵循，不修改原 spec）

1. **4.1 的 429 响应**：不用 `request.make_response`，改用 `self._err('请求过于频繁', status=429)`（`_err` 签名 `def _err(self, msg, status=400, code=None)` 已支持 status 参数）。
2. **4.2 的 `create_pending_payment` 签名**：统一为 `def create_pending_payment(self, config_id, amount, pay_code, ip='')`（4.3 版本，向后兼容现有 3 参数调用）。
3. **`pos_service.py` 头部**：新增 `import logging` + `_logger = logging.getLogger(__name__)`。
4. **`zhao_market_pos_payment.py` 头部**：`from odoo import fields, models` 改为 `from odoo import api, fields, models`。

---

## 文件结构

| 文件 | 职责 | 改动类型 |
|------|------|----------|
| `models/zhao_market_pos_payment.py` | 新增 `create_ip` 字段、`cancelled`/`expired` 状态、cron 入口方法 | 修改 |
| `controllers/pos_service.py` | 新增 `check_rate_limit`、`cleanup_stale_pending_payments`，修改 `create_pending_payment` | 修改 |
| `controllers/pos_controller.py` | 修复 `public_payment_submit`：bug 修复 + IP 提取 + 速率限制 + 429 | 修改 |
| `data/ir_cron.xml` | 注册 cron 任务 | 新建 |
| `__manifest__.py` | data 列表加 `data/ir_cron.xml` | 修改 |
| `tests/test_pos_service.py` | 修复 setUp + 新增 6 个 service 层测试 | 修改 |
| `tests/test_pos_controller.py` | 新增 3 个 controller 层测试 | 修改 |

---

### Task 1: 模型层 - 新增字段、状态与 cron 入口

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\models\zhao_market_pos_payment.py`

- [ ] **Step 1: 修改 import 头部**

将第 1 行 `from odoo import fields, models` 改为：

```python
from odoo import api, fields, models
```

- [ ] **Step 2: `pay_status` 加 `cancelled`**

将 `pay_status` 字段（第 31-35 行）改为：

```python
    pay_status = fields.Selection([
        ('pending', '待确认'),
        ('confirmed', '已确认'),
        ('failed', '失败'),
        ('cancelled', '已取消'),
    ], string='支付状态', default='pending', required=True)
```

- [ ] **Step 3: `poll_status` 加 `expired`**

将 `poll_status` 字段（第 43-48 行）改为：

```python
    poll_status = fields.Selection([
        ('idle', '空闲'),
        ('polling', '轮询中'),
        ('success', '成功'),
        ('timeout', '超时'),
        ('expired', '已过期'),
    ], string='轮询状态', default='idle')
```

- [ ] **Step 4: 新增 `create_ip` 字段**

在 `poll_status` 字段之后（原第 48 行之后）新增：

```python

    # === 速率限制（聚合码 public 提交） ===
    create_ip = fields.Char(
        '创建IP',
        help='聚合码 public 提交时的客户端 IP，用于速率限制',
    )
```

- [ ] **Step 5: 新增 cron 入口方法**

在文件末尾（`refund_status` 字段之后）新增：

```python

    @api.model
    def _cron_cleanup_stale_pending_payments(self):
        """cron 入口：清理 24h 未认领的 pending payment"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosService
        service = PosService(self.env)
        return service.cleanup_stale_pending_payments(stale_hours=24)
```

- [ ] **Step 6: 验证模块可加载**

Run: `cd e:\code\odoo && python -c "import ast; ast.parse(open('custom-addons/zhao_market_pos/models/zhao_market_pos_payment.py', encoding='utf-8').read()); print('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 7: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/models/zhao_market_pos_payment.py
git commit -m "feat(zhao_market_pos): 加 create_ip 字段、cancelled/expired 状态、cron 入口"
```

---

### Task 2: Service 层 - 导入 logging 并新增 check_rate_limit

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py`

- [ ] **Step 1: 修改 service 头部 import**

将 `pos_service.py` 第 1-7 行：

```python
"""
Odoo 模型访问适配层 —— 升级时本文件是首要核查对象。
所有对 Odoo 原生模型（pos.session/product/zhao.member）的访问集中在此。
controller 只调 service，不直接 env['xxx']。
"""
from odoo import fields
from odoo.exceptions import ValidationError
```

改为：

```python
"""
Odoo 模型访问适配层 —— 升级时本文件是首要核查对象。
所有对 Odoo 原生模型（pos.session/product/zhao.member）的访问集中在此。
controller 只调 service，不直接 env['xxx']。
"""
import logging

from odoo import fields
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)
```

- [ ] **Step 2: 写失败测试 - check_rate_limit 未超限**

在 `tests/test_pos_service.py` 的 `TestPosServiceSubmit` 类中（`test_get_pending_payments` 方法之后）新增：

```python
    def test_check_rate_limit_under_threshold(self):
        """速率限制：1 分钟内 10 次请求，第 10 次仍允许（count < threshold）"""
        # 预置 9 条 c_scan_b pending（带 create_ip）
        for i in range(9):
            self.env['zhao.market.pos.payment'].create({
                'config_id': self.config.id,
                'payment_method': 'mixed',
                'amount': 1.0,
                'scan_direction': 'c_scan_b',
                'pay_status': 'pending',
                'poll_status': 'polling',
                'create_ip': '192.168.1.100',
            })
        # 第 10 次应允许（9 < 10）
        self.assertTrue(self.service.check_rate_limit(self.config.id, '192.168.1.100'))
```

- [ ] **Step 3: 写失败测试 - check_rate_limit 超限**

紧接上一步新增：

```python
    def test_check_rate_limit_over_threshold(self):
        """速率限制：1 分钟内 11 次请求，第 11 次拒绝"""
        for i in range(10):
            self.env['zhao.market.pos.payment'].create({
                'config_id': self.config.id,
                'payment_method': 'mixed',
                'amount': 1.0,
                'scan_direction': 'c_scan_b',
                'pay_status': 'pending',
                'poll_status': 'polling',
                'create_ip': '192.168.1.101',
            })
        # 第 11 次应拒绝（10 不 < 10）
        self.assertFalse(self.service.check_rate_limit(self.config.id, '192.168.1.101'))
```

- [ ] **Step 4: 写失败测试 - check_rate_limit unknown IP 放行**

紧接上一步新增：

```python
    def test_check_rate_limit_unknown_ip_passes(self):
        """速率限制：IP='unknown' 时放行（不阻塞正常用户）"""
        for i in range(20):
            self.env['zhao.market.pos.payment'].create({
                'config_id': self.config.id,
                'payment_method': 'mixed',
                'amount': 1.0,
                'scan_direction': 'c_scan_b',
                'pay_status': 'pending',
                'poll_status': 'polling',
                'create_ip': 'unknown',
            })
        self.assertTrue(self.service.check_rate_limit(self.config.id, 'unknown'))
```

- [ ] **Step 5: 写失败测试 - check_rate_limit 不统计 b_scan_c**

紧接上一步新增：

```python
    def test_check_rate_limit_b_scan_c_not_counted(self):
        """速率限制：b_scan_c 方向的 pending 不计入 c_scan_b 速率统计"""
        for i in range(15):
            self.env['zhao.market.pos.payment'].create({
                'config_id': self.config.id,
                'payment_method': 'wechat',
                'amount': 1.0,
                'scan_direction': 'b_scan_c',
                'pay_status': 'pending',
                'poll_status': 'idle',
                'create_ip': '192.168.1.102',
            })
        # b_scan_c 不计数，c_scan_b 仍允许
        self.assertTrue(self.service.check_rate_limit(self.config.id, '192.168.1.102'))
```

- [ ] **Step 6: 运行测试验证失败**

Run: `cd e:\code\odoo && python -c "from odoo.tests.loader import get_test_modules; print('skip - manual run via odoo -i zhao_market_pos --test-enable')"`
Expected: 手动运行 odoo 测试时这 4 个测试会 FAIL（`PosService` 无 `check_rate_limit` 方法）

- [ ] **Step 7: 实现 check_rate_limit**

在 `pos_service.py` 的 `create_pending_payment` 方法之后新增：

```python
    def check_rate_limit(self, config_id, ip, threshold=10, window_seconds=60):
        """速率限制：同一 IP 在 window_seconds 内创建的 pending payment 数量。
        返回 True 表示允许，False 表示超限。
        复用 pending payment 记录计数，不新建模型。
        """
        if not ip or ip == 'unknown':
            return True  # 无法识别 IP 时放行（不阻塞正常用户）
        from datetime import datetime, timedelta
        from odoo.fields import Datetime
        cutoff = Datetime.to_string(datetime.now() - timedelta(seconds=window_seconds))
        count = self.env['zhao.market.pos.payment'].search_count([
            ('config_id', '=', config_id),
            ('scan_direction', '=', 'c_scan_b'),
            ('create_date', '>=', cutoff),
            ('create_ip', '=', ip),
        ])
        return count < threshold
```

- [ ] **Step 8: 运行测试验证通过**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -i zhao_market_pos --test-enable --test-tags=/zhao_market_pos:TestPosServiceSubmit --stop-after-init 2>&1 | findstr "check_rate_limit"`
Expected: 4 个 check_rate_limit 测试 PASS

- [ ] **Step 9: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_service.py custom-addons/zhao_market_pos/tests/test_pos_service.py
git commit -m "feat(zhao_market_pos): 加 check_rate_limit 速率限制方法 + 4 个测试"
```

---

### Task 3: Service 层 - cleanup_stale_pending_payments

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py`

- [ ] **Step 1: 写失败测试 - cleanup 清理 25h 前的 pending**

在 `tests/test_pos_service.py` 的 `TestPosServiceSubmit` 类中新增：

```python
    def test_cleanup_stale_pending_payments(self):
        """清理 24h 未认领的 pending：25h 的被 cancelled，23h 的保留"""
        from datetime import datetime, timedelta
        from odoo.fields import Datetime
        # 25h 前的 pending（应被清理）
        old = self.env['zhao.market.pos.payment'].create({
            'config_id': self.config.id,
            'payment_method': 'mixed',
            'amount': 5.0,
            'scan_direction': 'c_scan_b',
            'pay_status': 'pending',
            'poll_status': 'polling',
            'create_ip': '192.168.1.200',
        })
        old.create_date = Datetime.to_string(datetime.now() - timedelta(hours=25))
        # 23h 前的 pending（应保留）
        recent = self.env['zhao.market.pos.payment'].create({
            'config_id': self.config.id,
            'payment_method': 'mixed',
            'amount': 8.0,
            'scan_direction': 'c_scan_b',
            'pay_status': 'pending',
            'poll_status': 'polling',
            'create_ip': '192.168.1.201',
        })
        recent.create_date = Datetime.to_string(datetime.now() - timedelta(hours=23))
        count = self.service.cleanup_stale_pending_payments(stale_hours=24)
        self.assertEqual(count, 1)
        self.assertEqual(old.pay_status, 'cancelled')
        self.assertEqual(old.poll_status, 'expired')
        self.assertEqual(recent.pay_status, 'pending')
```

- [ ] **Step 2: 写失败测试 - cleanup 不清理 b_scan_c**

紧接上一步新增：

```python
    def test_cleanup_stale_pending_payments_only_c_scan_b(self):
        """清理只影响 c_scan_b，不影响 b_scan_c"""
        from datetime import datetime, timedelta
        from odoo.fields import Datetime
        old_b_scan_c = self.env['zhao.market.pos.payment'].create({
            'config_id': self.config.id,
            'payment_method': 'wechat',
            'amount': 5.0,
            'scan_direction': 'b_scan_c',
            'pay_status': 'pending',
            'poll_status': 'idle',
        })
        old_b_scan_c.create_date = Datetime.to_string(datetime.now() - timedelta(hours=25))
        count = self.service.cleanup_stale_pending_payments(stale_hours=24)
        self.assertEqual(count, 0)
        self.assertEqual(old_b_scan_c.pay_status, 'pending')
```

- [ ] **Step 3: 实现 cleanup_stale_pending_payments**

在 `pos_service.py` 的 `check_rate_limit` 方法之后新增：

```python
    def cleanup_stale_pending_payments(self, stale_hours=24):
        """cron 调用：清理 stale_hours 小时未认领的 pending payment。
        标记为 cancelled（不物理删除，保留审计）。
        返回清理数量。
        """
        from datetime import datetime, timedelta
        from odoo.fields import Datetime
        cutoff = Datetime.to_string(datetime.now() - timedelta(hours=stale_hours))
        stale = self.env['zhao.market.pos.payment'].search([
            ('pay_status', '=', 'pending'),
            ('scan_direction', '=', 'c_scan_b'),
            ('create_date', '<', cutoff),
        ])
        if stale:
            stale.write({
                'pay_status': 'cancelled',
                'poll_status': 'expired',
            })
            _logger.info("清理 %d 条过期聚合码 pending payment", len(stale))
        return len(stale)
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -i zhao_market_pos --test-enable --test-tags=/zhao_market_pos:TestPosServiceSubmit --stop-after-init 2>&1 | findstr "cleanup_stale"`
Expected: 2 个 cleanup_stale 测试 PASS

- [ ] **Step 5: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_service.py custom-addons/zhao_market_pos/tests/test_pos_service.py
git commit -m "feat(zhao_market_pos): 加 cleanup_stale_pending_payments 方法 + 2 个测试"
```

---

### Task 4: Service 层 - create_pending_payment 加 config 校验与 ip 参数

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_service.py`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_service.py`

- [ ] **Step 1: 修复现有测试 setUp（卡点 #1）**

在 `tests/test_pos_service.py` 的 `TestPosServiceSubmit.setUp` 中（第 307 行），将：

```python
        self.config = self.env['pos.config'].create({'name': '提交测试台'})
```

改为：

```python
        self.config = self.env['pos.config'].create({
            'name': '提交测试台',
            'aggregate_qrcode_enabled': True,
        })
```

- [ ] **Step 2: 写失败测试 - disabled config 抛异常**

在 `TestPosServiceSubmit` 类中新增：

```python
    def test_create_pending_payment_disabled_config(self):
        """config 未启用聚合码时抛 PosServiceError"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosServiceError
        disabled_config = self.env['pos.config'].create({
            'name': '未启用聚合码',
            'aggregate_qrcode_enabled': False,
        })
        with self.assertRaises(PosServiceError):
            self.service.create_pending_payment(disabled_config.id, 5.0, '')
```

- [ ] **Step 3: 写失败测试 - 记录 create_ip**

紧接上一步新增：

```python
    def test_create_pending_payment_records_ip(self):
        """create_pending_payment 写入 create_ip 字段"""
        pid = self.service.create_pending_payment(
            self.config.id, 5.0, '', ip='10.0.0.1',
        )
        payment = self.env['zhao.market.pos.payment'].browse(pid)
        self.assertEqual(payment.create_ip, '10.0.0.1')
```

- [ ] **Step 4: 实现 - 修改 create_pending_payment 签名与校验**

将 `pos_service.py` 的 `create_pending_payment` 方法（第 358-374 行）改为：

```python
    def create_pending_payment(self, config_id, amount, pay_code, ip=''):
        """顾客扫码提交：创建无 order_id 的孤儿 payment 记录"""
        config = self.env['pos.config'].browse(config_id)
        if not config.exists():
            raise PosServiceError(f"pos.config {config_id} 不存在")
        if not config.aggregate_qrcode_enabled:
            raise PosServiceError("聚合码未启用")
        if amount <= 0:
            raise PosServiceError("金额必须大于 0")
        payment = self.env['zhao.market.pos.payment'].create({
            'config_id': config_id,
            'payment_method': 'mixed',
            'amount': amount,
            'pay_code': pay_code,
            'scan_direction': 'c_scan_b',
            'pay_status': 'pending',
            'poll_status': 'polling',
            'create_ip': ip,
        })
        return payment.id
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -i zhao_market_pos --test-enable --test-tags=/zhao_market_pos:TestPosServiceSubmit --stop-after-init 2>&1 | findstr "create_pending"`
Expected: 所有 create_pending 相关测试 PASS（包括原有的 `test_create_pending_payment_orphan`、`test_get_pending_payments`）

- [ ] **Step 6: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_service.py custom-addons/zhao_market_pos/tests/test_pos_service.py
git commit -m "feat(zhao_market_pos): create_pending_payment 加 config 校验与 ip 参数 + 2 个测试"
```

---

### Task 5: Controller 层 - 修复 public_payment_submit

**Files:**
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\controllers\pos_controller.py`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\tests\test_pos_controller.py`

- [ ] **Step 1: 写失败测试 - 正常提交成功（回归测试）**

在 `tests/test_pos_controller.py` 的 `TestZhaoMarketPosController` 类中（`test_aggregate_pay_page_disabled_config` 之后）新增：

```python
    # ============ 聚合码 public 提交 ============
    def test_public_payment_submit_success(self):
        """POST /public/payment/submit 正常提交返回 200 + payment_id"""
        code, data = self._public_post(
            '/zhao_market_pos/public/payment/submit',
            {'config_id': self.config.id, 'amount': 5.0, 'pay_code': ''},
        )
        self.assertEqual(code, 200)
        self.assertTrue(data['ok'])
        self.assertTrue(data['data']['payment_id'])
```

- [ ] **Step 2: 写失败测试 - 速率限制返回 429**

紧接上一步新增：

```python
    def test_public_payment_submit_rate_limited(self):
        """连续 11 次提交，第 11 次返回 429"""
        url = '/zhao_market_pos/public/payment/submit'
        payload = {'config_id': self.config.id, 'amount': 1.0, 'pay_code': ''}
        for i in range(10):
            code, _ = self._public_post(url, payload)
            self.assertEqual(code, 200)
        # 第 11 次应被速率限制
        code, data = self._public_post(url, payload)
        self.assertEqual(code, 429)
        self.assertFalse(data['ok'])
```

- [ ] **Step 3: 写失败测试 - 未启用聚合码返回 400**

紧接上一步新增：

```python
    def test_public_payment_submit_disabled_config(self):
        """config 未启用聚合码返回 400"""
        self.config.write({'aggregate_qrcode_enabled': False})
        code, data = self._public_post(
            '/zhao_market_pos/public/payment/submit',
            {'config_id': self.config.id, 'amount': 5.0, 'pay_code': ''},
        )
        self.assertEqual(code, 400)
        self.assertFalse(data['ok'])
```

- [ ] **Step 4: 新增 _public_post 辅助方法**

在 `tests/test_pos_controller.py` 的 `_get` 方法之后新增（public 端点无需 CSRF 和登录）：

```python
    def _public_post(self, url, payload):
        """public 端点 POST JSON（无 CSRF、无登录），返回 (status_code, json_body)"""
        body = json.dumps(payload, ensure_ascii=False)
        resp = self.url_open(
            url,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout=30,
        )
        try:
            data = resp.json()
        except Exception:
            data = None
        return resp.status_code, data
```

- [ ] **Step 5: 实现 - 修复 public_payment_submit**

将 `pos_controller.py` 第 343-375 行的 `public_payment_submit` 方法改为：

```python
    @http.route('/zhao_market_pos/public/payment/submit',
                type='http', auth='public', methods=['POST'], csrf=False)
    def public_payment_submit(self, **kw):
        """顾客扫码提交支付（public，无登录）。
        限制：只允许创建 pending payment 记录，不做资金转移。
        速率限制：同一 IP 每分钟最多 10 次。
        """
        try:
            payload = request.get_json_data() or {}
        except Exception:
            return self._err('无效请求')
        config_id = payload.get('config_id')
        amount = payload.get('amount')
        if not config_id or amount is None:
            return self._err('config_id 和 amount 必填')
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return self._err('amount 必须为数字')
        if amount <= 0 or amount > 100000:
            return self._err('金额范围 0.01 ~ 100000')
        # 提取客户端 IP（X-Forwarded-For 优先，回退 Remote-Addr）
        ip = (request.httprequest.headers.get('X-Forwarded-For', '').split(',')[0].strip()
              or request.httprequest.remote_addr or 'unknown')
        # 用 sudo 绕过权限检查（public 用户无权创建 payment）
        service = PosService(request.env.su)
        try:
            if not service.check_rate_limit(int(config_id), ip):
                return self._err('请求过于频繁', status=429)
            pid = service.create_pending_payment(
                int(config_id), amount, str(payload.get('pay_code') or ''), ip=ip,
            )
        except PosServiceError as e:
            return self._err(str(e))
        except Exception as e:
            _logger.exception("聚合码 public 提交异常: %s", e)
            return self._err('提交失败')
        return self._ok({'payment_id': pid})
```

- [ ] **Step 6: 运行测试验证通过**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -i zhao_market_pos --test-enable --test-tags=/zhao_market_pos:TestZhaoMarketPosController --stop-after-init 2>&1 | findstr "public_payment"`
Expected: 3 个 public_payment 测试 PASS

- [ ] **Step 7: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/controllers/pos_controller.py custom-addons/zhao_market_pos/tests/test_pos_controller.py
git commit -m "fix(zhao_market_pos): public_payment_submit 修复 jsonrequest bug + 速率限制 + 3 个测试"
```

---

### Task 6: Cron 数据文件与 manifest 注册

**Files:**
- Create: `e:\code\odoo\custom-addons\zhao_market_pos\data\ir_cron.xml`
- Modify: `e:\code\odoo\custom-addons\zhao_market_pos\__manifest__.py`

- [ ] **Step 1: 创建 ir_cron.xml**

创建文件 `e:\code\odoo\custom-addons\zhao_market_pos\data\ir_cron.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="cron_cleanup_stale_pending_payments" model="ir.cron">
        <field name="name">zhao_market_pos: 清理过期聚合码待确认支付</field>
        <field name="model_id" ref="model_zhao_market_pos_payment"/>
        <field name="state">code</field>
        <field name="code">model._cron_cleanup_stale_pending_payments()</field>
        <field name="interval_number">1</field>
        <field name="interval_type">hours</field>
        <field name="numbercall">-1</field>
        <field name="active" eval="True"/>
    </record>
</odoo>
```

- [ ] **Step 2: 修改 __manifest__.py 注册 cron**

将 `__manifest__.py` 第 16-23 行的 `data` 列表：

```python
    'data': [
        'security/ir.model.access.csv',
        'data/ir_sequence.xml',
        'views/pos_templates.xml',
        'views/menu.xml',
        'views/order_views.xml',
        'views/config_views.xml',
    ],
```

改为：

```python
    'data': [
        'security/ir.model.access.csv',
        'data/ir_sequence.xml',
        'data/ir_cron.xml',
        'views/pos_templates.xml',
        'views/menu.xml',
        'views/order_views.xml',
        'views/config_views.xml',
    ],
```

- [ ] **Step 3: 升级模块验证 cron 注册**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -u zhao_market_pos --stop-after-init 2>&1 | findstr "cron_cleanup"`
Expected: 无报错，模块升级成功

- [ ] **Step 4: 验证 cron 记录创建**

Run: `cd e:\code\odoo && python odoo-bin shell -c odoo.conf -d test_db -c odoo.conf --no-xmlrpc <<EOF 2>&1 | findstr "cron"
cron = env.ref('zhao_market_pos.cron_cleanup_stale_pending_payments')
print('cron found:', cron.name)
EOF`
Expected: `cron found: zhao_market_pos: 清理过期聚合码待确认支付`

- [ ] **Step 5: Commit**

```bash
cd e:\code\odoo
git add custom-addons/zhao_market_pos/data/ir_cron.xml custom-addons/zhao_market_pos/__manifest__.py
git commit -m "feat(zhao_market_pos): 注册 cron 清理过期聚合码待确认支付"
```

---

### Task 7: 全量测试与最终验证

**Files:** 无修改

- [ ] **Step 1: 运行全量 zhao_market_pos 测试**

Run: `cd e:\code\odoo && python odoo-bin -c odoo.conf -d test_db -i zhao_market_pos --test-enable --test-tags=/zhao_market_pos --stop-after-init 2>&1 | findstr "FAIL\|ERROR\|test"`
Expected: 0 FAIL，0 ERROR

- [ ] **Step 2: 验证 cron 手动触发**

Run: `cd e:\code\odoo && python odoo-bin shell -c odoo.conf -d test_db --no-xmlrpc <<EOF 2>&1
from odoo.addons.zhao_market_pos.models.zhao_market_pos_payment import ZhaoMarketPosPayment
result = env['zhao.market.pos.payment']._cron_cleanup_stale_pending_payments()
print('cleanup result:', result)
EOF`
Expected: `cleanup result: 0`（或清理的数量，无异常）

- [ ] **Step 3: 最终 Commit（如有遗漏修复）**

```bash
cd e:\code\odoo
git log --oneline -6
```
Expected: 看到 6 个 commit（Task 1-6 各一个）

---

## Self-Review 检查

**1. Spec 覆盖：**
- ✅ 问题 1（无速率限制）→ Task 2 + Task 5
- ✅ 问题 2（孤儿无清理）→ Task 3 + Task 6
- ✅ 问题 3（jsonrequest bug）→ Task 5 Step 5
- ✅ 问题 4（sudo 无 config 校验）→ Task 4 Step 4
- ✅ create_ip 字段 → Task 1 Step 4
- ✅ cancelled/expired 状态 → Task 1 Step 2-3
- ✅ cron 入口 → Task 1 Step 5 + Task 6

**2. 卡点修复：**
- ✅ 卡点 1（现有测试失败）→ Task 4 Step 1 修复 setUp
- ✅ 卡点 2（429 响应不一致）→ 计划开篇"设计文档修正" + Task 5 Step 5 用 `_err(status=429)`
- ✅ 卡点 3（create_pending_payment 签名不一致）→ 计划开篇"设计文档修正" + Task 4 Step 4 统一带 `ip=''`

**3. 遗漏修复：**
- ✅ 遗漏 1（pos_service.py 缺 logging）→ Task 2 Step 1
- ✅ 遗漏 2（payment.py 缺 api）→ Task 1 Step 1
- ✅ 遗漏 3（测试覆盖 c_scan_b 过滤）→ Task 2 Step 5 + Task 3 Step 2

**4. 类型一致性：**
- `check_rate_limit(config_id, ip, threshold=10, window_seconds=60)` - Task 2 定义，Task 5 调用 ✅
- `cleanup_stale_pending_payments(stale_hours=24)` - Task 3 定义，Task 1 cron 入口调用 ✅
- `create_pending_payment(config_id, amount, pay_code, ip='')` - Task 4 定义，Task 5 调用 ✅
- `_err(msg, status=400, code=None)` - 现有方法，Task 5 用 `status=429` 调用 ✅

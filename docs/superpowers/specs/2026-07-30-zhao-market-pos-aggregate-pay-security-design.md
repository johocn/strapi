# zhao_market_pos 聚合码支付安全加固设计

- **日期**: 2026-07-30
- **状态**: 已批准
- **范围**: zhao_market_pos 聚合码 public_payment_submit 端点安全加固
- **关联**: 复盘风险点 #2（聚合码安全风险）

## 1. 背景与问题

### 1.1 public_payment_submit 端点现状

`controllers/pos_controller.py:343-375` 的 `public_payment_submit` 端点存在 4 个安全问题：

| # | 问题 | 严重度 | 现状代码 |
|---|------|--------|----------|
| 1 | 无速率限制 | 高 | 注释自承"速率限制暂未实现，生产环境建议加 nginx limit_req" |
| 2 | 孤儿 pending payment 无清理 | 中 | 无 cron，pending 记录永久堆积 |
| 3 | `request.jsonrequest` bug | 高 | 第 351 行 `request.jsonrequest` 在 type='http' 路由中抛 AttributeError，被 except 吞掉返回"无效请求"，端点可能从未正常工作 |
| 4 | sudo 无 config 校验 | 低 | `request.env.su` 绕过权限，但未校验 `config.aggregate_qrcode_enabled` |

### 1.2 风险场景

- **DB 灌满攻击**：攻击者循环调用 `/public/payment/submit`，每秒创建大量 pending payment 记录，DB 灌满
- **孤儿堆积**：顾客扫码后不付款、收银员不认领 → pending 记录永久存在，日积月累拖慢查询
- **端点失效**：`request.jsonrequest` bug 导致正常顾客扫码提交全部返回"无效请求"

## 2. 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 速率限制方案 | **复用 pending payment 记录计数** | 查询"过去 1 分钟内同一 IP 创建的 pending 数量"，不新建模型，不依赖部署环境 |
| 速率限制阈值 | **10 次/分钟** | 正常场景下单一顾客不会 1 分钟内扫 10 次码，阈值偏宽松但足够防刷 |
| 孤儿清理方式 | **标记 cancelled** | 不物理删除，保留审计记录。pay_status 改为 cancelled，poll_status 改为 expired |
| 孤儿清理阈值 | **24 小时** | 超市场景下顾客扫码后通常 5 分钟内完成支付，24h 足够保守 |
| cron 频率 | **每小时** | 平衡清理及时性和 DB 负载 |
| sudo 约束 | **加 config 校验** | 保留 sudo（public 用户必须 sudo 创建 payment），但校验 config.aggregate_qrcode_enabled=True |
| bug 修复 | **request.get_json_data()** | 与之前 _payload() 修复一致，Odoo 19 正确 API |

## 3. 架构改动

### 3.1 核心思路

- 速率限制：在 service 层新增 `check_rate_limit(config_id, ip)`，复用 pending payment 记录做计数
- 孤儿清理：在 service 层新增 `cleanup_stale_pending_payments()`，cron 每小时调用
- bug 修复：`request.jsonrequest` → `request.get_json_data()`
- sudo 约束：`create_pending_payment` 加 `config.aggregate_qrcode_enabled` 校验

### 3.2 数据流

```
顾客扫码提交：
  POST /public/payment/submit
    → 提取 IP（X-Forwarded-For 优先，回退 Remote-Addr）
    → check_rate_limit(config_id, ip)：查近 1 分钟同 IP pending 数
       ├─ > 10 次 → 返回 429 "请求过于频繁"
       └─ ≤ 10 次 → 继续
    → create_pending_payment(config_id, amount, pay_code)
       └─ 校验 config.aggregate_qrcode_enabled=True
    → 返回 {payment_id}

cron 每小时：
  cleanup_stale_pending_payments()
    → search pay_status='pending' AND create_date < now-24h
    → write pay_status='cancelled', poll_status='expired'
    → 记录日志（清理数量）
```

## 4. 组件改动

### 4.1 后端 `controllers/pos_controller.py`

**修改 `public_payment_submit`**（第 343-375 行）：

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
        # 速率限制：同一 IP 每分钟最多 10 次
        service = PosService(request.env.su)
        try:
            if not service.check_rate_limit(int(config_id), ip):
                return request.make_response(
                    json.dumps({'ok': False, 'error': '请求过于频繁'}),
                    headers=[('Content-Type', 'application/json')],
                    status=429,
                )
            pid = service.create_pending_payment(
                int(config_id), amount, str(payload.get('pay_code') or ''),
            )
        except PosServiceError as e:
            return self._err(str(e))
        except Exception as e:
            _logger.exception("聚合码 public 提交异常: %s", e)
            return self._err('提交失败')
        return self._ok({'payment_id': pid})
```

**关键改动**：
- `request.jsonrequest` → `request.get_json_data()`（修复 bug）
- 新增 IP 提取逻辑
- 新增 `check_rate_limit` 调用，超限返回 429
- 429 响应用 `request.make_response` 手动构建（`_err` 辅助方法默认 200）

### 4.2 后端 `controllers/pos_service.py`

**修改 `create_pending_payment`**（第 358-374 行）：加 config 校验。

```python
    def create_pending_payment(self, config_id, amount, pay_code):
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
        })
        return payment.id
```

**新增 `check_rate_limit` 方法**：

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
            ('create_ip', '=', ip),  # 需要在 payment 模型加 create_ip 字段
        ])
        return count < threshold
```

**新增 `cleanup_stale_pending_payments` 方法**：

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

### 4.3 后端 `models/zhao_market_pos_payment.py`

**pay_status Selection 加 cancelled**（保留现有 failed）：

```python
    pay_status = fields.Selection([
        ('pending', '待确认'),
        ('confirmed', '已确认'),
        ('failed', '失败'),
        ('cancelled', '已取消'),
    ], string='支付状态', default='pending', required=True)
```

**新增 create_ip 字段**（用于速率限制）：

```python
    create_ip = fields.Char('创建IP', help='聚合码 public 提交时的客户端 IP，用于速率限制')
```

**修改 `create_pending_payment`**：在 `pos_service.py` 的 `create_pending_payment` 中写入 `create_ip`。需在 `pos_controller.py` 的 `public_payment_submit` 中把 ip 传给 service：

```python
# pos_controller.py public_payment_submit 中：
pid = service.create_pending_payment(
    int(config_id), amount, str(payload.get('pay_code') or ''),
    ip=ip,  # 新增参数
)
```

```python
# pos_service.py create_pending_payment 中：
def create_pending_payment(self, config_id, amount, pay_code, ip=''):
    # ... 现有校验
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

**poll_status Selection 加 expired**：

```python
    poll_status = fields.Selection([
        ('idle', '空闲'),
        ('polling', '轮询中'),
        ('success', '成功'),
        ('expired', '已过期'),
    ], string='轮询状态', default='idle')
```

### 4.4 后端 `data/ir_cron.xml`（新建）

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

### 4.5 后端 `models/zhao_market_pos_payment.py` 新增 cron 入口

```python
    @api.model
    def _cron_cleanup_stale_pending_payments(self):
        """cron 入口：清理 24h 未认领的 pending payment"""
        from odoo.addons.zhao_market_pos.controllers.pos_service import PosService
        service = PosService(self.env)
        return service.cleanup_stale_pending_payments(stale_hours=24)
```

### 4.6 后端 `__manifest__.py`

在 `data` 列表加 `data/ir_cron.xml`：

```python
    'data': [
        # ... 现有文件
        'data/ir_cron.xml',
    ],
```

## 5. 错误处理

| 场景 | HTTP 状态码 | 响应 |
|------|-------------|------|
| 速率超限 | 429 | `{"ok": false, "error": "请求过于频繁"}` |
| config 未启用聚合码 | 400 | `{"ok": false, "error": "聚合码未启用"}` |
| amount 超范围 | 400 | `{"ok": false, "error": "金额范围 0.01 ~ 100000"}` |
| 无效 JSON | 400 | `{"ok": false, "error": "无效请求"}` |
| cron 清理 | N/A | 静默标记 cancelled，记录日志（清理数量） |
| IP 无法识别 | 200 | 放行（不阻塞正常用户） |

## 6. 测试改动

### 6.1 `tests/test_pos_service.py`

**新增**：
- `test_check_rate_limit_under_threshold`：1 分钟内 10 次请求，第 10 次返回 True
- `test_check_rate_limit_over_threshold`：1 分钟内 11 次请求，第 11 次返回 False
- `test_check_rate_limit_unknown_ip_passes`：IP='unknown' 时放行
- `test_cleanup_stale_pending_payments`：创建 25h 前 + 23h 前的 pending，验证 25h 的被 cancelled，23h 的保留
- `test_create_pending_payment_disabled_config`：config.aggregate_qrcode_enabled=False 时抛 PosServiceError

### 6.2 `tests/test_pos_controller.py`

**新增**：
- `test_public_payment_submit_success`：正常请求返回 200 + payment_id（修复 bug 后的回归测试）
- `test_public_payment_submit_rate_limited`：连续 11 次请求，第 11 次返回 429
- `test_public_payment_submit_disabled_config`：config 未启用聚合码返回 400

## 7. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| IP 提取准确性 | X-Forwarded-For 可伪造。MVP 接受此风险，生产环境 nginx 配置 `proxy_set_header X-Real-IP $remote_addr` 覆盖 |
| cron 误清理 | 24h 阈值偏保守。超市场景下顾客扫码后通常 5 分钟内完成支付，24h 足够安全 |
| 速率限制阈值 | 10 次/分钟。正常场景下单一顾客不会 1 分钟内扫 10 次码，阈值偏宽松但足够防刷 |
| 多 worker 速率限制 | 复用 DB 记录计数，跨 worker 生效，无需额外协调 |
| cancelled 状态影响 | get_pending_payments 只查 pending 状态，cancelled 不会出现在收银台轮询列表 |

## 8. 不在范围内

- hold_key TOCTOU 竞态（独立问题，复盘风险点 #3，后续处理）
- F1-F12 快捷键冲突（独立问题，复盘风险点 #4，后续处理）
- IP 白名单/黑名单（MVP 不做，速率限制足够防刷）
- 验证码/人机验证（MVP 不做，超市场景下顾客扫码体验优先）

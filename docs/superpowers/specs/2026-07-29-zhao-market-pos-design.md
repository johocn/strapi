# zhao_market_pos 超市 POS 收银台设计文档

## 元信息

- **创建日期**: 2026-07-29
- **状态**: 设计完成（v2 修正版），待用户确认后进入实现规划
- **方案**: C（session 复用 + 订单自建）
- **前置依赖**: `zhao_pos_shift`（交班）、`zhao_member`（会员档案+等级折扣）、`point_of_sale`（pos.session/pos.config）

## 1. 目标与范围

### 1.1 核心目标

Odoo 原生 POS 围绕欧美零售流程设计，与中国收银台交互习惯差距明显。本模块在 Odoo 数据层之上构建一套中国化收银台前端，核心约束：

- **后台数据遵守 Odoo 不变**：不改 Odoo 原生模型字段，复用 `pos.session`/`pos.config`/`product.template`/`zhao.member`
- **收银功能一切向中国本地化靠拢**：完全脱离 OWL 框架，自建 Vue3 收银前端

### 1.2 MVP 范围

**必做**：
- 收银主界面（左侧商品分类速选网格 + 右侧购物车 + 顶部快捷键栏 + 底部合计/会员入口）
- 扫码枪接入（USB HID 键盘模拟型，中国 90% 收银台主流方案）
- 快捷键矩阵（F1-F12 分类切换、数字键选商品、空格挂单、回车结账、Delete 删行）
- 购物车状态机（加商品/改数量/改价/赠品/整单折扣/挂单/取单/退货）
- 订单提交（单一事务：订单创建 + 会员价应用）
- 会员价（对接 `zhao.member.level.discount`，按等级+商品查折扣率）
- 聚合码支付（固定码方案：收银台贴码 + 顾客扫码输入金额 + 收银员手点确认）
- 交班对账单（订单统计 + 支付方式汇总 + 异常提醒）
- 小票打印（浏览器原生打印 + HTML 模板）

**不做（明确砍掉）**：
- **积分扣减/累加**（待 `zhao_member_points` 模块实现后对接；订单模型字段 `member_points_used`/`member_points_earned` 预留默认 0）
- 离线兜底（第二版）
- 微信/支付宝 API 对接（扫码后收银员手点确认）
- 电子秤/钱箱/ESC-POS 指令打印
- 电子发票
- 储值卡扣减（第二版）
- 优惠券核销/拼团秒杀（第二版）
- 后台销售报表/会计对接（`account.move`）
- 动态聚合码生成（第一版用固定码贴纸）

### 1.3 预留扩展

- `pos_type` 字段三选项：`market`（超市）/ `restaurant`（餐馆）/ `yi_guan`（医馆）
- `zhao_restaurant_pos` 模块通过 inheritance 扩展本表加桌台/堂食字段
- `zhao_yi_guan_pos` 模块通过 inheritance 扩展本表加处方/诊疗字段
- 订单模型 `member_points_used`/`member_points_earned` 字段预留，待 `zhao_member_points` 模块实现后启用

## 2. 架构总览

### 2.1 分层

```
┌─────────────────────────────────────────┐
│  Vue3 + Pinia SPA（static/src/pos/）     │  中国化收银交互层
│  挂载于 QWeb 单一 div，不进 Odoo asset   │
└──────────────┬──────────────────────────┘
               │ JSON（同源 cookie + CSRF header）
┌──────────────▼──────────────────────────┐
│  controllers/pos_controller.py           │  REST endpoint 层
│  13 个端点：商品/分类/会员/订单/交班/聚合码│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  controllers/pos_service.py              │  Odoo 模型访问适配层
│  唯一出口，升级时只改这里                 │  ← 风险隔离层
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Odoo 原生层（只读复用）                  │
│  ├ pos.session / pos.config              │
│  ├ product.template / product.product    │
│  └ res.partner                           │
├──────────────────────────────────────────┤
│  依赖模块（复用）                         │
│  ├ zhao_pos_shift（交班）                 │
│  └ zhao_member（会员档案+等级+商品折扣）   │
├──────────────────────────────────────────┤
│  zhao_market_pos 自建模型层               │
│  ├ zhao.market.pos.order                 │
│  ├ zhao.market.pos.order.line            │
│  └ zhao.market.pos.payment               │
└─────────────────────────────────────────┘
```

### 2.2 模块结构

```
zhao_market_pos/                          # 注意：custom-addons 目录用中划线
├── __manifest__.py
├── __init__.py
├── controllers/
│   ├── __init__.py          # 含升级注意事项中文备注
│   ├── pos_controller.py    # REST endpoint
│   └── pos_service.py       # Odoo 模型访问适配层（升级时只改这里）
├── models/
│   ├── __init__.py
│   ├── zhao_market_pos_order.py
│   ├── zhao_market_pos_order_line.py
│   ├── zhao_market_pos_payment.py
│   └── pos_config.py        # 扩展 pos.config 加中国化配置
├── views/
│   ├── pos_templates.xml    # QWeb 模板（收银台挂载页+聚合码支付页）
│   ├── menu.xml             # 后台菜单入口
│   ├── order_views.xml      # 订单查询 tree/form
│   └── config_views.xml     # pos.config 扩展视图
├── security/
│   └── ir.model.access.csv
├── static/
│   └── src/pos/
│       ├── pos.umd.js       # Vite 构建产物（不进 Odoo asset bundle）
│       └── pos.css
├── tests/
│   ├── __init__.py
│   ├── test_pos_service.py       # L1 单元
│   ├── test_pos_controller.py    # L2 集成
│   └── test_cashier_e2e.py       # L3 E2E
└── frontend/                # Vue3 源码（开发用，部署不依赖）
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── stores/          # Pinia: cart/pending/payment/session
    │   ├── views/           # 主收银/交班/对账单/聚合码支付
    │   ├── composables/     # useScanner/useShortcut/usePrint
    │   └── api/             # 调 controller
    ├── vite.config.ts
    └── package.json
```

### 2.3 关键架构决策

1. **`pos_service.py` 是升级风险隔离层**：所有对 Odoo 原生模型和 `zhao.member` 的访问集中在此，controller 只调 service 不直接碰 `env`。升级时逐字段核对只改这一个文件
2. **`frontend/` 不进 Odoo 运行时**：部署只需 `static/src/pos/` 构建产物，`frontend/` 是开发源码。Odoo 升级 asset 系统时零影响
3. **Vue3 + Pinia 独立构建**：Vite 打包为 `pos.umd.js` + `pos.css`，放到 `static/src/pos/`，QWeb 模板 `<script src>` 直接引入，完全不进 Odoo asset bundle
4. **`pos_type` 预留多业态扩展**：餐馆/医馆模块通过 inheritance 扩展本表，不重建表
5. **聚合码固定 URL 方案**：收银台贴固定码 `/zhao_market_pos/pay/<config_id>`，顾客扫码输入金额提交，后端创建待确认支付记录，收银台前端轮询+手点确认

### 2.4 升级风险提示（controllers/__init__.py 顶部备注）

```python
# ============================================================
# 升级注意事项（Odoo 跨版本升级时必读）
# ============================================================
# 本目录是 zhao_market_pos 与 Odoo 原生模型的唯一对接层。
# 升级 Odoo 大版本（如 19→20）时，按以下清单逐项核查：
#
# 1. pos_service.py —— 核心适配层
#    - pos.session / pos.config 字段变更（Odoo 19 改过 session 状态机）
#    - product.template / product.product 字段变更（影响商品查询）
#    - zhao.member / zhao.member.level 字段变更（zhao_member 升级时同步）
#    - ORM API 变更（search/read/write/create 签名跨版本稳定，但
#      command 字面量如 [(6, 0, ids)] 偶有调整）
#
# 2. pos_controller.py —— REST 端点
#    - @http.route 装饰器签名跨版本稳定
#    - request.csrf_token() 在 Odoo 17+ 强化，确认 token 获取方式
#    - request.jsonrequest 解析行为偶有微调
#
# 3. 不要在 controller 里直接调 env['xxx']，一律走 pos_service
#    - 集中访问 = 集中升级，散落访问 = 升级时遗漏
#
# 4. 自建模型（zhao.market.pos.order 等）不受 Odoo 升级影响
#    - 仅当 res.partner / pos.session 字段变更时需同步适配
# ============================================================
```

## 3. 数据模型设计

### 3.1 zhao.market.pos.order（订单主表）

| 字段 | 类型 | 说明 |
|---|---|---|
| name | Char | 单号，默认 `/` |
| pos_type | Selection | `market`/`restaurant`/`yi_guan`，默认 `market` |
| state | Selection | `draft`/`paid`/`done`/`cancel`/`refund` |
| session_id | Many2one | `pos.session`，复用原生 |
| config_id | Many2one | `pos.config`，related session |
| zhao_member_id | Many2one | `zhao.member`，下单会员（可空=非会员订单） |
| partner_id | Many2one | `res.partner`，related zhao_member（用于发票/统计） |
| company_id | Many2one | `res.company`，related |
| amount_untaxed | Monetary | 税前金额，compute |
| amount_tax | Monetary | 税额，compute |
| amount_total | Monetary | 应付总额，compute |
| amount_paid | Monetary | 实付总额，compute |
| amount_change | Monetary | 找零，compute |
| member_level_id | Many2one | `zhao.member.level`，成单时快照 |
| member_points_used | Integer | 使用积分（预留，默认 0，待积分模块对接） |
| member_points_earned | Integer | 获得积分（预留，默认 0，待积分模块对接） |
| member_discount_amount | Monetary | 会员折扣金额 |
| order_type | Selection | `normal`/`refund`/`exchange` |
| is_held | Boolean | 挂单中 |
| hold_key | Char | 挂单编号，如 `A01` |
| salesman_id | Many2one | `res.users`，收银员 |
| note | Text | 备注 |
| line_ids | One2many | `zhao.market.pos.order.line` |
| payment_ids | One2many | `zhao.market.pos.payment` |

**关键决策**：
- 会员关联用 `zhao_member_id` 指向 `zhao.member`（独立模型），不用 `partner_id` 直接关联 `res.partner`；`partner_id` 通过 related 自动取 `zhao_member_id.partner_id`
- 会员等级快照（`member_level_id`）成单时固化，避免会员后续升级导致历史订单折扣计算错乱
- `is_held` + `hold_key` 是中国收银台"挂单/取单"核心，Odoo 原生 POS 无此概念
- `member_points_used`/`member_points_earned` 字段保留但 MVP 默认 0，待 `zhao_member_points` 模块实现后启用

**SQL 唯一约束（Odoo 19 用 `models.Constraint`）**：
```python
_hold_key_uniq = models.Constraint(
    'unique(hold_key, is_held) WHERE is_held = true',
    '挂单编号已存在',
)
```

### 3.2 zhao.market.pos.order.line（订单明细）

| 字段 | 类型 | 说明 |
|---|---|---|
| order_id | Many2one | `zhao.market.pos.order`，cascade |
| product_id | Many2one | `product.product` |
| qty | Float | 数量 |
| price_unit | Float | 单价（折后价），成单时快照 |
| price_subtotal | Monetary | 税前小计，compute |
| price_subtotal_incl | Monetary | 含税小计，compute |
| is_gift | Boolean | 赠品（金额为 0） |
| is_weighted | Boolean | 称重商品 |
| discount | Float | 折扣率%（语义：88 表示 88 折，与 zhao_member 一致） |
| original_price | Float | 原价快照，用于审计 |
| price_manual | Boolean | 手动改价 |
| member_price_applied | Boolean | 应用会员价 |
| note | Char | 行备注 |

**关键决策**：
- 折扣率语义统一为 zhao_member 模式：`price = original_price * (discount / 100)`，88=88折
- `discount` 默认 100（不打折=付原价），会员价场景写入等级折扣率
- 价格快照（`price_unit`/`original_price`）与会员字段同理，避免商品价格变更影响历史订单

### 3.3 zhao.market.pos.payment（支付记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| order_id | Many2one | `zhao.market.pos.order`，cascade |
| payment_method | Selection | `cash`/`wechat`/`alipay`/`mixed`（聚合码） |
| amount | Monetary | 金额 |
| pay_code | Char | 付款码（B扫C，扫码枪扫入） |
| pay_status | Selection | `pending`/`confirmed`/`failed`，第一版默认 pending + 人工确认 |
| pay_time | Datetime | 支付时间 |
| scan_direction | Selection | `b_scan_c`（收银员扫顾客）/ `c_scan_b`（顾客扫收银台聚合码） |
| poll_status | Selection | `idle`/`polling`/`success`/`timeout`，C扫B 专用 |
| config_id | Many2one | `pos.config`，related order（聚合码待确认记录按 config 轮询） |
| refund_amount | Monetary | 退款金额（第二版原路返回） |
| refund_status | Selection | `none`/`processing`/`refunded`/`failed` |

**关键决策**：
- `payment_method` 用 Selection 不用 Many2one `pos.payment.method`，与 Odoo 原生支付方式解耦
- 第一版 `pay_status` 默认 `pending`，收银员手点"已到账"确认。第二版接 API 时自动化
- 聚合码场景：`scan_direction='c_scan_b'` + `poll_status` 状态机，记录由顾客扫码提交后创建

### 3.4 pos.config 扩展（inheritance）

| 字段 | 类型 | 说明 |
|---|---|---|
| receipt_header | Char | 小票头部名称 |
| receipt_phone | Char | 小票联系电话 |
| receipt_address | Char | 小票地址 |
| receipt_footer | Char | 小票底部提示，默认"退换货请凭小票7日内办理" |
| receipt_paper_width | Selection | `58`/`80`，默认 `80` |
| cashier_name | Char | 收银台名称 |
| aggregate_qrcode_enabled | Boolean | 启用聚合码支付，默认 True |

### 3.5 集成点

**与 zhao_member**：
- 会员查询：service 调 `zhao.member` 按 `mobile` 查询，返回 `id`/`name`/`mobile`/`level_id`/`level_name`/`level_discount_rate`
- 会员价应用：service 调 `zhao.member.level.discount` 按 `(product_tmpl_id, level_id)` 查商品级折扣率；无配置时用 `level.discount_rate` 等级默认折扣
- 折扣率语义：88=88折，`price = original * (discount/100)`（与 zhao_member 完全一致）
- **不做积分扣减/累加**（待 `zhao_member_points` 模块实现）

**与 zhao_pos_shift**：
- 开班：复用 `pos.session.action_pos_session_open()` 原生开班流程
- 订单关联：订单创建时 `session_id` 自动取当前进行中的 session
- 交班对账：查 `zhao.market.pos.order` where `session_id=X`，调 `pos.session.action_pos_session_closing_control()` 关闭

**事务边界**：订单创建 + 明细 + 支付记录在同一个 Odoo 事务内，任一失败全部回滚（`env.cr.savepoint()`）。

### 3.6 已知限制

- 税额计算简化：第一版 `price_subtotal_incl = price_subtotal`，不接入 `product.taxes`
- 不对接会计：`zhao.market.pos.order` 不生成 `account.move`
- 无离线：断网时订单提交失败，前端提示
- 无积分：MVP 不做积分扣减/累加，字段预留

## 4. Controller API 设计

### 4.1 端点列表

所有 endpoint 走 `/zhao_market_pos/v1/<action>`，统一 JSON 交互，CSRF header 必带。

| 端点 | 方法 | 入参 | 出参 |
|---|---|---|---|
| `/v1/session/current` | GET | - | `{session_id, config_id, shift_id, salesman}` |
| `/v1/session/open` | POST | `{config_id}` | `{session_id}` |
| `/v1/session/close` | POST | `{session_id}` | `{summary}` |
| `/v1/products` | GET | `?category_id&barcode&search&page` | `{items[], total}` |
| `/v1/categories` | GET | - | `{tree[]}` |
| `/v1/member/lookup` | GET | `?mobile` | `{member_id, name, mobile, level_id, level_name, level_discount_rate}` |
| `/v1/member/product_price` | GET | `?member_id&product_tmpl_id` | `{discount_rate, price}` |
| `/v1/order/submit` | POST | `{order_payload}` | `{order_id, name}` |
| `/v1/order/hold` | POST | `{order_id, hold_key}` | `{ok}` |
| `/v1/order/resume` | POST | `{hold_key}` | `{order_payload}` |
| `/v1/order/refund` | POST | `{order_id, lines[]}` | `{refund_order_id}` |
| `/v1/shift/summary` | GET | `?session_id` | `{orders, payments, warnings}` |
| `/v1/payment/pending` | GET | `?config_id` | `{items[]}`（聚合码待确认列表） |
| `/v1/payment/confirm` | POST | `{payment_id}` | `{ok}`（收银员手点确认） |

### 4.2 关键约束

1. 所有写操作走 controller，不从前端直接调 `/web/dataset/call_kw`，CSRF 风险收敛到 controller 内部
2. `pos_service.py` 是 controller 与 Odoo 模型的唯一中介
3. 订单提交是单一事务，`/v1/order/submit` 内部调 `pos_service.submit_order()`
4. 聚合码支付采用"提交时统一创建"：收银员先选支付方式→（聚合码场景）等待顾客扫码→手点确认→一次性 submitOrder 含所有 payment_ids

### 4.3 pos_service 方法签名

```python
class PosService:
    def __init__(self, env): self.env = env
    def get_current_session(self, user_id) -> dict
    def open_session(self, config_id, user_id) -> int
    def close_session(self, session_id) -> dict
    def search_products(self, category_id, barcode, search, page) -> dict
    def get_category_tree(self) -> list
    def lookup_member(self, mobile) -> dict
    def get_member_product_price(self, member_id, product_tmpl_id) -> dict
    def submit_order(self, payload, session_id, user_id) -> dict  # 单一事务
    def hold_order(self, order_id, hold_key) -> bool
    def resume_order(self, hold_key) -> dict
    def refund_order(self, order_id, lines) -> dict
    def get_shift_summary(self, session_id) -> dict
    def get_pending_payments(self, config_id) -> list  # 聚合码待确认列表
    def confirm_payment(self, payment_id) -> bool  # 收银员手点确认
    def create_pending_payment(self, config_id, amount, pay_code) -> int  # 顾客扫码提交
```

## 5. 前端状态机设计

### 5.1 Pinia Stores

**cartStore（购物车）**：
- `lines: CartLine[]`、`member: Member | null`、`orderType`、`isHeld`
- actions: `addLine`、`updateLine`、`removeLine`、`applyMember`、`clear`

**pendingStore（挂单队列）**：
- `orders: HeldOrder[]`
- actions: `hold(holdKey)`、`resume(holdKey)`、`remove(holdKey)`

**paymentStore（支付）**：
- `amountTotal`、`amountPaid`、`amountChange`、`payments[]`、`currentMethod`
- 聚合码：`pendingList[]`、`polling`、`selectedPendingId`
- 状态机: `idle → pending → confirmed → 完成`

**sessionStore（交班）**：
- `sessionId`、`shiftId`、`configId`、`salesman`、`status`

### 5.2 快捷键矩阵

| 键 | 上下文 | 动作 |
|---|---|---|
| F1-F12 | 主界面 | 切换左侧商品分类 |
| 数字键 1-9 | 商品网格 | 选当前网格第 N 个商品 |
| 空格 | 主界面 | 挂单（弹窗输入 holdKey） |
| 回车 | 主界面 | 进入结账 |
| Delete | 购物车行选中 | 删除当前行 |
| +/- | 购物车行选中 | 增减数量 |
| F2 | 结账界面 | 切换支付方式 |
| 回车 | 结账界面 | 确认支付 |
| Esc | 任意弹窗 | 关闭弹窗 |

### 5.3 扫码枪接入

USB HID 键盘模拟型扫码枪（中国 90% 主流方案），浏览器原生 `keydown` 监听。

**分流逻辑**：
- `onScan(code)` 先查商品（`/v1/products?barcode=code`），命中则加购物车
- 未命中则当付款码处理，切到结账界面填入 `payCode`（B扫C场景）
- 会员手机号：在会员查询输入框聚焦时，扫码枪当键盘输入

**扫码特征识别**：快速连续 keydown（间隔 < 50ms）+ 末尾回车，区分人工输入与扫码枪。

### 5.4 订单提交流程（含聚合码）

```
收银员点"结账" → paymentStore 计算应付 → 选支付方式：

[现金] 收银员输入实收 → addPayment('cash', amount)
[B扫C 扫码付] 收银员扫顾客付款码 → addPayment('wechat'/'alipay', amount) + pay_code
[聚合码 C扫B] 收银员点"等待顾客扫码" → 启动轮询 /v1/payment/pending?config_id=X
              顾客扫固定码 → 跳转 /pay/<config_id> 输入金额 → 后端 create_pending_payment
              收银员看到待确认列表 → 选中匹配金额项 → 手点确认 /v1/payment/confirm
              → addPayment('mixed', amount) + poll_status='success'

所有支付方式确认后 → 前端组装 order_payload → POST /v1/order/submit
pos_service.submit_order() 单一事务：
   ├─ 创建 zhao.market.pos.order + lines + payments（含已确认的聚合码支付记录）
   └─ 提交事务
返回 {order_id, name}
前端：打印小票 + 清空 cartStore + 回到主界面
```

### 5.5 聚合码固定码方案

**收银台贴码**：每个 pos.config 一个固定聚合码，URL 格式 `/zhao_market_pos/pay/<config_id>`，二维码内容为完整 URL（如 `https://shop.example.com/zhao_market_pos/pay/3`）。

**顾客扫码后页面**（`pay_page` QWeb 模板）：
- 显示收银台名称
- 输入金额框
- 提交按钮 → POST `/v1/payment/pending/create`（前端 fetch 调用，需 CSRF）
- 后端 `create_pending_payment` 创建 `zhao.market.pos.payment` 记录（无 order_id，state=pending，config_id 关联）

**收银台前端轮询**：
- 结账界面选"聚合码"支付方式后，每 2 秒调 `/v1/payment/pending?config_id=X`
- 返回 `items[]`（state=pending 的支付记录列表）
- 收银员选中金额匹配的项 → 点"确认到账" → POST `/v1/payment/confirm`
- 后端更新 `pay_status='confirmed'` + `pay_time=now`
- 前端 `addPayment('mixed', amount)` 并关闭轮询

**注意**：聚合码支付记录在订单提交前是无 order_id 的"孤儿"记录，submit_order 时由后端关联到新订单。

## 6. 交班对账单

### 6.1 数据结构（`/v1/shift/summary` 返回）

```typescript
interface ShiftSummary {
  session: { id, open_time, close_time, salesman, config }
  orders: { total_count, total_amount, normal_count, refund_count, refund_amount, held_count }
  payments_by_method: { cash, wechat, alipay, mixed }  // 各含 count + amount
  warnings: string[]  // 如"有 3 单挂单未取"、"有 2 单支付待确认"
}
```

### 6.2 关键约束

1. 交班阻断：有挂单未取或支付待确认时标红警告，但**允许强制交班**（收银员确认后跳过）
2. 对账单可打印：浏览器 `window.print()` + 专用打印 CSS，A4 竖版
3. 交班后 session 关闭：调 `pos.session.action_pos_session_closing_control()`，`zhao.market.pos.order` 的 `session_id` 不变

## 7. 小票模板

### 7.1 订单小票内容

- 头部：超市名称/电话/地址（从 `pos.config` 扩展字段读取）
- 单号/时间/收银员/台号/会员信息
- 商品明细：名称/规格/数量/金额，赠品行独立显示，称重商品标重量
- 会员价/折扣行独立显示
- 应付/实付/找零
- 底部：退换货提示

### 7.2 关键约束

1. 第一版用浏览器打印：`window.print()` 会弹对话框，收银员点确认
2. 小票内容配置化：从 `pos.config` 扩展字段读取，不硬编码
3. 退货小票：金额前加"-"，标题改"退货单"

## 8. 后台菜单

### 8.1 菜单结构

- 超市POS（根菜单）
  - 收银台（`ir.actions.act_url`，新窗口打开 Vue3 页面）
  - 订单查询（`ir.actions.act_window`，Odoo 原生 tree/form，`domain=[('pos_type','=','market')]`）
  - 交班记录（`ir.actions.act_window`，Odoo 原生 tree/form）
  - 配置（pos.config 扩展视图）

### 8.2 QWeb 模板（收银台挂载页）

```xml
<template id="cashier_page" name="超市POS收银台">
    <div id="pos-app"
         t-att-data-csrf="request.csrf_token()"
         t-att-data-session-id="session_id or ''"
         t-att-data-user-id="request.env.uid"
         t-att-data-user-name="request.env.user.name"
         t-att-data-config-id="config_id or ''">
    </div>
    <script src="/zhao_market_pos/static/src/pos/pos.umd.js"></script>
</template>
```

关键：QWeb 模板极简，只渲染挂载 div + 注入 csrf/session，不进 Odoo asset bundle。

## 9. 错误处理

### 9.1 错误分类

| 类型 | 说明 | HTTP | 前端处理 |
|---|---|---|---|
| ValidationError | 参数校验失败（会员不存在/商品下架） | 4xx | Toast 提示，清空相关输入 |
| ConflictError | 并发冲突（hold_key 重复/session 已关闭） | 409 | Toast 提示，弹窗重新输入/跳转 |
| IntegrationError | 外部依赖失败 | 4xx | Toast 提示，购物车保留 |
| CriticalError | 系统错误（DB 异常） | 500 + log | Toast "系统错误"，购物车保留可重试 |

### 9.2 事务回滚铁律

订单提交核心写路径，事务边界在 `pos_service.submit_order()`：

```python
def submit_order(self, payload, session_id, user_id):
    try:
        with self.env.cr.savepoint():
            order = self._create_order(payload, session_id, user_id)
            return {'order_id': order.id, 'name': order.name}
    except PosServiceError:
        raise
    except Exception as e:
        raise IntegrationError(f"订单提交失败: {e}")
```

### 9.3 核心场景错误矩阵

| 场景 | 错误类型 | 后端 | 前端 |
|---|---|---|---|
| 会员不存在 | ValidationError | 4xx | Toast，清空会员输入 |
| 商品已下架 | ValidationError | 4xx | Toast，不加入购物车 |
| hold_key 重复 | ConflictError | 409 | Toast，重新输入 |
| session 已关闭 | ConflictError | 409 | 跳转开班页面 |
| 订单提交事务失败 | IntegrationError | 全回滚 | Toast"提交失败，请重试"，购物车保留 |
| DB 连接失败 | CriticalError | 500 + log | Toast"系统错误" |

## 10. 测试策略

### 10.1 测试分层

| 层级 | 对象 | 工具 | 覆盖 |
|---|---|---|---|
| L1 单元 | pos_service | TransactionCase | 事务回滚/金额计算/会员价/聚合码待确认 |
| L2 集成 | controller | HttpCase | 每个 endpoint 正常/异常路径 + CSRF |
| L3 E2E | 收银员全流程 | TransactionCase | 开班→加商品→会员→挂单→取单→结账（现金+聚合码）→退货→交班 |

### 10.2 测试用例清单

**L1 单元（约 18 case）**：
- 订单提交 + 事务回滚（4 case）：含回滚、挂单取单、金额计算
- 会员价应用（3 case）：等级默认折扣、商品级折扣、无折扣
- 挂单/取单（2 case）
- 会员查询（1 case）
- 商品查询（1 case）
- 交班对账单（2 case）
- 退货（1 case）
- 金额计算（2 case）
- 聚合码待确认（2 case）：创建待确认、确认后状态变更

**L2 集成（约 8 case）**：
- `/v1/order/submit` 正常/异常路径（2 case）
- `/v1/member/lookup`（1 case）
- `/v1/products`（1 case）
- `/v1/payment/pending` + `/v1/payment/confirm`（2 case）
- CSRF 防护（2 case）

**L3 E2E（1 case）**：
- 收银员一日全流程：开班→加商品→会员（应用会员价）→挂单→取单→结账（现金）→聚合码支付→退货→交班

### 10.3 测试约束

1. 事务回滚测试最高优先级：`test_submit_order_rollback` 必须通过
2. E2E 用 TransactionCase 模拟完整流程，不绕过 service
3. 前端 Vue3 第一版靠人工冒烟测试，不写自动化单测
4. 测试数据用 `TransactionCase` 自动回滚

## 11. 已知限制汇总

| 限制项 | 说明 | 计划版本 |
|---|---|---|
| 积分扣减/累加 | MVP 不做，字段预留默认 0 | 待 zhao_member_points 实现 |
| 离线兜底 | 断网时订单提交失败，前端提示 | 第二版 |
| 微信/支付宝 API 对接 | 第一版收银员手点确认到账 | 第二版 |
| 电子秤/钱箱 | 第一版人工输入重量/手点开箱 | 第二版 |
| ESC/POS 指令打印 | 第一版用浏览器打印 | 第二版 |
| 储值卡扣减 | 第二版 | 第二版 |
| 优惠券/拼团秒杀 | 第二版 | 第二版 |
| 后台销售报表 | 第一版仅交班对账单 | 第二版 |
| 会计对接 | 不生成 `account.move` | 第二版 |
| 税额计算 | 第一版简化，不接入 `product.taxes` | 第二版 |
| 前端自动化测试 | 第一版人工冒烟 | 第二版 |
| 浏览器兼容 | 仅测 Chrome/Edge | - |
| 动态聚合码生成 | 第一版用固定码贴纸 | 第二版按需 |

## 12. 部署说明

### 12.1 前端构建

```bash
cd zhao_market_pos/frontend
npm install
npm run build  # 产物输出到 ../static/src/pos/
```

构建产物 `pos.umd.js` + `pos.css` 提交到 Git，部署时不依赖 Node.js。

### 12.2 Odoo 模块安装

```bash
# 常规 Odoo 模块安装
./odoo-bin -c odoo.conf -i zhao_market_pos --stop-after-init
```

### 12.3 依赖检查

- `point_of_sale`（Odoo 原生）
- `zhao_pos_shift`（已实现）
- `zhao_member`（已实现，提供会员档案+等级+商品折扣）

### 12.4 聚合码贴纸生成

安装后，每个 pos.config 访问 `/zhao_market_pos/pay/<config_id>` 即为顾客扫码落地页。用任意二维码生成工具将此 URL 生成静态二维码贴纸贴在收银台。

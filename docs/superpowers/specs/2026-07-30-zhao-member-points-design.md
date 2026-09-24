# zhao_member_points 会员积分模块设计

- **日期**: 2026-07-30
- **状态**: 已批准（v2，修复 6 个卡点）
- **范围**: 会员积分获取/抵扣/回滚 MVP 闭环
- **关联**: zhao_member（会员主档+等级）、zhao_market_pos（收银台对接）、zhao_pos_iam（多门店隔离）

## 1. 背景与目标

### 1.1 背景

zhao_member 模块已完成 Phase 1（会员主档+实体卡+等级+折扣），但完全没有任何积分字段、模型或业务逻辑。zhao_market_pos 订单模型（`zhao.market.pos.order`）已预留 `member_points_used`/`member_points_earned` 字段（默认 0）和 `member_level_id` 等级快照字段，等待积分模块对接。

**关键事实**（v2 修正）：`zhao_market_pos` 是完全独立的自建订单系统，**不创建 Odoo 原生 `pos.order`**，不调用 `action_pos_order_paid` 钩子。因此本模块不能依赖 Odoo 原生 POS 订单流程，必须通过 `points_service` 显式 API 由 `zhao_market_pos` 的 `pos_service` 调用。

本模块为 Phase 3，从零构建积分获取/抵扣/回滚闭环。

### 1.2 核心目标

- **消费赠积分**：订单支付后按消费额 × 等级倍率自动累加
- **积分抵扣现金**：收银台结账时可选积分抵扣部分金额
- **退货回滚**：退货时按比例回滚已获积分、返还已扣积分
- **多门店隔离**：积分流水按门店隔离，参考 zhao_member 模式

## 2. 范围

### 2.1 MVP 必做

- 积分获取：订单支付后由 `pos_service.submit_order` 显式调用 `points_service.earn_points()`
- 积分抵扣：收银台结账时选用，固定汇率 `100 积分 = 1 元`，单笔最多抵扣订单金额 50%
- 积分回滚：退货时由 `pos_service.refund_order` 显式调用 `points_service.refund_points()`
- 积分流水：完整审计记录
- 多门店隔离：参考 `zhao_member/security/member_security.xml` 自建 ir.rule

### 2.2 不做（第二版）

- 积分有效期（滚动 12 月）
- 积分兑换商品
- 活动双倍积分
- 积分转储值
- 后台积分报表
- zhao_market_pos 收银台前端积分抵扣交互（独立 spec，由 zhao_market_pos 负责）

## 3. 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 获取规则 | 消费额 × 等级倍率 | 超市主流，配置轻，1 元=1 积分，金卡 1.5 倍 |
| 抵扣规则 | 固定汇率 100 积分=1 元 | 简单透明，便于收银员心算 |
| 抵扣上限 | 单笔最多抵扣订单金额 50% | 防止积分滥用导致实付过低 |
| 余额存储 | store 字段 + history 流水 | 查询用 store 字段（性能），审计用 history（完整） |
| **获取触发点** | **`points_service.earn_points()` 显式 API** | zhao_market_pos 不创建 pos.order，无法用 action_pos_order_paid 钩子；由 pos_service.submit_order 显式调用 |
| 等级倍率快照 | 复用 `zhao.market.pos.order.member_level_id` | zhao_market_pos 已有此字段，pos_service.submit_order 创建订单时已写入 |
| 并发抵扣 | SQL 原子扣减 | `UPDATE ... SET balance=balance-X WHERE balance>=X` |
| 回滚顺序 | 先回滚获取，再返还抵扣 | 避免中间态余额为负 |
| 退货抵扣返还 | 返还到余额 | 不退款现金，只返还积分 |
| **模块边界** | **points_service 提供API，pos_service 调用** | 积分逻辑集中在 points_service，zhao_market_pos 负责调用和字段写入 |

## 4. 数据模型

### 4.1 新模型 `zhao.member.points.history`（积分流水表）

借鉴 `zhao.member.grade.log` 结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| member_id | Many2one→zhao.member | 必填 |
| market_order_id | Many2one→zhao.market.pos.order | 可空（手工调整时无订单） |
| change_type | Selection | `earn`(获取) / `deduct`(抵扣) / `refund_earn`(退货回滚获取) / `refund_deduct`(退货返还抵扣) / `adjust`(手工调整) |
| points | Integer | 变更积分数（正数加，负数减） |
| balance_after | Integer | 变更后余额（快照） |
| amount_paid | Float | 关联订单实付金额（获取规则计算依据） |
| rate_applied | Float | 实际倍率（快照） |
| warehouse_id | Many2one→stock.warehouse | 门店（多门店隔离） |
| reason | Char | 备注 |
| changed_by | Many2one→res.users | 操作人 |
| changed_at | Datetime | 时间 |

**约束**（用 `models.Constraint` 替代 `_sql_constraints`，Odoo 19 规范）：
- `member_id` 必填
- `change_type` 必填
- `points != 0`
- `balance_after >= 0`

### 4.2 扩展 `zhao.member`

新增字段：
- `points_balance` Integer（当前积分余额，store=True，默认 0）

**不使用 compute from history**：高频查询场景下 store 字段性能更优，history 仅作审计。余额变更时在事务内显式更新。

### 4.3 扩展 `zhao.member.level`

新增字段：
- `points_earn_rate` Float（积分获取倍率，默认 1.0，金卡可设 1.5）

### 4.4 扩展 `zhao.market.pos.order`

zhao_market_pos 已预留以下字段，本模块通过 inherit 启用：
- `member_points_used` Integer（已有，默认 0）
- `member_points_earned` Integer（已有，默认 0）
- `member_level_id` Many2one→zhao.member.level（已有，等级快照）

**本模块新增字段**：
- `member_points_deduct_amount` Monetary（积分抵扣金额，默认 0.0）

**不改 `amount_paid` compute**：`amount_paid` 是 `compute='_compute_payments'`（基于 payment_ids），积分抵扣金额作为独立字段记录，不影响支付流。收银台前端提交订单时，现金/扫码支付金额 = `amount_total - member_points_deduct_amount`，由 `pos_service` 负责计算和创建对应 payment 记录。

### 4.5 不扩展 `pos.order`

**v2 修正**：放弃扩展 `pos.order`。`zhao_market_pos` 不创建 `pos.order`，本模块所有积分数据直接挂在 `zhao.market.pos.order` 上，不经过 `pos.order` 中转。

## 5. 核心业务流程

### 5.1 积分获取（订单支付后显式调用）

```
pos_service.submit_order()  ← zhao_market_pos 已有
  → 创建 zhao.market.pos.order（state='paid'）
  → [新增] 调用 points_service.earn_points(order)
    → 查 order.member_level_id（下单时快照等级，pos_service 已写入）
    → rate = level.points_earn_rate or 1.0
    → points = floor(order.amount_paid * rate)
    → if points > 0:
        → SQL 原子加积分：UPDATE zhao_member SET points_balance = points_balance + X WHERE id = member_id
        → 查询更新后余额 new_balance
        → 创建 history(change_type='earn', points=+points, balance_after=new_balance,
                       market_order_id=order.id, amount_paid=order.amount_paid, rate_applied=rate)
        → 回写 order.member_points_earned = points
```

**边界**：
- 无会员订单（`zhao_member_id` 为空）跳过
- `amount_paid <= 0` 跳过
- `points == 0` 不创建 history（避免无意义记录）
- 等级快照为空时用默认倍率 1.0

### 5.2 积分抵扣（收银台结账时）

```
收银员选择积分抵扣 → 输入抵扣积分数
  → pos_service 调用 points_service.apply_points_deduction(member_id, points_to_use, order_amount)
    → 校验：member.points_balance >= points_to_use
    → 校验：points_to_use <= floor(order_amount * 0.5 * 100)  // 50% 上限 × 汇率
    → SQL 原子扣减：UPDATE zhao_member SET points_balance = points_balance - X
                   WHERE id = member_id AND points_balance >= X
    → 若影响行数 = 0：抛异常"积分不足或并发冲突"
    → 查询更新后余额 new_balance
    → deduct_amount = points_to_use / 100.0
    → 创建 history(change_type='deduct', points=-points_to_use, balance_after=new_balance)
    → 返回 {deduct_amount, points_used} 给 pos_service
  → pos_service 回写：
    - zhao.market.pos.order.member_points_used = points_to_use
    - zhao.market.pos.order.member_points_deduct_amount = deduct_amount
  → pos_service 创建 payment 记录时，现金/扫码支付金额 = amount_total - deduct_amount
```

### 5.3 积分回滚（退货时显式调用）

```
pos_service.refund_order()  ← zhao_market_pos 已有
  → 创建退货单（state='refund'）
  → [新增] 调用 points_service.refund_points(original_order)
    → 检查 original_order 是否已回滚（查 history 是否有 market_order_id=original_order.id 且 change_type in ['refund_earn','refund_deduct']）
    → 若已回滚：跳过，不重复回滚
    → 获取订单回滚：
        → if original_order.member_points_earned > 0:
          → points_to_deduct = original_order.member_points_earned
          → SQL 原子扣减：UPDATE zhao_member SET points_balance = points_balance - X
                         WHERE id = member_id AND points_balance >= X
          → 若影响行数 = 0（余额不足）：clamp，UPDATE ... SET points_balance = 0 WHERE id = member_id
            → 实际扣减 = 原余额，记录 warning
          → 查询更新后余额 new_balance
          → 创建 history(change_type='refund_earn', points=-actual_deducted, balance_after=new_balance)
    → 抵扣返还：
        → if original_order.member_points_used > 0:
          → points_to_return = original_order.member_points_used
          → SQL 原子加积分：UPDATE zhao_member SET points_balance = points_balance + X WHERE id = member_id
          → 查询更新后余额 new_balance
          → 创建 history(change_type='refund_deduct', points=+points_to_return, balance_after=new_balance)
    → 清零 original_order.member_points_earned / member_points_used / member_points_deduct_amount
```

**边界**：
- 回滚顺序：先回滚获取（减），再返还抵扣（加），避免中间态为负
- 余额不足回滚时 clamp 到 0（不抛异常，记录 warning）
- 已退货订单不重复回滚（检查 history）

### 5.4 手工调整（店长后台）

```
店长在会员详情页点击"调整积分"
  → 输入调整积分数（正/负）+ 原因
  → points_service.adjust_points(member_id, points, reason)
    → 校验调整后余额 >= 0
    → SQL 原子更新：UPDATE zhao_member SET points_balance = points_balance + X
                   WHERE id = member_id AND points_balance + X >= 0
    → 若影响行数 = 0：抛异常"积分不足"
    → 查询更新后余额 new_balance
    → 创建 history(change_type='adjust', points=±points, reason=reason, balance_after=new_balance)
```

## 6. 架构与模块边界

### 6.1 模块结构

```
zhao_member_points/                     # 新模块
├── __init__.py
├── __manifest__.py
│   depends: ['zhao_member', 'zhao_market_pos', 'zhao_pos_iam']
├── models/
│   ├── __init__.py
│   ├── zhao_member.py                  # inherit: 加 points_balance
│   ├── zhao_member_level.py            # inherit: 加 points_earn_rate
│   ├── zhao_market_pos_order.py        # inherit: 启用预留字段 + 加 member_points_deduct_amount
│   └── zhao_member_points_history.py   # 新模型：积分流水
├── services/
│   └── points_service.py               # 积分业务逻辑层（获取/抵扣/回滚/调整）
├── views/
│   └── points_history_views.xml        # 流水查询视图
├── security/
│   ├── ir.model.access.csv             # 权限矩阵
│   └── points_security.xml             # 记录规则（多门店隔离）
└── tests/
    ├── __init__.py
    ├── test_points_earn.py             # 获取测试
    ├── test_points_deduct.py           # 抵扣测试
    └── test_points_refund.py           # 回滚测试
```

### 6.2 模块边界

1. **`points_service.py` 是积分业务逻辑层**（类比 `pos_service.py` 模式），所有积分变更逻辑集中在此，使用 SQL 原子操作保证并发安全
2. **zhao_market_pos 的 `pos_service.py` 调用 `points_service`**：`submit_order` 调 `earn_points`，`refund_order` 调 `refund_points`，结账时调 `apply_points_deduction`
3. **不依赖 Odoo 原生 POS 钩子**：zhao_market_pos 是独立订单系统，不创建 pos.order，积分获取由 pos_service 显式调用
4. **多门店隔离参考 `zhao_member/security/member_security.xml` 模式自建 ir.rule**：domain_force 用 `[('warehouse_id', 'in', user.zhao_warehouse_ids.ids)]`（`zhao_warehouse_ids` 由 `zhao_pos_iam` 提供）

### 6.3 对接点

| 对接方 | 方式 | 说明 |
|--------|------|------|
| zhao_member | inherit zhao.member | 加 points_balance 字段 |
| zhao_member | inherit zhao.member.level | 加 points_earn_rate 字段 |
| zhao_market_pos | inherit zhao.market.pos.order | 启用预留字段 + 加 member_points_deduct_amount |
| zhao_market_pos | pos_service 调用 points_service | submit_order 调 earn_points，refund_order 调 refund_points |
| zhao_pos_iam | 复用 zhao_warehouse_ids 字段 | 多门店隔离规则依赖 |

### 6.4 zhao_market_pos 需配合的改动（独立 spec）

本模块只提供 points_service API，zhao_market_pos 需配合以下改动（由 zhao_market_pos 独立 spec 负责）：
- `pos_service.submit_order` 末尾调用 `points_service.earn_points(order)`
- `pos_service.refund_order` 末尾调用 `points_service.refund_points(original_order)`
- 结账时调用 `points_service.apply_points_deduction` 并回写订单字段
- 收银台前端加积分抵扣交互

## 7. 风险点与缓解

| 风险 | 缓解 |
|------|------|
| 并发抵扣 | SQL 原子扣减 `UPDATE ... WHERE balance >= X`，影响行数=0 时抛异常 |
| 退货回滚顺序 | 先回滚获取（减）再返还抵扣（加），避免中间态为负 |
| 余额不足回滚 | clamp 到 0，不抛异常，记录 warning（避免退货流程卡住） |
| 跨模块依赖 | points_service 是纯 API 层，zhao_market_pos 调用失败不影响订单提交（try-except 包裹，记录 warning） |
| Odoo 19 适配 | 遵循 zhao_member 已验证的规范：`models.Constraint` 替代 `_sql_constraints`、`<list>` 替代 `<tree>` |
| 积分获取失败 | points_service.earn_points 失败不阻断订单（try-except，记录 warning，可手工补积） |

## 8. 测试策略

### 8.1 L1 单元测试（test_points_earn.py）

- `test_earn_points_basic`：订单支付后按消费额 × 倍率获取积分
- `test_earn_points_no_member`：无会员订单不获取积分
- `test_earn_points_zero_amount`：金额为 0 不获取积分
- `test_earn_points_level_snapshot`：用订单 member_level_id 快照倍率
- `test_earn_points_floor`：积分向下取整（floor）
- `test_earn_points_no_level`：等级快照为空用默认倍率 1.0

### 8.2 L1 单元测试（test_points_deduct.py）

- `test_deduct_points_basic`：正常抵扣，余额扣减，返回 deduct_amount
- `test_deduct_points_insufficient_balance`：余额不足抛异常
- `test_deduct_points_over_50_percent`：超过 50% 上限抛异常
- `test_deduct_points_concurrent`：并发抵扣，第二个失败（SQL 原子扣减）
- `test_deduct_points_zero`：抵扣 0 积分抛异常

### 8.3 L1 单元测试（test_points_refund.py）

- `test_refund_points_basic`：退货回滚获取+返还抵扣
- `test_refund_points_only_earned`：仅获取无抵扣的订单退货
- `test_refund_points_only_deducted`：仅抵扣无获取的订单退货
- `test_refund_points_insufficient_balance`：余额不足回滚获取时 clamp 到 0
- `test_refund_points_already_refunded`：已退货订单不重复回滚

## 9. 不在范围内

- 积分有效期（第二版）
- 积分兑换商品（第二版）
- 活动双倍积分（第二版）
- 积分转储值（第二版）
- 后台积分报表（第二版）
- zhao_market_pos 收银台前端积分抵扣交互（独立 spec，由 zhao_market_pos 负责）
- zhao_market_pos 的 pos_service 改动（独立 spec，由 zhao_market_pos 负责）

## 10. v2 修正记录

v1 → v2 的关键修正（基于代码审查发现的 6 个卡点）：

| 卡点 | v1 设计 | v2 修正 |
|------|---------|---------|
| zhao_market_pos 不创建 pos.order | 依赖 action_pos_order_paid 钩子 | 改为 points_service.earn_points() 显式 API |
| pos.order 与 zhao.market.pos.order 无关联 | 通过 pos.order 反向同步 | 直接操作 zhao.market.pos.order，不经过 pos.order |
| zhao_company 无记录规则 | depends zhao_company | depends zhao_pos_iam，自建 ir.rule |
| zhao_member_level_id 仅 onchange 写入 | 依赖 pos.order 的 zhao_member_level_id | 复用 zhao.market.pos.order.member_level_id（pos_service 已写入） |
| 设计内部矛盾（6.2 vs 5.1） | 钩子 vs 显式调用 | 统一为显式调用 |
| amount_paid 是 compute 字段 | 回写 pos.order.amount_paid | 不改 amount_paid，用独立 member_points_deduct_amount 字段 |

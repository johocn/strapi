# Odoo 19 中国本地化收银系统：多门店权限与班次交接

- 日期：2026-07-29
- 仓库：[e:/code/odoo](file:///e:/code/odoo)
- 二开目录：[custom-addons](file:///e:/code/odoo/custom-addons)
- 目标版本：Odoo 19.0
- 模块版本：19.0.1.0.0
- 依赖基线：`zhao_pos`、`zhao_company`、`zhao_pos_receipt`、`zhao_pos_print`、`zhao_supply` 已落地（最新提交 `dcbd30d41c4`，2026-07-27）

## 1. 背景与目标

### 1.1 现状盘点

`custom-addons` 下已有 5 个 `zhao_*` 模块覆盖中国本地化收银主链路：

| 模块 | 范围 |
|---|---|
| `zhao_company` | 公司主体：统一社会信用代码、法人、税号、门店类型 |
| `zhao_pos` | POS 核心：小票抬头/尾部、手动确认收款、默认收款方式、日结支付汇总 |
| `zhao_pos_receipt` | 聚合码收款：实收=应收、客户付款时间、确认金额、备注 |
| `zhao_pos_print` | 58mm/80mm 小票打印、打印机类型 |
| `zhao_supply` | 采购/调拨本地化：供应商编码、采购类型、调拨类型中文、门店调拨 |

测试覆盖：`test_pos_flow.py`（POS 支付日结）、`test_purchase_flow.py`（采购到入库）已就位。

### 1.2 缺口

多门店运营场景下缺失：
- 班次交接（钱箱盘点、长款/短款处理、店长确认）
- 多门店权限矩阵（收银员只看本门店、店长管本门店、区域经理跨门店、财务不受限）

### 1.3 目标

新增 2 个独立模块：
- `zhao_pos_shift`：班次交接扩展
- `zhao_pos_iam`：多门店权限矩阵

两个模块互不依赖，可独立安装；同时安装即具备完整能力。

## 2. 架构与依赖关系

```
                     ┌─────────────────────────┐
                     │   zhao_pos (已存在)       │
                     │  pos.config/pos.session  │
                     │  pos.payment.method      │
                     └────────────┬────────────┘
                                  │ depends
                ┌─────────────────┼─────────────────┐
                ▼                                   ▼
  ┌─────────────────────────────┐    ┌─────────────────────────────┐
  │   zhao_pos_shift (新增)      │    │   zhao_pos_iam (新增)        │
  │  扩展 pos.session            │    │  扩展 res.users              │
  │  - 钱箱面额拆分 JSON         │    │  - zhao_warehouse_ids        │
  │  - 差额处理                  │    │  - zhao_role (Selection)     │
  │  - 交接备注 + 店长确认       │    │  record rules:               │
  │  - 交接动作                  │    │  - pos.config 按 warehouse   │
  │  depends: zhao_pos           │    │  - pos.session 按 warehouse  │
  └─────────────────────────────┘    │  - pos.payment 按 warehouse  │
                                     │  - pos.order 按 warehouse    │
                                     │  - stock.picking 按 warehouse│
                                     │  depends: zhao_pos, stock    │
                                     └─────────────────────────────┘
```

### 2.1 依赖关系

- `zhao_pos_shift` 仅依赖 `zhao_pos`，不动权限
- `zhao_pos_iam` 依赖 `zhao_pos` 和 `stock`（需要 `stock.warehouse` 模型）
- 两者互不依赖，可按需启用；同时安装时无冲突
- 与已有 `zhao_company`、`zhao_pos_receipt`、`zhao_pos_print`、`zhao_supply` 正交，不修改它们的字段

### 2.2 模块边界

- 不新增 `zhao.role` 模型（YAGNI）：role 用 `res.users.zhao_role` Selection 即可
- 不新增 `zhao.session.handover` 模型：交接记录复用 `pos.session` 字段（`zhao_handover_user_id`、`zhao_handover_time`、`zhao_handover_note`）
- 不引入 inter-company 规则：门店=warehouse，多门店数据共享同一账套

### 2.3 核心取舍

- **门店模型=stock.warehouse**：复用原生多门店库存隔离，pos.config 已有 `warehouse_id` 必填字段；不新增 res.company（避免多公司账套复杂度）
- **班次=pos.session**：复用原生日结/现金流逻辑；一天多班轮换通过关闭再开 session 实现
- **权限=res.users+record rule**：用 Odoo 原生 record rule 限制可见性，权限可预测；不新增配置化角色模型

## 3. zhao_pos_shift 模块设计

### 3.1 模型扩展：`pos.session`（inherit）

| 字段 | 类型 | 说明 |
|---|---|---|
| `zhao_cash_breakdown` | Json | 钱箱面额拆分，结构 `{"100": 5, "50": 10, "20": 0, "10": 0, "5": 0, "1": 0, "coin": 0.0}` |
| `zhao_expected_cash` | Float (compute) | 应缴现金，等于原生 `cash_register_balance_end`（理论期末现金）；直接引用原生字段，避免重复计算 |
| `zhao_counted_cash` | Float | 收银员实点现金 |
| `zhao_cash_diff` | Float (compute) | `zhao_counted_cash - zhao_expected_cash`，正=长款，负=短款 |
| `zhao_diff_handling` | Selection | `none`/`report`（仅记录上报）/`supply`（收银员补交）/`approve`（店长审批核销） |
| `zhao_diff_note` | Text | 差额说明 |
| `zhao_handover_user_id` | Many2one → res.users | 交接对象（接班收银员） |
| `zhao_handover_time` | Datetime | 交接时间 |
| `zhao_handover_note` | Text | 交接备注 |
| `zhao_manager_confirm_user_id` | Many2one → res.users | 店长确认人 |
| `zhao_manager_confirm_time` | Datetime | 店长确认时间 |
| `zhao_shift_state` | Selection | `draft`/`opened`/`counting`（盘点中）/`handover`（已交接待确认）/`closed` |

### 3.2 关键方法

- `action_zhao_start_counting()`：session 从 `opened` → `counting`，锁定订单创建（避免盘点时新订单窜入）
- `action_zhao_handover(user_id, note)`：session → `handover`，写 `zhao_handover_user_id/time/note`，通知接班人（内部消息）
- `action_zhao_manager_confirm()`：session → `closed`，写 `zhao_manager_confirm_user_id/time`；仅 `group_pos_manager` 可调用
- `action_zhao_report_diff(note)`：`zhao_diff_handling='report'` 时的上报动作，记录 `zhao_diff_note`

### 3.3 视图扩展

- `pos.session_views.xml`：在表单加「钱箱盘点」「差额处理」「交接信息」「店长确认」分组，状态栏加 `counting`/`handover`
- `pos.session_tree`：列表加 `zhao_cash_diff` 列（红绿着色）

### 3.4 与原生 session 关闭流程的关系

**Odoo 19 实际状态机**（经源码验证）：
- `pos.session.state` 仅有 4 个值：`opening_control` / `opened` / `closing_control` / `closed`
- 关闭链路：`action_pos_session_closing_control`（opened → closing_control）→ `action_pos_session_validate` → `action_pos_session_close` → `_validate_session`（最终 write state='closed'）
- **Odoo 19 中不存在 `action_pos_session_closing_validate` 方法**（spec 早期版本有误，已修正）

**原生现金字段**（经源码验证，`pos.session` 上）：
- `cash_register_balance_start`：期初现金（readonly）
- `cash_register_balance_end`：理论期末现金（compute）
- `cash_register_balance_end_real`：实际期末现金（readonly，收银员录入）
- `cash_register_difference`：差额（compute）
- **不存在 `closing_balance` 字段**

**zhao_pos_shift 的拦截策略**：
- 覆写 `action_pos_session_closing_control`：在 `zhao_shift_state != 'closed'` 时抛 `ValidationError("请先完成班次交接")`，阻止进入 `closing_control`
- **不覆写 `_validate_session`**（避免触碰 Odoo 复杂的账务逻辑）
- `zhao_counted_cash` 与原生 `cash_register_balance_end_real` 关系：
  - `zhao_counted_cash` 作为补充字段记录钱箱面额拆分后的总额
  - 提交盘点时 `action_zhao_start_counting` 将 `zhao_counted_cash` 同步写入 `cash_register_balance_end_real`，保持原生字段一致
  - `zhao_cash_diff` 与原生 `cash_register_difference` 含义相同但来源不同（zhao 基于面额拆分 JSON 计算），两者并存，不互相覆写

### 3.5 权限

- 不新增 group，复用 `point_of_sale.group_pos_user`（收银员）和 `point_of_sale.group_pos_manager`（店长）
- 收银员可执行 `action_zhao_start_counting`/`action_zhao_handover`/`action_zhao_report_diff`
- 店长独占 `action_zhao_manager_confirm`

## 4. zhao_pos_iam 模块设计

### 4.1 模型扩展：`res.users`（inherit）

| 字段 | 类型 | 说明 |
|---|---|---|
| `zhao_warehouse_ids` | Many2many → stock.warehouse | 可访问门店列表（空=全部，兼容管理员） |
| `zhao_role` | Selection | `area_manager`（区域经理）/`store_manager`（店长）/`cashier`（收银员）/`finance`（财务） |

### 4.2 权限规则（record rules）

| 模型 | 规则 | 适用组 | 域 |
|---|---|---|---|
| `pos.config` | 「仅本门店 POS」 | group_pos_user, group_pos_manager | `[('warehouse_id', 'in', user.zhao_warehouse_ids)]` |
| `pos.session` | 「仅本门店班次」 | group_pos_user, group_pos_manager | `[('config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]` |
| `pos.payment` | 「仅本门店支付」 | group_pos_user, group_pos_manager | `[('session_id.config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]`（`pos.payment.session_id` 是 `store=True, index=True` 的 related 字段，可直接查询） |
| `pos.order` | 「仅本门店订单」 | group_pos_user, group_pos_manager | `[('session_id.config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]`（`pos.order.config_id` 是 `store=True` 的 related 字段，也可用 `[('config_id.warehouse_id', 'in', user.zhao_warehouse_ids)]`） |
| `stock.picking` | 「仅本门店调拨」 | group_pos_user, group_pos_manager | `['\|', ('warehouse_id', 'in', user.zhao_warehouse_ids), ('warehouse_dest_id', 'in', user.zhao_warehouse_ids)]` |

**关于 `pos.config.warehouse_id` 非必填的处理**（经源码验证，Odoo 19 中该字段无 `required=True`）：
- record rule `[('warehouse_id', 'in', user.zhao_warehouse_ids)]` 当 `warehouse_id` 为 false 时该 pos.config 不会被任何普通用户看到
- **配置责任**：门店 POS 必须绑定 warehouse，否则无法被收银员看到
- `zhao_pos_iam` 在 `pos.config` 表单上加 `required=True`（通过视图 attrs，不改原生模型字段），强制二开场景下必须选 warehouse
- admin 用户（uid=SUPERUSER_ID）通过 `env.su=True` 机制 bypass record rule，能看到未绑定的 pos.config

### 4.3 全局规则避免冲突与空值行为

- 区域经理（`zhao_role='area_manager'`）通过 `zhao_warehouse_ids` 多选实现跨门店可见，不需要单独规则
- 财务（`zhao_role='finance'`）走原生 `account.group_account_invoice`，不受门店限制（需看全公司账单）
- **`zhao_warehouse_ids` 为空时的行为（重要，经源码验证）**：
  - Odoo record rule 中 `[('warehouse_id', 'in', user.zhao_warehouse_ids)]` 当列表为空时匹配不到任何记录，即"全不可见"
  - **只有 `uid == SUPERUSER_ID`（即 uid=1，admin 账户）才会通过 `env.su=True` 机制 bypass record rule**（源码位置：`odoo/orm/environments.py` 第 64-67 行 + `odoo/addons/base/models/ir_rule.py` 第 113-121 行）
  - `has_group('base.group_system')` 单独 **不** bypass record rule（`_is_admin()` 包含 group_erp_manager，但 bypass 仅看 `env.su`）
  - 普通用户若未配置 `zhao_warehouse_ids` 将看不到任何 POS 数据——这是配置责任，不是代码兜底
  - 模块安装后需在 `data/res_users_demo.xml` 或文档中明确提示：**POS 用户必须绑定至少一个门店**
  - `zhao_pos_iam` 的 `res.users` 表单校验：保存时若 `zhao_role` in (`cashier`/`store_manager`/`area_manager`) 且 `zhao_warehouse_ids` 为空，弹出 `ValidationError("请为该用户绑定至少一个门店")`

### 4.4 菜单与视图

- `res_users_views.xml`：用户表单加「门店访问」「角色」分组，权限页签内
- 不新增菜单：配置入口复用「设置 → 用户」

### 4.5 与 zhao_pos_shift 的协同

- `zhao_pos_shift.action_zhao_manager_confirm` 的调用者必须是 `pos.session.config_id.warehouse_id` 在 `user.zhao_warehouse_ids` 内（通过 record rule 自动保证，无需额外代码）

## 5. 数据流与跨模块协同

### 5.1 班次交接完整时序

```
收银员A                    pos.session                店长
   │                          │                         │
   │  开会话(opened)           │                         │
   │─────────────────────────▶│                         │
   │  接单/支付(原生)           │                         │
   │─────────────────────────▶│                         │
   │  action_zhao_start_counting                          │
   │  (counting, 锁订单)       │                         │
   │─────────────────────────▶│                         │
   │  填 zhao_cash_breakdown   │                         │
   │  填 zhao_counted_cash     │                         │
   │  compute zhao_cash_diff   │                         │
   │  选 zhao_diff_handling    │                         │
   │─────────────────────────▶│                         │
   │  action_zhao_handover(B)  │                         │
   │  (handover, 写接班人B)    │                         │
   │─────────────────────────▶│  通知店长(原生日志)      │
   │                          │────────────────────────▶│
   │                          │  action_zhao_manager_confirm
   │                          │  (closed, 写店长/time)   │
   │                          │◀────────────────────────│
   │                          │  原生 action_pos_session_closing_validate
   │                          │  (走 Odoo 日结, 不拦截)  │
   │                          │                         │
```

### 5.2 差额处理分支

| `zhao_cash_diff` | `zhao_diff_handling` | 行为 |
|---|---|---|
| 0 | `none` | 直接交接，无差额 |
| 正（长款） | `report` | 仅记录，进入交接 |
| 负（短款）小 | `supply` | 收银员补交后 `zhao_counted_cash` 更新，重算 diff；补平后交接 |
| 负（短款）大 | `approve` | 需店长审批，店长确认时记录核销 |

### 5.3 zhao_pos_iam 对 zhao_pos_shift 的隐式约束

- record rule 保证：店长只能 confirm 自己门店的 session
- 不需要 `zhao_pos_shift` 显式调用权限检查（避免重复逻辑）
- `zhao_pos_shift.action_zhao_manager_confirm` 内仅做状态校验（`zhao_shift_state == 'handover'`），权限交给 record rule

### 5.4 跨门店调拨协同（与 zhao_supply）

- `zhao_pos_iam` 的 `stock.picking` record rule 限制收银员只能看本门店出入库
- `zhao_supply` 的 `zhao_store_from`/`zhao_store_to` 字段继续用 `res.company`（不动）
- 不强行打通：跨门店调拨由总部/区域经理操作（`zhao_role='area_manager'`），收银员不可见

### 5.5 与已存在模块的边界

| 已有模块 | 关系 |
|---|---|
| `zhao_company` | 不动；门店=warehouse，公司=company，两条线 |
| `zhao_pos` | 复用 `pos.session.zhao_payment_summary`，不重复计算 |
| `zhao_pos_receipt` | 不动；支付字段独立 |
| `zhao_pos_print` | 不动；打印模板独立 |
| `zhao_supply` | 不动；调拨字段独立，record rule 仅过滤可见性 |

## 6. 错误处理与测试策略

### 6.1 错误处理（用户可读的 ValidationError）

| 场景 | 处理 |
|---|---|
| 盘点时仍有未支付订单 | `action_zhao_start_counting` 拦截：`ValidationError("还有 N 笔未支付订单，请先完成或取消")` |
| 差额未处理就交接 | `action_zhao_handover` 拦截：当 `zhao_cash_diff != 0` 且 `zhao_diff_handling == 'none'` 时报「差额 X 元未处理」 |
| 短款 `approve` 但未店长确认就关闭 | 覆写 `action_pos_session_closing_control` 拦截：`zhao_shift_state != 'closed'` 时报「请先完成班次交接」 |
| 店长确认非 `handover` 状态 | `action_zhao_manager_confirm` 拦截：「仅可确认已交接班次」 |
| 收银员尝试跨门店操作 | record rule 静默过滤，不报错（Odoo 原生行为） |
| `zhao_warehouse_ids` 配置丢失 | 普通用户保存时 `ValidationError("请为该用户绑定至少一个门店")`，强制配置 |

### 6.2 测试矩阵

**zhao_pos_shift（`tests/test_shift_flow.py` + `test_cash_diff.py`）**

| 用例 | 覆盖 |
|---|---|
| `test_01_open_to_handover` | opened→counting→handover 完整流程 |
| `test_02_manager_confirm` | handover→closed，店长确认字段写入 |
| `test_03_block_closing_without_confirm` | 未 closed 时拦截原生关闭 |
| `test_04_block_counting_with_unpaid_order` | 盘点时有未支付订单报错 |
| `test_05_cash_diff_zero` | 差额 0 直接交接 |
| `test_06_cash_diff_positive_report` | 长款 report 分支 |
| `test_07_cash_diff_negative_supply` | 短款 supply 补交后 diff=0 |
| `test_08_cash_diff_negative_approve` | 短款 approve 待店长确认 |
| `test_09_block_handover_with_unhandled_diff` | diff!=0 且 handling=none 拦截 |

**zhao_pos_iam（`tests/test_warehouse_isolation.py` + `test_role_matrix.py`）**

| 用例 | 覆盖 |
|---|---|
| `test_01_two_users_isolated` | 两个用户绑定不同 warehouse，互相看不到对方 session/order |
| `test_02_cashier_only_own_store` | cashier 只能看本门店 |
| `test_03_store_manager_own_store` | store_manager 能盘点本门店 |
| `test_04_area_manager_cross_store` | area_manager 多 warehouse 可见 |
| `test_05_finance_unrestricted` | finance 不受门店限制 |
| `test_06_empty_warehouse_blocked` | `zhao_warehouse_ids` 为空时普通用户全不可见（强制配置校验） |
| `test_07_picking_cross_store_or` | 跨门店调拨 OR 规则生效 |
| `test_08_payment_isolated` | pos.payment 按 warehouse 隔离 |

### 6.3 测试基础设施

- 复用 Odoo 19 `TransactionCase` + `@tagged('post_install', '-at_install')`，与已有 `test_pos_flow.py` 风格一致
- `setUpClass` 创建 2 个 warehouse、2 个 pos.config、2 个用户，覆盖隔离场景
- **`zhao_pos_iam` 测试基类**：使用 `odoo.addons.stock.tests.common.TestStockCommon`（位于 `e:\code\odoo\addons\stock\tests\common.py`，提供 `user_stock_user` 和 `user_stock_manager` 多用户测试 fixture；注意 Odoo 19 中不存在 `StockUsers` 类，spec 早期版本有误已修正）
- 多用户权限隔离测试需用 `self.env(user=self.user_xxx)` 切换用户上下文后查询

### 6.4 测试执行命令

```
e:\code\odoo\venv\Scripts\python.exe e:\code\odoo\odoo-bin -c e:\code\odoo\odoo.conf -d odoo_dev -i zhao_pos_shift,zhao_pos_iam --test-enable --test-tags=zhao_pos_shift,zhao_pos_iam --stop-after-init
```

### 6.5 验收标准

- 17 个用例全部 PASS（shift 9 + iam 8）
- 无 `traceback`，无 `WARNING` 级权限错误
- 模块安装无报错（`-i zhao_pos_shift,zhao_pos_iam` 退出码 0）

## 7. 关键取舍汇总

| 决策点 | 选择 | 理由 |
|---|---|---|
| 门店模型 | `stock.warehouse` | 复用原生多门店库存隔离，pos.config 已有 warehouse_id；避免多公司账套复杂度 |
| 班次模型 | 复用 `pos.session` | 复用原生日结/现金流逻辑，避免与 Odoo 19 原生 closing 逻辑冲突 |
| 权限模型 | `res.users` + record rule | Odoo 原生 record rule 可预测；不新增配置化角色模型 |
| 模块切分 | 双模块（shift + iam） | 与现有 `zhao_pos_*` 模块粒度一致；班次与权限正交，独立演进 |
| 交接记录 | 复用 pos.session 字段 | YAGNI；不新增 handover 模型 |
| 错误提示 | `ValidationError` | 保持 Odoo 原生交互风格，不引入 alert/wizard |
| `zhao_warehouse_ids` 为空 | 普通用户全不可见，admin bypass | 强制配置责任；admin 通过 Odoo 原生 bypass 机制兜底 |
| shift 模块权限检查 | 不显式检查，依赖 iam record rule | 模块解耦；但要求两个模块同时安装才有完整能力 |

## 8. 不在范围内（YAGNI）

- 微信/支付宝官方接口直连（沿用 `zhao_pos_receipt` 聚合码手动确认）
- 增值税电子发票（金税/电子发票接口）
- 会员/储值/积分
- 离线模式
- 硬件集成（扫码枪/电子秤/钱箱驱动）
- 促销引擎
- 一天多班轮换（通过关闭再开 session 实现，不引入子班次表）
- 配置化角色模型（`zhao.role`）
- 交接记录独立模型（`zhao.session.handover`）

## 9. 卡点验证记录（2026-07-29 源码核验）

生成实施计划前对 Odoo 19 源码逐项核验，修正 6 处 spec 早期假设错误：

| # | spec 早期假设 | Odoo 19 实际 | 修正措施 |
|---|---|---|---|
| 1 | `pos.config.warehouse_id` 必填 | 非必填（无 `required=True`，源码 `addons/point_of_sale/models/pos_config.py:180`） | 在 pos.config 表单视图加 `required=True` attrs；record rule 对未绑定 warehouse 的 pos.config 自动隐藏 |
| 2 | 存在 `action_pos_session_closing_validate` 方法 | **不存在**；实际链路 `action_pos_session_closing_control` → `action_pos_session_validate` → `action_pos_session_close` → `_validate_session`（`addons/point_of_sale/models/pos_session.py:382,407,411,418`） | 改为覆写 `action_pos_session_closing_control`；不触碰 `_validate_session` |
| 3 | `pos.session` 有 `closing_balance` 字段 | **不存在**；实际字段 `cash_register_balance_start` / `cash_register_balance_end` / `cash_register_balance_end_real` / `cash_register_difference`（`pos_session.py:61,64,58,69`） | `zhao_expected_cash` 直接引用 `cash_register_balance_end`；`zhao_counted_cash` 同步写入 `cash_register_balance_end_real` |
| 4 | admin 通过 `has_group('base.group_system')` bypass record rule | **错误**；只有 `uid=SUPERUSER_ID`（env.su=True）才 bypass（`odoo/orm/environments.py:64-67` + `odoo/addons/base/models/ir_rule.py:113-121`） | 明确文档：仅 uid=1 才 bypass，`group_system` 单独不 bypass |
| 5 | 存在 `StockUsers` 测试基类 | **不存在**；实际是 `TestStockCommon`（`addons/stock/tests/common.py:9`，提供 `user_stock_user`/`user_stock_manager`） | 改用 `TestStockCommon` 或自建多用户 fixture |
| 6 | `pos.payment.session_id` 需通过 order 间接查询 | `related='pos_order_id.session_id'` 但 `store=True, index=True`（`addons/point_of_sale/models/pos_payment.py:28`），可直接查询 | record rule 直接用 `[('session_id.config_id.warehouse_id', 'in', ...)]`，无需经 order |

**其他已验证事实**：
- `pos.session.config_id` 存在且必填（`pos_session.py:32-35`）
- `pos.order.session_id` 存在（`pos_order.py:319`），`pos.order.config_id` 是 store=True 的 related 字段
- `group_pos_user` 和 `group_pos_manager` 均存在（`addons/point_of_sale/security/point_of_sale_security.xml:8,13`），Odoo 19 引入 `res.groups.privilege` 概念
- `pos.session` 无 `payment_ids` 字段，必须通过 `order_ids.payment_ids` 间接访问（与 zhao_pos 模块注释一致）

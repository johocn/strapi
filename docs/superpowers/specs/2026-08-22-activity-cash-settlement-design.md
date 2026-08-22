# 讲师/场地费用结算 + 现金报名费 设计文档

**日期：** 2026-08-22
**方向：** 运营效率提升 · 讲师/场地费用结算
**最小闭环：** 活动现金项（报名收费 + 讲师费 + 场地费）纳入台账，形成"积分 + 现金"双向经营台账与结算记录

---

## 背景与目标

既有 `activity-ledger` 台账只覆盖积分口径（应收报名积分、签到发放、裂变奖励、净积分），无现金项。线下活动实际存在三笔现金往来：
1. **现金报名收费**（部分活动按现金收费或积分+现金并存）；
2. **讲师费**（按场次支付讲师现金报酬）；
3. **场地费**（按场次支付场地现金租金）。

目前三类现金均无系统记录，财务无法核对"活动大概收了多少、该付讲师和场地多少"。本闭环把三笔现金项纳入活动台账，形成与积分台账并行的现金口径，并产出**结算记录**供运营登记付款。

> 记账不收款（线下自收）：现金报名收入仅记应收/实收，**不接入第三方支付**，与项目「少依赖/最小配置」原则一致。真正收款走线下。

**范围外（后续排期）：** 接入第三方支付收款、讲师/场地按小时计费复杂模板、跨活动经营汇总。

---

## 架构（最简模型，复用现有台账）

- **不新增现金结算独立集合**。在既有 `activity-ledger` 快照上**扩展现金字段**，同一张快照内并出"积分四维 + 现金三维"，生成逻辑对齐现有 `generate()`，自动/手动触发机制完全复用。
- 现金报名费落在 **activity** 上（`cashPrice`），讲师/场地费用落在**主档**上（`cashFee`，按场次），活动生成快照时读取并快照固化。
- 结算记录由 ledger 派生：`ledger` 新增 `settleStatus`（未结/已结）+ `settledAt` + 现金明细 detail 含讲师/场地/报名收入，运营在「经营对账」页登记付款。

## 数据模型变更

### 1) lecturer（主档）—— 加结算字段

```json
"cashMode":     { "type": "enumeration", "enum": ["none","flat"], "default": "none" },
"cashFee":      { "type": "decimal", "default": 0 }
```
`cashMode=none` 表示按活动登记结算（每场在活动上单独登记金额）；`flat` 表示固定场次费 `cashFee`。灵活覆盖"固定价 + 每场手填"两种。

### 2) venue（主档）—— 加结算字段

```json
"cashMode":     { "type": "enumeration", "enum": ["none","flat"], "default": "none" },
"cashFee":      { "type": "decimal", "default": 0 }
```
语义同讲师。

### 3) activity —— 加现金报名费 + 结算登记

```json
"cashPrice":     { "type": "decimal", "default": 0 },   // 现金报名费(元)，0=不收现金
"settleLecturer": { "type": "decimal", "default": 0 },  // 本场实际讲师费(元)
"settleVenue":    { "type": "decimal", "default": 0 },  // 本场实际场地费(元)
```
`settleLecturer/settleVenue` 允许运营每场登记实际应付金额；缺省时回退到主档 `cashFee`（`cashMode=flat`），兼顾灵活性。

### 4) activity-ledger —— 扩展现金口径

```json
"cashRevenue":   { "type": "decimal", "default": 0 },  // 应收现金报名
"cashExpense":   { "type": "decimal", "default": 0 },  // 应付讲师+场地
"cashNet":       { "type": "decimal", "default": 0 },  // 现金净额 应收-应付
"settleStatus":  { "type": "enumeration", "enum": ["pending","settled"], "default": "pending" },
"settledAt":     { "type": "datetime" }
```

## 取数口径（现金三维）

| 项 | 字段 | 口径 |
|---|---|---|
| 现金应收报名 | `cashRevenue` | active 报名数 × `activity.cashPrice`（现金按单价计，不细分到每人支付状态） |
| 讲师费 | 并入 `cashExpense` | `activity.settleLecturer`（>0 用之，否则回退 `lecturer.cashFee` 当其 cashMode=flat） |
| 场地费 | 并入 `cashExpense` | `activity.settleVenue`（>0 用之，否则回退 `venue.cashFee` 当其 cashMode=flat） |
| 现金净额 | `cashNet` | `cashRevenue − cashExpense` |

- `cashPrice` 为 0 时 `cashRevenue=0`（不重复计已有的积分 recharge；现金与积分是两种口径，互不折算）。
- 讲师/场地未配置（无资源关联）则该笔为 0。

## detail 结构扩展

```jsonc
"detail": {
  "signups":   [...],  // 既有
  "attendees": [...],  // 既有
  "referrals": [...],  // 既有（积分）
  "cash": {
    "revenuePer": { "cashPrice": 0, "activeCount": 0 },
    "lecturer": { "cost": 0, "source": "activity|lecturer|none" },
    "venue":    { "cost": 0, "source": "activity|venue|none" }
  }
}
```

## 结算登记

运营在「经营对账」页把某活动某快照标记"已结算"：
- `PUT /adm/ledgers/:id/settle`（body: `settleStatus`）→ 置 `settleStatus/settledAt`，登记付款完成。
- 不新增付款流水表（记账不收款，快照外环节由线下完成）。

## 组件与边界

- **服务**：`activity-ledger` service 的 `generate()` 扩展计算现金三维 + detail.cash + 派生 settleLecturer/Venue 回退；新增 `settle()` 方法。
- **activity 服务**：`adminCreate/adminUpdate` 该字段随 schema 自动写入，无需特殊逻辑。
- **控制器/路由**（channelScope，管理端）：
  - `PUT /adm/ledgers/:documentId/settle` → `ledger.settle`
- **web**：「经营对账」页现金三列 + 讲师/场地费 source 标注 + "标记已结算"按钮；活动外设现金报名费/结算费的输入。
- **C 端（shao）**：本闭环不涉及 C 端；活动详情页可展示"票价¥N + 积分N"（可选，非必须）。

## 验收（端到端）

`scripts/accept-activity-settlement.cjs`，`PREFIX='acs_'`，覆盖：
1. 造讲师(cashMode=flat/cashFee=200) + 场地(flat/cashFee=100) + 活动(现金报名 cashPrice=50，关联讲师/场地；3 名 active 报名)。
2. 手动脉冲快照 → 断言 ledger：
   - `cashRevenue=150`（3×50）
   - `cashExpense=300`（讲师 200 + 场地 100，均回退主档）
   - `cashNet=-150`
   - `detail.cash.lecturer.source=lecturer`、`venue.source=venue`
3. 活动上单独登记 `settleLecturer=250` → 重归档 → `cashExpense=350`（250+100），source=activity。
4. `PUT settle` 置 settled + settledAt 非空；幂等不重复。
5. 清理：DELETE lecturers/venues/activities/ledgers/signups where PREFIX 对应；断言零残留。

## 收口约定

- 新增 controller 方法须同步注册 `controllers/index.ts`（ledger 已注册，补 settle 方法即可）。
- 改 TS/JSON 后重建插件 dist：`cd plugins/zhao-point && npm run build`；插件 `dist/` 提交；根 app `dist/` 用 `git restore dist/`。
- schema 加字段 dev 会重生成 `types/generated/contentTypes.d.ts`，随功能提交。
- 收口前停 dev、`git restore dist/`、清理临时脚本，三仓库干净并 push。
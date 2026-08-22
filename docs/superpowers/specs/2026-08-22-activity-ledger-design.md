# 经营复盘·对账归档 设计文档

**日期：** 2026-08-22
**方向：** 经营复盘·对账归档
**最小闭环：** 活动收支对账 + 归档快照（二合一）

---

## 背景与目标

线下活动体系当前以「积分经济」为主：报名按费用档扣积分（`pointsCost`/`feeTiers`/`feeFactors`），签到时发放到场奖励积分（`activity_attend`），分享裂变发放奖励积分（`activity_referral_rewards`）。但目前缺乏一个统一的、不可变的「活动经营台账」，财务/运营难以对一个活动的账实情况（应收 vs 应付）做核对，且历史数据一旦被改无法追溯。

本最小闭环：**活动结束时自动生成不可变归档快照**，固化报名/到场/收支四项；运营可手动重归档；管理端新增「经营对账」页按活动核对账实。

> 范围外（后续排期）：讲师/场地费用结算（现金分账）、跨活动经营口径汇总看板、现金价格扩展。本闭环不引入现金口径。

---

## 架构

- 新增独立 content-type：`activity-ledger`（活动台账/快照，`collectionName: activity_ledgers`），每活动一行，内嵌 json 明细，**不侵入现有集合**。
- 生成触发：既有 activity service 在 `status` 转为 `ended` 时自动生成一张快照；另新增 admin 手动端点支持补快照/重归档（snapshotNo 递增，不覆盖旧快照，保留可追溯）。
- 管理端：web 新增「经营对账」页，按活动列示全部快照，展示四项 + 明细展开 + 手动重归档。
- 无调度依赖（自动触发走活动状态变更既有链路）。

## 数据流

1. 活动 `status → ended`（或运营手动归档）→ 调 `activityLedger.generate(activityId)`。
2. generate 内部并行取数，计算四项，落库一张 `activity-ledger`（snapshotNo = 该活动已有序号 + 1）。
3. 管理端「经营对账」页读取所有 ledger（按活动/快照），展示四项与明细。

## 组件与边界

- `activity-ledger` content-type（schema）：独立集合，包含 `activity` 关系、`documentId` 冗余、`snapshotNo`、`generatedAt/generatedBy`、四项标量、`detail`/`summary` json。
- `activityLedger` service：`generate()`（计算 + 落库）、`list()`（管理端查询）、`regenerate()`（手动重归档 alias of generate）。
- activity service：`status→ended` 钩子内调用 generate。
- 控制器/路由：admin 端 `GET /ledgers`、`POST /ledgers/:documentId/generate`（管理端触发重归档）。
- web「经营对账」页：列表 + 明细展开 + 重归档按钮。

## 四项取数口径（核心）

| 项 | 字段 | 口径 |
|---|---|---|
| 应收报名积分 | `revenuePoints` | `activity_signups` 本活动 `status=active` 的 `pointsCharged` 求和（去候补/取消） |
| 签到发放积分 | `signinCostPoints` | `activity_attend` 积分规则当前分值 × 本场到场且 `pointsGranted=true` 人数 |
| 裂变奖励积分 | `referralCostPoints` | `activity_referral_rewards` 本活动 `points` 求和 |
| 净收支/毛利 | `netPoints` | `revenuePoints − signinCostPoints − referralCostPoints` |

**口径声明：**
- 应收报名积分以 signup 实际 `pointsCharged` 落账为准（feeCollectAt 仅影响扣分时机，聚合口径一致）。
- 签到发放积分为「规则分值 × 到场数」估算口径（非流水精确值）。因当前 `grantPoints(userId,"activity_attend")` 落流水无活动 orderId 归属，历史存量也无法精确定位。此口径在对账页标注「估算」。若需精确，需改造发放逻辑加活动归属（后续排期，不属本闭环）。

## detail / summary json 结构

```jsonc
// summary（快照冗余，防活动删除后失联）
{
  "signupCount": 0,    // active 报名数
  "attendedCount": 0,  // pointsGranted=true 到场数
  "cancelledCount": 0, // cancelled 数
  "waitingCount": 0    // waiting 候补数
}

// detail（可折叠展开的明细行）
{
  "signups": [ { "userId": 0, "userName": "", "pointsCharged": 0 } ],   // active 报名
  "attendees": [ { "userId": 0, "userName": "", "points": 0 } ],        // 到场发放
  "referrals": [ { "inviterId": 0, "inviteeId": 0, "points": 0 } ]      // 裂变奖励
}
```

## 错误处理与约束

- 同活动同时触发生成（自动 + 手动）以事务内计算 + 落库保证不并发叠号（snapshotNo 读取后自增，冲突由 DB 唯一约束兜底 `(activity, snapshotNo)`）。
- `activity.endStatus→ended` 重复触发 generate 视为幂等增强：任一状态变更多次为 ended 只视为第一次自动生成？——设计决定：**每次 ended 状态变更允许再生成**，由 snapshotNo 区分；自动生成仅识别「非 ended → ended」的首次转变（用状态机判断，避免重复自动生成）。手动 generate 不受限制。
- activity 已删除时，`activity-ledger` 因 `documentId` 冗余仍可展示（自动生成发生在删除前）。

## 前端呈现（web 经营对账页）

按活动/系列分组列示全部快照（默认按 generatedAt desc），展示四项标量 + summary 数 + detail 明细展开 + 「重归档」按钮（POST generate）。不可见/只读逻辑沿用既有 admin API 鉴权。

## 测试（端到端验收）

`scripts/accept-activity-ledger.cjs`，`PREFIX='al_'`，覆盖：
1. 直插 1 个活动（draft → 转 signup_open），报名 active pointsCharged=50、取消 1 条、候补 1 条；到场 pointsGranted=true 2 人、false 1 人；裂变奖励 1 笔 30 分。
2. 手动触发生成（因不太方便触发 ended 转态，验收可直调 generate 或先置 status ended）→ 断言：
   - revenuePoints=50（仅 active 报名求和）
   - signinCostPoints = activity_attend 规则分值 × 2（仅 pointsGranted=true）
   - referralCostPoints=30
   - netPoints = 50 − signin − 30
   - summary：signupCount=1、attendedCount=2、cancelledCount=1、waitingCount=1
3. 手动重归档 → snapshotNo 递增，不覆盖旧快照。
4. 自动：构造 non-ended→ended 转态触发一次，断言自动生成一张（不会重复）。
5. 清理：DELETE activity_ledgers + activities + signups + attendances + referral_rewards where PREFIX；断言零残留。

## 验收/收口约定

- 新增 controller 须同步注册 `controllers/index.ts`（插件控制器入口），并把「注册控制器」显式列为计划 Step。
- 改 TS 后必须重建插件 dist：`cd plugins/zhao-point && npm run build`；插件 `dist/` 属有效产物需提交；根 app `dist/` 用 `git restore dist/` 还原。
- schema 加字段后 dev 会重生成 `types/generated/contentTypes.d.ts`，随功能一并提交。
- 收口前停 dev、`git restore dist/`、清理临时诊断脚本，三仓库 `git status --short` 干净并 push。
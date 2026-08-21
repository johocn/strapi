# 活动效果总览看板 · 设计文档

日期：2026-08-22
状态：已确认（方案评审通过）
范围：运营端「活动效果总览看板」，报名-到场-评价漏斗 + 积分成本/收益 + 裂变转化，活动/系列双分组，两级+展开下钻。

## 1. 目标与边界
在活动域（zhao-point）补齐"从报名到裂变的单页决策入口"，让运营一眼看清：
- 每场/每系列活动的报名→到场→评价漏斗
- 积分成本/收益（报名实收、裂变奖励发放）
- 裂变转化（分享带来的报名）
- 综合一堆汇总卡片 + 年度一页总览，可下钻到点名报名/评价/裂变明细

落点：**zhao-point**，新增 `activity-stats` service + `activity-stats` controller + 1 条管理端聚合路由。
纯查询不落库，复用 channelScope 权限与既有 `wrap` 契约。**不新增任何 content-type**。

## 2. 数据口径（已对真实 schema 核实）
| 指标 | 数据源 | 精度 |
|---|---|---|
| 报名数/到场/候补/取消/评价数 | `activity-signup`（status/attendedAt/reviewedAt） | 按活动精确 |
| 均分/NPS | signup.rating / signup.nps（仅 reviewedAt 非空计入） | 按活动精确 |
| 报名实收积分 | Σ signup.pointsCharged（feeCollectAt=signup 时已扣） | 按活动精确 |
| 裂变奖励积分/referral 数 | `activity-referral-reward`（points/activity） | 按活动精确 |
| 签到发放积分 | `point-record` where source='activity' AND method='activity_attend' | **仅全局**（point-record 无 activity 维度，不按活动展开）⚠️ |

> 约束：point-record 无 activity 关系，签到发放积分**只做顶部全局卡片**，不参与活动/系列行及下钻，避免引入 point-record 结构变更（过度设计）。

## 3. 接口契约
`GET /v1/admin/adm/activity-overview`（channelScopeRoute，action=`activity.read`）

入参：`status`（all|draft|signup_open|ongoing|ended，缺省 all）

返回 `wrap({ summary, rows })`：
- **summary**（汇总卡片）：
  - activityCount（活动数，不含草稿？含）、signupCount、attendedCount、attendanceRate（到场率%）
  - reviewCount、avgRating、avgNps、standalone/evaluated... 收敛为：活动数、总报名、总到场、到场率、评价数、均分、NPS
  - pointsChargedSum（报名实收）、referralPoints（裂变奖励）、referralCount（裂变被推带报名数）、attendPointsGlobal（签到发放全局）
- **rows**（活动+系列双分组）：每个元素：
  - `type`: `series` | `activity`（无系列单一活动；有系列的活动并入所属系列行，系列行下 detail 列场次）
  - `documentId`/`title`/`status`/`startTime`
  - 指标：signupCount / attendedCount / attendanceRate / waitingCount / cancelledCount、reviewCount / avgRating / avgNps、pointsChargedSum / referralPoints / referralCount
  - `seriesId`：type=activity 且有系列时标记；系列聚合数据并入系列行，单场仍可下钻
  - `detail`（两种）：
    - series：`[{ documentId,title,startTime, signupCount,attendedCount,reviewCount,avgRating,avgNps, referralCount }]`（场次级）
    - activity：`{ reviews:[{userName,rating,nps,review,reviewedAt}], referrers:[{userName,inviteeCount,points}], signups:[{userName,status,attendedAt}] }`（明细；量大时 signups 仅返头部若干+总数）

> 排序：系列在前（按最近 startTime desc），无系列活动随后（startTime desc）；`attendanceRate` 前段均返回已算好的百分数，前端直接展示。

## 4. 实现组件
- `services/activity-stats.ts`：聚合核心
  - `getOverview({ status })` → { summary, rows }
  - 内部：查 activities + series（过滤 channelIds 归属沿用 adminList 的"不自己过滤、靠 has-channel-scope"原则，路由级已保护）；按 activity 分组聚合 signups/referrals；series 按 belongsToSeries 归组
  - 用 entityService/documents 分页拉取 + 内存/SQL 聚合，避免大 N 全量
- `controllers/activity-stats.ts`：`overview(ctx)` 解析 status → 调 service → `wrap`
- 注册 controller 到 `controllers/index.ts`（**显式 Step**）
- 路由：`content-api.ts` 增 `channelScopeRoute("GET", "/adm/activity-overview", "activity-stats.overview", "activity.read")`

## 5. 前端（web 运营端）
新增 `src/pages/activity/overview.vue`：
- 顶部 4~6 汇总卡片（总报名/到场/到场率/评价数/均分/NPS/实收/裂变奖励，可滚动）
- 状态筛选 select（全部/草稿/报名中/进行中/已结束）
- 活动+系列双分组列表：每行 `[类型徽标] 标题 | 状态 | 时间 | 报名/到场/到场率 | 评价均分/NPS | 实收/裂变奖励 | [展开]`
  - series 类型目标加"系列"徽标；行指标为该系列聚合
  - 点「展开」在该行下展开 detail（纯前端展开，复用现有 call data 一次）
- API：`src/api/activity.js` 增 `getActivityOverview(params)`
- 路由：注册到 `pages.json` + dashboard 入口挂「活动效果」
- 前端字段以**后端返回契约**为准（见 §3）

## 6. 风险与约束
- 全局仅签到发放积分无活动维度 → 已降级全局口径（§2 约束），明确告知运营侧该卡片为全站加总
- 系列聚合需遍历场次，activities 较多时用 SQL GROUP BY（signups/referrals 按 activity_id 聚合）保证性能
- 评价均分/NPS 仅统计已评价报名，列表出现 0 条时前端显示 '-' 而非 0
- 不新增 dependencies；全部复用 strapi documents + PG 原生能力

## 7. 验收
- `scripts/accept-activity-overview.cjs` 端到端
  - 造 1 系列(2 场) + 2 无系列活动(+1 草稿) + 若干 signup（active/候补/取消/到场/评价）+ 报名实收积分 + 裂变奖励
  - 断言 summary 汇总正确、series 行聚合其场次、无系列活动独立成行、草稿按 status 过滤、attendanceRate 正确、detail 明细结构与字段契约、清理零残留
  - 3 仓库收口：basic（service/controller/路由/插件dist/spec/accept 脚本）、web（api+overview.vue+pages.json+dashboard 入口）、shao 不动

## 8. 后续可深化（本期不做）
- 活动维度积分流水（point-record 加 activity 关系）以支持按场积分成本
- ROI（积分成本 vs 复购/转介绍带来的后续积分收益）
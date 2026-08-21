# 活动后运营（三合一完整闭环）设计

> 阶段序号：十七 · 2026-08-21
> 前置：阶段十六（分享裂变）已收口。本设计在 activity.ts 既有 `closeActivity` 与 zhao-sso/sso-sop + sso-msg 之上增量补齐"活动后"链路。

## 目标

活动结束后，自动化跑通「回执 + 挽回 + 复购/转介 + 评价回收 + 运营看板」三合一完整闭环：

1. **结束自动回执**：到场用户收到感谢回执，并附评价邀请入口。
2. **未到场挽回**：报名未签到用户次日收到挽回触达。
3. **复购/转介触达**：到场用户次日收到复购/转介邀请。
4. **评价采集**：评分 `rating` + NPS `nps` + 文字 `review`。
5. **运营端看板**：评价管理 + 汇总统计。

## 现状基线与关键缺口

- `activity.ts` 已有 `closeActivity(docId)`：置 `status=ended`，并对**未到场且未取消**的报名触发 `activity.closed` 事件 + 立即 `act_revisit` 回访。
- **缺口①**：`closeActivity` 无任何 controller/route 暴露，方法从未被调用 → 活动后链路当前完全未激活。
- **缺口②**：现有触发对"到场用户"完全不发消息（回执/评价/复购均缺失）。
- **缺口③**：`activity-signup` 无评价字段，无 C 端提交接口、无管理端看板接口。

SOP 触发可用：`sso-sop.trigger(event, { user, payload, schedules })`，`schedules[].scheduledAt` / `delayMinutes` 覆盖规则默认延迟，`dedupeKey` 幂等。

## 数据模型

评价**直接挂在 `activity-signup` 上**（最简：一报名一评价天然一对一幂等，无需新增 CT）。在 [activity-signup/schema.json](file:///e:/code/basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json) 追加：

| 字段 | 类型 | 说明 |
|---|---|---|
| `rating` | integer(1-5) | 评分，可空 |
| `nps` | integer(0-10) | 净推荐值，可空 |
| `review` | text | 文字评价，可空 |
| `reviewedAt` | datetime | 提交时间（幂等/更新依据） |

约束：仅 `status=active` 的报名可评价；任意字段可空（支持只打分/只填字）。

## 触发机制（打通缺口①+③）

在 `zhao-point` 提供 **admin 关闭端点** `POST /adm/activities/:documentId/close` → 调 `activity.closeActivity`，并在其内部**扩展为活动后三合一触发**：

`closeActivity` 内，拉全部报名并按到场分队列：

- **到场用户**（`attendedAt` 非空、`status=active`）：触发
  - `act_receipt`（`scene: activity.receipt`）感谢回执 + 评价邀请 → 立即可达
  - `act_repurchase`（`scene: activity.repurchase`）复购/转介 → `delayMinutes: 1440`（次日）
- **未到场用户**（`attendedAt` 为空、`status=active`）：触发
  - `act_revisit`（`scene: activity.closed`）挽回 → `delayMinutes: 1440`（次日，由立即改为次日）

统一走 `sso-sop.trigger("activity.closed", { user: sso.id, payload:{activity:{name,startTime}}, schedules:[...] })`，模板 code 缺省回退（`sso-msg` 模板缺失降级不抛错）。

> 说明：模板/文案由 message-center（sso-msg-template）运维配置，后端只需建 job，不写死文案。

## 评价接口

- **C 端提交**（当前登录用户对活动评价）：
  `POST /v1/activities/:documentId/review`，body `{ rating?, nps?, review? }`
  逻辑：校验 `status=active` 报名存在 → upsert 到 `activity-signup`（已近示例的 `reviewedAt` 更新），返回评价结果。
  权限：`userRoute`（`activity.signup` 或等额已授权权限）。
- **管理端看板聚合**：
  `GET /adm/activity-reviews?activityDId=&page=`（admin `activity.read`），返回：
  ```json
  {
    "rows": [{ "id", "user":{name}, "rating", "nps", "review", "reviewedAt", "activity":{title} }],
    "summary": { "count", "avgRating", "avgNps", "ratingDist":[0..5], "npsPromoter", "npsPassive", "npsDetractor", "npsScore" },
    "pagination": { "page", "pageSize", "pageCount" }
  }
  ```
  NPS 计算：0-6 贬损(detractor)、7-8 中立(passive)、9-10 推荐(promoter)，`npsScore = promoter% - detractor%`。

## 前端

- **C 端（shao）**：活动详情页新增评价入口（弹层评分+NPS+文字），提交调 `/v1/activities/:documentId/review`。
- **管理端（web）**：新增 `pages/activity/review.vue`：汇总统计卡（评价数/均分/NPS/分档分布）+ 评论文本列表 + 活动筛选，调 `/adm/activity-reviews`。

## 验收

`scripts/accept-activity-post-op.cjs`，覆盖：
- close 端点置 ended + 到场/未到场分队列触发（job 建立数与 scene/templateCode/delay 断言）
- 评价提交 upsert 幂等、非 active 报名拒绝 400
- 看板 summary 统计正确（含 NPS 三档划分）
- 清理零残留

## 风险与边界

- **无 cron 自动判定活动结束**：沿用"运营手动点 close"的上限方案，不引入 cron（与现状一致，用户可用自动化 cron 规则延后扩展）。
- **触达依赖 sso 绑定**：未绑定 sso 用户跳过，验收需预插测试数据。
- **模板缺文案降级**：仅建 job，发送失败不阻断。
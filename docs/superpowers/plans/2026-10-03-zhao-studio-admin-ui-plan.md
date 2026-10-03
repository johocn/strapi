# zhao-studio Admin 运营界面补齐 — 实施计划

**日期**：2026-10-03
**关联设计**：`docs/superpowers/specs/2026-10-03-zhao-studio-publish-enhancement-design.md`（P0–P3 后端已全部落地）
**本计划目标**：把 P0–P3 的后端能力暴露为**运营可用界面**（Gap 6）。后端四阶段闭环但运营端看不到、点不到，本计划只补「看得见 + 点得动」。
**改动仓库**：`basic`（1 处后端契约修正）+ `web`（tadmin H5 前端，`johocn/strapi-backend`）

---

## 一、范围

### 1.1 做

| # | 交付 | 位置 |
|---|---|---|
| T1 | `oauth.getAuthorizeUrl` 改为返回 JSON（现为 302 redirect，浏览器跳转带不上 `Authorization` 头 → 前端拿不到授权链接） | basic `controllers/oauth.ts` |
| T2 | 前端 API 层补齐 OAuth / 定时发布 / 发布预览 | web `src/api/studio.js` |
| T3 | 发布账号页：OAuth 状态列 + 去授权 / 重新授权 / 吊销 | web `pages/studio/publish-account/` |
| T4 | 发布记录页：10 个新状态枚举 + 筛选 + 错误码 + 重试；详情页补新字段 | web `pages/studio/publish-record/` |
| T5 | 新增「定时发布」页（列表 + 取消）+ 路由 + 首页入口 | web `pages/studio/publish-schedule/`、`pages.json`、`dashboard/index.vue` |
| T6 | 发布中心：预约发布（时间选择）+ 发布预览 | web `pages/studio/publish-center/index.vue` |

### 1.2 不做

- Strapi admin panel（插件内嵌 `admin/src`）UI —— 运营实际用的是 tadmin H5，不重复造。
- RPA 真选择器（Gap 5）、小红书/头条真实发帖。
- 平台真实凭证联调（需运营提供公众号/抖音资质）。
- `media-asset` 素材资产管理。

---

## 二、后端契约（实施前实测）

| 用途 | 方法 路径（`/api/zhao-studio` 前缀） | 请求体 | 响应 |
|---|---|---|---|
| 取授权链接 | GET `/v1/admin/oauth/authorize/:accountId` | — | **T1 后** `{data:{url}}`（现为 302） |
| 授权状态 | GET `/v1/admin/oauth/status/:accountId` | — | `{ok:true,data:{oauthState,oauthExpiresAt,oauthOpenId,lastRefreshAt,platformType,accountName}}` |
| 吊销授权 | POST `/v1/admin/oauth/revoke/:accountId` | — | `{ok:true}` |
| 建定时任务 | POST `/v1/admin/schedules` | `{articleId,accountIds[],scheduledAt,name}` | `{data}` |
| 定时任务列表 | GET `/v1/admin/schedules` | — | `{data:[...]}` |
| 取消定时任务 | POST `/v1/admin/schedules/:id/cancel` | — | `{data}` |
| 发布预览 | POST `/v1/admin/publish/preview` | `{articleId,accountIds[]}` | `{data}` |
| 立即发布 | POST `/v1/admin/articles/:articleId/publish` | `{accountIds[]}` | `{data}` |
| 发布记录列表 | GET `/v1/admin/records` | query `articleId/platformId/accountId` | `{data:[...]}` |
| 记录重试 | POST `/v1/admin/records/:recordId/retry` | — | `{data}` |

**注意**：`scheduledAt` 后端强校验「必须晚于当前时间」，格式非法或过去时间直接 400。前端须预校验。
**注意**：`accountIds` 传 **documentId 数组**；`schedules` 无 PUT 路由，只有 create/list/get/cancel。

---

## 三、状态枚举（publish-record，10 值）

`pending`(手动建未入队) / `queued`(已入队) / `validating`(校验中) / `uploading_media`(上传媒体) / `publishing`(调用平台API) / `checking_status`(状态回查) / `success` / `partial_success`(多账号部分成功) / `failed`(重试耗尽) / `rejected`(平台审核拒绝)

- 可重试：`failed` / `rejected` / `partial_success`
- 进行中（只读）：`queued` / `validating` / `uploading_media` / `publishing` / `checking_status`
- 错误码：`PUB_009` 授权失效、`PUB_010` 续期失败、`PUB_011` 平台限流、`PUB_012` 审核拒绝

账号 OAuth 状态（`oauthState`）：`unauthorized` / `authorized` / `expired` / `revoked`。

---

## 四、执行记录

| 日期 | 内容 | 结果 |
|---|---|---|
| 2026-10-03 | 计划落盘 | 已完成 |
| 2026-10-03 | T1 `oauth.getAuthorizeUrl` 由 302 改返回 `{data:{url}}` | 已完成 |
| 2026-10-03 | T2 studio.js 补 `publishScheduleApi`/`publishOauthApi`/`preview`；修正 `publishArticle` body（原多套一层 `{data}` → 后端读不到 `accountIds`，会退化为向全部启用账号发布） | 已完成 |
| 2026-10-03 | T3 账号页 OAuth 状态 + 授权/重新授权/吊销；编辑页只读 OAuth 区 | 已完成 |
| 2026-10-03 | T4 记录页 10 状态映射 + 筛选 + 错误码 + 重试按钮；详情页补 `errorCode/queueStage/jobId/scheduledAt/startedAt/finishedAt` | 已完成 |
| 2026-10-03 | T5 新增「定时发布」页 + `pages.json` 路由 + dashboard 入口 | 已完成 |
| 2026-10-03 | T6 发布中心预约发布（日期+时间+任务名）+ 逐篇预览浮层；修正多选文章只建首条预约的静默丢参（改为逐篇各建一条） | 已完成 |
| 2026-10-03 | `npm run build:h5` 通过，产物含 `pages-studio-publish-schedule-list.*` | 已完成 |

**实施期修正的既有契约偏差**：
- 重试可重试状态**实际只有 `failed`**（后端 `service.retryPublish` 硬校验），`rejected`/`partial_success` 会 400 —— 前端按钮仅对 `failed` 开放。
- `listRecords` 的 `platformId` 过滤落到不存在的 `platform` 字段（后端缺陷，未修）—— 前端未依赖该过滤。
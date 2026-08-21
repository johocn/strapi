# 活动日历聚合视图 设计文档

> 状态：已确认 ｜ 日期：2026-08-21 ｜ 范围：shao C 端 + web 管理端 + zhao-point 后端

## 目标

提供一个「按月份聚合 + 惰性补齐」的活动日历聚合视图：C 端用户按月浏览未来已发布活动，管理端按月查看含草稿在内的全部场次排期。两端共享同一聚合接口，各自按状态过滤呈现月历 + 日视图。

## 约束

- 复用现有排期引擎 `generateSchedule`（滚动惰性补齐，幂等），不引入新组件/依赖。
- 惰性补齐窗口沿用系列 `schedule.generateWeeks`；超窗月的补齐走管理端手动「生成排期」，日历不越窗生成（YAGNI）。
- 按本地（东八区）日期分组，避免 UTC 跨日错位。
- C 端绝不暴露 draft 场次。

## 后端设计（zhao-point 插件）

### 服务 `calendar-service`
新增 `plugins/zhao-point/server/src/services/calendar-service.ts`，暴露 `getCalendarMonth({ month, includeAllStatus })`：

1. **惰性补齐**：查询目标月内有 `schedule` 且 `status=active` 的系列，逐个调用 `series-service.generateSchedule(seriesDocumentId)`（不传 count → 滚动补齐到 generateWeeks）。幂等：同系列同日同 startTime 已存在则跳过。
2. **按月拉取**：范围过滤 `startTime` 落在该月（本地时区）的活动。
3. **状态过滤**：`includeAllStatus=false` 仅保留 `status ∈ {signup_open, ongoing}`；`true` 返回全部（含 draft/completed/ended/signup_closed 等）。
4. **本地日分组**：按活动 `startTime` 的本地 `YYYY-MM-DD` 作为 `date` key 汇总，返回 `{ days: [{ date, activities }] }`，仅含存在活动的日；空月返回 `days: []`。
5. 每组合并进 `series` 场次与独立活动，同一日按 `startTime asc` 排序。

### 控制器/路由
- `controllers/index.ts` 注册 `calendar` 控制器。
- `routes/content-api.ts` 追加：
  - `publicRoute("GET", "/activities/calendar", "calendar.month")` — C 端，`month=YYYY-MM`
  - `channelScopeRoute("GET", "/adm/activities/calendar", "calendar.adminMonth", "series.read")` — 管理端，`month=YYYY-MM`
- C 端公开路由需加入 `PUBLIC_ROUTES` 白名单（避免游客被跳登录）。

### 响应契约
```json
GET /zhao-point/v1/activities/calendar?month=2026-09
→ { "data": { "days": [ { "date": "2026-09-14", "activities": [ { "documentId","title","startTime","endTime","venueName","status","capacity","usedCapacity","belongsToSeries" } ] } ] } }
```

## C 端（shao）

- 新增 `pages/activity/calendar.vue`：月历（6×7 格子，有活动日期标点）+ 月份切换 + 选中日下方展示当日活动卡片（复用 activity/list 卡片样式，点击跳 `/pages/activity/detail?id=<documentId>`）。
- 双入口：
  - `pages/index/index.vue` 首页加「活动日历」入口
  - `pages/activity/list.vue` 顶部加「日历」图标入口
- `services/api.ts` 增 `getActivityCalendar(month)`；`pages.json` 注册 calendar 页。
- 状态文案映射复用 activity/list 现有实现。

## 管理端（web）

- `pages/activity/list.vue` 加「日历视图」入口，新增 `pages/activity/calendar.vue`：月历 + 当日**全状态**场次（draft 用状态 tag/色标），点击可跳 `pages/activity/form` 编辑。
- `src/api/activity.js` 增 `getAdminActivityCalendar(month)`；web pages.json 注册。

## 验收 `scripts/accept-calendar.cjs`

以 `scripts/accept-series.cjs` 为模板（pg 直连 + API 走查）：
1. admin 登录拿 token。
2. 建一个带 `schedule`（如 weekdays:[1,3,5]）的 active 系列 + 若干独立活动，落同一目标月。
3. C 端日历接口：断言按月返回、分组到正确 `date`、只含 `signup_open/ongoing`（draft 不出现）、`startTime` 落在请求月。
4. 管理端日历接口：断言包含该月 draft 场次。
5. 惰性补齐：浏览某月后该系列 draft 场次 +N，且重复调用不再新增（幂等）。
6. 空月：无活动月返回 `days: []`。
7. 清理：删除测试系列 + 测试活动（含 join 表 `_lnk`），断言零残留。

## 边界与风险

- 越窗（超过 generateWeeks 的未来月）：惰性补齐不触达，归管理端手动预生成。
- 重复浏览同月：幂等，不重复建场次。
- 本地/UTC 边界：按月与按日分组统一走本地时区。
- 公开路由必须入 PUBLIC_ROUTES，否则游客被 `handleUnauthorized` 拦截。
```
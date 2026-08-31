# 省开销手动 SOP：待办列表 + 双通道提醒 设计文档

> **Goal:** 将「活动开始前后 / 回放 / 复购」等 SOP 从「自动定时轮询发送」改为「事件驱动生成待办 + 管理员手动触发发送」，同时为管理员提供后台待办列表与短信/微信主动提醒双通道，显著降低服务器固定周期开销。报名成功确认仍保持事件即时自动发送。
>
> **背景约束：** 现有 zhao-sso 的 `source=cron` 规则后端无调度消费（前端可配、永不触发），`sso-sop` 仅 `trigger`(event)/`runDueJobs`(发件扫描)。本设计不补 `runScheduledRules` 轮询，而是直接砍掉自动定时发送，改人工触发，从根源省资源。

**Architecture:** 在 zhao-sso 消息中心之上新增「手动 SOP 待办」与「管理员提醒」两层。事件埋点只做两件轻事：① 生成待办记录；② 向管理员发提醒（复用 sso-msg 通道）。真正的目标人群发送在管理员点发时实时查询并逐条 `sso-msg.buildJob`，全链路复用既有消息设施，不另起发送器/队列。

**Tech Stack:** Strapi zhao-sso 插件（`sso-sop`/`sso-msg`/cron）；uni-app web 运营端 h.joho.cn；短信/微信模板消息（复用现有 MSG 通道）。

---

## 现状核实

- `sop-rule` 内容类型已含 `source=event|cron`、`cronExpression`、`event`、`templateCode`、`scene`、`delayMinutes`、`link`、`enabled` 等字段；运营前端 `sop-rule/edit.vue` 已能配 cron 规则并全校验。
- `sso-sop.ts` 提供 `trigger()`（仅匹配 `source=event` 启用规则 + 业务 `schedules` 精确排期）、`runDueJobs()`（每分钟发送到期 job）、`resolveSsoUserForUpUser()`。
- `cron.ts` 每分钟固定只调 `runDueJobs(50)`；**无**任何按 cron 规则生成任务能力。
- `sso-msg` 已具备 `buildJob` / `sendJob` / `listPendingJobsForSend`，是唯一发送设施。
- 运营端已存在消息中心页面（`msg-template`、`msg-job`、`repurchase-leads.vue`、`sopStats.vue`），可参照其列表/路由风格新增待办页。

## 触发边界与角色

| SOP 环节 | 触发方式 | 说明 |
|---|---|---|
| 报名成功确认 `act_confirm` | 自动 | 事件 `activity.signup` 即时发，保持不变 |
| 活动前提醒 `act_before` | 手动 | 活动开始前 N 时间点生成待办，管理员手动发 |
| 未到场回访 `act_noshow_revisit` | 手动 | 活动结束事件生成待办，管理员手动发 |
| 活动回放触达 | 手动 | 活动结束事件生成待办，管理员手动发（可复用回放/资料模板） |
| 复购跟进 `activity.repurchase` | 手动 | 复购窗口到时生成待办，管理员手动发 |

> 采用「手动」的环节，除「报名成功确认」外的 SOP 一律不再自动定时发送；由事件埋点创建待办并发提醒。目的是省掉持续轮询的固定服务器开销，换取人工触发的灵活性。

## 数据模型 1：`sso-sop-manual-todo`（内容类型 manual-sop-todo）

| 字段 | 类型 | 说明 |
|---|---|---|
| code | string unique | 待办规则编码，如 `act_before` / `act_noshow_revisit` / `act_recap` / `act_repurchase` |
| title | string required | 待办标题（运营列表展示文案，含活动名/时间） |
| scene | string required | 生成 job 的 scene，如 `activity.before` / `activity.noshow` / `activity.recap` / `activity.repurchase` |
| templateCode | string | 关联消息模板（发送时 sso-msg.buildJob 使用） |
| link | string | 跳转链接（支持 `{placeholder}`，发送时渲染） |
| audience | json | **对象条件**（不存名单），如 `{ activityDocumentId, filter: "noshow" | "registered" | "recap" | "repurchase" }`。点发时据此实时查名单 |
| paramsTemplate | json | 从触发 payload 提取发送 params 的映射 |
| status | enumeration | `open` / `done` / `skipped`，默认 `open`（open 常驻防漏） |
| createdAt / doneAt | datetime | 生成/完成时间 |
| description | text | 说明 |

**关键口径：`audience` 存「条件」而非「名单」。** 管理员点发时才实时查询并逐条 `buildJob`，名单永远最新、不占存储、不引入同步。

## 数据模型 2：管理员提醒

- **通道**：两条可并存——① 后台待办列表（web 新增页，常驻查看 open 项）；② 向管理员账号发短信/微信模板消息（带直达待办链接）。
- **管理员目标解析**：提醒不发给 C 用户，走独立的管理员触达。落地方式：复用 `sso-msg` 的能力，但需明确管理员目标（下见「待确认点 R1」）。

## 编排服务 `sso-sop` 增量

```ts
// 事件埋点统一入口（扩充现有 trigger 之外的手动路径）
async enqueueManualSop(event: string, opts: {
  source: "activity.before" | "activity.closed" | "activity.recap" | "activity.repurchase";
  payload: Record<string, any>;   // 含 activityDocumentId / activity name 等
}): Promise<{ todo: any; notified: boolean }[]>
```

处理：按 `source` 匹配到一条启用的手动规则 → 据 `payload` 组装并**创建待办**（`status=open`）→ 向管理员发提醒（短信/微信，附待办直达链接）。发送目标人群不在此时处理。

```ts
// 管理员点发：按待办 audience 实时查名单并逐条 buildJob，全成功置 done
async dispatchManualTodo(todoId: number): Promise<{ sent: number; skipped: number }>
```

处理：读待办 → 按 `audience` 实时查目标 up_user 列表 → 逐条 `resolveSsoUserForUpUser` + `sso-msg.buildJob`（`dedupeKey = sopManual:{code}:{user}` 幂等）→ 完成置 `status=done`、`doneAt=now`。

## cron 调度（`cron.ts`）— 不再新增轮询

- **不新增**按 cron 规则生成任务的逻辑（砍掉 `runScheduledRules` 的必要）。
- 保留既有每分钟 `runDueJobs(50)` 用于发送已到期 job（报名确认等即时任务与管理员点发产生的 job 均由此发送）。
- 手动 SOP 的「到点生成待办」由业务事件埋点触发，非 cron 轮询；如需对**无人触达的事件**生成待办有兜底依赖，见「待确认点 R2」。

## 管理端 API 与运营 UI

- **API（zhao-sso admin 路由，复用 sso.msg 权限读/写）：**
  - `GET /sop-manual-todos`（列表，支持 status 筛选 open/done）
  - `POST /sop-manual-todos/:id/dispatch`（管理员点发）
  - `POST /sop-manual-todos/:id/skip`（跳过）
- **运营 UI（web 新增 `sso/sop-manual-todo/list.vue`）：**
  - 待办列表（标题/活动/状态/生成时间/操作）
  - 行操作「发送 / 跳过」，发送成功 toast 并刷新；open 项常驻展示
  - 可进入待办详情查看对象条件与已发数量

## 省资源的核心收益

1. **固定周期成本归零**：不引入按秒/按分钟扫描 cron 规则的轮询，空闲期服务器零 SOP 编排开销。
2. **名单不预存不预生成**：点发时实时查询，省存储、省同步、名单最新。
3. **全链路复用现有 `sso-msg`**：不另起发送器/队列/worker。
4. **低频人工触发**：真正的发送消耗只发生在管理员点下去那一刻，且一次性瞬时发生。

## 风险与约束

- **人工依赖/漏发**：待办 `open` 常驻 + 双通道提醒双重兜底；更新 `doneAt` 防大数据量重发歧义。
- **管理员触达通道**：现有 `sso-msg` 主要服务 C 用户，管理员提醒需明确目标账号与模板（R1）。
- **无用户定时事件兜底**：若某事件埋点因故未触发，待办不会生成（R2 是否需要低频兜底扫描，需权衡）。
- **不新增前端依赖**：web 铁律禁止升级 vue/新增依赖，待办页复用既有组件与路由风格。

## 待确认点（落地前收敛）

- **R1** 管理员提醒的目标如何确定、用哪条通道与模板（复用现有 zhao-sso 短信/微信能力 + 哪些管理员账号）。
- **R2** 是否需要低频兜底：对「应生成但因逻辑异常未生成」的待办做兜底扫描（低频如每小时，仍远低于每分钟轮询），或接受现状依赖事件埋点可靠性。
- **R3** 待办生成的时间点（活动开始前 N 小时 / 活动结束 / 复购窗口偏移量）的落位，沿用既有 `act_before`/`act_noshow_revisit`/`activity.repurchase` 场景语义。

## 明确不做（YAGNI / 范围外）

- 不实现 `runScheduledRules` / 不恢复 SOP 自动定时发送轮询。
- 不做秒级精度定时任务。
- 不新增任务队列/外部 worker。
- 不处理签到后「活动进行中」的实时通知（不在本轮）。
- 报名成功确认路径不改动。
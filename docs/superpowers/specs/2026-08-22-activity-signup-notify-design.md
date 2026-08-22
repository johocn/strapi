# 活动报名态提醒 设计文档

> 日期：2026-08-22 | 插件：zhao-point + zhao-sso | 前端：shao（C端）

## 背景与目标

在活动报名各生命周期状态点（报名成功、进入候补、候补转正、取消、开场前）即时触达用户。本轮最小闭环复用既有 zhao-sso 触达引擎，覆盖以下场景，触达方式为**站内短信息 + 微信模板双通道**。

复用而非重建：触达能力（消息任务、模板、频控、幂等、cron 调度）已在 zhao-sso 的 sso-msg/sso-sop/sso-quota 稳固沉淀，本功能仅在**报名动作事件点**即时调用，并新增 `inapp`（站内信）provider 落点。

## 触发方式结论

- 即时场景（报名成功/候补/转正/取消）：在 zhao-point 报名动作内**即时同步调** sso-msg 构建任务，不新增 cron 扫描。
- 开场前提醒：报名成功确认时一并 buildJob 并**指定 `scheduledAt`**（开始时间 − 提前量），由既有 `runDueJobs` cron（每 1 分钟扫到期任务）触发微信外发；站内信部分直接落已读即时可见。

## 场景映射

| 场景 | scene | 触发时机 | 触发类型 |
|---|---|---|---|
| 报名成功确认 | `activity.signup_success` | active 报名成功 | 即时 |
| 候补提醒 | `activity.waitlisted` | 进入候补（status=waiting） | 即时 |
| 转正提醒 | `activity.promoted` | 递补转正 | 即时（扩展现有 notifyPromoted）|
| 开场前提醒 | `activity.reminder` | 报名成功确认时排 scheduledAt | 定时延迟 |
| 取消确认 | `activity.cancelled` | 取消成功 | 即时 |

模板 code：`act_signup_success` / `act_waitlisted` / `act_promoted`（沿用）/ `act_reminder` / `act_cancelled`。

## 数据模型变更

### zhao-sso 侧
- **msg-job**：`provider` 枚举/取值扩展支持 `inapp`（现为 string，无约束，直接可写入，无需 schema 迁移）。
- **activity 新增字段**（zhao-point）：
  - `remindLeadMinutes`：开场前提醒提前量（分钟），默认 `1440`（1 天）；`-1` 表示关闭开场前提醒（可选，默认开启）。

### 触达参数（params）
统一传：活动标题、开始时间、地点、报名状态等。微信模板渲染字段由 `act_*` 模板的 `wxTemplateFields` 映射决定；站内信直接展示 params 结构化内容。

## 发送链路

### inapp（站内信）provider
- `sso-msg.resolveChannel` 通道注册表新增 `inapp` → `createInappChannel`：**不真正外呼**，仅标记送达。
- **立即落库即送达**：调用 `buildJob({ provider:'inapp', ... })` 后，由 zhao-point 逻辑把该 job `status` 直接置 `sent`（`sentAt=now`），C 端消息中心读取 `provider=inapp && status=sent`。不依赖 cron 轮询，即时可见。
- 站内信无需 `toTarget`；按 `user`（sso-user）归属。

### wechat 微信外发
- 维持现有链路：`buildJob({ provider default 'wechat', scheduledAt })` → cron `runDueJobs` → `sendJob` → wechat channel。频控/重试/回执沿用现逻辑。

### 双通道编排
- 每个场景一次触达产生**两条 job**：一条 inapp（即时落 sent），一条 wechat（按 scheduledAt 或即时）。
- 立即场景的 wechat job 无 scheduledAt，由下一轮 cron 发送；zhao-point 也可直接对即时场景调 `sendNow` 同步触发 wechat（推荐，保证即时性）。

## 幂等与防重

沿用 `buildJob` 的 `dedupeKey`，防重复触发（如并发转正、重复点击取消）：
- `activity:signup_success:{ssoUserId}:{activityId}`
- `activity:waitlisted:{ssoUserId}:{activityId}`
- `activity:promote:{ssoUserId}:{activityId}`（既有）
- `activity:reminder:{ssoUserId}:{activityId}`
- `activity:cancelled:{ssoUserId}:{activityId}`

站内信也走同一 dedupeKey 幂等。频控复用 sso-quota（站内信同样计入每日上限/场景冷却）。

## 前端（shao C端）

- 新增**消息中心**页：读取当前登录 sso-user 的 `provider=inapp` 消息（按 `status=sent`、`scene` 归类），支持列表展示 + 未读角标 + 点击已读。
- 首页/「我的」提供入口；消息数据经 zhao-sso（或 zhao-point）提供只读接口返回。

## 路由与接口

- C 端读站内信：`GET /api/zhao-sso/v1/my/notices?page&pageSize&unreadOnly` → `{ data: { list, unreadCount }, meta }`。
- 已读：`POST /api/zhao-sso/v1/my/notices/:id/read`（幂等）。

## 未决项（采用默认）

- 提前量：做成活动级 `remindLeadMinutes`，默认 1440（1 天），支持单活动覆盖。
- 个推：当前阶段不集成（H5 无载体），sso-msg 通道注册表保留扩展点，App 化时加 getui 通道即可。

## 风险与规避

- redirect：调 sso-msg 需 resolve sso-user，无绑定则降级（站内信按 up_user id 无 sso 时跳过 wechat，仅落站内可读 label）。
- 不因通知失败阻断报名主流程（try/catch 降级，沿用 notifyPromoted 风格）。
- 站内信落 sent 需保证与 wechat job 创建在同一 try 块，失败不阻断报名。
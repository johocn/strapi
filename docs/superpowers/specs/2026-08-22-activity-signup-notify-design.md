# 活动报名态提醒 设计文档

> 日期：2026-08-22 | 插件：zhao-point + zhao-sso | 前端：shao（C端）

## 背景与目标

在活动报名各生命周期状态点（报名成功、进入候补、候补转正、取消、开场前）即时触达用户。本轮最小闭环复用既有 zhao-sso 触达引擎，覆盖以下场景，触达方式为**站内短信息 + 微信模板双通道**。

复用而非重建：触达能力（消息任务、模板、频控、幂等、cron 调度）已在 zhao-sso 的 sso-msg/sso-sop/sso-quota 稳固沉淀，本功能仅在**报名动作事件点**即时调用，并新增 `inapp`（站内信）provider 落点。

## 触发方式结论

- 即时场景（报名成功/候补/转正/取消）：在 zhao-point 报名动作内**即时同步调** sso-msg 构建任务，不新增 cron 扫描。
- 开场前提醒：报名成功确认时一并 buildJob 并**指定 `scheduledAt`**（开始时间 − 提前量），由既有 `runDueJobs` cron（每 1 分钟扫到期任务）触发微信外发；站内信部分直接落已读即时可见。

## 场景映射（scene 命名对齐现有实现）

| 场景 | scene | 模板 code | 触发时机 | 触发类型 | 现状 |
|---|---|---|---|---|---|
| 报名成功确认 | `activity.confirm` | `act_confirm` | active 报名成功 | 即时（微信既有内嵌）| 站内信新增 |
| 候补提醒 | `activity.waitlisted` | `act_waitlisted` | 进入候补（status=waiting）| 即时 | **缺，新增** |
| 转正提醒 | `activity.promoted` | `act_promoted` | 递补转正 | 即时（notifyPromoted 既有）| 站内信新增 |
| 开场前提醒 | `activity.before` | `act_before` | 报名成功时排 scheduledAt | 定时延迟（微信既有 24h）| 站内信新增 + 提前量可配 |
| 取消确认 | `activity.cancelled` | `act_cancelled` | 取消成功 | 即时 | **缺，新增** |

## 数据模型变更

### zhao-sso 侧
- **msg-job**：`provider` 取值扩展支持 `inapp`（现为无枚举 string，直接可写入）；**新增 `readAt`（datetime）字段**支持站内信已读，schema 迁移。
- **activity 新增字段**（zhao-point）：
  - `remindLeadMinutes`：开场前提醒提前量（分钟），默认 `1440`（1 天）；`-1` 表示关闭开场前提醒。

### 触达参数（params）
统一传：活动标题、开始时间、地点、报名状态等。微信模板渲染字段由 `act_*` 模板的 `wxTemplateFields` 映射决定；站内信直接展示 params 结构化内容。

## 发送链路

### 站内信（inapp）通道 —— sso-msg 新增 `sendInApp`
- 新增方法 `sso-msg.sendInApp({ user, scene, params, link?, dedupeKey? })`：**直接落一条 provider=inapp、status=sent、sentAt=now 的 msg-job**（不经过 cron/buildJob 待发队列），即时可见、幂等（同 dedupeKey 已存在则跳过）。
- 不真正外呼；`toTarget` 置空，按 `sso-user.user` 归属。C 端读取 `provider=inapp && status=sent`。

### 微信（wechat）外发
- 维持现有链路：`sop.trigger`/`sso-msg.sendNow` 构建 wechat job → cron `runDueJobs` → `sendJob`。频控/重试/回执沿用。
- 报名成功 + 开场前（scheduledAt）既有内嵌于 signup；转正既有 notifyPromoted；**候补、取消两场景为新增**，同样走 sendNow/trigger。

### 双通道编排 —— activity service 新增 `notifyActivityState`
统一助手，各触点（signup 成功/进候补 / cancel / promoteWaiting 转正 / notifyPromoted）调用，一次完成**站内信 + 微信**：
```ts
// 伪代码：内部 = sendInApp(站内) + sop.trigger/sendNow(微信)，各 try/catch 降级不阻断报名主流程
notifyActivityState({ upUserId, activityId, scene, wxTemplateCode, inAppParams, wxParams, dedupeKey, wxScheduledAt? })
```
- **报名成功**：sendInApp(act_confirm 内容) + 微信既有 act_confirm（保持现有内嵌逻辑，仅并入站内信）
- **候补进入**：sendInApp + 微信 act_waitlisted（新增）
- **转正**：notifyPromoted 并入 sendInApp（微信既有）
- **开场前**：仅微信既有 act_before 定时 + 落一条 inapp 站内信（即时提示已预约提醒）→ 提前量改读 `remindLeadMinutes`
- **取消**：sendInApp + 微信 act_cancelled（新增）

## 幂等与防重

沿用 `sso-msg.sendInApp` 的 dedupeKey 幂等（站内信），微信侧沿用 buildJob/sendNow 的 dedupeKey：
- `activity:confirm:{ssoUserId}:{activityId}`
- `activity:waitlisted:{ssoUserId}:{activityId}`
- `activity:promoted:{ssoUserId}:{activityId}`（既有）
- `activity:before:{ssoUserId}:{activityId}`
- `activity:cancelled:{ssoUserId}:{activityId}`

频控复用 sso-quota（站内信同样计入每日上限/场景冷却）。

## 路由与接口

- C 端读站内信：`GET /api/zhao-sso/v1/my/notices?page&pageSize&unreadOnly` → `{ data: { list, unreadCount }, meta }`（读 provider=inapp && status=sent，按 sentAt desc）。
- 已读：`POST /api/zhao-sso/v1/my/notices/:id/read`（幂等，置 readAt=now，仅属主可操作）。

## 前端（shao C端）

- 新增**消息中心**页：读取 `GET /api/zhao-sso/v1/my/notices`，按 scene 分类展示列表 + 未读角标 + 点击已读。
- 首页/「我的」提供入口。

## 未决项（采用默认）

- 提前量：做成活动级 `remindLeadMinutes`，默认 1440（1 天），支持单活动覆盖。
- 个推：当前阶段不集成（H5 无载体），sso-msg 通道注册表保留扩展点，App 化时加 getui 通道即可。

## 风险与规避

- redirect：调 sso-msg 需 resolve sso-user，无绑定则降级（站内信按 up_user id 无 sso 时跳过 wechat，仅落站内可读 label）。
- 不因通知失败阻断报名主流程（try/catch 降级，沿用 notifyPromoted 风格）。
- 站内信落 sent 需保证与 wechat job 创建在同一 try 块，失败不阻断报名。
# 消息中心 + 微信公众号模板消息 · 设计文档

日期：2026-08-21
状态：待评审
范围：阶段二·消息触达的首期最小闭环 = **通道层（微信模板消息）+ 消息模板库 + 消息任务队列 + 手动/批量发送后台**。自动化 SOP 编排层不在本期实施，但在本设计中预留接口。

## 1. 背景与定位

承接阶段一一期闭环（活动报名/到场签到），平台需要在 `活动前提醒 → 未到场回访 → 课后持续学习 SOP` 等触达点向 C 端用户推送消息。为支持**跨应用复用**，消息中心落在 **zhao-sso 统一登录中心**（sso 已聚合微信 openid 绑定，天然持有触达目标身份），成为一套"跨应用可调用的消息中心"。短信/企微/APP 通道在本期只做 provider 抽象与微信模板消息实现，其余通道口预留。

## 2. 架构分层（一次设计、可逐步实现）

```
┌─ 编排层（SOP，本期不做，预留）─► 触发器(事件/定时) → 条件 → 动作序列 → 时间线
├─ 执行层（本期）─► MsgJob（待发/去重/幂等/状态机）← 同时被 手动发送 与 未来SOP 写入
├─ 通道层（本期实现微信模板消息）─► ChannelProvider 抽象，mock/wechat 实现
├─ 共用：MsgTemplate（消息模板库，微信模板ID + 参数变量映射）
└─ 触达身份：sso-third-party-binding.openid + subscribe(是否关注)标记
```

核心流程一条主线：**事件/手动操作 → 选模板 → 生成 MsgJob(待发) → 通道发送 → 回执落库 → 状态流转**。

## 3. 数据模型（新增于 zhao-sso，均 `plugin::zhao-sso`）

### 3.1 msg-template（消息模板库，SOP 与手动发送共用）
| 字段 | 类型 | 说明 |
|---|---|---|
| code | string, unique, required | 模板业务码，如 `activity_remind`，供 SOP/代码引用 |
| name | string | 模板名称 |
| provider | string, default `wechat` | 目标通道 |
| wxTemplateId | string | 微信模板消息 ID（从公众号后台申请） |
| wxTemplateFields | json | 微信模板字段名列表（`{name: 字段名, key: 数据键}`），发送时按此映射取值 |
| content | text | 面向运营的模板说明/占位示例 |
| isEnabled | boolean | 是否启用 |
| description | string | 备注 |

### 3.2 msg-job（消息任务，执行层核心）
| 字段 | 类型 | 说明 |
|---|---|---|
| user | relation→sso-user | 触达目标用户 |
| scene | string | 业务场景码 |
| template | relation→msg-template | 使用的模板 |
| provider | string, default `wechat` | 发送通道 |
| toTarget | string | 通道目标（公众号=openid；短信=手机号），发送时从 binding/user 解析 |
| params | json | 模板渲染参数（`{key: value}` 按 template.wxTemplateFields 映射成微信字段值） |
| link | string | 消息附带跳转链接(可选) |
| status | enum `pending\|sending\|sent\|failed\|cancelled` | 状态机 |
| retryCount | integer, default 0 | 重试次数 |
| nextRetryAt | datetime | 下次重试时间 |
| wxMsgId | string | 微信返回 msgid |
| result | json | 微信返回原始数据/失败原因 |
| scheduledAt | datetime | 计划发送时间（SOP 预留） |
| sentAt | datetime | 实际发送时间 |
| dedupeKey | string | 幂等键（如 `signup:123:activity_remind`），唯一防重 |

### 3.3 subscribe 标记（复用 sso-third-party-binding，不新建表）
在 `sso-third-party-binding` 增加：
| 字段 | 类型 | 说明 |
|---|---|---|
| subscribe | integer | 是否关注该公众号 `1关注 0未关注`，随登录回调查询更新 |
| subscribeAt | datetime | 关注状态更新时间 |
| subscribeCheckAt | datetime | 最后一次从微信查询 subscribe 的时间 |

> 头像/昵称已在 provider_avatar/provider_nickname。关注状态需 `sns/userinfo`（带关注参数）或在登录回调中调 `cgi-bin/user/info?openid=` 冗余查询。鉴于登录回调用 `sns/oauth2/access_token`，本期在回调里追加一次 `sns/userinfo` 获取 subscribe，落库到 binding。

## 4. 通道服务（新建 sso-msg service）

复用 zhao-sso 现有工具：`sso-oauth-config`（appId/secret）、`sso-wechat` 的 access_token 内存缓存。新增文件 `sso-msg.ts`（消息中心）+ `channel/wechat-template.ts`（通道实现），建议以 `sso-sms.ts` 的 provider 抽象为范本。

公开能力：
- `buildJob({ user, scene, templateCode, params, link, scheduledAt? })` → 校验模板+evaluate 参数+生成 dedupeKey+写 pending 任务（幂等：同 dedupeKey 未终态则跳过）
- `sendJob(jobId)` → 通道发送，成功置 sent+wxMsgId，失败置 failed+记录（支持上限重试）
- `sendNow({ user, scene, templateCode, params, link })` → 立即构建并发送（手动/单发）
- `sendBatch(criteria, ...)` → 按筛选批量创建并发送任务（手动批量发送）
- `querySubscribe(ctx/uid)` → 查询/刷新某用户公众号关注状态

通道实现（wechat-template）：
- 调 `stable_token`/`cgi-bin/token` 取全局 access_token（复用 sso-wechat.getValidAccessToken）
- `POST /cgi-bin/message/template/send`，body=`{touser: openid, template_id, url: link, data: {字段名:{value}}}`（data 由 params 按 template.wxTemplateFields 映射）
- 判 subscribe：未关注返回 43101 → job 置 failed（reason=not_subscribe）
- 支持 mock 模式（`MSG_WECHAT_PROVIDER=mock`）：不真正调微信，直接置 sent，便于本地联调

## 5. 路由 & 控制器（zhao-sso）

新增 `message-controller.ts` + `admin-message-controller.ts`：
- 管理端（需 SSO 鉴权）：
  - CRUD `msg-template`
  - `GET msg-jobs`（列表/筛选/详情）
  - `POST msg-jobs/anonymous`（手动单发，按 uid）
  - `POST msg-jobs/batch`（手动批量发送）
  - `POST msg-jobs/{id}/retry`
- 注册进现有 `routes/admin.ts`、`routes/api.ts`（对外发送能力若需跨应用调用，走 SSO 鉴权后开放）与 `controllers/index.ts`。

## 6. 管理后台（web，SSO 控制台）

- 消息模板：列表 + 新建/编辑（code/名称/微信模板ID/字段映射 JSON/启用开关）
- 消息任务：列表（状态/场景/用户/模板/时间筛选）、详情（params/link/回执/失败原因）、手动单发入口、批量发送入口、失败重试
- 关注状态：用户查询页展示 subscribe 标记

> 本期后端先行打通通道；后台 UI 可在后端接口就绪后迭代，首期后端+接口验收优先。

## 7. 与阶段三（SOP）的衔接
- 本设计的 MsgJob 与 MsgTemplate 即为 SOP 的"执行层与承载层"。
- SOP 编排只需往 MsgJob 写 scheduledAt 任务并触发 `sendJob`，无需改通道。故本期先完成执行层，SOP 后接即可复用。

## 8. 风险点与约束
- **前提**：模板消息要求认证服务号 + 用户关注 + IP 白名单（access_token 接口）。本地无法真实发送验证，用 mock 模式验证链路与幂等。
- **数据隐私**：subscribe/手机号等仅在 sso 数据域使用，不跨插件派发明文。
- **跨应用调用**：消息中心在 sso，其他应用通过 SSO token + 应用授权调用，凭 app_code 鉴权（预留）。
- **不做**：本期不做 SOP 编排、不做短信/企微/APP 通道实现（仅留 provider 抽象）、不做消息模板自动同步微信侧模板（人工在公众号后台申请 template_id）。
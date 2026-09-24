# 微信模板通知 · 配置向导链路 + 客户端测试发送 · 设计文档

日期：2026-08-23
状态：待评审
范围：为"零基础客户也能完成微信模板通知配置"提供**分步配置向导**（web 运营端 + 后台 admin 插件双端），并补齐**测试发送链路**（模板编辑页发送测试 + 消息任务页手动发送），完成后部署到 joho 服务器验证。

## 1. 背景与现状

平台已有较完整的消息中心（zhao-sso）：`msg-template`（消息模板库）、`msg-job`（消息任务）、`msg-version`（版本/AB）、微信通道 `wechat-template.ts`（含真实发送 + mock）、`sendNow`/`sendBatch`/`retryJob` 控制器，且路由已暴露到 admin。

**现状缺口：**
1. 配置说明零散、简略——web 运营端 [msg-template/list.vue](file:///e:/code/web/src/pages/sso/msg-template/list.vue) 仅一行 `help-banner`，后台 admin 插件 `WebchatTab.tsx` 仅展示模板列表。零基础客户无法照着走完整链路（公众号申请 → 绑定 → 填模板ID → 映射字段 → 测试发送 → 自动触发）。
2. 测试发送能力前端未接线——后端 `POST /msg-jobs/anonymous`（`sendNow`，权限 `sso.msg.write`）已存在，但前端无"发送测试/手动发送"入口。

**已有可复用能力（无需新增后端接口）：**
- `POST /msg-jobs/anonymous` → `message.sendNow`（入参 `userId/templateCode/params/link/scene`）
- `POST /msg-jobs/batch` → `message.sendBatch`
- `GET /users/:id/subscribe` → 查询 sso 用户公众号关注状态（`sso.user-read`）
- `GET/POST/PUT/DELETE /msg-templates` → 模板 CRUD（`sso.msg.read/write`）
- 微信公众号后台"模板消息"已添加模板列表：`WebchatTab` 的 `/v1/admin/wx/templates`

## 2. 设计目标与成功标准

- 零基础客户能在 **web 运营端** 照着分步向导走完整链路，独立完成配置。
- 后台 admin 插件提供同一链路的**简短指引**（因只展示模板列表，侧重"指引 + 跳 web 运营端"）。
- 操作者能在**模板编辑页**一键"发送测试"，选一个已关注 sso 用户，实时看到成功/失败回执。
- 操作者能在**消息任务页**直接发起"手动发送"。
- 部署到 joho 服务器（后端 basic zhao-sso + web 前端 h.joho.cn），真实微信通道验证。

## 3. 详细设计

### 3.1 配置向导面板（核心）

**web 运营端 [msg-template/list.vue](file:///e:/code/web/src/pages/sso/msg-template/list.vue#L7-L10)**
将现有 `help-banner` 升级为**可折叠分步向导面板（默认展开，可收起）**，覆盖完整链路六步：

| 步骤 | 内容 | 操作位置 |
|---|---|---|
| 1 前置准备 | 公众号为**认证服务号**；客户已**关注**公众号；已在公众号后台开启"模板消息" | 微信公众号后台 |
| 2 公众号后台操作指引 | 登录 mp.weixin.qq.com → 广告与服务→增值服务→模板消息 → 从"我的模板"选取或"从模板库添加" → 复制 **Template ID** | 微信公众号后台 |
| 3 平台配置公众号 | 填公众号 AppID / AppSecret（在后台"设置与开发→基本配置"查看，AppSecret 需重置后复制并妥善保管） | web 运营端 OAuth 配置 |
| 4 新增消息模板 | 填 `code`(唯一业务码)、`name`、`wxTemplateId`(第2步的Template ID)、`wxTemplateFields`(字段映射)、启用开关 | [msg-template/edit.vue](file:///e:/code/web/src/pages/sso/msg-template/edit.vue) |
| 5 发送测试 | 选一个已关注 sso 用户 → 填入各字段测试值 → 发送 → 看回执 | 模板编辑页「发送测试」（见 3.2） |
| 6 自动触发(可选) | 配置 SOP 自动规则 / 业务埋点，在消息任务页查看自动下发结果 | SOP 规则 + 消息任务页 |

**字段映射说明（第4步关键）**：
- `wxTemplateId` = 公众号后台复制的 Template ID（形如 `xxx_AbCd1234`）。
- `wxTemplateFields` 为 `[{key, name}]` 数组：`key` = 平台埋点传值键；`name` = 微信模板字段名（`thing1/date2/number3` 等）。发送时 `params[key] → {value}` 渲染进微信字段 `name`。
- 每条字段上方提供所见即所得示例（如 `key`="title"、`name`="thing1"）。

每个字段说明做成**可点击展开（折叠）**，非一次性长文，降低认知压力。

**后台 admin 插件 [WebchatTab.tsx](file:///e:/code/basic/plugins/zhao-sso/admin/src/pages/WebchatTab.tsx#L641-L717)（TemplateSection）**
在现有"模板消息配置"标题下方追加一段**简短向导**（步骤摘要 + 链接跳 web 运营端 h.joho.cn 对应页面），不承载完整表单，仅指引。

### 3.2 模板编辑页「发送测试」（web 运营端）

在 [msg-template/edit.vue](file:///e:/code/web/src/pages/sso/msg-template/edit.vue) 底部新增「发送测试」按钮（权限 `sso.msg.write`）。

流程：
1. 点「发送测试」弹窗。
2. 选目标 sso 用户（下拉+搜索，展示 username/昵称；提示"需已关注公众号"；可选调用 `GET /users/:id/subscribe` 预检关注状态，未关注时红字提示但允许继续以观测 43101）。
3. 按 `wxTemplateFields` 动态生成参数输入框（每个字段一个输入）。
4. 调 `POST /msg-jobs/anonymous`：`{ userId, templateCode: form.code, params: {key: 值} }`。
5. 回执展示：成功显示 `msgId`；失败显示原因（如 43101 未关注 → 提示引导关注；`isEnabled=false` → 提示先启用）。

### 3.3 消息任务页「手动发送」（web 运营端）

在 [msg-job/list.vue](file:///e:/code/web/src/pages/sso/msg-job/list.vue) 顶部新增「手动发送」入口（权限 `sso.msg.write`）：
- 弹窗：选模板（下拉，取已启用 `msg-template`）+ 选目标 sso 用户 + 填参数。
- 调 `POST /msg-jobs/anonymous` 发送，刷新列表可见新任务；失败任务可在列表沿用现有"重试"按钮。

### 3.4 目标 sso 用户选择（3.2/3.3 共用）

复用平台现有 sso 用户列表/搜索（`GET /users`，若有），选择器渲染 username/昵称/openid 标记。若现无现成可用接口，复用 admin 既有用户查询。

### 3.5 后端改动

**预期无生产后端持久化改动**（复用 `sendNow`）。仅在以下情况需要：
- 若需在发送测试弹窗做关注预检，需确认 `GET /users/:id/subscribe` 返回结构并复用（只读，无改动）。
- admin 插件 `WebchatTab.tsx` 属 zhao-sso admin bundle，改动后需 `npm run build` 重建插件 dist。

### 3.6 部署

- 后端：更新 basic 仓库 zhao-sso（源码 + admin 插件 dist）→ 上传 joho 服务器。
- web 前端：构建 h.joho.cn 运营端（`npm run build:h5`）→ 上传 joho 服务器（web/shao 目录构建物）。
- 部署后真实微信通道验证（需客户公众号已绑定 + 有已关注测试用户 + 已领取模板）。

## 4. 数据流

```
操作者(运营端) ──选模板/填参数──▶ POST /msg-jobs/anonymous(sendNow)
                                     ├─ buildJob(校验模板+renderData 映射) → 写入 msg-job(pending)
                                     └─ 通道 wechat-template.send(opts{openid,templateId,data})
                                          ├─ 真实: POST message/template/send → msgid / errcode
                                          └─ mock: 直接 sent
回执 ──▶ msg-job(status/result/wxMsgId) ──▶ 前端展示成功/失败原因
```

## 5. 风险与约束

- **真实发送前提**（不可本地规避）：认证服务号 + 用户关注 + IP 白名单（access_token 接口）。本地用 mock 验证链路；真实验证须在 joho 服务器 + 已配置公众号环境。
- **sendNow 无幂等覆盖**：测试重复点按会重复发送；发送测试入口可加"发送中"防抖，避免连发。
- **前端调用 admin 路由**：`/msg-jobs/anonymous` 走 admin 路由，web 运营端须用 sso admin token（`sso.msg.write` 权限）——需确认 web 当前登录态具备该权限点，否则测试入口对无权限角色隐藏（与既有 `hasPermission('sso.msg.write')` 模式一致）。
- **data 隐私**：params/手机号等仅 sso 数据域使用，不跨插件派发明文。
- **不做**：短信/企微/APP 通道、模板自动同步微信侧（人工在公众号后台申请 template_id）、配置后台图文截图自动生成。

## 6. 验收要点

- web 运营端：向导面板六步可见可折叠、字段说明可展开；模板编辑页可发送测试并见回执；消息任务页可手动发送并见新任务。
- 后台 admin：WebchatTab 模板区块有简短向导指引。
- 权限：无 `sso.msg.write` 的用户不显示测试/手动发送入口。
- mock 模式返回 `msgId=mock_*`；真实模式返回微信 `msgid`。
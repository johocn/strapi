# zhao-sso 微信公众号常用功能 设计文档

- 日期：2026-08-22
- 插件：`zhao-sso`（Strapi 5 插件，`e:\code\basic\plugins\zhao-sso`）
- 交付目标：在既有 SSO 微信能力之上补齐四项公众号运营功能，完成端到端验收后收口。

## 1. 背景与目标

`zhao-sso` 已具备：微信 OAuth 网页授权（公众号/开放平台/小程序/App 登录）、JSSDK 签名、关注状态查询（`querySubscribe`）、微信模板消息发送通道（`channel/wechat-template.ts`）。

本次补四项公众号**运营侧常用功能**（用户四选全选）：

1. 接入验证 + 消息/事件回调（服务器配置 Token 校验、关注/取关/扫码事件、被动回复）
2. 带参二维码生成（永久/临时，扫码进入活动/邀请裂变/来源归因）
3. 自定义菜单管理（后台配置 + 一键同步下发）
4. 模板消息管理配置（可视化维护微信模板 ID 与字段映射）

设计原则：**不新增 npm 依赖**（微信回调 XML 用受限手写解析，禁用 DTD 防 XXE）；**复用既有 token 缓存与配置存储**；**归属/裂变 MVP 只记录事件日志，不自动落 referral 关系**（避免过度设计）。

## 2. 现状盘点（已核实）

- 服务注册：`server/src/services/index.ts`（`sso-wechat`、`sso-msg`、`sso-oauth-config`…）
- 控制器注册：`server/src/controllers/index.ts`（新增 controller 必须登记，否则路由 404）
- 内容类型注册：`server/src/content-types/index.ts`
- 路由：
  - `routes/api.ts`（content-api，公开），现有 `/v1/auth/wechat`、`/v1/auth/wechat/callback` 等
  - `routes/admin.ts`（`adminRoute(method,path,handler,permission)` helper，走 `sso.*` action 权限）
- 配置存储：`sso-oauth-config`（provider=wechat, app_type=official_account），含 `extra_config`(json) 可存菜单/服务器 Token
- 消息模板：`msg-template` schema 已有 `wxTemplateId`、`wxTemplateFields`(json) 字段；`message-controller` 已有模板 CRUD
- 绑定关系：`sso-third-party-binding`（provider_user_id=openid ↔ user），关键词：粉丝主体
- 前端：`admin/src/pages/HomePage.tsx` 用 `tabs` 数组 + `activeTab` state 切页，`API_PREFIX=/api/zhao-sso/v1/admin`
- token 获取：`sso-wechat.ts` 闭包内 `getValidAccessToken(config)` + `tokenCache`/`ticketCache`，**当前未对外导出**

## 3. 总体设计

### 3.1 模块划分与文件清单

| 模块 | 新增/修改文件 |
|---|---|
| 共享核心 | `server/src/services/sso-wechat.ts`（**新增公开 `getAccessToken(appType)`** 复用 tokenCache） |
| 共享核心 | `server/src/utils/wechat-xml.ts`（受限 XML 解析 `parseXml` + 组装 `buildXml`） |
| 接入验证+事件回调 | `content-types/sso-wx-event`、`services/sso-wx-callback.ts`、`controllers/wx-callback-controller.ts` |
| 带参二维码 | `content-types/sso-wx-qrcode`、`services/sso-wx-qrcode.ts`、`controllers/wx-qrcode-controller.ts` |
| 自定义菜单 | `content-types/sso-wx-menu`、`services/sso-wx-menu.ts`、`controllers/wx-menu-controller.ts` |
| 模板消息管理 | 复用 `msg-template` + `message-controller`；仅 admin 补一轮读公众号已添加模板接口 |
| 注册文件 | `content-types/index.ts`、`controllers/index.ts`、`services/index.ts`、`routes/api.ts`、`routes/admin.ts` |
| 前端 | `admin/src/pages/WebchatTab.tsx`（内置 QrCode/Menu/Callback/Template 子区）+ `HomePage.tsx` 新增 tab |

### 3.2 数据模型（新增 collectionType，均 draftAndPublish: false）

**sso-wx-qrcode**（表 `sso_wx_qrcodes`）
- `scene_key` string required unique（场景值，如 `activity:12` / `invite:ABC`，微信侧用其做 scene）
- `title` string（后台备注名）
- `kind` enum `["temporary","permanent"]` default temporary
- `expire_seconds` integer default 2592000（临时二维码有效期，秒；永久忽略）
- `ticket` text（微信返回 ticket）
- `wx_url` text（`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=...`）
- `qrcode_url` text（可选：本地返回图片 URL）
- `remark` text

**sso-wx-event**（事件回调日志，表 `sso_wx_events`）
- `openid` string required
- `event` enum `["subscribe","unsubscribe","SCAN","CLICK","text","other"]`
- `event_key` string
- `scene_key` string（带参二维码场景）
- `payload` json（原始消息/事件 XML 解析结果）
- `openid_bound` boolean default false（是否已绑定 sso 用户，事件处理时回填）

**sso-wx-menu**（表 `sso_wx_menus`）
- `name` string required
- `menu_json` json required（微信菜单按钮结构，参考 menu/create 的 `{ "button": [...] }`）
- `enabled` boolean default true
- `publish_state` enum `["local","published","failed"]` default local（下发状态）
- `last_publish_at` datetime
- `last_error` text

### 3.3 权限与 action

复用既有 `sso.*` action，不新增权限注册：
- 二维码 admin 路由 → `sso.wx.read` / `sso.wx.write`
- 菜单 admin 路由 → `sso.wx.read` / `sso.wx.write`
- 接入配置（读 extra_config / 服务器URL生成）→ `sso.wx.config`
- 模板管理 → 复用 `sso.msg.read` / `sso.msg.write`

> 若 `zhao-auth` 未注册这些 action 会导致 admin 权限校验拒绝，实现时先在 `permissions.ts`（插件权限注册处）补充 `sso.wx.read/write/config` 三个 action（参照现有 `sso.*` 写法）。

### 3.4 关键接口契约（后端返回字段为准）

**接入验证 + 事件回调（content-api，公开，auth:false）**
- `GET /api/zhao-sso/v1/wechat/callback?signature=&timestamp=&nonce=&echostr=`
  - 校验 `sha1(sort([serverToken,timestamp,nonce]).join("")) === signature`；通过返回 `echostr`，否则返回 403
  - `serverToken` 取 `sso-oauth-config(wechat/official_account).extra_config.serverToken`
- `POST /api/zhao-sso/v1/wechat/callback`（body: 微信回调 XML，明文模式）
  - 验签同 GET；`parseXml` 后分发事件，写入 `sso-wx-event`
  - 关注 `subscribe`：若 `event_key` 前缀 `qrscene_` 则 scene_key=其后缀；若 openid 已有 `sso-third-party-binding` 记录则回填 `subscribe` 状态与 `openid_bound`
  - 取关 `unsubscribe`：更新 binding.subscribe=0
  - 扫码 `SCAN`：`event_key` 即 scene_key
  - 被动回复：仅对关注事件返回配置的欢迎语（`extra_config.welcomeReply`），其余返回 `success`（微信认可）或空串
- `GET /api/zhao-sso/v1/wechat/server-url`
  - 返回 `{ url: "/api/zhao-sso/v1/wechat/callback", token, encMode:"plain" }` 供后台填服务器配置（admin）

**带参二维码（admin，`/v1/admin`）**
- `POST /v1/admin/wx/qrcodes` body `{ scene_key, title, kind, expire_seconds, remark }`
  - 调微信 `cgi-bin/qrcode/create`：temporary→`QR_SCENE`(scene_id=数字场景挂载实际需映射)，permanent→`QR_LIMIT_STR_SCENE`(scene_str=scene_key)
  - 返回创建的记录（含 `ticket`、`wx_url`、`qrcode_url`）
- `GET /v1/admin/wx/qrcodes` / `GET /v1/admin/wx/qrcodes/:id` / `DELETE /v1/admin/wx/qrcodes/:id`
- `GET /v1/admin/wx/events?openid=`（事件日志查询，按 openid 可筛选，倒序分页）

**自定义菜单（admin，`/v1/admin`）**
- `GET /v1/admin/wx/menus` / `POST /v1/admin/wx/menus`（保存本地 `menu_json`）
- `PUT /v1/admin/wx/menus/:id` / `DELETE /v1/admin/wx/menus/:id`
- `POST /v1/admin/wx/menus/:id/publish` → 调 `cgi-bin/menu/create` 下发，回写 `publish_state=published`/`failed`
- `DELETE /v1/admin/wx/menu/remote` → 调 `cgi-bin/menu/delete` 删除线上菜单
- `GET /v1/admin/wx/menu/remote`（可选）→ `cgi-bin/get_current_selfmenu_info`

**模板消息管理（admin，复用 `sso.msg.*`）**
- 复用 `POST/GET/PUT /v1/admin/msg-templates`（`wxTemplateId`、`wxTemplateFields` json 已可写）
- 新增 `GET /v1/admin/wx/templates` → `cgi-bin/template/get_all_private_template`，返回公众号已添加模板列表供运营配置字段映射

### 3.5 微信 API 封装落点

- `sso-wechat.getAccessToken(appType)`：公开导出，复用闭包 `tokenCache`，供二维码/菜单/模板列表调微信时统一取 token
- `sso-wx-qrcode` / `sso-wx-menu` service 内部直接用 `axios` 调对应 cgi-bin 接口，token 用 `getAccessToken("official_account")`
- mock 支持：沿用 `MSG_WECHAT_PROVIDER=mock` 约定，mock 下二维码/菜单返回预设 ticket/成功，便于本地验收

### 3.6 安全与依赖约束（硬约束）

- **不新增任何 npm 依赖**；`package.json` 不改
- XML 解析 `wechat-xml.ts`：**只做扁平元素/单层数组解析**，禁止解析 DTD/实体/DOCTYPE（`<![CDATA[...]]>` 提取文本），从源头规避 XXE
- 回调验签必须在校验通过后才处理业务；验签失败返回 403 且不落库
- 二维码 `scene` 用 `scene_str`（永久）与场景映射，避免数字 scene_id 冲突；临时用 `scene_id` 时由后台分配自增 id

## 4. 执行计划

采用共享首个子代理先行、其余按依赖衔接的 Subagent 模式：

1. **Step Core（先行）**：`wechat-xml.ts` + `sso-wechat.getAccessToken` 导出 + 注册文件骨架（content-types/index、services/index、controllers/index 预留本次所有 uid —— 由实现者一次性补齐，避免并发互相覆盖）
2. **Step A 接入验证+事件回调**：`sso-wx-event` + `sso-wx-callback` service + `wx-callback-controller` + api.ts 路由 + admin server-url
3. **Step B 带参二维码**：`sso-wx-qrcode` + service + controller + admin 路由
4. **Step C 自定义菜单 + 模板消息后端**：`sso-wx-menu` + service + controller + admin 路由 + `wx/templates` 只读接口
5. **Step D 前端**：`WebchatTab.tsx`（二维码/菜单/接入配置/模板配置四区）+ HomePage tab 注册
6. **Step E 验收收口**：`basic/scripts/accept-wechat-official.cjs`（mock 模式覆盖：验签、事件分发、二维码创建、菜单发布、模板列表，断言零残留）；`cd plugins/zhao-sso && npm run build` 重建 dist；收口停 dev + `git restore dist/` 还原根 app dist

## 5. 验收要点（accept-wechat-official.cjs）

- 验签：正确 signature 返回 echostr；错误返回 403
- 事件：POST 关注(subscribe, qrscene_xxx) 落 `sso-wx-event`（scene_key 提取正确）；取关更新 binding.subscribe
- 二维码：创建 temporary/permanent 各一，断言返回 `wx_url` 含 ticket；列表可查
- 菜单：保存 → publish 后状态 published；mock 下无真实调用
- 模板：`wx/templates` mock 返回列表
- 清理：删除测试创建的二维码/菜单/事件记录，脚本退出前确认零残留
# zhao-sso 公众号运营功能扩展（二期：关键字回复 / 素材 / 图文发布） 设计文档

- 日期：2026-08-22
- 插件：`zhao-sso`（Strapi 5 插件，`e:\code\basic\plugins\zhao-sso`）
- 前端承载端：**web 运营端**（`e:\code\web`，h.joho.cn，uni-app）—— 非 shao C 端、非插件 admin
- 交付目标：在一期（已交付：接入验证+事件回调 / 带参二维码 / 自定义菜单 / 模板消息管理）基础上，补齐三项公众号运营能力，前端统一落在 web 运营端页面，端到端验收后收口。

## 1. 背景与目标

一期能力（`sso-wx-event`/`sso-wx-qrcode`/`sso-wx-menu` + 插件 admin 的 `WebchatTab.tsx`）已交付。
用户明确要求前端承载端为 **web 运营端（h.joho.cn）**，并在运营端提供完整公众号运营工作台，覆盖：
1. **配置菜单**（菜单管理 + 下发，web 页面）
2. **关键字自动回复**（关注欢迎语 / 关键字 / 未命中兜底）
3. **上传素材**（图片/语音/视频/缩略图 永久素材）
4. **公众号文章**（图文草稿 + 发布，复用多媒体发布中心账号体系登记发布台账）
5. **接入配置引导**（服务器 URL/Token 展示、账号接入指引）

设计原则沿用一期：**不新增 npm 依赖**、**复用 `sso-wechat.getAccessToken("official_account")` 与 `sso-oauth-config` token 载体**、复用既有 `sso.wx.*` 权限 action。

## 2. 现状盘点（已核实 2026-08-22）

- `sso-wechat.getAccessToken(appType)` 已公开导出（`sso-wechat.ts` line 90），复用闭包 tokenCache
- 回调入口 `sso-wx-callback.handleXml(xml)` 已做验签分发（subscribe/unsubscribe/SCAN/CLICK/text），`text` 事件当前仅写日志
- admin 路由 helper：`adminRoute(method,path,handler,permission)`（`routes/admin.ts`），控制器形如 `"wx-reply.list"`，服务在 `services/index.ts` 注册
- 权限 action：`sso.wx.read` / `sso.wx.write` / `sso.wx.config` 已注册，本期复用不新增
- 前端 web 端请求封装：`src/utils/request.js` 提供 `adminGet/adminPost/adminPut/adminDel`，自动注入 Bearer token + `x-site-id`，base=`BASE_API`，广告 min 前缀 `/zhao-sso/v1/admin`
- 多媒体发布中心（zhao-studio）：`publish-account`（platform 含 `wechat`，config json 存公众号账号）、`publish-record`（发布台账）；`platformAdapters.wechat.endpoint` 指向 `cgi-bin/material/add_material`
- 公众号 token 唯一载体：`sso-oauth-config`（provider=wechat, app_type=official_account）的 `extra_config`

## 3. 总体设计

### 3.1 模块划分与文件清单

| 模块 | 文件 |
|---|---|
| 关键字回复 | `content-types/sso-wx-reply/schema.json`、`services/sso-wx-reply.ts`、`controllers/wx-reply-controller.ts` |
| 永久素材 | `content-types/sso-wx-material/schema.json`、`services/sso-wx-material.ts`、`controllers/wx-material-controller.ts` |
| 图文草稿+发布 | `content-types/sso-wx-article/schema.json`、`services/sso-wx-article.ts`、`controllers/wx-article-controller.ts` |
| 回调扩展 | 修改 `services/sso-wx-callback.ts`（text/订阅事件命中关键字规则） |
| 注册文件 | `content-types/index.ts`、`services/index.ts`、`controllers/index.ts`、`routes/admin.ts` |
| web 前端 | `src/api/wechat.js`、`src/pages/wechat/*.vue`（reply/material/article/menu/config）、`pages.json` 路由 + 运营端菜单入口 |

> 跨插件发布台账（旁路）：`sso-wx-article` 发布成功后，若 `zhao-studio` 存在则登记一条 `publish-record`（platform=wechat），失败不影响主流程。

### 3.2 数据模型（新增 collectionType，draftAndPublish:false）

**sso-wx-reply**（表 `sso_wx_replies`）
- `trigger` enum `["welcome","fallback","keyword"]` required default keyword
- `match` string（trigger=keyword 时匹配关键字，唯一）
- `reply_type` enum `["text","article"]` default text
- `text` text（文本回复内容）
- `title` string、`desc` string、`pic_url` string、`link_url` string（article 回复：标题/摘要/封面/点击跳转链接）
- `sort` integer default 0、`enabled` boolean default true

**sso-wx-material**（表 `sso_wx_materials`）
- `type` enum `["image","voice","video","thumb"]` required
- `name` string、`media_id` string（微信永久素材 id）
- `wx_url` string（微信侧 url）、`remark` text

**sso-wx-article**（表 `sso_wx_articles`）
- `draft_id` string（公众号图文草稿 media_id）
- `title` string required、`author` string、`digest` string、`content` text（正文 HTML）
- `thumb_media_id` string（封面素材）、`pic_url` string、`content_source_url` string（阅读原文）、`show_cover_pic` boolean default true
- `publish_state` enum `["draft","publishing","published","failed"]` default draft
- `publish_id` string（freepublish 返回）、`wx_published_at` datetime（注：避开 Strapi 系统保留列，未用 published_at）、`last_error` text

### 3.3 权限 action

复用 `sso.wx.read` / `sso.wx.write`，不新增权限注册。素材/图文上传走 `sso.wx.write`。

### 3.4 后端接口契约（admin，前缀 `/v1/admin/wx`，返回字段以后端为准）
> 经 `request.js`，web 端完整调用路径为 `BASE_API + /zhao-sso/v1/admin/wx/*`，Bearer token 自动附带。

**关键字回复（controller `wx-reply`）**
- `GET  /wx/replies` 列表（分页）
- `POST /wx/replies` 创建 `{trigger,match,reply_type,text,title,desc,pic_url,link_url,sort,enabled}`
- `PUT /wx/replies/:id` 更新
- `DELETE /wx/replies/:id` 删除

**永久素材（controller `wx-material`，上传走 multipart/form-data）**
- `POST   /wx/materials` form-data `{type,name,file}` → cgi-bin/material/add_material，落库返回 `{media_id,wx_url}`
- `GET    /wx/materials` 本地素材清单（分页）
- `DELETE /wx/materials/:id` → cgi-bin/material/del_material + 删本地

**图文草稿+发布（controller `wx-article`）**
- `POST   /wx/articles` `{title,author,digest,content,thumb_media_id,content_source_url,show_cover_pic}` → 调 cgi-bin/draft/add 提交，写 `draft_id`，publish_state=draft
- `GET    /wx/articles` 本地草稿列表
- `GET    /wx/articles/:id` 详情
- `PUT    /wx/articles/:id` 更新本地 + cgi-bin/draft/update 重提（若已发布返回 400）
- `POST   /wx/articles/:id/publish` → 校验已提草稿 → cgi-bin/freepublish/submit，记 `publish_id`，publish_state=publishing；**旁路登记 zhao-studio publish-record**
- `GET    /wx/articles/:id/status` → 若 publishing 调 cgi-bin/freepublish/get 刷新 publish_state
- `DELETE /wx/articles/:id` → cgi-bin/draft/delete + 删本地

**回调扩展（修改 `sso-wx-callback.handleXml`）**
- `text` 事件：按 `match` 匹配回复规则 —— 优先关键字精确命中 → 未命中取 `fallback` 规则 → 均无返回 `success`
- `subscribe`：命中 `welcome` 规则，优先于上一期的 `extra_config.welcomeReply`；逻辑叠加为 welcome → extraConfig 兜底
- 命中 `reply_type=text` 时生成被动文本回复 XML（5 秒窗口内），`article` 规则因被动回复不支持图文，仅回欢迎提示文本
- 验签失败仍返回 403 不落库不处理

### 3.5 微信 API 封装落点

- 共用 `sso-wechat.getAccessToken("official_account")` 取 token
- `sso-wx-reply`/`sso-wx-material`/`sso-wx-article` service 内部用既有 `axios` 调 cgi-bin 接口
- mock 支持：沿用 `MSG_WECHAT_PROVIDER=mock` 约定，mock 下素材返回固定 media_id、图文返回固定 draft_id/publish_id，便于本地验收

### 3.6 后续周知（不实现在第一期）
- 被动回复 `article` 类型的图文下拉，需升级客服消息（cgi-bin/message/custom/send），本期不做
- 视频素材（type=video）需先上传到媒体库再 add_material，markdown 接口留 `type` 透传，具体二次上传按微信报错返回

## 4. 前端（web 运营端 h.joho.cn）

### 4.1 API 封装 `src/api/wechat.js`
- 引入 `get, post, put, del, adminGet, adminPost, adminPut, adminDel`；admin 前缀 `/zhao-sso/v1/admin/wx`
- 导出 `ssoWxReplyApi`（list/create/update/delete）、`ssoWxMaterialApi`（list/create(upload)/delete）、`ssoWxArticleApi`（list/create/detail/update/publish/status/delete）、`ssoWxMenuApi`（list/publish/deleteRemote，复用已有一期后端）、`ssoWxServerConfig`（接入配置）
- 文件上传用 `uni.uploadFile`，url=`BASE_API + /zhao-sso/v1/admin/wx/materials`，header 带 token + x-site-id

### 4.2 页面 `src/pages/wechat/`
- `config.vue` 接入配置引导：展示回调 URL `/api/zhao-sso/v1/wechat/callback`、服务器 Token、编码模式，附公众号后台配置步骤文案；显示是否已配置 appid/secret 状态
- `menu.vue` 菜单管理：JSON/Schema 编辑 + 下发 publish + 删除远程 + 远程菜单读取（调 websocket 已有 `sso.wx` 一期 admin 接口）
- `reply.vue` 关键字回复：规则列表 + 增删改（welcome/fallback/keyword，text/article）
- `material.vue` 素材：上传（图/音/视频/缩略图）+ 列表 + 删除
- `article.vue` 图文：草稿列表 + 新建/编辑（正文、封面、原文链接）+ 发布 + 状态轮询
- `wechat/index.vue`（可选）运营工作台入口/入口卡片

### 4.3 路由与菜单
- `src/pages.json` 注册上述页面
- 运营端侧边栏追加入口（实现时按 web 现有权限菜单加载机制加入「公众号运营」分组，挂在 `zhao-sso` 相关菜单节点下；子代理实现时核实 web 菜单源文件）

## 5. 执行计划（Subagent 模式）

1. **Step Core（先行）**：`content-types/index.ts`、`services/index.ts`、`controllers/index.ts` 一次性补齐本次所有 uid（sso-wx-reply/material/article），避免并发互相覆盖
2. **Step Reply**：`sso-wx-reply` service + controller + admin 路由 + 改 `sso-wx-callback.handleXml` 命中文案逻辑
3. **Step Material**：`sso-wx-material` service + controller + admin 路由（multipart 上传）
4. **Step Article**：`sso-wx-article` service + controller + admin 路由（draft + freepublish + publish-record 旁路）
5. **Step Web**：`api/wechat.js` + `pages/wechat/*` 五页 + pages.json + 菜单入口（前端承载端为 `e:\code\web`）
6. **Step Accept**：`basic/scripts/accept-wechat-ops.cjs`（mock 覆盖回复匹配/素材上传/图文 draft+publish/状态流转，断言零残留）；`cd plugins/zhao-sso && npm run build` 重建 dist；收口停 dev + `git restore dist/` 还原根 app dist + 提交

## 6. 验收要点（accept-wechat-ops.cjs）
- 回复：建 keyword/welcome/fallback 规则，POST 对应 text 事件断言返回文本 XML 命中；未命中回 fallback；订阅回 welcome
- 素材：mock 上传 image 返回固定 media_id 并落库；列表可查；删除清本地
- 图文：创建草稿返回 draft_id → publish 后 publish_state=publishing → status 后 published；已发布再 update 返回 400
- 权限：admin 路由带 / 不带 token 的 401/200 行为
- 清理：脚本退出前删除测试创建的回执/素材/图文记录，确认零残留

## 7. 风险与约束
- 硬约束：**不新增 npm 依赖**；`package.json` 不改
- 跨插件 publish-record 旁路：`strapi.plugin("zhao-studio")` 判空，不存在或抛错均不影响公众号发布主流程
- 公众号素材/图文接口依赖认证服务号 + 已配置 appid/secret；未配置时 admin 接口返回 400 与提示
- mock 模式下不触真微信接口，仅本地验收
# 多媒体发布功能扩展设计

> 日期：2026-10-04
> 状态：已确认（brainstorming 四节全部通过）

## §0. 背景与决策回顾

zhao-studio publish 系统目前只覆盖 **图文文章（article-draft）** 一种内容类型，publish-record 硬编码 `article` 关系列，channel-adapter payload 构建全部假设 `article.content + article.title`。

用户决定：**扩 video 短视频 + gallery 图集** 两种新类型，先做内容模型 + 服务适配（A→B→C 顺序），后做端到端多媒体工作流（collect→edit→publish）。

**核心决策（brainstorming 已确认）**：

| 维度 | 决策 | 理由 |
|---|---|---|
| 第一批类型 | video 短视频 + gallery 图集 | 覆盖 6 平台核心形态（douyin=xhs=核心） |
| 数据模型策略 | 三列并存（article + video + gallery 三 nullable 互斥） | Strapi native relation、filter 直接；等类型 ≥5 再重构 polymorphic |
| media 存储 | URL 字符串方案（videoUrl / images[].url） | 2G 服务器禁大文件、采集来的素材本身就是 URL |
| service 架构 | channel-adapter 内部 contentType switch，不拆文件 | 平台数 ≤6 可控、switch 内聚、未来扩类型只加 switch 分支 |
| payload 策略 | 按平台 switch，内部再 contentType switch；upload 逻辑内聚在各平台 adapter | 不归一化、每个平台自己决定"直接传 URL 还是先 upload 拿 mediaId" |

---

## §1. 数据模型

### §1.1 新增 publish-video content-type

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_publish_videos",
  "info": {
    "singularName": "publish-video",
    "pluralName": "publish-videos",
    "displayName": "短视频"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "title":        { "type": "string", "required": true, "maxLength": 200 },
    "videoUrl":     { "type": "string", "required": true },
    "coverImage":   { "type": "string" },
    "description":  { "type": "text" },
    "duration":     { "type": "integer" },
    "size":         { "type": "integer" },
    "tags":         { "type": "json" },
    "status":       { "type": "enumeration", "enum": ["draft","processing","ready","published"], "default": "draft" },
    "publishRecords": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-studio.publish-record", "mappedBy": "video" },
    "scope":        { "type": "enumeration", "enum": ["current","global","tenant"], "default": "current" },
    "scopeTenantId": { "type": "string" },
    "publishedAt":  { "type": "datetime" }
  }
}
```

### §1.2 新增 publish-gallery content-type

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_publish_galleries",
  "info": {
    "singularName": "publish-gallery",
    "pluralName": "publish-galleries",
    "displayName": "图集"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "title":        { "type": "string", "required": true, "maxLength": 200 },
    "images":       { "type": "json", "required": true },
    "description":  { "type": "text" },
    "coverImage":   { "type": "string" },
    "tags":         { "type": "json" },
    "status":       { "type": "enumeration", "enum": ["draft","processing","ready","published"], "default": "draft" },
    "publishRecords": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-studio.publish-record", "mappedBy": "gallery" },
    "scope":        { "type": "enumeration", "enum": ["current","global","tenant"], "default": "current" },
    "scopeTenantId": { "type": "string" },
    "publishedAt":  { "type": "datetime" }
  }
}
```

`images` JSON 结构：
```json
[{ "url": "https://...", "caption": "可选说明" }]
```

### §1.3 publish-record 扩展

保留 `article` 关系列，**新增 2 列**：

```json
"video": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.publish-video", "inversedBy": "publishRecords" },
"gallery": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.publish-gallery", "inversedBy": "publishRecords" }
```

三列 **nullable 互斥**——service 层校验必须且只能有一个非 null。

### §1.4 publish-schedule 扩展

同样扩展三列（支持 video/gallery 定时发布）：

```json
"article": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.article-draft" },
"video":   { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.publish-video" },
"gallery": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.publish-gallery" }
```

### §1.5 互斥校验（service 层）

```ts
function validateRecordContentRef(record: any) {
  const refs = [record.article, record.video, record.gallery].filter(Boolean)
  if (refs.length !== 1) {
    throw new Error('publish-record 必须且只能关联一种内容类型')
  }
}
```

---

## §2. Service 层架构

### §2.1 现有结构（不动文件，只加内容）

```
services/
  publish.ts          ← publishContent 统一入口 + 保留 publishArticle 兼容
  publish-queue.ts     ← BullMQ worker 只调 channel-adapter.publish
  channel-adapter.ts   ← 改签名 + 内部加 contentType switch
  rpa-client.ts        ← RPA 多了 video/gallery 分支（如果走 RPA 路径）
  status-sync.ts       ← 只拉 externalId + 回填 status，不关心 contentType
```

### §2.2 channel-adapter 改造

**签名变化**：
```ts
// 旧
async publish(article: any, account: any)

// 新
async publish(content: any, account: any, contentType: 'article' | 'video' | 'gallery')
```

**内部结构变化**——原来一层 platform switch，现在两层：

```ts
async publish(content, account, contentType) {
  const platformType = account.platform?.type || 'custom'

  // 1. contentType 适配校验（新逻辑）
  const validation = validateContentForPlatform(content, contentType, platformType)
  if (!validation.valid) throw new Error(validation.errors.join('; '))

  // 2. OAuth 凭证获取（不变）
  let accessToken
  // ... 现有 oauth-manager.ensureValidToken ...

  // 3. 双重 switch（核心新增）
  switch (platformType) {
    case 'douyin':      return this.publishToDouyin(content, account, accessToken, contentType)
    case 'xiaohongshu': return this.publishToXiaohongshu(content, account, accessToken, contentType)
    case 'wechat':      return this.publishToWechat(content, account, accessToken, contentType)
    case 'toutiao':     return this.publishToToutiao(content, account, accessToken, contentType)
    case 'bilibili':    return this.publishToBilibili(content, account, accessToken, contentType)
    case 'internal':    return this.publishToInternal(content, account, contentType)
    case 'custom':      return this.publishToCustom(content, account, accessToken, contentType)
    default: throw new Error(`暂不支持: ${platformType}`)
  }
}
```

每个平台方法内部再加 contentType switch：
```ts
async publishToDouyin(content, account, token, contentType) {
  switch (contentType) {
    case 'video':   payload = buildDouyinVideoPayload(content); break
    case 'article': payload = buildDouyinArticlePayload(content); break
    case 'gallery': payload = buildDouyinGalleryPayload(content); break  // 图集在抖音→自动合成轮播视频
  }
  return await callDouyinApi(payload, token)
}
```

### §2.3 publish.ts 统一入口

```ts
// 旧路由保留
async publishArticle(ctx)  // 调 publishContent({ type: 'article', contentId, accountIds })

// 新入口
async publishContent(ctx) {
  const { type, contentId, accountIds } = ctx.request.body
  // 1. type 校验
  // 2. 查内容（type→对应 content-type，documents.findOne）
  // 3. 查账号（accountIds）
  // 4. 入队 publish-queue
  // 5. 返回 records
}
```

### §2.4 辅助工具函数（publish-adapter.ts，新文件）

```ts
// contentType 识别
export function detectContentType(content): 'article' | 'video' | 'gallery'

// 适配校验
export function validateContentForPlatform(content, contentType, platformType) -> { valid: boolean, errors: string[] }
// 例：douyin video 必须 videoUrl 非空；xhs gallery 必须 images.length ≥3

// 各平台 payload builder（可选拆到 utils/platformAdapters.ts）
export function buildDouyinPayload(content, contentType)
export function buildXhsPayload(content, contentType)
// ...
```

---

## §3. Payload 适配矩阵

### §3.1 平台 × 类型映射

| 平台 | article | video | gallery | 备注 |
|---|---|---|---|---|
| **douyin** | title + content + cover + images[] | **videoUrl + coverUrl + title + description** | gallery → 自动合成轮播视频 | video 核心，API ≥3s ≤5min |
| **xiaohongshu** | title + content + cover | videoUrl + title + description | **title + images[] + notes + cover** | gallery 核心，图片 ≥3 |
| **wechat (公众号)** | title + digest + cover + content(html) | mediaId(video) + title + desc | articles[title,digest,thumb,content]×N | video 走永久素材 upload |
| **toutiao** | title + content + cover | videoUrl + title + desc + cover | images[] + title + content | 图集需 upload 每图拿 mediaId |
| **bilibili** | — | **videoUrl + title + desc + tags[] + tid** | — | 只有视频发布 |
| **internal** | 存 externalId 占位 | 同左 | 同左 | 不调外部 API |

### §3.2 媒体上传策略

videoUrl / images[] / coverImage 都是 URL（方案 B），各平台 adapter 内部自己处理"直接传 URL 还是先 upload"：

| 平台 | video URL | images URL |
|---|---|---|
| douyin | 直接传，API 内部下载 | 直接传 |
| xiaohongshu | uploadFile → imageId | uploadImages[] → imageIds[] |
| wechat | uploadVideo → mediaId | uploadImg → mediaId[] |
| toutiao | upload → mediaId | uploadEach → mediaId[] |
| bilibili | upload → mediaId | — |

**不归一化 upload 逻辑**——每个平台 adapter 内部有 upload 子函数处理。

---

## §4. 控制器路由 + 前端页面

### §4.1 后端路由

```
// publish controller — 保留旧路由兼容
POST   /v1/admin/publish/article/:articleId           ← 保留
POST   /v1/admin/publish/video/:videoId              ← 新增
POST   /v1/admin/publish/gallery/:galleryId            ← 新增
POST   /v1/admin/publish/content                      ← 统一入口 body { type, contentId, accountIds }

// publish-record listOne 查询 — 已通配 relation，自动带出 video/gallery

// publish-schedule — 扩 contentType 三列
POST   /v1/admin/publish/schedules                    ← body 可传 articleId/videoId/galleryId 任一

// video CRUD — 新增 controller
GET    /v1/admin/publish-videos                        ← list
POST   /v1/admin/publish-videos                        ← create
GET    /v1/admin/publish-videos/:id                    ← findOne
PUT    /v1/admin/publish-videos/:id                    ← update
DELETE /v1/admin/publish-videos/:id                    ← delete

// gallery CRUD — 同上
GET    /v1/admin/publish-galleries
...
```

### §4.2 前端页面（web/ 运营后台）

| 页面 | 路由 | 核心 UI |
|---|---|---|
| **video list/edit** | `/pages/studio/publish-video/list` + `/edit` | videoUrl 输入框 + 标题 + 描述 + tags + 封面 URL |
| **gallery list/edit** | `/pages/studio/publish-gallery/list` + `/edit` | images[] 数组编辑（动态增删 + 每个 url + caption）+ 首图自动设封面 |
| **publish center 扩类型选择** | publish-center/index.vue | 内容类型 picker（文章 / 视频 / 图集） |
| **publish-record list 扩 contentType** | 已有 | 加 contentType 列（推断 record.video/article/gallery 三列） |
| **publish-record detail 扩预览** | 已有 | 根据 contentType 渲染：video→`<video>` / gallery→`<swiper>` / article→富文本 |

### §4.3 菜单注册

dashboard/index.vue 菜单加两项：
```
📹 短视频管理 → /pages/studio/publish-video/list
🖼 图集管理  → /pages/studio/publish-gallery/list
```

---

## §5. 实施计划（高层级 task list，不含时间估算）

| 阶段 | Task | 涉及仓库 |
|---|---|---|
| **P0 Schema** | ① 新增 publish-video + publish-gallery schema.json ② 扩 publish-record 加 video/gallery 两列 ③ 扩 publish-schedule 加三列互斥 | basic |
| **P0 部署** | ④ 本地 `npm run build` → dist commit → 服务器 ff-only + pm2 restart strapi（停 vendure）→ 等 transcompile 完 → 恢复 vendure | basic |
| **P1 Service** | ⑤ channel-adapter 改签名 + 加 contentType switch ⑥ publish.ts 加 publishContent 统一入口 + publishVideo/publishGallery 三路由 | basic |
| **P1 前端** | ⑦ video list/edit + gallery list/edit 两页（4 vue 文件）⑧ publish-center 扩类型 picker ⑨ publish-record 扩 contentType 列 + detail 预览 | web |
| **P1 部署** | ⑩ web npm run build:h5 → deploy-h5.ps1 SYNC_OK | web |
| **P2 RPA** | ⑪ rpa-client.ts 加 video/gallery RPA 路径（如果平台走 RPA） | basic |
| **P2 验证** | ⑫ Playwright smoke test 登录 → 三列表可见 → 过滤器生效 → 发布视频/图集到内部渠道验证 | 本机 |

---

## §6. 不在本次范围

- 多媒体工作流（collect → edit → publish 整合）—— 这是 C 轮，等 A+B 跑通再做
- short 短动态 / live 直播 —— 后续类型，等 video/gallery 稳定再扩
- 视频转码 / 图片裁剪 —— 方案 B 全部 URL 字符串，不涉及
- polymorphic 重构为 publish-source —— 等类型 ≥5 再评估
- 完整 RPA 视频发布实现 —— 先 stub + 骨架，真机跑通后再补选择器

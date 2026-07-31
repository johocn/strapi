# zhao-website SEO/GEO 全面审计与修复设计

> **日期：** 2026-07-31
> **插件：** zhao-website (`d:\zhao\strapi\plugins\zhao-website`)
> **状态：** 已确认，待实现

## 背景

对 zhao-website 插件进行全面的官网功能、SEO 优化、GEO 优化审计。插件已实现 19 个 Content-Type、25 个 Service、约 95 个 API 端点，覆盖内容管理、SEO 输出、GEO 优化、线索转化等能力。但审计发现 23 个问题，从严重缺陷到改进建议，需分层修复。

## 目标

修复全部 23 项问题，使插件的 SEO/GEO 优化从"字段已配置但不输出"提升为"端到端可用"。

## 方案：分层递进

- **第一层（严重缺陷 6 项）：** 影响 SEO/GEO 实际效果，优先修复
- **第二层（重要缺陷 10 项）：** 影响完整性，确保覆盖全面
- **第三层（改进项 7 项）：** 锦上添花，提升标准合规性

---

## 第一层：严重缺陷修复（6 项）

### 1.1 新增 SEO Meta 标签输出端点

**问题：** hreflang 配置、GEO meta 标签、站点验证代码都存在于 `seo-config` schema 中，但没有任何端点将它们输出为 HTML meta 标签。

**方案：**

新建 service + controller + 公开路由：

```
GET /api/v1/seo-meta → 返回 JSON，包含所有需要注入 <head> 的 meta 标签
```

输出结构：

```json
{
  "title": "圣麟教育",
  "titleTemplate": "%s | 圣麟教育",
  "description": "让学习更有价值",
  "keywords": "教育,学习,课程",
  "canonical": "https://example.com",
  "og": {
    "og:title": "圣麟教育",
    "og:description": "让学习更有价值",
    "og:image": "https://example.com/og.png",
    "og:site_name": "圣麟教育",
    "og:locale": "zh_CN",
    "og:type": "website"
  },
  "twitter": {
    "twitter:card": "summary_large_image",
    "twitter:site": "@shenglin_edu",
    "twitter:creator": "@shenglin_edu"
  },
  "geo": {
    "geo.region": "CN-BJ",
    "geo.placename": "北京",
    "geo.position": "39.9042;116.4074",
    "ICBM": "39.9042, 116.4074"
  },
  "hreflang": [
    { "hreflang": "zh-CN", "href": "https://example.com" },
    { "hreflang": "en", "href": "https://example.com/en" }
  ],
  "verification": {
    "google-site-verification": "...",
    "baidu-site-verification": "...",
    "bing-site-verification": "...",
    "sogou_site_verification": "..."
  },
  "structuredData": [
    { ...Organization JSON-LD... },
    { ...WebSite JSON-LD... }
  ],
  "customHeadCode": "<!-- custom head -->",
  "customBodyCode": "<!-- custom body -->"
}
```

**新建文件：**
- `server/src/services/seo-meta.ts` — 组装所有 meta 标签数据
- `server/src/controllers/content-api/seo-meta.ts` — 控制器

**修改文件：**
- `server/src/routes/content-api.ts` — 新增 `GET /v1/seo-meta` 路由
- `server/src/services/index.ts` — 注册 `seo-meta` service
- `server/src/controllers/content-api/index.ts` — 导出 `seo-meta` controller

### 1.2 hreflang 实现

**问题：** `seo-config` 有 `defaultLocale`/`alternateLocales`/`hreflangStrategy` 字段，但从未在任何输出中使用。

**方案：**

在 `seo-meta.ts` 中根据 `hreflangStrategy` + `defaultLocale` + `alternateLocales` 生成 hreflang 链接数组：

- `none`：不输出 hreflang
- `subdirectory`：`https://example.com` (zh-CN) + `https://example.com/en` (en)
- `subdomain`：`https://example.com` (zh-CN) + `https://en.example.com` (en)
- `tld`：`https://example.cn` (zh-CN) + `https://example.com` (en)

同时修改 `sitemap.ts`，在每个 URL 条目中追加 `<xhtml:link rel="alternate" hreflang="...">`，需在 urlset 根节点引入 `xmlns:xhtml="http://www.w3.org/1999/xhtml"`。

### 1.3 GEO meta 标签输出

**问题：** `geoRegion`/`geoPlacename`/`geoPosition`/`geoICBM` 字段存在但从未输出。

**方案：** 在 `seo-meta.ts` 中将这四个字段转为标准 geo meta 标签格式输出：

```
geo.region → <meta name="geo.region" content="CN-BJ">
geo.placename → <meta name="geo.placename" content="北京">
geo.position → <meta name="geo.position" content="39.9042;116.4074">
geoICBM → <meta name="ICBM" content="39.9042, 116.4074">
```

### 1.4 搜索引擎推送生命周期触发

**问题：** `search-engine-push` 服务存在但 article/product/case 的 lifecycle 未调用。

**方案：**

修改以下 lifecycle 文件，在 `afterCreate` 和 `afterUpdate` 中调用搜索引擎推送：

- `content-types/article/lifecycles.ts`
- `content-types/product/lifecycles.ts`
- `content-types/case/lifecycles.ts`
- `content-types/tutorial/lifecycles.ts`
- `content-types/faq/lifecycles.ts`

推送逻辑：

```typescript
// afterCreate / afterUpdate 中，仅 status=published 时推送
if (event.result.status === 'published') {
  const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
    where: { id: event.result.site },
  });
  if (siteConfig?.domain) {
    const url = `${siteConfig.domain}/articles/${event.result.slug}`;
    await strapi.plugin('zhao-website').service('search-engine-push').pushAll(event.result.site, [url]).catch(() => {});
  }
}
```

### 1.5 知识图谱/第一真值公开端点

**问题：** `exportGraph()`/`exportEntity()`/`exportFacts()` 方法存在，但 `content-api.ts` 无对应公开路由，AI 爬虫无法直接获取。

**方案：**

在 `content-api.ts` 新增 3 个公开路由：

```
GET /v1/knowledge-graph.json → knowledge-graph.exportGraph (JSON-LD @graph)
GET /v1/knowledge-graph/:slug → knowledge-graph.exportEntity (单个实体 JSON-LD)
GET /v1/facts.json → first-truth.exportFacts (第一真值列表)
```

需在 `content-api/` 下新建 `knowledge-graph.ts` 控制器（或扩展现有控制器），调用 service 层的 `exportGraph`/`exportEntity`/`exportFacts` 方法。

### 1.6 robots.txt selective 策略实现

**问题：** `aiCrawlerPolicy` 有 `selective` 选项，但 `robots.ts` 只处理 `block_all`，`selective` 直接 fall through 为全允许。

**方案：**

在 `seo-config` schema 新增字段：

```json
"allowedAiCrawlers": {
  "type": "json",
  "default": []
}
```

修改 `robots.ts` 的 AI 爬虫处理逻辑：

- `allow_all`：不屏蔽任何 AI 爬虫
- `block_all`：屏蔽所有 AI 爬虫（GPTBot/CCBot/ClaudeBot/PerplexityBot/Google-Extended/meta-external-agent/Amazonbot）
- `selective`：仅允许 `allowedAiCrawlers` 列表中的 AI 爬虫，屏蔽其他

AI 爬虫完整列表：

```
GPTBot, CCBot, ClaudeBot, PerplexityBot, Google-Extended,
meta-external-agent, Amazonbot, Bytespider, Sogou web spider
```

### 1.7 siteUrl 修正

**问题：** `seo-output.ts` 用 `https://${ctx.request.host}` 推导站点 URL，未考虑 HTTP 代理、X-Forwarded-Proto、或 site-config 中配置的规范域名。

**方案：**

修改 `seo-output.ts` 的 sitemap/robots/llmsTxt/manifest 四个控制器：

```typescript
// 优先从 site-config 的 domain 字段获取
const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
  where: { id: siteId },
});
const siteUrl = siteConfig?.domain || `https://${ctx.request.host}`;
```

---

## 第二层：重要缺陷修复（10 项）

### 2.1 sitemap 多语言 alternate 链接

修改 `sitemap.ts`：

- 在 urlset 根节点引入 `xmlns:xhtml="http://www.w3.org/1999/xhtml"`
- `_urlEntry` 方法接收 `hreflangEntries` 参数，为每个 URL 追加 `<xhtml:link rel="alternate" hreflang="..." href="...">`
- 根据 `seo-config` 的 `hreflangStrategy` 生成各语言的完整 URL

### 2.2 llms.txt 内容补全 + 完整 URL

修改 `llms-txt.ts`：

- Pages 区域新增 tutorials/cases/faqs/compliance 内容
- 所有路径从相对路径改为完整 URL（从 site-config 获取 domain）
- Facts 区域每条增加 `sourceUrl`
- Brand Voice 区域增加完整 URL

### 2.3 Product schema offers 修复

修改 `schema-builder.ts` 的 `buildProduct`：

- 补充 `offers.price`（从 product.price 读取）
- 补充 `offers.availability`（从 product.availability 读取，默认 `https://schema.org/InStock`）
- 补充 `offers.url`（从 product 完整 URL 读取）
- 补充 `offers.priceCurrency`（从 seoConfig 或默认 CNY）

需在 `product/schema.json` 确认是否有 `price`/`availability` 字段，若无则新增。

### 2.4 Article schema publisher logo 修复

修改 `schema-builder.ts` 的 `buildArticle`：

```typescript
if (brandInfo?.companyName) schema.publisher = {
  "@type": "Organization",
  name: brandInfo.companyName,
  logo: {
    "@type": "ImageObject",
    url: brandInfo?.logo?.url || "",
  },
};
```

### 2.5 LocalBusiness schema（集成 GEO 坐标）

在 `schema-builder.ts` 新增 `buildLocalBusiness` 方法：

```typescript
buildLocalBusiness(brandInfo: any, seoConfig: any): any {
  const org = this.buildOrganization(brandInfo, seoConfig);
  org["@type"] = seoConfig?.organizationType || "LocalBusiness";
  // 解析 geoPosition "lat;lng" 格式
  if (seoConfig?.geoPosition) {
    const [lat, lng] = seoConfig.geoPosition.split(';').map(s => s.trim());
    org.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }
  if (seoConfig?.geoPlacename) org.address = {
    "@type": "PostalAddress",
    addressLocality: seoConfig.geoPlacename,
  };
  return org;
}
```

在 `seo-meta.ts` 中，若 `geoPosition` 非空则输出 LocalBusiness schema 而非 Organization。

### 2.6 robots AI 爬虫列表扩展

修改 `robots.ts`，AI 爬虫屏蔽列表从硬编码 2 个扩展为完整 9 个（见 1.6）。

`selective` 策略时，仅屏蔽不在 `allowedAiCrawlers` 列表中的爬虫。

### 2.7 SEO 输出缓存层

新建 `server/src/services/cache.ts`：

```typescript
const cache = new Map<string, { data: string; expiresAt: number }>();

export default ({ strapi }) => ({
  async get(key: string, ttl: number, generator: () => Promise<string>): Promise<string> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const data = await generator();
    cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
    return data;
  },
  invalidate(key?: string) {
    if (key) cache.delete(key);
    else cache.clear();
  },
});
```

修改 `seo-output.ts` 控制器，对 sitemap（TTL 600s）/robots（TTL 600s）/llms.txt（TTL 1800s）使用缓存。

在 article/product/case 等 lifecycle 中调用 `cache.invalidate()` 清除缓存。

### 2.8 brand-voice 注入所有内容类型

修改 `schema-builder.ts`：

- `buildProduct`、`buildHowTo`、`buildFAQ` 中增加 brand 注入逻辑（与 `buildArticle` 一致）
- 若 product/tutorial/faq 有 `brandVoiceRef` 关联字段则注入

需确认 product/case/tutorial/faq schema 是否有 `brandVoiceRef` 字段，若无则新增。

### 2.9 RSS/Atom feed

新建：
- `server/src/services/feed.ts` — 生成 RSS 2.0 和 Atom 1.0 XML
- `server/src/controllers/content-api/feed.ts` — 控制器

路由：
```
GET /v1/feed.xml → feed.rss (application/rss+xml)
GET /v1/atom.xml → feed.atom (application/atom+xml)
```

RSS 2.0 输出已发布文章，包含 title/link/description/pubDate/category。

### 2.10 301 重定向管理

新建：
- `server/src/content-types/redirect-rule/schema.json` — 重定向规则 CT

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_redirect_rules",
  "attributes": {
    "site": { "relation": "oneToOne", "target": "plugin::zhao-common.site-config" },
    "fromPath": { "type": "string", "required": true },
    "toUrl": { "type": "string", "required": true },
    "statusCode": { "type": "integer", "default": 301 },
    "isActive": { "type": "boolean", "default": true },
    "deletedAt": { "type": "datetime", "default": null }
  }
}
```

- `server/src/services/redirect.ts` — 匹配逻辑（精确匹配 + 通配符匹配）
- `server/src/middlewares/redirect.ts` — Strapi 中间件，拦截请求匹配规则执行重定向
- 在 `bootstrap.ts` 注册中间件

---

## 第三层：改进项设计（7 项）

### 3.1 图片 sitemap

修改 `sitemap.ts`：为 article/product 的 coverImage 追加：

```xml
<image:image>
  <image:loc>https://example.com/cover.jpg</image:loc>
  <image:title>文章标题</image:title>
</image:image>
```

需在 article/product schema 确认 coverImage 字段，并在 sitemap generate 中 populate。

### 3.2 VideoObject schema

在 `schema-builder.ts` 新增 `buildVideo` 方法：

```typescript
buildVideo(tutorial: any): any {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: tutorial.title,
    uploadDate: tutorial.publishedAt,
  };
  if (tutorial.description) schema.description = tutorial.description;
  if (tutorial.thumbnailUrl) schema.thumbnailUrl = tutorial.thumbnailUrl;
  if (tutorial.videoUrl) schema.contentUrl = tutorial.videoUrl;
  return schema;
}
```

在 tutorial 详情页输出时，若有 videoUrl 则同时输出 VideoObject JSON-LD。

### 3.3 OG 标签补全

在 `seo-meta.ts` 输出中增加：
- `og:site_name`：从 `brandInfo.companyName` 获取
- `og:locale`：从 `seoConfig.defaultLocale` 转换格式（`zh-CN` → `zh_CN`）

### 3.4 Twitter Card 补全

在 `seo-config` schema 新增字段：

```json
"twitterSite": { "type": "string", "maxLength": 50 },
"twitterCreator": { "type": "string", "maxLength": 50 }
```

在 `seo-meta.ts` 中输出为 `twitter:site` 和 `twitter:creator` meta 标签。

### 3.5 manifest.json 完善

修改 `seo-output.ts` 的 `manifest` 方法，输出完整 PWA manifest：

```json
{
  "name": "圣麟教育",
  "short_name": "圣麟",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "categories": ["education", "productivity"],
  "icons": [
    { "src": "...", "sizes": "192x192", "type": "image/png" },
    { "src": "...", "sizes": "512x512", "type": "image/png" }
  ]
}
```

从 `seo-config.extraConfig` 读取 themeColor，从 `brand-info` 读取多尺寸图标。

### 3.6 Sogou 站点验证

在 `seo-config` schema 新增字段：

```json
"sogouSiteVerification": { "type": "string", "maxLength": 100 }
```

在 `seo-meta.ts` 中输出为 `<meta name="sogou_site_verification" content="...">`。

### 3.7 结构化数据校验

在 admin UI 的 `SEOOutputPage.tsx` 增加"结构化数据校验"区块：

- Google Rich Results Test 链接：`https://search.google.com/test/rich-results?url={encodedUrl}`
- Schema.org Validator 链接：`https://validator.schema.org/#url={encodedUrl}`
- 纯前端链接生成，无需后端改动

---

## 新建文件汇总

| 文件 | 用途 |
|------|------|
| `server/src/services/seo-meta.ts` | SEO meta 标签组装 |
| `server/src/controllers/content-api/seo-meta.ts` | meta 标签控制器 |
| `server/src/services/cache.ts` | SEO 输出缓存层 |
| `server/src/services/feed.ts` | RSS/Atom feed 生成 |
| `server/src/controllers/content-api/feed.ts` | feed 控制器 |
| `server/src/content-types/redirect-rule/schema.json` | 重定向规则 CT |
| `server/src/services/redirect.ts` | 重定向匹配服务 |
| `server/src/middlewares/redirect.ts` | 重定向中间件 |
| `server/src/controllers/content-api/knowledge-graph.ts` | 知识图谱公开端点控制器 |

## 修改文件汇总

| 文件 | 修改内容 |
|------|---------|
| `content-types/seo-config/schema.json` | 新增 allowedAiCrawlers/twitterSite/twitterCreator/sogouSiteVerification |
| `content-types/product/schema.json` | 确认/新增 price/availability 字段 |
| `content-types/redirect-rule/schema.json` | 新建 CT |
| `services/sitemap.ts` | 多语言 alternate + 图片 sitemap |
| `services/robots.ts` | selective 策略 + AI 爬虫列表扩展 |
| `services/schema-builder.ts` | Product offers + publisher logo + LocalBusiness + VideoObject + brand-voice 注入 |
| `services/llms-txt.ts` | 内容补全 + 完整 URL |
| `services/search-engine-push.ts` | 确认无需修改（lifecycle 调用即可） |
| `controllers/content-api/seo-output.ts` | siteUrl 修正 + manifest 完善 + 缓存集成 |
| `controllers/content-api/index.ts` | 导出新控制器 |
| `routes/content-api.ts` | 新增 seo-meta/knowledge-graph/facts/feed 路由 |
| `content-types/article/lifecycles.ts` | 搜索引擎推送触发 + 缓存清除 |
| `content-types/product/lifecycles.ts` | 搜索引擎推送触发 + 缓存清除 |
| `content-types/case/lifecycles.ts` | 搜索引擎推送触发 + 缓存清除 |
| `content-types/tutorial/lifecycles.ts` | 搜索引擎推送触发 + 缓存清除 |
| `content-types/faq/lifecycles.ts` | 搜索引擎推送触发 + 缓存清除 |
| `services/index.ts` | 注册 seo-meta/cache/feed/redirect services |
| `content-types/index.ts` | 注册 redirect-rule CT |
| `bootstrap.ts` | 注册重定向中间件 |
| `admin/src/pages/SEOOutputPage.tsx` | 结构化数据校验链接 |

## 验证方式

1. 启动 Strapi dev server
2. 访问以下端点验证输出：
   - `GET /api/v1/seo-meta` — 确认包含 hreflang、geo meta、OG、Twitter、verification 标签
   - `GET /api/v1/sitemap.xml` — 确认包含 xhtml:link alternate 和 image:image
   - `GET /api/v1/robots.txt` — 确认 selective 策略生效
   - `GET /api/v1/llms.txt` — 确认包含 tutorials/cases/faqs 和完整 URL
   - `GET /api/v1/knowledge-graph.json` — 确认 JSON-LD @graph 输出
   - `GET /api/v1/facts.json` — 确认真值列表输出
   - `GET /api/v1/feed.xml` — 确认 RSS XML 格式正确
   - `GET /api/v1/manifest.json` — 确认完整 PWA manifest
3. 发布一篇文章，确认搜索引擎推送被触发（检查日志）
4. 配置 301 重定向规则，访问旧 URL 确认跳转
5. 在 admin UI 的 SEO 输出页面确认结构化数据校验链接可用

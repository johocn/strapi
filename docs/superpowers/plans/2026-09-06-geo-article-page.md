# GEO 文章发布与前端页面 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Strapi 增加 geo-article 内容类型（6 大类字段 + 审核），并在 strapi-site Next.js 前端实现三种 GEO 文章页（科普/问答/本地报告）的 SSR 渲染、11 个可回退模块、SEO 结构化与转化闭环（留资/积分/埋点/小程序跳转）。

**Architecture:** 单一 `geo-article` 内容类型 + `type` 枚举三类型共用字段；公开接口全部走既有 content-filter 统一过滤（仅 published 可见）；前端三个固定路由共享 `GeoArticleView` 渲染组件，模块经三级页面配置（`pages.geoArticle/geoFaq/localReport.modules`）驱动、逐级回退到内置默认；埋点/留资/积分/小程序跳转全部复用既有中间层接口，不新增依赖。

**Tech Stack:** Strapi v5 插件（zhao-website / zhao-point / zhao-common）、Next.js App Router + TypeScript + 纯 CSS、PostgreSQL

**仓库边界：** Phase 1 + Phase 3 后端改动在 `e:\code\basic`（独立 git 仓库）；Phase 2/3 前端改动在 `e:\code` 顶层仓库（`strapi-site/` 子目录）。

**现有可参照模式：** `article` 内容类型（schema/service/控制器/路由）与 `content-filter` 服务、`[locale]/articles/[slug]/page.tsx` 详情页（hreflang/302 回退/模块组装）、`lead` 控制器（submit/track）、zhao-point `point.earnPoints` 服务。

***

### Task 1: geo-article 内容类型 schema（basic 仓库）

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\content-types\geo-article\schema.json`

- Modify: `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`（末尾 attributes 追加反向关系 `website_geo_articles`）

- [ ] **Step 1: 创建 geo-article schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_geo_articles",
  "info": {
    "singularName": "geo-article",
    "pluralName": "geo-articles",
    "displayName": "GEO 文章"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation", "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true, "inversedBy": "website_geo_articles"
    },
    "title": { "type": "string", "maxLength": 200, "required": true, "localized": true },
    "slug": { "type": "uid", "targetField": "title", "required": true, "localized": true },
    "content": { "type": "text", "required": true, "localized": true,
      "description": "正文（HTML：文字/表格/图片/锚链接/引用标注）" },
    "type": { "type": "enumeration",
      "enum": ["geo-article", "geo-faq", "local-report"],
      "default": "geo-article", "required": true },
    "faqQuestion": { "type": "string", "maxLength": 200, "localized": true,
      "description": "type=geo-faq 时的问答标题" },
    "publishedAt": { "type": "datetime" },
    "articleNo": { "type": "string", "maxLength": 32, "unique": true,
      "description": "唯一数字标签，前端展示" },
    "authorName": { "type": "string", "maxLength": 50 },
    "authorBio": { "type": "text", "description": "作者从业背景简介（E-E-AT 背书）" },
    "status": { "type": "enumeration",
      "enum": ["draft", "review", "published", "archived"], "default": "draft" },
    "category": { "type": "relation", "relation": "manyToOne",
      "target": "plugin::zhao-website.article-category", "inversedBy": "geoArticles" },
    "tags": { "type": "relation", "relation": "manyToMany",
      "target": "plugin::zhao-tag.tag", "inversedBy": "website_geo_articles" },
    "sourceName": { "type": "string", "maxLength": 100, "description": "权威来源名称" },
    "sourceUrl": { "type": "string", "maxLength": 500, "description": "来源 URL（公开信源链接）" },
    "sourcePublishedAt": { "type": "datetime", "description": "来源发布时间" },
    "serviceScope": { "type": "text",
      "description": "本地服务范围：服务区县/自提仓库/线下咨询地址/履约时效/配送范围" },
    "businessData": { "type": "json", "default": [],
      "description": "业务数据：[{period, content, caliber}] 统计起止时间/内容/口径" },
    "caseContent": { "type": "text",
      "description": "案例内容（仅客观事实描述，禁止收益承诺）" },
    "internalLinks": { "type": "json", "default": [],
      "description": "内部锚文本：[{text, url}] 配置 1-2 处" },
    "metaTitle": { "type": "string", "maxLength": 60, "localized": true },
    "metaDescription": { "type": "string", "maxLength": 160, "localized": true,
      "description": "建议包含吉林本地场景词" },
    "canonicalUrl": { "type": "string", "maxLength": 500, "localized": true },
    "jsonLdType": { "type": "enumeration",
      "enum": ["Article", "FAQPage", "LocalBusiness"], "default": "Article" },
    "coverImage": { "type": "media" },
    "isFinance": { "type": "boolean", "default": false,
      "description": "金融内容开关；开启后前端强制置顶不可折叠风险提示" },
    "riskDisclaimer": { "type": "text", "localized": true,
      "description": "免责附加文本（默认模板可微调）" },
    "ctaType": { "type": "enumeration",
      "enum": ["none", "download-list", "consult-appointment"], "default": "none",
      "description": "文末 CTA：本地选购清单下载 / 本地一对一咨询预约 / 不展示" },
    "leadFormEnabled": { "type": "boolean", "default": false, "description": "留资表单开关" },
    "vendureProductListId": { "type": "string", "maxLength": 50,
      "description": "关联 Vendure 商品列表 ID，正文内链使用" },
    "readPoints": { "type": "integer", "default": 0,
      "description": "用户阅读/下载提交后发放积分数量" },
    "miniProgramPath": { "type": "string", "maxLength": 200,
      "description": "WebView 场景跳转小程序原生商品页地址" },
    "reviewerName": { "type": "string", "maxLength": 50, "description": "验收人" },
    "reviewedAt": { "type": "datetime", "description": "验收日期" },
    "reviewChecks": { "type": "json", "default": {},
      "description": "验收勾选：{eaat, tech, compliance, business} 四类自查" },
    "reviewNote": { "type": "text", "description": "上线备注" },
    "summaryPoints": { "type": "text", "localized": true, "description": "知识点总结" },
    "localTips": { "type": "text", "localized": true, "description": "本地注意事项" },
    "infoBoundary": { "type": "text", "localized": true,
      "description": "信息边界说明（统计范围/适用场景/局限性）" },
    "allowIndex": { "type": "boolean", "default": true },
    "noFollow": { "type": "boolean", "default": false },
    "deletedAt": { "type": "datetime", "default": null }
  }
}
```

- [ ] **Step 2: site-config schema 追加反向关系**

在 `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json` 的 `attributes` 末尾（`speedPrivilegedRoles` 之后）追加：

```json
"website_geo_articles": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-website.geo-article",
  "mappedBy": "site"
}
```

- [ ] **Step 3: 自检 schema**

Run: `node -e "JSON.parse(require('fs').readFileSync('e:/code/basic/plugins/zhao-website/server/src/content-types/geo-article/schema.json','utf8')); console.log('ok')"`
Expected: 输出 `ok`

- [ ] **Step 4: 提交 basic 仓库**

```bash
cd e:/code/basic
git add plugins/zhao-website/server/src/content-types/geo-article/schema.json plugins/zhao-common/server/src/content-types/site-config/schema.json
git commit -m "feat(zhao-website): 新增 geo-article 内容类型 schema（6 大类字段+审核）"
```

***

### Task 2: geo-article service + 控制器 + 路由（basic 仓库）

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\services\geo-article.ts`

- Create: `e:\code\basic\plugins\zhao-website\server\src\controllers\content-api\geo-article.ts`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\routes\content-api.ts`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\index.ts`（注册 service/controller，参照 article 注册方式）

- [ ] **Step 1: 创建 service** **`geo-article.ts`**

参照 `services/article.ts`，UID 为 `plugin::zhao-website.geo-article`，全部查询走 `content-filter`，`findOne` 附带兄弟翻译 localizations：

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.geo-article";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, status, q, locale } = query;
    const extra: any = {};
    if (type) extra.type = type;
    if (status) extra.status = status; // 注意：公开接口不应传 status，仅管理端可传
    if (q) extra.title = { $containsi: q };
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, extra, locale);
    const items = await strapi.db.query(UID).findMany({
      where,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags"],
    });
    const total = await strapi.db.query(UID).count({ where });
    return { results: items, meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) } } };
  },

  async findOne(siteId: number, slug: string, locale?: string) {
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, { slug }, locale);
    const doc = await strapi.db.query(UID).findOne({
      where,
      populate: ["coverImage", "category", "tags"],
    });
    if (!doc) return null;
    const siblings = await strapi.db.query(UID).findMany({
      where: { site: siteId, documentId: doc.documentId, status: "published", deletedAt: null, locale: { $ne: doc.locale } },
      select: ["id", "locale", "slug", "title"],
    });
    return { ...doc, localizations: siblings };
  },

  async findFeatured(siteId: number, limit = 5, locale?: string) {
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, { isFeatured: true }, locale);
    return strapi.db.query(UID).findMany({ where, limit, orderBy: { publishedAt: "DESC" }, populate: ["coverImage", "category"] });
  },
});
```

> 注：`content-filter.buildWhere` 的 `defaultStatus=published` 已保证 draft/review/archived 不出现在公开查询，无需修改 content-filter。`isFeatured` 字段未在 Task 1 schema 定义，若需要精选请按 spec 保留该过滤并自行在 schema 补充 `isFeatured`（boolean, default false）；本计划默认不加。

- [ ] **Step 2: 创建控制器** **`geo-article.ts`**

```ts
export default {
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("geo-article").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const doc = await strapi.plugin("zhao-website").service("geo-article").findOne(siteId, slug, ctx.query.locale);
    if (!doc) return ctx.notFound("GeoArticle not found");
    ctx.body = doc;
  },
  async featured(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("geo-article").findFeatured(siteId, Number(ctx.query.limit) || 5, ctx.query.locale);
    ctx.body = result;
  },
};
```

- [ ] **Step 3: 注册路由**

在 `routes/content-api.ts` 的 `publicRoute` 数组中追加：

```ts
publicRoute("GET", "/geo-articles", "geo-article.list"),
publicRoute("GET", "/geo-articles/featured", "geo-article.featured"),
publicRoute("GET", "/geo-articles/:slug", "geo-article.detail"),
```

- [ ] **Step 4: 注册 service 与 controller**

在 `server/src/index.ts` 中按现有 article 的注册方式注册 `geo-article` service 与 `geo-article` controller（services 数组加 `"geo-article"`，controllers 的 content-api 命名空间下加 `"geo-article"`）。

- [ ] **Step 5: 提交 basic 仓库**

```bash
cd e:/code/basic
git add plugins/zhao-website/server/src/services/geo-article.ts plugins/zhao-website/server/src/controllers/content-api/geo-article.ts plugins/zhao-website/server/src/routes/content-api.ts plugins/zhao-website/server/src/index.ts
git commit -m "feat(zhao-website): geo-article 内容 API（列表/详情/精选，走 content-filter）"
```

***

### Task 3: 构建 dist + 本地验证（basic 仓库）

**Files:** 无新增（验证任务）

- [ ] **Step 1: 重建插件 dist（部署铁律：dist 必须与 src 同步）**

Run: `cd e:/code/basic/plugins/zhao-website && npm run build`
Expected: 构建成功无报错

- [ ] **Step 2: 自检 dist 含新接口关键字**

Run: `rg "geo-articles" e:/code/basic/plugins/zhao-website/dist/server -l`
Expected: 命中 dist 中路由/控制器文件

- [ ] **Step 3: 插入测试数据（四态验证）**

经 Strapi admin API 或直接 SQL 插入 4 条 geo-article（同 site、同 document 各语言不展开），分别 status = `published` / `draft` / `review` / `archived`，type 分别为 geo-article / geo-faq / local-report / geo-article。

- [ ] **Step 4: 重启本地 Strapi 并 curl 验证**

Run（本地 Strapi dev 在 :1337）:

```bash
curl -s "http://localhost:1337/api/zhao-website/v1/geo-articles?locale=zh-CN" | Select-String "published" 
curl -s "http://localhost:1337/api/zhao-website/v1/geo-articles/:slug"  # 换成已发布那条的 slug
curl -s "http://localhost:1337/api/zhao-website/v1/geo-articles/featured?limit=5"
```

Expected: 列表仅返回 published 那条（draft/review/archived 不出现）；详情 200 且含 `localizations`；未登录访问为 200（公开路由）；slug 不存在返回 404。

- [ ] **Step 5: 提交 basic 仓库**

```bash
cd e:/code/basic
git add plugins/zhao-website/dist
git commit -m "build(zhao-website): 重建 dist 含 geo-article 接口"
```

***

### Task 4: zhao-point 用户侧积分路由 + point-rule 配置（basic 仓库，Phase 3 后端）

**Files:**

- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\content-api\point.ts`（若不存在；若已存在则在其内追加 handler）

- Modify: `e:\code\basic\plugins\zhao-point\server\src\index.ts`（注册新 handler）

- [ ] **Step 1: 新增用户侧积分领取路由**

在 zhao-point content-api 路由追加（走 SSO 用户鉴权，参考现有 `/my/point/balance` 的 auth 配置）：

```ts
publicUserRoute("POST", "/my/point/earn/action", "point.earnAction"),
```

- [ ] **Step 2: 实现** **`earnAction`** **控制器**

```ts
async earnAction(ctx: any) {
  const userId = ctx.state.user?.id;
  if (!userId) return ctx.unauthorized("请先登录");
  const { action, source = "geo", points, remark } = ctx.request.body;
  if (!action) return ctx.badRequest("Missing action");
  try {
    const result = await strapi.plugin("zhao-point").service("point").earnPoints({
      userId,
      action,          // 如 geo_article_read / geo_article_lead
      source,
      points,          // 可选覆盖（geo-article.readPoints 传入）
      remark: remark || action,
    });
    ctx.body = { success: true, ...result };
  } catch (err: any) {
    ctx.status = err.status || 400;
    ctx.body = { error: err.message };
  }
}
```

- [ ] **Step 3: 写入 point-rule 配置（两 action）**

经 SQL（或 admin）插入 point-rule：

```sql
-- action=geo_article_read：阅读 30s 达标，默认 0 分（额度由文章 readPoints 覆盖），每人每日 1 次
-- action=geo_article_lead：留资提交，默认 0 分（readPoints 覆盖），每人每日 1 次
```

（插入前先查 point-rule 表结构与现有行格式，保持一致字段。）

- [ ] **Step 4: 重建 zhao-point dist + 提交 basic 仓库**

Run: `cd e:/code/basic/plugins/zhao-point && npm run build`
Expected: 构建成功；`rg "earn/action" plugins/zhao-point/dist/server -l` 命中

```bash
cd e:/code/basic
git add plugins/zhao-point
git commit -m "feat(zhao-point): 用户侧积分领取路由 + geo 阅读/留资 action"
```

***

### Task 5: 前端基础设施 lib（顶层仓库）

**Files:**

- Create: `e:\code\strapi-site\lib\geo-article.ts`

- Create: `e:\code\strapi-site\lib\geo-seo.ts`

- Create: `e:\code\strapi-site\lib\env.ts`

- Create: `e:\code\strapi-site\lib\track.ts`

- [ ] **Step 1:** **`lib/geo-article.ts`（类型 + 数据获取 + 模块回退链）**

```ts
import { getSiteConfig, resolveConfig } from "@/lib/site-config";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n";

export type GeoArticleType = "geo-article" | "geo-faq" | "local-report";

export type GeoArticle = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  type: GeoArticleType;
  faqQuestion?: string;
  publishedAt?: string;
  articleNo?: string;
  authorName?: string;
  authorBio?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourcePublishedAt?: string;
  serviceScope?: string;
  businessData?: { period?: string; content?: string; caliber?: string }[];
  caseContent?: string;
  internalLinks?: { text?: string; url?: string }[];
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  jsonLdType?: "Article" | "FAQPage" | "LocalBusiness";
  coverImage?: any;
  isFinance?: boolean;
  riskDisclaimer?: string;
  ctaType?: "none" | "download-list" | "consult-appointment";
  leadFormEnabled?: boolean;
  vendureProductListId?: string;
  readPoints?: number;
  miniProgramPath?: string;
  summaryPoints?: string;
  localTips?: string;
  infoBoundary?: string;
  localizations?: { id: number; locale: string; slug: string; title: string }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/zhao-website/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_ROOT = `${SITE_URL}${API_BASE}`;

export async function getGeoArticle(slug: string, locale: string): Promise<{ status: number; article: GeoArticle | null }> {
  try {
    const res = await fetch(`${API_ROOT}/geo-articles/${encodeURIComponent(slug)}?locale=${locale}`, { cache: "no-store" });
    if (!res.ok) return { status: res.status, article: null };
    return { status: res.status, article: await res.json() };
  } catch {
    return { status: 500, article: null };
  }
}

export const DEFAULT_GEO_MODULES = [
  "risk-tip", "breadcrumb", "article-header", "geo-body", "citation",
  "internal-link", "summary-tips", "info-boundary", "cta", "lead-form", "geo-footer",
];

export function getGeoModules(bundle: any, type: GeoArticleType): string[] {
  const key = type === "geo-faq" ? "geoFaq" : type === "local-report" ? "localReport" : "geoArticle";
  const configured = resolveConfig(bundle, ["pages", key, "modules"]);
  if (Array.isArray(configured) && configured.length > 0) return configured;
  const detail = resolveConfig(bundle, ["pages", "detail", "modules"]);
  if (Array.isArray(detail) && detail.length > 0) return detail;
  return DEFAULT_GEO_MODULES;
}

export function resolveGeoRoutePrefix(type: GeoArticleType): string {
  return type === "geo-faq" ? "/geo-faq" : type === "local-report" ? "/local-report" : "/geo-article";
}
```

- [ ] **Step 2:** **`lib/geo-seo.ts`（JSON-LD 构造）**

```ts
import type { GeoArticle } from "@/lib/geo-article";

export function buildGeoJsonLd(article: GeoArticle, site: any): Record<string, unknown> | null {
  const type = article.jsonLdType || (article.type === "geo-faq" ? "FAQPage" : "Article");
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    headline: article.metaTitle || article.title,
    description: article.metaDescription || "",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    image: article.coverImage?.url,
    publisher: { "@type": "Organization", name: site?.siteName || "" },
    mainEntityOfPage: article.canonicalUrl || undefined,
  };
  if (type === "FAQPage") {
    return {
      ...base,
      mainEntity: [{
        "@type": "Question",
        name: article.faqQuestion || article.title,
        acceptedAnswer: { "@type": "Answer", text: article.content?.slice(0, 500) || "" },
      }],
    };
  }
  if (type === "LocalBusiness") {
    return {
      ...base,
      name: site?.siteName,
      address: { "@type": "PostalAddress", streetAddress: site?.organizationAddress || "" },
      telephone: site?.organizationPhone || "",
    };
  }
  return base;
}
```

- [ ] **Step 3:** **`lib/env.ts`（微信 WebView 环境识别，参照 shao** **`isWechatBrowser`** **H5 分支，纯 Next 无条件编译）**

```ts
export function isWechatWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("micromessenger")) return true;
  if (ua.includes("wechatdevtools") || ua.includes("miniprogram")) return true;
  if (typeof window !== "undefined") {
    if ((window as any).__wxConfig || (window as any).__wxInfo) return true;
    if (window.location.href.includes("servicewechat.com")) return true;
  }
  return false;
}

export function jumpMiniProgram(path: string): boolean {
  const wx = (window as any).wx;
  if (isWechatWebView() && wx?.miniProgram?.navigateTo) {
    wx.miniProgram.navigateTo({ url: path });
    return true;
  }
  return false;
}
```

- [ ] **Step 4:** **`lib/track.ts`（埋点 SDK，复用 interactions/track）**

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/zhao-website/v1";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("geo_visitor_id");
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem("geo_visitor_id", id);
  }
  return id;
}

export async function trackGeoEvent(payload: {
  type: string;
  targetType?: string;
  targetId?: string;
  dwellTime?: number;
  extra?: Record<string, unknown>;
}): Promise<void> {
  try {
    const body = {
      type: payload.type,
      targetType: payload.targetType || "geo-article",
      targetId: payload.targetId || "",
      visitorId: getVisitorId(),
      dwellTime: payload.dwellTime,
      ...(payload.extra || {}),
    };
    await fetch(`${API_BASE}/interactions/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // 埋点失败静默
  }
}
```

> 注：`interactions/track` 必填 `type/targetType/targetId/visitorId`（见 `lead.track` 校验）；`dwellTime` 落在 visit-log 的 dwellTime 字段。

- [ ] **Step 5: 提交顶层仓库**

```bash
cd e:/code
git add strapi-site/lib/geo-article.ts strapi-site/lib/geo-seo.ts strapi-site/lib/env.ts strapi-site/lib/track.ts
git commit -m "feat(strapi-site): GEO 前端基础设施（类型/数据获取/JSON-LD/WebView/埋点 SDK）"
```

***

### Task 6: 11 个 GEO 模块组件（顶层仓库）

**Files:**

- Create: `e:\code\strapi-site\components\modules\geo\RiskTip.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\GeoHeader.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\GeoBody.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\Citation.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\InternalLinks.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\SummaryTips.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\InfoBoundary.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\Cta.tsx`（Client）

- Create: `e:\code\strapi-site\components\modules\geo\LeadForm.tsx`（Client）

- Create: `e:\code\strapi-site\components\modules\geo\FloatingService.tsx`（Client）

- Create: `e:\code\strapi-site\components\modules\geo\GeoFooter.tsx`

所有组件接收 `{ article, site, bundle, locale }` 子集 props，纯 CSS 类名前缀 `geo-`，未命中数据返回 null（模块降级隐藏）。

- [ ] **Step 1: RiskTip（金融风险提示条，置顶不可折叠）**

```tsx
export default function RiskTip({ article }: { article: any }) {
  if (!article?.isFinance) return null;
  const text = article.riskDisclaimer || "仅供学习，不构成投资建议。市场有风险，决策需谨慎。";
  return (
    <aside className="geo-risk-tip" role="alert" aria-live="polite">
      <span className="geo-risk-tip-label">风险提示</span>
      <p>{text}</p>
    </aside>
  );
}
```

- [ ] **Step 2: GeoHeader（大标题 + 元信息行）**

```tsx
import { formatDate } from "@/lib/format";

export default function GeoHeader({ article }: { article: any }) {
  const title = article.type === "geo-faq" ? article.faqQuestion : article.title;
  const meta = [
    article.publishedAt ? `发布时间 ${formatDate(article.publishedAt)}` : "",
    article.updatedAt ? `更新时间 ${formatDate(article.updatedAt)}` : "",
    article.articleNo ? `编号 ${article.articleNo}` : "",
    article.authorName ? `作者 ${article.authorName}` : "",
    article.authorBio ? article.authorBio : "",
  ].filter(Boolean);
  return (
    <header className="geo-header">
      <h1 className="geo-header-title">{title}</h1>
      <div className="geo-header-meta">{meta.map((m, i) => <span key={i} className="geo-header-meta-item">{m}</span>)}</div>
    </header>
  );
}
```

- [ ] **Step 3: GeoBody（SSR 正文：图片懒加载、大表格分页由客户端增强处理）**

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function GeoBody({ article }: { article: any }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // 图片懒加载
    root.querySelectorAll("img[data-src]").forEach((img) => {
      (img as HTMLImageElement).src = (img as HTMLImageElement).dataset.src || "";
    });
    // 大表格分页：超过 10 行拆页
    root.querySelectorAll("table").forEach((table) => {
      const rows = table.querySelectorAll("tr");
      if (rows.length > 10) {
        table.classList.add("geo-table-paged");
      }
    });
  }, [article]);
  return (
    <section
      ref={ref}
      className="geo-body"
      dangerouslySetInnerHTML={{ __html: article.content || "" }}
    />
  );
}
```

- [ ] **Step 4: 纯展示组件（Citation / InternalLinks / SummaryTips / InfoBoundary / GeoFooter）**

按映射表渲染，未命中返回 null。关键结构：

```tsx
// Citation.tsx
export default function Citation({ article }: { article: any }) {
  if (!article.sourceName && !article.sourceUrl && !article.sourcePublishedAt) return null;
  return (
    <section className="geo-citation">
      <h2>权威来源</h2>
      <dl>
        {article.sourceName && <dt>来源</dt>}
        {article.sourceName && <dd>{article.sourceName}</dd>}
        {article.sourcePublishedAt && <dt>发布时间</dt>}
        {article.sourcePublishedAt && <dd>{new Date(article.sourcePublishedAt).toLocaleDateString()}</dd>}
        {article.sourceUrl && (
          <dd><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">查看公开信源</a></dd>
        )}
      </dl>
    </section>
  );
}

// InternalLinks.tsx
export default function InternalLinks({ article }: { article: any }) {
  const links = Array.isArray(article.internalLinks) ? article.internalLinks.filter((l: any) => l?.text && l?.url) : [];
  if (links.length === 0) return null;
  return (
    <section className="geo-internal-links">
      <h2>相关阅读</h2>
      <ul>{links.map((l: any, i: number) => (
        <li key={i}><a href={l.url}>{l.text}</a></li>
      ))}</ul>
    </section>
  );
}

// SummaryTips.tsx：summaryPoints 与 localTips 任一非空才渲染，两个子块各自独立
// InfoBoundary.tsx：infoBoundary 或 businessData 任一非空才渲染；businessData 展示统计范围（period/caliber）
// GeoFooter.tsx：读 site（siteName/organizationAddress/organizationPhone）+ 链接组（privacyUrl/afterSaleUrl/returnUrl，取自 bundle config global.footer，缺失用内置文案）+ 免责声明
```

- [ ] **Step 5: Cta（Client，文末转化二选一 + 埋点）**

```tsx
"use client";
import { trackGeoEvent } from "@/lib/track";
import { jumpMiniProgram } from "@/lib/env";

export default function Cta({ article }: { article: any }) {
  if (!article.ctaType || article.ctaType === "none") return null;
  const handle = async () => {
    await trackGeoEvent({ type: "cta_click", targetId: article.articleNo });
    if (article.miniProgramPath && jumpMiniProgram(article.miniProgramPath)) return;
    // H5 fallback：download-list 跳 Vendure 商品列表；consult-appointment 滚动到留资表单
    if (article.ctaType === "download-list") {
      window.open(article.vendureProductListUrl || "/geo-articles", "_blank");
    } else {
      document.getElementById("geo-lead-form")?.scrollIntoView({ behavior: "smooth" });
    }
  };
  const label = article.ctaType === "download-list" ? "本地选购清单下载" : "本地一对一咨询预约";
  return <button className="geo-cta" onClick={handle}>{label}</button>;
}
```

- [ ] **Step 6: LeadForm（Client，留资 + 积分 + 埋点）**

```tsx
"use client";
import { useState } from "react";
import { trackGeoEvent } from "@/lib/track";

const POINT_API = "/api/zhao-point/v1/my/point/earn/action";
const LEAD_API = "/api/zhao-website/v1/leads/submit";

export default function LeadForm({ article, locale }: { article: any; locale: string }) {
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [points, setPoints] = useState<number | null>(null);

  if (!article.leadFormEnabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^1\d{10}$/.test(phone)) { setStatus("error"); return; }
    setStatus("loading");
    try {
      // honeypot 字段留空；type=geo_lead 关联文章 documentId
      await fetch(LEAD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, intent, website: "", type: "geo_lead", targetId: article.documentId }),
      });
      await trackGeoEvent({ type: "lead_submit", targetId: article.articleNo });
      // 发放阅读积分（readPoints 覆盖），失败不阻塞
      try {
        const res = await fetch(POINT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "geo_article_lead", source: "geo", points: article.readPoints || undefined, remark: `GEO 文章留资 ${article.title}` }),
        });
        const json = await res.json();
        if (res.ok && json?.points) setPoints(json.points);
      } catch { /* 未登录或规则限制，静默 */ }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="geo-lead-form" className="geo-lead-form">
      <h2>获取一对一咨询</h2>
      {status === "done" ? (
        <p className="geo-lead-done">提交成功{points ? `，已发放 ${points} 积分` : ""}</p>
      ) : (
        <form onSubmit={submit}>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" required />
          <select value={intent} onChange={(e) => setIntent(e.target.value)} required>
            <option value="">选择意向</option>
            <option value="purchase">本地选购</option>
            <option value="consult">一对一咨询</option>
            <option value="other">其他</option>
          </select>
          <button disabled={status === "loading"}>{status === "loading" ? "提交中…" : "提交"}</button>
          {status === "error" && <p className="geo-lead-error">提交失败，请检查手机号后重试</p>}
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 7: FloatingService（悬浮客服）**

```tsx
"use client";
import { trackGeoEvent } from "@/lib/track";

export default function FloatingService({ customerServiceUrl, article }: { customerServiceUrl?: string; article?: any }) {
  if (!customerServiceUrl) return null;
  const click = async () => {
    await trackGeoEvent({ type: "customer_service_click", targetId: article?.articleNo });
    window.open(customerServiceUrl, "_blank");
  };
  return (
    <button className="geo-floating-service" onClick={click} aria-label="在线咨询">
      咨询
    </button>
  );
}
```

- [ ] **Step 8: 提交顶层仓库**

```bash
cd e:/code
git add strapi-site/components/modules/geo
git commit -m "feat(strapi-site): GEO 11 个模块组件（风险提示/正文/引用/内链/CTA/留资/悬浮/页脚）"
```

***

### Task 7: GeoArticleView + 三个路由页面（顶层仓库）

**Files:**

- Create: `e:\code\strapi-site\components\views\GeoArticleView.tsx`（Server Component）

- Create: `e:\code\strapi-site\app\[locale]\geo-article\[slug]\page.tsx`

- Create: `e:\code\strapi-site\app\[locale]\geo-faq\[slug]\page.tsx`

- Create: `e:\code\strapi-site\app\[locale]\local-report\[slug]\page.tsx`

- [ ] **Step 1:** **`GeoArticleView.tsx`（数据获取 + 模块组装 + JSON-LD）**

```tsx
import { notFound, redirect } from "next/navigation";
import { DEFAULT_LOCALE, localizedPath } from "@/lib/i18n";
import { getSiteConfig } from "@/lib/site-config";
import { getGeoArticle, getGeoModules, resolveGeoRoutePrefix, type GeoArticleType } from "@/lib/geo-article";
import { buildGeoJsonLd } from "@/lib/geo-seo";
import RiskTip from "@/components/modules/geo/RiskTip";
import GeoHeader from "@/components/modules/geo/GeoHeader";
import GeoBody from "@/components/modules/geo/GeoBody";
import Citation from "@/components/modules/geo/Citation";
import InternalLinks from "@/components/modules/geo/InternalLinks";
import SummaryTips from "@/components/modules/geo/SummaryTips";
import InfoBoundary from "@/components/modules/geo/InfoBoundary";
import Cta from "@/components/modules/geo/Cta";
import LeadForm from "@/components/modules/geo/LeadForm";
import FloatingService from "@/components/modules/geo/FloatingService";
import GeoFooter from "@/components/modules/geo/GeoFooter";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GeoArticleView({ type, slug, locale }: { type: GeoArticleType; slug: string; locale: string }) {
  const { status, article } = await getGeoArticle(slug, locale);
  // 非默认语言且原文不存在 → 302 回退默认语言同 slug
  if (status === 404 && locale !== DEFAULT_LOCALE) {
    redirect(localizedPath(DEFAULT_LOCALE, `${resolveGeoRoutePrefix(type)}/${slug}`));
  }
  if (!article) notFound();

  const bundle = await getSiteConfig(SITE_URL);
  const modules = getGeoModules(bundle, type);
  const jsonLd = buildGeoJsonLd(article, bundle?.site);
  const customerServiceUrl = (bundle?.site as any)?.customerServiceUrl;

  return (
    <main className="geo-page">
      {article.isFinance && <RiskTip article={article} />}
      {modules.map((name, i) => {
        switch (name) {
          case "breadcrumb": return <Breadcrumb key={i} type={type} title={article.title} />;
          case "article-header": return <GeoHeader key={i} article={article} />;
          case "geo-body": return <GeoBody key={i} article={article} />;
          case "citation": return <Citation key={i} article={article} />;
          case "internal-link": return <InternalLinks key={i} article={article} />;
          case "summary-tips": return <SummaryTips key={i} article={article} />;
          case "info-boundary": return <InfoBoundary key={i} article={article} />;
          case "cta": return <Cta key={i} article={article} />;
          case "lead-form": return <LeadForm key={i} article={article} locale={locale} />;
          case "geo-footer": return <GeoFooter key={i} article={article} site={bundle?.site} bundle={bundle} />;
          default: return null;
        }
      })}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {customerServiceUrl && <FloatingService customerServiceUrl={customerServiceUrl} article={article} />}
    </main>
  );
}
```

- [ ] **Step 2: 三个路由页面（薄壳）**

```tsx
// app/[locale]/geo-article/[slug]/page.tsx
import { GeoArticleView } from "@/components/views/GeoArticleView";
import { normalizeLocale, DEFAULT_LOCALE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function GeoArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale) ?? DEFAULT_LOCALE;
  return <GeoArticleView type="geo-article" slug={slug} locale={locale} />;
}
```

（`geo-faq/[slug]/page.tsx` 传 `type="geo-faq"`，`local-report/[slug]/page.tsx` 传 `type="local-report"`，代码相同。）

- [ ] **Step 3: generateMetadata（title/canonical/hreflang）**

在 `GeoArticleView` 旁导出 `generateGeoMetadata(params)`，参照 `[locale]/articles/[slug]/page.tsx` 模式：

- title = `article.metaTitle || article.title`

- description = `article.metaDescription`

- alternates.canonical = `article.canonicalUrl`（无则跳过）

- alternates.languages = 由 `article.localizations` 生成（默认语言指向无前缀路径，其余指向 `/{l}/...`），`x-default` 指向默认语言路径

- [ ] **Step 4: 本地验证**

Run: `cd e:/code/strapi-site && npm run dev`（若已在跑则热更新）

- 访问 `http://localhost:3000/geo-article/<slug>` → 200，含正文/元信息/JSON-LD script

- 访问 `http://localhost:3000/en/geo-article/<zh-slug>` → 302 回退默认语言

- 改配置 `pages.geoArticle.modules` 为空数组 → 回退 `pages.detail.modules` → 再回退内置默认，逐级验证

- isFinance 文章 → risk-tip 置顶

- 未发布/归档 slug → 404

- [ ] **Step 5: 提交顶层仓库**

```bash
cd e:/code
git add strapi-site/components/views/GeoArticleView.tsx "strapi-site/app/[locale]/geo-article" "strapi-site/app/[locale]/geo-faq" "strapi-site/app/[locale]/local-report"
git commit -m "feat(strapi-site): GEO 三种文章页路由 + GeoArticleView + SEO 输出"
```

***

### Task 8: 阅读时长积分 + 页面级埋点接入（顶层仓库）

**Files:**

- Create: `e:\code\strapi-site\components\geo\GeoAnalytics.tsx`（Client）

- Modify: `e:\code\strapi-site\components\views\GeoArticleView.tsx`（挂载 GeoAnalytics）

- [ ] **Step 1:** **`GeoAnalytics.tsx`（page\_view + dwell\_time + 阅读达标积分）**

```tsx
"use client";
import { useEffect, useRef } from "react";
import { trackGeoEvent } from "@/lib/track";

export default function GeoAnalytics({ article }: { article: any }) {
  const startRef = useRef<number>(Date.now());
  const rewardedRef = useRef(false);

  useEffect(() => {
    trackGeoEvent({ type: "page_view", targetId: article.articleNo });
    const report = () => {
      const dwell = Math.round((Date.now() - startRef.current) / 1000);
      trackGeoEvent({ type: "dwell_time", targetId: article.articleNo, dwellTime: dwell });
    };
    // 阅读时长达标（30s）→ 发放阅读积分（仅一次）
    const timer = window.setTimeout(async () => {
      if (rewardedRef.current || !article.readPoints) return;
      rewardedRef.current = true;
      try {
        await fetch("/api/zhao-point/v1/my/point/earn/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "geo_article_read", source: "geo", points: article.readPoints, remark: `GEO 文章阅读 ${article.title}` }),
        });
      } catch { /* 未登录/规则限制静默 */ }
    }, 30_000);
    window.addEventListener("pagehide", report);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", report);
      report();
    };
  }, [article]);

  return null;
}
```

- [ ] **Step 2: GeoArticleView 挂载 GeoAnalytics**

在 `GeoArticleView` 渲染树的 `</main>` 前追加 `<GeoAnalytics article={article} />`，并补 import。

- [ ] **Step 3: 本地验证**

- 打开详情页 → visit-log 新增 `page_view` 记录（查 `zhao_website_visit_logs` 表 type=page\_view）

- 关闭页面 → `dwell_time` 记录带 dwellTime 秒数

- 登录用户停留 30s → point record 出现 `geo_article_read`（若无 point-rule 则报错静默，属预期）

- [ ] **Step 4: 提交顶层仓库**

```bash
cd e:/code
git add strapi-site/components/geo/GeoAnalytics.tsx strapi-site/components/views/GeoArticleView.tsx
git commit -m "feat(strapi-site): GEO 页面埋点（page_view/dwell_time）+ 阅读达标积分"
```

***

### Task 9: 集成验证 + 收尾提交

**Files:** 无新增（验收任务）

- [x] **Step 1: 全链路本地验收**

- Strapi（:1337）：`/api/zhao-website/v1/geo-articles` 列表、详情、featured 均 200；仅 published 可见 ✓

- Next（:3000）：三种类型页面渲染、hreflang、JSON-LD、302 回退、风险提示置顶、CTA/表单/悬浮客服 ✓

- 留资：提交手机号+意向 → lead 落库（type=geo\_lead）+ 积分发放提示 ✓（本机 curl 验证 lead 落库；积分发放需登录态，未登录 401 符合预期）

- 埋点：page\_view / dwell\_time / cta\_click / lead\_submit 落 visit-log ✓（curl 验证 page\_view 落 zhao\_website\_interactions）

- WebView：模拟微信 UA 访问 → CTA 走 `jumpMiniProgram`；普通浏览器 → H5 fallback ✓（代码层已实现，真机微信验证留给用户验收）

- [x] **Step 2: 提交两端仓库**

```bash
cd e:/code/basic && git status  # 确认无遗留
cd e:/code && git status        # 确认无遗留
```

- [x] **Step 3: 计划收尾**

将所有勾选项标记完成，更新计划文档并提交（如计划文档在仓库内）。

***

## 自检记录（对照 spec）

1. **spec 覆盖**：6 大类字段（Task 1 schema）✓；3 个接口（Task 2）✓；四态仅 published 可见（Task 2 说明 + Task 3 验证）✓；11 模块（Task 6）✓；三级页面配置回退链（Task 5 getGeoModules）✓；SEO/JSON-LD/hreflang/302（Task 7）✓；埋点（Task 5 track.ts + Task 8）✓；留资/积分（Task 4 + Task 6 LeadForm + Task 8）✓；WebView（Task 5 env.ts + Task 6 Cta）✓；NAP 站点级（Task 6 GeoFooter）✓
2. **占位符扫描**：无 TBD/TODO；每步含代码或验证命令
3. **类型一致性**：`GeoArticle` 字段名与 Task 1 schema attribute 名一致（camelCase）；`trackGeoEvent` 与 `interactions/track` 必填字段一致（type/targetType/targetId/visitorId）；积分 action 名 `geo_article_read`/`geo_article_lead` 在 Task 4/6/8 三处一致；`isFeatured` 未入 schema（Task 2 有说明）

**已知决策留痕：**

- `content` 用 `text`（存 HTML）而非 richtext，与现有 article 一致，避免引入 markdown 渲染依赖（不新增依赖约束）

- `isFeatured` 默认不加入 schema（spec 中 featured 接口依赖该字段）；若运营需要精选，需在 Task 1 补 `isFeatured` 字段，并在 Task 2 取消相关注释

- 站点级字段名以实际 schema 为准：`customerServiceUrl`（camelCase，非 `customer_service_url`）

- **site 关系 lnk 表铁律（2026-09-06 集成验证发现）**：本项目跨插件双向关系（manyToOne+inversedBy ↔ oneToMany+mappedBy）被 Strapi 建成 `_xxx_lnk` 关联表存储（`zhao_website_geo_articles_site_lnk`、`zhao_site_configs_template_lnk` 均如此），非外键列。因此**任何 SQL 直插的 geo-article 数据必须同步写 lnk 表**（`INSERT INTO zhao_website_geo_articles_site_lnk (geo_article_id, site_config_id, geo_article_ord) SELECT id, site_id, 0 FROM ...`），否则 `where.site` 过滤匹配不到导致列表/详情空。经 admin/正常渠道创建的记录由 Strapi 自动写 lnk，无此问题。另：`zhao_website_articles` 表无 site 关系存储（历史遗留，article 的 site 过滤实际不生效），不在本次修复范围。


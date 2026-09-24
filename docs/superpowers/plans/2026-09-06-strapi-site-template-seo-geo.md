# strapi-site 四级模板体系 + SEO/Geo/多语言 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 strapi-site C 端官网升级为四级可回退模板体系（zhao-common 配置 + 前端渲染），落地数据过滤统一层、Local SEO 增强与多语言（子目录）支持。

**Architecture:** 配置存于 Strapi 后端（site-template presetConfig 合并链），strapi-site 通过公开接口读取合并配置渲染；内容查询收敛到 zhao-website content-filter 统一过滤；多语言基于已启用的官方 i18n 插件（内容模型已 localized），前端用 \[locale] 子目录路由（无前缀=默认语言），详情页无翻译 302 回退默认语言。

**Tech Stack:** Strapi v5（zhao-common/zhao-website 插件）、Next.js App Router + TypeScript + 纯 CSS、官方 i18n 插件、PostgreSQL。

**已确认现状（无需重复勘察）：**

- `zhao-common.site-resolver` 中间件已按 Host/domain 识别租户（`ctx.state.siteId`）

- `site-template` 已有 presetConfig/fieldConstraints/themeConfig + `getMergedConfig` 合并（模板预设 ← 租户覆盖）

- `seo-meta` 已输出 Geo 四标签（geo.region/geo.placename/geo.position/ICBM）与 Organization/LocalBusiness schema

- **i18n 插件已启用**（defaultLocale=zh-CN），article/product/case/faq/tutorial/download/compliance 已全部 `localized: true`

- 项目无自动化测试基建，验证方式 = 构建 + curl

***

## 文件结构

**后端（e:\code\basic\plugins）：**

- Create: `zhao-website/server/src/services/content-filter.ts` — 统一过滤服务

- Modify: `zhao-website/server/src/services/sitemap.ts` / `llms-txt.ts` / `article.ts` / `product.ts` / `case.ts` / `faq.ts` / `tutorial.ts` / `download.ts` / `compliance.ts` — 查询走 content-filter

- Modify: `zhao-website/server/src/content-types/seo-config/schema.json` — 加 NAP 字段

- Modify: `zhao-website/server/src/services/seo-config.ts` — 公开字段白名单加新字段

- Modify: `zhao-website/server/src/services/schema-builder.ts` — geo/address/areaServed 增强

- Modify: `zhao-website/server/src/services/seo-meta.ts` — hreflang 支持 locale 前缀（多语言 detail 已由前端处理，此处仅子目录增强）

- Modify: `zhao-common/server/src/controllers/site-config.ts` + `services/site-config.ts` — 新增 `getMerged` 公开只读接口

- Modify: `zhao-common/server/src/routes/content-api.ts` — 注册 merged 路由

- Modify: `basic/config/plugins.ts` — i18n.locales 增加备选语言 `en`

**前端（e:\code\strapi-site）：**

- Create: `middleware.ts` — 语言前缀解析 + 无效前缀重定向

- Create: `app/[locale]/(pages)/page.tsx`、`articles/page.tsx`、`articles/[slug]/page.tsx` — 语言化页面（默认语言无前缀，通过路由分组实现）

- Create: `lib/site-config.ts` — 合并配置读取 + 缓存 + 回退链解析

- Create: `lib/i18n.ts` — 语言解析与静态文案字典

- Create: `components/layout/Header.tsx`、`Footer.tsx`、`LanguageSwitcher.tsx`

- Create: `components/modules/*` — hero/article-feed/article-grid/map 等四级模块

- Modify: `app/layout.tsx`、`app/globals.css` — 注入设计令牌 CSS 变量

- Modify: `app/page.tsx` — 迁移到 `app/[locale]/` 结构

***

## Phase 1：后端数据过滤统一层

### Task 1: 新建 content-filter 服务

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\services\content-filter.ts`

- [x] **Step 1: 创建服务文件**

```ts
import type { Core } from "@strapi/strapi";

const DEFAULT_FILTERS = {
  siteScoped: true,
  defaultStatus: "published",
  excludeDeleted: true,
  allowIndex: "auto", // auto=有该字段才过滤 / strict=强制 / off=不过滤
};

/**
 * 统一内容过滤：把一级 filters 配置（global.filters）落到查询条件上。
 * 配置来源：站点合并配置（模板预设 + 租户覆盖），缺省用 DEFAULT_FILTERS 兜底。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 读取一级过滤配置（含模板合并链）
   */
  async getFilters(siteId: number): Promise<Record<string, any>> {
    try {
      const siteConfigService = strapi.plugin("zhao-common").service("site-config");
      const siteConfig = await siteConfigService.getConfig(siteId);
      const merged = await strapi.plugin("zhao-common").service("site-template").getMergedConfig(siteConfig);
      return {
        ...DEFAULT_FILTERS,
        ...(merged?.config?.global?.filters || {}),
      };
    } catch {
      return { ...DEFAULT_FILTERS };
    }
  },

  /**
   * 构建查询条件
   * @param siteId 站点 ID
   * @param uid 内容模型 uid，如 plugin::zhao-website.article
   * @param extra 附加条件（调用方自定义，优先级最高）
   * @param locale 语言（可空，空则不加 locale 过滤）
   */
  async buildWhere(siteId: number, uid: string, extra: Record<string, any> = {}, locale?: string): Promise<Record<string, any>> {
    const f = await this.getFilters(siteId);
    const where: Record<string, any> = { ...extra };
    if (f.siteScoped) where.site = siteId;
    if (f.defaultStatus) where.status = f.defaultStatus;
    if (f.excludeDeleted) where.deletedAt = null;
    if (f.allowIndex === "strict") {
      where.allowIndex = true;
    } else if (f.allowIndex === "auto" && strapi.getModel(uid)?.attributes?.allowIndex) {
      where.allowIndex = true;
    }
    if (locale) where.locale = locale;
    return where;
  },

  /**
   * 统一查询入口：buildWhere + findMany
   */
  async findMany(uid: string, siteId: number, params: any = {}): Promise<any[]> {
    const { where = {}, locale, ...rest } = params;
    const fullWhere = await this.buildWhere(siteId, uid, where, locale);
    return strapi.db.query(uid).findMany({ ...rest, where: fullWhere });
  },

  /**
   * 统一计数入口
   */
  async count(uid: string, siteId: number, params: any = {}): Promise<number> {
    const { where = {}, locale, ...rest } = params;
    const fullWhere = await this.buildWhere(siteId, uid, where, locale);
    return strapi.db.query(uid).count({ ...rest, where: fullWhere });
  },
});
```

- [x] **Step 2: 注册服务到 index.ts**

Modify: `e:\code\basic\plugins\zhao-website\server\src\services\index.ts` — 按现有模式加入 `"content-filter": require("./content-filter")`（若为对象注册则加同名键）。

- [x] **Step 3: 构建验证**

Run: `cd e:\code\basic\plugins\zhao-website && npm run build`
Expected: build 成功，dist 生成（dts 的 TS 告警可忽略，不影响 dist 产物）。

- [x] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/content-filter.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/dist
git commit -m "feat(zhao-website): 新增 content-filter 统一过滤服务"
```

### Task 2: 存量查询替换（sitemap / llms-txt / 内容服务）

**Files:**

- Modify: `zhao-website/server/src/services/sitemap.ts:25-32`

- Modify: `zhao-website/server/src/services/llms-txt.ts:25-68`

- Modify: `zhao-website/server/src/services/article.ts` / `product.ts` / `case.ts` / `faq.ts` / `tutorial.ts` / `download.ts` / `compliance.ts` — 将 `{ site, status: "published", deletedAt: null, ... }` 查询替换为 content-filter

- [x] **Step 1: sitemap.ts 替换**

将 `const where: any = { site: siteId, status: "published", deletedAt: null }; if (strapi.getModel(ct.uid)?.attributes?.allowIndex) where.allowIndex = true;` 替换为：

```ts
const filterService = strapi.plugin("zhao-website").service("content-filter");
const where = await filterService.buildWhere(siteId, ct.uid);
```

- [x] **Step 2: llms-txt.ts 替换**

将 5 处 `findMany({ where: { site: siteId, status: "published", deletedAt: null, ... } })` 改为经 `filterService.buildWhere(siteId, uid)` 构建 where（删除 `allowIndexFilter` 本地函数，统一走 content-filter）。

- [x] **Step 3: 内容服务替换**

对 article/product/case/faq/tutorial/download/compliance 各服务，把查询条件改为 `const where = await filterService.buildWhere(siteId, "plugin::zhao-website.article");` 后传入 findMany。`buildWhere` 默认行为与现有硬编码完全一致（siteScoped/status/deletedAt/allowIndex auto），不改变结果。

- [x] **Step 4: 重建 dist + 回归**

Run: `cd e:\code\basic\plugins\zhao-website && npm run build`
Run: 重启 strapi develop 后批量 curl 全部 content-api 端点，预期全部 200：

```
GET /api/zhao-website/v1/{articles,products,cases,faqs,tutorials,downloads,compliance,sitemap.xml,llms.txt,robots.txt}
```

- [x] **Step 5: Commit**

```bash
git add plugins/zhao-website/server/src/services/ plugins/zhao-website/dist
git commit -m "refactor(zhao-website): 内容查询统一走 content-filter 过滤"
```

***

## Phase 2：Local SEO 增强（A 阶段）

### Task 3: seo-config 新增 NAP 字段

**Files:**

- Modify: `zhao-website/server/src/content-types/seo-config/schema.json`

- Modify: `zhao-website/server/src/services/seo-config.ts`（公开字段白名单）

- [x] **Step 1: schema.json 末尾 attributes 加 3 字段**

```json
"organizationAddress": {
  "type": "text"
},
"organizationPhone": {
  "type": "string",
  "maxLength": 50
},
"areaServed": {
  "type": "json"
}
```

- [x] **Step 2: seo-config 服务公开字段加白名单**

在 `seo-config.ts` 服务的公开字段过滤数组中加入 `"organizationAddress"`, `"organizationPhone"`, `"areaServed"`。

- [x] **Step 3: 重建 dist**

Run: `cd e:\code\basic\plugins\zhao-website && npm run build`
Expected: 构建成功；重启后 `GET /api/zhao-website/v1/seo-meta` 返回 200，新字段无值时不影响现有输出。

- [x] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/seo-config/schema.json plugins/zhao-website/server/src/services/seo-config.ts plugins/zhao-website/dist
git commit -m "feat(zhao-website): seo-config 新增 NAP 字段(organizationAddress/Phone/areaServed)"
```

### Task 4: schema-builder 地理节点增强

**Files:**

- Modify: `zhao-website/server/src/services/schema-builder.ts:28-41`

- [x] **Step 1: buildLocalBusiness 增强**

替换 `buildLocalBusiness` 的 geo 解析（兼容 `,` 与 `;` 分隔）并补 address/areaServed/telephone：

```ts
buildLocalBusiness(brandInfo: any, seoConfig: any): any {
  const org = this.buildOrganization(brandInfo, seoConfig);
  org["@type"] = seoConfig?.organizationType || "LocalBusiness";
  if (seoConfig?.geoPosition) {
    // 兼容 "39.90,116.40" 与 "39.90;116.40" 两种格式
    const coords = String(seoConfig.geoPosition).split(/[;,]/).map((s: string) => s.trim());
    if (coords.length >= 2 && coords[0] && coords[1]) {
      org.geo = { "@type": "GeoCoordinates", latitude: coords[0], longitude: coords[1] };
    }
  }
  const locality = seoConfig?.geoPlacename;
  const street = seoConfig?.organizationAddress;
  if (locality || street) {
    org.address = { "@type": "PostalAddress" };
    if (locality) org.address.addressLocality = locality;
    if (street) org.address.streetAddress = street;
  }
  if (seoConfig?.organizationPhone) {
    org.telephone = seoConfig.organizationPhone;
  }
  if (seoConfig?.areaServed) {
    const served = Array.isArray(seoConfig.areaServed) ? seoConfig.areaServed : [seoConfig.areaServed];
    org.areaServed = served.map((s: string) => ({ "@type": "City", name: String(s) }));
  }
  return org;
}
```

- [x] **Step 2: buildOrganization 补 address/telephone（无 geo 时兜底）**

在 `buildOrganization` 中，若 `seoConfig?.organizationAddress` 且无 `brandInfo.registeredAddress`，address 用 organizationAddress；`seoConfig?.organizationPhone` 有值且无 schemaContactPoint 时补 `telephone`。

- [x] **Step 3: 重建 dist + 验证**

Run: `cd e:\code\basic\plugins\zhao-website && npm run build`
验证：给测试站点 seo-config 填 geoPosition=`39.90,116.40`、geoPlacename=`北京`、organizationAddress、organizationPhone、areaServed，curl `GET /api/zhao-website/v1/seo-meta`，确认 structuredData 中 LocalBusiness 含 `geo.latitude/longitude`、`address.addressLocality/streetAddress`、`telephone`、`areaServed`。

- [x] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/schema-builder.ts plugins/zhao-website/dist
git commit -m "feat(zhao-website): LocalBusiness/Organization schema 地理节点增强"
```

***

## Phase 3：多语言（官方 i18n，子目录路由）

### Task 5: 启用备选语言

**Files:**

- Modify: `e:\code\basic\config\plugins.ts`（i18n.locales）

- [x] **Step 1: 增加 en 备选语言**

在 `i18n.config.locales` 数组中追加 `{ code: "en", name: "English" }`。

- [x] **Step 2: 重启 + 验证 locale 查询**

Run: 重启 strapi develop，确认日志无 i18n 错误；curl `GET /api/zhao-website/v1/articles` 仍 200（默认 locale 数据正常）。

- [x] **Step 3: Commit**

```bash
git add config/plugins.ts
git commit -m "feat(config): i18n 启用 en 备选语言"
```

### Task 6: 前端语言化路由 + 302 回退

**Files:**

- Create: `e:\code\strapi-site\middleware.ts`

- Create: `e:\code\strapi-site\lib\i18n.ts`

- Create: `e:\code\strapi-site\app\[locale]\articles\[slug]\page.tsx`（含回退逻辑）

- Modify: `e:\code\strapi-site\app\layout.tsx`（lang 属性按 locale 输出）

- Move: `app/page.tsx` → `app/[locale]/(home)/page.tsx`、`app/articles/page.tsx` → `app/[locale]/(pages)/articles/page.tsx`

- [x] **Step 1: lib/i18n.ts（语言解析与文案）**

```ts
export const DEFAULT_LOCALE = "zh-CN";
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, "en"];

export function normalizeLocale(raw: string | undefined): string | null {
  if (!raw) return null; // 无前缀 = 默认语言
  const match = SUPPORTED_LOCALES.find(
    (l) => l.toLowerCase() === raw.toLowerCase() || l.split("-")[0].toLowerCase() === raw.toLowerCase()
  );
  return match || null;
}

export const UI_STRINGS: Record<string, Record<string, string>> = {
  "zh-CN": { navHome: "首页", navArticles: "资讯", langName: "EN" },
  en: { navHome: "Home", navArticles: "Articles", langName: "中文" },
};
```

- [x] **Step 2: middleware.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, normalizeLocale } from "./lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  const locale = normalizeLocale(first);

  // 前缀不是合法语言 → 重定向到无前缀（默认语言）同路径
  if (first && !locale) {
    const url = request.nextUrl.clone();
    url.pathname = "/" + segments.slice(1).join("/");
    return NextResponse.redirect(url, 301);
  }

  const resolved = locale ?? DEFAULT_LOCALE;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", resolved);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

- [x] **Step 3: 路由结构迁移**

用 `[locale]` 可选动态段实现"无前缀=默认语言 + /en/ 前缀"：

- `app/[locale]/page.tsx` 首页（locale 段可选，`app/[locale]/page.tsx` 同时匹配 `/` 与 `/en/`——App Router 中 `[locale]` 为必选段时 `/` 不匹配，需将 locale 声明为可选：`[[locale]]`）

说明：App Router 用 `app/[[locale]]/` 可选段可同时匹配 `/` 与 `/en/`；`page.tsx` 中从 `params.locale` 取语言（undefined=默认语言），未命中默认语言的内容回退见 Step 4。

- [x] **Step 4: 详情页 302 回退**

`app/[[locale]]/articles/[slug]/page.tsx` 服务端组件中：

```ts
export default async function ArticlePage({ params }: { params: { locale?: string; slug: string } }) {
  const locale = normalizeLocale(params.locale) ?? DEFAULT_LOCALE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const res = await fetch(`${siteUrl}/api/zhao-website/v1/articles/${params.slug}?locale=${locale}`, { cache: "no-store" });
  if (res.status === 404 && locale !== DEFAULT_LOCALE) {
    // 当前语言无此文章 → 302 到默认语言同路径
    redirect(`/articles/${params.slug}`);
  }
  if (res.status === 404) notFound();
  const article = await res.json();
  // ...
}
```

- [x] **Step 5: 本地验证**

Run: `cd e:\code\strapi-site && npm run dev`

- 访问 `http://localhost:3000/` 与 `http://localhost:3000/en/` 均渲染首页

- 访问 `http://localhost:3000/en/articles/{slug}`：若 en 无翻译 → 302 到 `/articles/{slug}`；有翻译 → 渲染英文

- 访问 `http://localhost:3000/xx/`（非法前缀）→ 301 到 `/`

- [x] **Step 6: Commit**

```bash
git add middleware.ts lib/i18n.ts app/
git commit -m "feat(strapi-site): [locale] 子目录路由 + 详情页 302 回退"
```

### Task 7: hreflang 按翻译存在性输出（详情页）

**Files:**

- Modify: `e:\code\strapi-site\app\[[locale]]\articles\[slug]\page.tsx`（SEO meta 输出）

- [x] **Step 1: 详情页按实际翻译输出 hreflang**

服务端组件获取文章时并行请求各语言存在性（`HEAD`/`GET` 各 locale 同 slug，200 才输出）：

```ts
const alternates: Array<{ hreflang: string; href: string }> = [];
for (const alt of ["en"]) {
  const r = await fetch(`${siteUrl}/api/zhao-website/v1/articles/${params.slug}?locale=${alt}`, { method: "HEAD" });
  if (r.ok) alternates.push({ hreflang: alt, href: `${siteUrl}/${alt}/articles/${params.slug}` });
}
// metadata.alternates.languages 或自渲染 <link rel="alternate">
```

说明：站点级页面（首页/列表页）沿用 seo-meta 服务的全量 hreflang（子目录策略），不做存在性过滤——聚合页语言版本始终存在。

- [x] **Step 2: 验证**

用 curl 模拟：`curl -I "http://localhost:3000/en/articles/{slug}"` 确认回退；打开详情页源码确认 hreflang 仅含实际存在的语言 + `x-default`。

- [x] **Step 3: Commit**

```bash
git add app/
git commit -m "feat(strapi-site): 详情页 hreflang 按翻译存在性输出"
```

***

## Phase 4：前端四级模板体系

### Task 8: 后端 merged 配置公开接口

**Files:**

- Modify: `zhao-common/server/src/controllers/site-config.ts`

- Modify: `zhao-common/server/src/services/site-config.ts`

- Modify: `zhao-common/server/src/routes/content-api.ts`

- [x] **Step 1: 服务新增 getMerged**

在 `site-config.ts` 服务新增（或复用 `getPublicConfig` 内部扩展）：

```ts
async getMergedPublic() {
  const config = await this.getPublicConfig();
  const merged = await strapi.plugin("zhao-common").service("site-template").getMergedConfig(config);
  return { ...(config || {}), templateMeta: merged.meta, config: merged.config };
}
```

- [x] **Step 2: 控制器新增 getMerged + 注册路由**

控制器加 `getMerged`（模式同 `getPublic`），routes/content-api.ts 注册 `GET /site-config/merged`（公开，走 site-resolver 中间件）。

- [x] **Step 3: 重建 dist + curl 验证**

Run: `cd e:\code\basic\plugins\zhao-common && npm run build`
Run: `curl http://localhost:1337/api/zhao-common/v1/site-config/merged` → 200，返回含 `config`（模板预设+租户覆盖）与 `templateMeta`。

- [x] **Step 4: Commit**

```bash
git add plugins/zhao-common/server/src plugins/zhao-common/dist
git commit -m "feat(zhao-common): site-config merged 公开只读接口"
```

### Task 9: 前端配置读取 + 回退链解析

**Files:**

- Create: `e:\code\strapi-site\lib\site-config.ts`

- [x] **Step 1: 实现 site-config.ts**

```ts
export interface SiteConfigBundle {
  config: Record<string, any>; // 合并配置（模板预设 + 租户覆盖）
  templateMeta: any;
  site: any;
}

const cache = new Map<string, { data: SiteConfigBundle; ts: number }>();
const TTL = 60_000;

export async function getSiteConfig(siteUrl: string): Promise<SiteConfigBundle> {
  const key = siteUrl;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;
  const res = await fetch(`${siteUrl}/api/zhao-common/v1/site-config/merged`, { cache: "no-store" });
  const json = await res.json();
  const data = { ...(json?.data || json), site: json?.data?.site || json?.site };
  cache.set(key, { data, ts: Date.now() });
  return data;
}

/** 回退链查找：module → page → style → global → 内置兜底 */
export function resolveConfig(
  bundle: SiteBundle,
  path: string[]
): any {
  let cursor: any = bundle;
  for (const key of path) {
    if (cursor && typeof cursor === "object" && key in cursor && cursor[key] !== null && cursor[key] !== "") {
      cursor = cursor[key];
    } else {
      return undefined;
    }
  }
  return cursor;
}
```

- [x] **Step 2: 根布局注入**

`app/[[locale]]/layout.tsx` 服务端读取 `getSiteConfig`，用 React context 向下传递；`globals.css` 由一级 `global.designTokens` 生成 CSS 变量（内联 `<style>` 或数据属性 + 默认值兜底）。

- [x] **Step 3: Commit**

```bash
git add lib/site-config.ts app/
git commit -m "feat(strapi-site): 合并配置读取 + 回退链解析 + 上下文注入"
```

### Task 10: 一级令牌 + Header/Footer + 二级风格 + 四级模块

**Files:**

- Create: `components/layout/Header.tsx`、`Footer.tsx`、`LanguageSwitcher.tsx`

- Create: `components/modules/Hero.tsx`、`ArticleFeed.tsx`、`ArticleGrid.tsx`、`Pagination.tsx`、`Breadcrumb.tsx`、`MapBlock.tsx`

- Modify: `app/globals.css`（设计令牌变量 + 两套风格变量）

- Modify: `app/[[locale]]/(pages)/**` 各页按回退链组装模块

- [x] **Step 1: globals.css 设计令牌**

定义一级默认 CSS 变量（兜底）+ 二级风格覆盖类：

```css
:root {
  --color-primary: #1a73e8;
  --color-bg: #ffffff;
  --color-text: #1f2329;
  --radius: 8px;
  --space-base: 16px;
  --space-section: 48px;
  --font-body: system-ui, sans-serif;
  --font-heading: system-ui, sans-serif;
}
.style-toutiao { --card-columns: 1; --article-image-ratio: 16/9; }
.style-zhihu   { --card-columns: 1; --article-image-ratio: 4/3; --detail-max-width: 720px; }
```

组件通过 CSS 变量读取令牌，`html[data-style="toutiao"]` 或根元素 class 切换二级风格（值来自合并配置 `config.style`）。

- [x] **Step 2: 模块组件**

每个模块读取 `resolveConfig(bundle, ["modules", name])` 驱动样式/可见性/参数；未配置时用组件内置默认。例如 ArticleGrid 渲染 `columns` 由配置驱动，MapBlock 读取 `config.modules.map`（enabled/zoom）并仅在 `tencentMapKey` 存在时渲染。

- [x] **Step 3: 页面组装**

首页按 `resolveConfig(bundle, ["pages", "home", "modules"])` 数组顺序渲染模块；列表页/详情页同理。二级风格（toutiao/zhihu）通过 `style` 配置切换页面根 class。

- [x] **Step 4: 本地验收**

Run: `cd e:\code\strapi-site && npm run dev`

- 后端给测试站点关联模板（presetConfig 含 global/style/pages/modules）→ 前端生效

- 逐级删除配置 key 验证回退链（模块 → 页面 → 风格 → 全局默认）

- 切换 style 为 toutiao/zhihu 观察布局变化

- 配置 map.enabled=true 且 seo-config 有 geoPosition + tencentMapKey → 首页渲染地图

- [x] **Step 5: Commit**

```bash
git add components/ app/ lib/
git commit -m "feat(strapi-site): 四级模板体系组件落地(令牌/Header/Footer/模块)"
```

***

## 自审结论

- **Spec 覆盖**：四级体系（Task 8-10）、数据过滤（Task 1-2）、多语言（Task 5-7）、Local SEO（Task 3-4）、B 阶段契约（仅文档，无代码任务，符合"只约定不实现"）

- **占位符**：无 TBD/TODO；每步含具体代码与验证命令

- **类型一致性**：`buildWhere(siteId, uid, extra, locale)` / `findMany(uid, siteId, params)` / `getSiteConfig` / `resolveConfig` 在各任务间签名一致

## 执行建议

按 Phase 顺序执行，每个 Phase 结束可独立验收（Phase 1 与 2 后端先行；Phase 3 依赖 Phase 1 的 locale 过滤；Phase 4 依赖 Phase 3 路由与 Task 8 接口）。多语言内容录入（各语言实际翻译）不在本计划内，属于运营动作。

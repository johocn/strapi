# zhao-website SEO/GEO 审计修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 zhao-website 插件 23 项 SEO/GEO 缺陷，从"字段已配置但不输出"提升为"端到端可用"。

**Architecture:** 分三层递进：第一层修复严重缺陷（影响 SEO/GEO 实际效果），第二层修复重要缺陷（完整性），第三层改进项（标准合规性）。新建 9 个文件，修改约 20 个现有文件。

**Tech Stack:** Strapi 5 插件，TypeScript，Koa 中间件，JSON-LD，XML sitemap/RSS

**Spec:** `docs/superpowers/specs/2026-07-31-zhao-website-seo-geo-audit-design.md`

**注意:** 项目无单元测试框架用于新功能（现有 jest 测试仅覆盖部分 service）。验证方式为代码审查 + 启动后访问端点。git 命令需用完整路径 `& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi'`。所有插件文件路径基于 `d:\zhao\strapi\plugins\zhao-website\`。

---

## 第一层：严重缺陷修复（6 项）

### Task 1: seo-config schema 新增字段

**Files:**
- Modify: `server/src/content-types/seo-config/schema.json`

- [ ] **Step 1: 新增 4 个字段到 seo-config schema**

在 `schema.json` 的 `attributes` 中，`publicSecurityRecord` 之后、`extraConfig` 之前，添加：

```json
    "allowedAiCrawlers": {
      "type": "json",
      "default": []
    },
    "twitterSite": {
      "type": "string",
      "maxLength": 50
    },
    "twitterCreator": {
      "type": "string",
      "maxLength": 50
    },
    "sogouSiteVerification": {
      "type": "string",
      "maxLength": 100
    },
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/content-types/seo-config/schema.json
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add allowedAiCrawlers, twitter, sogou fields to seo-config"
```

---

### Task 2: product/tutorial/case/faq schema 新增缺失字段

**Files:**
- Modify: `server/src/content-types/product/schema.json`
- Modify: `server/src/content-types/tutorial/schema.json`

- [ ] **Step 1: product schema 新增 price/availability/brandVoiceRef**

在 `product/schema.json` 的 `attributes` 中，`structuredData` 之前，添加：

```json
    "price": {
      "type": "decimal",
      "default": 0
    },
    "currency": {
      "type": "string",
      "maxLength": 10,
      "default": "CNY"
    },
    "availability": {
      "type": "enumeration",
      "enum": ["in_stock", "out_of_stock", "pre_order"],
      "default": "in_stock"
    },
    "brandVoiceRef": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.brand-voice"
    },
```

- [ ] **Step 2: tutorial schema 新增 videoUrl/thumbnailUrl/brandVoiceRef**

在 `tutorial/schema.json` 的 `attributes` 中，`estimatedTime` 之后，添加：

```json
    "videoUrl": {
      "type": "string",
      "maxLength": 500
    },
    "thumbnailUrl": {
      "type": "string",
      "maxLength": 500
    },
    "brandVoiceRef": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.brand-voice"
    },
```

- [ ] **Step 3: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/content-types/product/schema.json plugins/zhao-website/server/src/content-types/tutorial/schema.json
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add price/availability to product, videoUrl/brandVoiceRef to tutorial"
```

---

### Task 3: 新建 seo-meta service

**Files:**
- Create: `server/src/services/seo-meta.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: 创建 seo-meta service 文件**

创建 `server/src/services/seo-meta.ts`，完整内容如下：

```typescript
import type { Core } from "@strapi/strapi";

const AI_CRAWLER_LIST = [
  "GPTBot", "CCBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "meta-external-agent", "Amazonbot", "Bytespider", "Sogou web spider",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, requestHost: string): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const schemaBuilder = strapi.plugin("zhao-website").service("schema-builder");

    // 从 site-config 获取规范域名
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: siteId },
    });
    const siteUrl = siteConfig?.domain || `https://${requestHost}`;

    // 基础 meta
    const title = seoConfig?.defaultTitle || brandInfo?.companyName || "";
    const description = seoConfig?.defaultDescription || brandInfo?.description || "";
    const keywords = seoConfig?.defaultKeywords || "";

    // OG 标签
    const og: Record<string, string> = {
      "og:title": title,
      "og:description": description,
      "og:type": "website",
      "og:site_name": brandInfo?.companyName || "",
      "og:locale": (seoConfig?.defaultLocale || "zh-CN").replace("-", "_"),
    };
    if (seoConfig?.ogImage?.url) og["og:image"] = `${siteUrl}${seoConfig.ogImage.url}`;

    // Twitter 标签
    const twitter: Record<string, string> = {
      "twitter:card": "summary_large_image",
    };
    if (seoConfig?.twitterSite) twitter["twitter:site"] = seoConfig.twitterSite;
    if (seoConfig?.twitterCreator) twitter["twitter:creator"] = seoConfig.twitterCreator;

    // GEO meta
    const geo: Record<string, string> = {};
    if (seoConfig?.geoRegion) geo["geo.region"] = seoConfig.geoRegion;
    if (seoConfig?.geoPlacename) geo["geo.placename"] = seoConfig.geoPlacename;
    if (seoConfig?.geoPosition) geo["geo.position"] = seoConfig.geoPosition;
    if (seoConfig?.geoICBM) geo["ICBM"] = seoConfig.geoICBM;

    // hreflang
    const hreflang = this._buildHreflang(seoConfig, siteUrl);

    // 站点验证
    const verification: Record<string, string> = {};
    if (seoConfig?.googleSiteVerification) verification["google-site-verification"] = seoConfig.googleSiteVerification;
    if (seoConfig?.baiduSiteVerification) verification["baidu-site-verification"] = seoConfig.baiduSiteVerification;
    if (seoConfig?.bingSiteVerification) verification["bing-site-verification"] = seoConfig.bingSiteVerification;
    if (seoConfig?.sogouSiteVerification) verification["sogou_site_verification"] = seoConfig.sogouSiteVerification;

    // 结构化数据
    const structuredData: any[] = [];
    if (seoConfig?.geoPosition) {
      structuredData.push(schemaBuilder.buildLocalBusiness(brandInfo, seoConfig));
    } else {
      structuredData.push(schemaBuilder.buildOrganization(brandInfo, seoConfig));
    }
    structuredData.push(schemaBuilder.buildWebSite(seoConfig, siteUrl));

    return {
      title,
      titleTemplate: seoConfig?.titleTemplate || "",
      description,
      keywords,
      canonical: siteUrl,
      og,
      twitter,
      geo,
      hreflang,
      verification,
      structuredData,
      customHeadCode: seoConfig?.customHeadCode || "",
      customBodyCode: seoConfig?.customBodyCode || "",
      analytics: {
        baiduAnalyticsId: seoConfig?.baiduAnalyticsId || "",
        googleAnalyticsId: seoConfig?.googleAnalyticsId || "",
      },
    };
  },

  _buildHreflang(seoConfig: any, siteUrl: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      const baseTld = host.split(".").pop();
      const domainWithoutTld = host.split(".").slice(0, -1).join(".");
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? siteUrl : `${origin}/${locale}`;
        case "subdomain":
          return locale === defaultLocale ? siteUrl : `${origin.protocol}//${locale}.${host}`;
        case "tld":
          if (locale === defaultLocale) return siteUrl;
          // 简化：用 locale 的国家码替换 tld
          const localeTld = locale.includes("-") ? locale.split("-")[1].toLowerCase() : locale.toLowerCase();
          return `${origin.protocol}//${domainWithoutTld}.${localeTld}`;
        default:
          return siteUrl;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale) });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt) });
    }
    // x-default
    result.push({ hreflang: "x-default", href: siteUrl });
    return result;
  },

  getAiCrawlerList(): string[] {
    return [...AI_CRAWLER_LIST];
  },
});
```

- [ ] **Step 2: 在 services/index.ts 中注册 seo-meta**

在 `services/index.ts` 文件中，`import brandVoice from "./brand-voice";` 之后添加：

```typescript
import seoMeta from "./seo-meta";
```

在导出对象中，`"brand-voice": brandVoice,` 之后添加：

```typescript
  "seo-meta": seoMeta,
```

- [ ] **Step 3: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/seo-meta.ts plugins/zhao-website/server/src/services/index.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add seo-meta service for unified meta tag output"
```

---

### Task 4: 新建 seo-meta controller + 路由

**Files:**
- Create: `server/src/controllers/content-api/seo-meta.ts`
- Modify: `server/src/controllers/content-api/index.ts`
- Modify: `server/src/routes/content-api.ts`

- [ ] **Step 1: 创建 seo-meta controller**

创建 `server/src/controllers/content-api/seo-meta.ts`：

```typescript
export default {
  async meta(ctx: any) {
    const siteId = ctx.state.siteId;
    const requestHost = ctx.request.host;
    const data = await strapi.plugin("zhao-website").service("seo-meta").generate(siteId, requestHost);
    ctx.body = data;
  },
};
```

- [ ] **Step 2: 在 controllers/content-api/index.ts 中注册**

在 `import siteInfo from "./site-info";` 之后添加：

```typescript
import seoMeta from "./seo-meta";
```

在导出对象中，`"site-info": siteInfo,` 之后添加：

```typescript
  "seo-meta": seoMeta,
```

- [ ] **Step 3: 在 routes/content-api.ts 中新增路由**

在 `publicRoute("GET", "/site-info", "site-info.info"),` 之后，`// 品牌话术公开路由` 之前，添加：

```typescript
    publicRoute("GET", "/seo-meta", "seo-meta.meta"),
```

- [ ] **Step 4: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/controllers/content-api/seo-meta.ts plugins/zhao-website/server/src/controllers/content-api/index.ts plugins/zhao-website/server/src/routes/content-api.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add GET /v1/seo-meta endpoint"
```

---

### Task 5: robots.ts selective 策略 + AI 爬虫列表扩展

**Files:**
- Modify: `server/src/services/robots.ts`

- [ ] **Step 1: 重写 robots.ts 实现完整 AI 爬虫策略**

将 `server/src/services/robots.ts` 的完整内容替换为：

```typescript
import type { Core } from "@strapi/strapi";

const AI_CRAWLER_LIST = [
  "GPTBot", "CCBot", "ClaudeBot", "PerplexityBot", "Google-Extended",
  "meta-external-agent", "Amazonbot", "Bytespider", "Sogou web spider",
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.enableRobotsTxt) {
      return "User-agent: *\nDisallow: /";
    }
    if (seoConfig.robotsContent) return seoConfig.robotsContent;

    const lines: string[] = [];

    // AI 爬虫策略
    const policy = seoConfig.aiCrawlerPolicy || "allow_all";
    if (policy === "block_all") {
      for (const bot of AI_CRAWLER_LIST) {
        lines.push(`User-agent: ${bot}`, "Disallow: /");
      }
    } else if (policy === "selective") {
      const allowed = seoConfig.allowedAiCrawlers || [];
      for (const bot of AI_CRAWLER_LIST) {
        if (!allowed.includes(bot)) {
          lines.push(`User-agent: ${bot}`, "Disallow: /");
        }
      }
    }

    // 默认规则
    lines.push("User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api");
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n");
  },
});
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/robots.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): implement robots selective AI crawler policy with full bot list"
```

---

### Task 6: seo-output.ts siteUrl 修正 + manifest 完善

**Files:**
- Modify: `server/src/controllers/content-api/seo-output.ts`

- [ ] **Step 1: 重写 seo-output.ts 使用 site-config domain**

将 `server/src/controllers/content-api/seo-output.ts` 的完整内容替换为：

```typescript
async function getSiteUrl(siteId: number, fallbackHost: string): Promise<string> {
  const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
    where: { id: siteId },
  });
  return siteConfig?.domain || `https://${fallbackHost}`;
}

export default {
  async sitemap(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("sitemap").generate(siteId, siteUrl);
    ctx.type = "application/xml";
    ctx.body = xml;
  },

  async robots(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const txt = await strapi.plugin("zhao-website").service("robots").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async llmsTxt(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const txt = await strapi.plugin("zhao-website").service("llms-txt").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async manifest(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").find(siteId);
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").find(siteId);

    const icons: any[] = [];
    if (brandInfo?.favicon?.url) {
      icons.push({ src: `${siteUrl}${brandInfo.favicon.url}`, sizes: "192x192", type: "image/png" });
    }
    if (brandInfo?.logo?.url) {
      icons.push({ src: `${siteUrl}${brandInfo.logo.url}`, sizes: "512x512", type: "image/png" });
    }

    ctx.body = {
      name: brandInfo?.companyName || "",
      short_name: brandInfo?.shortName || brandInfo?.companyName?.substring(0, 6) || "",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: seoConfig?.extraConfig?.themeColor || "#000000",
      categories: ["education", "productivity"],
      icons,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/controllers/content-api/seo-output.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "fix(zhao-website): use site-config domain for siteUrl, complete PWA manifest"
```

---

### Task 7: llms-txt.ts 修改 generate 签名 + 内容补全

**Files:**
- Modify: `server/src/services/llms-txt.ts`

- [ ] **Step 1: 重写 llms-txt.ts 接收 siteUrl 并输出完整内容**

将 `server/src/services/llms-txt.ts` 的完整内容替换为：

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const lines: string[] = [];

    // 标题
    lines.push(`# ${brandInfo?.companyName || "Website"}`);
    if (brandInfo?.slogan) lines.push(`> ${brandInfo.slogan}`);
    lines.push("");

    // 概述
    if (brandInfo?.description) {
      lines.push("## Overview");
      lines.push(brandInfo.description);
      lines.push("");
    }

    // 核心页面
    lines.push("## Pages");

    // 文章
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](${siteUrl}/articles/${a.slug}): ${a.excerpt || ""}`);
    }

    // 产品
    const products = await strapi.db.query("plugin::zhao-website.product").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const p of products) {
      lines.push(`- [${p.name}](${siteUrl}/products/${p.slug}): ${p.tagline || ""}`);
    }

    // 教程
    const tutorials = await strapi.db.query("plugin::zhao-website.tutorial").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const t of tutorials) {
      lines.push(`- [${t.title}](${siteUrl}/tutorials/${t.slug}): ${t.description || ""}`);
    }

    // 案例
    const cases = await strapi.db.query("plugin::zhao-website.case").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const c of cases) {
      lines.push(`- [${c.title || c.name}](${siteUrl}/cases/${c.slug}): ${c.summary || ""}`);
    }

    // FAQ
    const faqs = await strapi.db.query("plugin::zhao-website.faq").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const f of faqs) {
      lines.push(`- [FAQ: ${f.question}](${siteUrl}/faqs/${f.slug})`);
    }

    // 合规
    const compliances = await strapi.db.query("plugin::zhao-website.compliance").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 30,
    });
    for (const c of compliances) {
      lines.push(`- [${c.title}](${siteUrl}/compliance/${c.slug})`);
    }

    lines.push("");

    // 第一真值
    lines.push("## Facts");
    const facts = await strapi.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      const sourceUrl = f.canonicalSourceUrl ? ` (source: ${f.canonicalSourceUrl})` : "";
      lines.push(`- ${f.claim}: ${f.canonicalValue}${sourceUrl}`);
    }

    // 品牌话术
    lines.push("");
    lines.push("## Brand Voice");
    const voices = await strapi.db.query("plugin::zhao-website.brand-voice").findMany({
      where: { $or: [{ site: siteId, status: true, deletedAt: null }, { site: null, status: true, deletedAt: null }] },
      orderBy: { category: "ASC" },
    });
    for (const v of voices) {
      lines.push(`- [${v.category}] ${v.name}: ${v.content.substring(0, 200)}`);
    }
    lines.push("");

    return lines.join("\n");
  },
});
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/llms-txt.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): expand llms.txt with tutorials/cases/faqs/compliance + full URLs"
```

---

### Task 8: 知识图谱/第一真值公开端点

**Files:**
- Create: `server/src/controllers/content-api/knowledge-graph.ts`
- Modify: `server/src/controllers/content-api/index.ts`
- Modify: `server/src/routes/content-api.ts`

- [ ] **Step 1: 创建 knowledge-graph controller**

创建 `server/src/controllers/content-api/knowledge-graph.ts`：

```typescript
export default {
  async exportGraph(ctx: any) {
    const siteId = ctx.state.siteId;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(siteId);
    ctx.type = "application/json";
    ctx.body = data;
  },

  async exportEntity(ctx: any) {
    const siteId = ctx.state.siteId;
    const slug = ctx.params.slug;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportEntity(siteId, slug);
    if (!data) {
      ctx.status = 404;
      ctx.body = { error: "Entity not found" };
      return;
    }
    ctx.type = "application/json";
    ctx.body = data;
  },

  async exportFacts(ctx: any) {
    const siteId = ctx.state.siteId;
    const data = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(siteId);
    ctx.type = "application/json";
    ctx.body = data;
  },
};
```

- [ ] **Step 2: 在 controllers/content-api/index.ts 中注册**

在 `import seoMeta from "./seo-meta";` 之后添加：

```typescript
import knowledgeGraph from "./knowledge-graph";
```

在导出对象中，`"seo-meta": seoMeta,` 之后添加：

```typescript
  "knowledge-graph": knowledgeGraph,
```

- [ ] **Step 3: 在 routes/content-api.ts 中新增路由**

在 `publicRoute("GET", "/seo-meta", "seo-meta.meta"),` 之后添加：

```typescript
    publicRoute("GET", "/knowledge-graph.json", "knowledge-graph.exportGraph"),
    publicRoute("GET", "/knowledge-graph/:slug", "knowledge-graph.exportEntity"),
    publicRoute("GET", "/facts.json", "knowledge-graph.exportFacts"),
```

- [ ] **Step 4: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/controllers/content-api/knowledge-graph.ts plugins/zhao-website/server/src/controllers/content-api/index.ts plugins/zhao-website/server/src/routes/content-api.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add public knowledge-graph and facts endpoints for GEO AI"
```

---

### Task 9: 搜索引擎推送生命周期触发

**Files:**
- Modify: `server/src/content-types/article/lifecycles.ts`
- Create: `server/src/content-types/product/lifecycles.ts`
- Create: `server/src/content-types/case/lifecycles.ts`
- Create: `server/src/content-types/tutorial/lifecycles.ts`
- Create: `server/src/content-types/faq/lifecycles.ts`

- [ ] **Step 1: 创建通用推送辅助函数内联到 article lifecycles**

将 `article/lifecycles.ts` 完整内容替换为：

```typescript
import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";
import { triggerSyncEvent } from "../../services/utils/sync-event-trigger";

const TARGET_TYPE = "website-article";
const PATH_PREFIX = "/articles";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    // 清除 SEO 输出缓存
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await triggerSyncEvent("article", event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await triggerSyncEvent("article", event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
```

- [ ] **Step 2: 创建 product lifecycles**

创建 `server/src/content-types/product/lifecycles.ts`：

```typescript
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-product";
const PATH_PREFIX = "/products";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] product search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
```

- [ ] **Step 3: 创建 case lifecycles**

创建 `server/src/content-types/case/lifecycles.ts`：

```typescript
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-case";
const PATH_PREFIX = "/cases";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] case search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
```

- [ ] **Step 4: 创建 tutorial lifecycles**

创建 `server/src/content-types/tutorial/lifecycles.ts`：

```typescript
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-tutorial";
const PATH_PREFIX = "/tutorials";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] tutorial search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
```

- [ ] **Step 5: 创建 faq lifecycles**

创建 `server/src/content-types/faq/lifecycles.ts`：

```typescript
const PATH_PREFIX = "/faqs";

async function pushToSearchEngines(event: any) {
  try {
    const result = event.result;
    if (result.status !== "published") return;
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { id: result.site },
    });
    if (!siteConfig?.domain) return;
    const url = `${siteConfig.domain}${PATH_PREFIX}/${result.slug}`;
    await strapi.plugin("zhao-website").service("search-engine-push").pushAll(result.site, [url]);
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  } catch (e) {
    strapi.log.warn("[zhao-website] faq search engine push failed:", e);
  }
}

export default {
  async afterCreate(event: any) {
    await pushToSearchEngines(event);
  },
  async afterUpdate(event: any) {
    await pushToSearchEngines(event);
  },
  async afterDelete(event: any) {
    strapi.plugin("zhao-website").service("cache")?.invalidate();
  },
};
```

- [ ] **Step 6: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/content-types/article/lifecycles.ts plugins/zhao-website/server/src/content-types/product/lifecycles.ts plugins/zhao-website/server/src/content-types/case/lifecycles.ts plugins/zhao-website/server/src/content-types/tutorial/lifecycles.ts plugins/zhao-website/server/src/content-types/faq/lifecycles.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): trigger search engine push + cache invalidation in lifecycles"
```

---

### Task 10: schema-builder.ts 增强（Product offers + publisher logo + LocalBusiness + VideoObject + brand-voice 注入）

**Files:**
- Modify: `server/src/services/schema-builder.ts`

- [ ] **Step 1: 重写 schema-builder.ts 完整内容**

将 `server/src/services/schema-builder.ts` 的完整内容替换为：

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== Organization =====
  buildOrganization(brandInfo: any, seoConfig: any): any {
    const org: any = {
      "@context": "https://schema.org",
      "@type": seoConfig?.organizationType || "Organization",
      name: brandInfo?.companyName,
      url: brandInfo?.url || "",
    };
    if (brandInfo?.logo) org.logo = brandInfo.logo.url;
    if (brandInfo?.description) org.description = brandInfo.description;
    if (brandInfo?.foundingDate) org.foundingDate = brandInfo.foundingDate;
    if (brandInfo?.registeredAddress) org.address = {
      "@type": "PostalAddress",
      streetAddress: brandInfo.registeredAddress,
    };
    if (brandInfo?.contactPhone) org.contactPoint = {
      "@type": "ContactPoint",
      telephone: brandInfo.contactPhone,
      contactType: "customer service",
    };
    if (seoConfig?.schemaSameAs) org.sameAs = seoConfig.schemaSameAs;
    if (seoConfig?.schemaContactPoint) org.contactPoint = seoConfig.schemaContactPoint;
    return org;
  },

  // ===== LocalBusiness (Organization + GEO) =====
  buildLocalBusiness(brandInfo: any, seoConfig: any): any {
    const org = this.buildOrganization(brandInfo, seoConfig);
    org["@type"] = seoConfig?.organizationType || "LocalBusiness";
    if (seoConfig?.geoPosition) {
      const coords = seoConfig.geoPosition.split(";").map((s: string) => s.trim());
      if (coords.length >= 2) {
        org.geo = { "@type": "GeoCoordinates", latitude: coords[0], longitude: coords[1] };
      }
    }
    if (seoConfig?.geoPlacename) {
      org.address = { "@type": "PostalAddress", addressLocality: seoConfig.geoPlacename };
    }
    return org;
  },

  // ===== Article =====
  buildArticle(article: any, brandInfo: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": article.schemaType || "Article",
      headline: article.seoTitle || article.title,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: {
        "@type": "Person",
        name: article.author || brandInfo?.companyName || "",
      },
    };
    if (article.seoDescription) schema.description = article.seoDescription;
    if (article.coverImage) schema.image = article.coverImage.url;
    if (article.canonicalUrl) schema.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": article.canonicalUrl,
    };
    if (brandInfo?.companyName) schema.publisher = {
      "@type": "Organization",
      name: brandInfo.companyName,
      logo: {
        "@type": "ImageObject",
        url: brandInfo?.logo?.url || "",
      },
    };
    if (article.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: article.brandVoiceRef.name,
        description: article.brandVoiceRef.content,
      };
    }
    return schema;
  },

  // ===== Product =====
  buildProduct(product: any, brandInfo: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.seoTitle || product.name,
    };
    if (product.description) schema.description = product.description;
    if (product.coverImage) schema.image = product.coverImage.url;
    if (product.brand) schema.brand = { "@type": "Brand", name: product.brand };
    if (product.specifications) {
      schema.additionalProperty = product.specifications.map((s: any) => ({
        "@type": "PropertyValue",
        name: s.name,
        value: s.value,
      }));
    }
    // offers 修复：完整价格信息
    if (product.price || product.priceRange) {
      schema.offers = {
        "@type": "Offer",
        price: String(product.price || "0"),
        priceCurrency: product.currency || "CNY",
        availability: product.availability === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : product.availability === "pre_order"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      };
      if (product.slug) {
        schema.offers.url = `${brandInfo?.url || ""}/products/${product.slug}`;
      }
    }
    // brand-voice 注入
    if (product.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: product.brandVoiceRef.name,
        description: product.brandVoiceRef.content,
      };
    }
    return schema;
  },

  // ===== HowTo (tutorial) =====
  buildHowTo(tutorial: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: tutorial.title,
    };
    if (tutorial.description) schema.description = tutorial.description;
    if (tutorial.steps) {
      schema.step = tutorial.steps.map((step: any, i: number) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.title,
        text: step.content,
      }));
    }
    if (tutorial.estimatedTime) schema.totalTime = tutorial.estimatedTime;
    // brand-voice 注入
    if (tutorial.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: tutorial.brandVoiceRef.name,
        description: tutorial.brandVoiceRef.content,
      };
    }
    return schema;
  },

  // ===== FAQ =====
  buildFAQ(faqs: any[]): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    // brand-voice 注入（取第一个 faq 的 brandVoiceRef）
    if (faqs[0]?.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: faqs[0].brandVoiceRef.name,
        description: faqs[0].brandVoiceRef.content,
      };
    }
    return schema;
  },

  // ===== VideoObject =====
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
  },

  // ===== BreadcrumbList =====
  buildBreadcrumb(items: Array<{ name: string; url: string }>): any {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };
  },

  // ===== WebSite =====
  buildWebSite(seoConfig: any, siteUrl: string): any {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: seoConfig?.organizationName || "",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/schema-builder.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): enhance schema-builder with Product offers, publisher logo, LocalBusiness, VideoObject, brand-voice injection"
```

---

### Task 11: sitemap.ts 多语言 alternate + 图片 sitemap

**Files:**
- Modify: `server/src/services/sitemap.ts`

- [ ] **Step 1: 重写 sitemap.ts 完整内容**

将 `server/src/services/sitemap.ts` 的完整内容替换为：

```typescript
import type { Core } from "@strapi/strapi";

const INDEXABLE_CTS = [
  { uid: "plugin::zhao-website.article", pathPrefix: "/articles", priority: 0.7, imageField: "coverImage" },
  { uid: "plugin::zhao-website.product", pathPrefix: "/products", priority: 0.8, imageField: "coverImage" },
  { uid: "plugin::zhao-website.case", pathPrefix: "/cases", priority: 0.6, imageField: null },
  { uid: "plugin::zhao-website.tutorial", pathPrefix: "/tutorials", priority: 0.6, imageField: "coverImage" },
  { uid: "plugin::zhao-website.faq", pathPrefix: "/faqs", priority: 0.5, imageField: null },
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const excludeTypes = seoConfig?.sitemapExcludeTypes || [];
    const urls: string[] = [];

    // 构建 hreflang 条目
    const hreflangEntries = this._buildHreflangEntries(seoConfig, siteUrl);

    // 首页
    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily", undefined, undefined, hreflangEntries));

    for (const ct of INDEXABLE_CTS) {
      if (excludeTypes.includes(ct.uid.split(".").pop())) continue;
      const populate: string[] = [];
      if (ct.imageField) populate.push(ct.imageField);
      const items = await strapi.db.query(ct.uid).findMany({
        where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
        orderBy: { publishedAt: "DESC" },
        populate: populate.length > 0 ? populate : undefined,
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        const imageUrl = ct.imageField && item[ct.imageField]?.url
          ? `${siteUrl}${item[ct.imageField].url}`
          : undefined;
        const itemHreflang = this._buildItemHreflang(seoConfig, siteUrl, `${ct.pathPrefix}/${item.slug}`);
        urls.push(this._urlEntry(siteUrl, `${ct.pathPrefix}/${item.slug}`, String(ct.priority), "weekly", lastmod, imageUrl, itemHreflang));
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>`;
  },

  _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string, imageUrl?: string, hreflangEntries?: Array<{ hreflang: string; href: string }>): string {
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    const img = imageUrl
      ? `<image:image><image:loc>${imageUrl}</image:loc></image:image>`
      : "";
    const alternates = hreflangEntries && hreflangEntries.length > 0
      ? hreflangEntries.map(h => `<xhtml:link rel="alternate" hreflang="${h.hreflang}" href="${h.href}"/>`).join("")
      : "";
    return `  <url><loc>${siteUrl}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority>${img}${alternates}</url>`;
  },

  _buildHreflangEntries(seoConfig: any, siteUrl: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string, path: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin}/${locale}${path}`;
        case "subdomain":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin.protocol}//${locale}.${host}${path}`;
        case "tld":
          return `${siteUrl}${path}`; // 简化
        default:
          return `${siteUrl}${path}`;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale, "") });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt, "") });
    }
    result.push({ hreflang: "x-default", href: `${siteUrl}` });
    return result;
  },

  _buildItemHreflang(seoConfig: any, siteUrl: string, path: string): Array<{ hreflang: string; href: string }> {
    if (!seoConfig || seoConfig.hreflangStrategy === "none") return [];
    const defaultLocale = seoConfig.defaultLocale || "zh-CN";
    const alternates: string[] = seoConfig.alternateLocales || [];
    const strategy = seoConfig.hreflangStrategy || "subdirectory";
    const result: Array<{ hreflang: string; href: string }> = [];

    const buildUrl = (locale: string): string => {
      const origin = new URL(siteUrl).origin;
      const host = new URL(siteUrl).host;
      switch (strategy) {
        case "subdirectory":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin}/${locale}${path}`;
        case "subdomain":
          return locale === defaultLocale ? `${siteUrl}${path}` : `${origin.protocol}//${locale}.${host}${path}`;
        default:
          return `${siteUrl}${path}`;
      }
    };

    result.push({ hreflang: defaultLocale, href: buildUrl(defaultLocale) });
    for (const alt of alternates) {
      result.push({ hreflang: alt, href: buildUrl(alt) });
    }
    result.push({ hreflang: "x-default", href: `${siteUrl}${path}` });
    return result;
  },
});
```

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/sitemap.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add hreflang alternate + image sitemap support"
```

---

### Task 12: 新建 cache service

**Files:**
- Create: `server/src/services/cache.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: 创建 cache service**

创建 `server/src/services/cache.ts`：

```typescript
import type { Core } from "@strapi/strapi";

const cache = new Map<string, { data: string; expiresAt: number }>();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(key: string, ttl: number, generator: () => Promise<string>): Promise<string> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await generator();
    cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
    return data;
  },

  invalidate(key?: string) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  },
});
```

- [ ] **Step 2: 在 services/index.ts 中注册 cache**

在 `import seoMeta from "./seo-meta";` 之后添加：

```typescript
import cache from "./cache";
```

在导出对象中，`"seo-meta": seoMeta,` 之后添加：

```typescript
  "cache": cache,
```

- [ ] **Step 3: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/cache.ts plugins/zhao-website/server/src/services/index.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add in-memory cache service for SEO output"
```

---

### Task 13: 新建 RSS/Atom feed

**Files:**
- Create: `server/src/services/feed.ts`
- Create: `server/src/controllers/content-api/feed.ts`
- Modify: `server/src/controllers/content-api/index.ts`
- Modify: `server/src/routes/content-api.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: 创建 feed service**

创建 `server/src/services/feed.ts`：

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generateRSS(siteId: number, siteUrl: string): Promise<string> {
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null },
      limit: 20,
      orderBy: { publishedAt: "DESC" },
    });

    const channelTitle = brandInfo?.companyName || "Website";
    const channelDesc = brandInfo?.description || "";
    const items = articles.map(a => {
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : "";
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${siteUrl}/articles/${a.slug}</link>
      <description><![CDATA[${a.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid>${siteUrl}/articles/${a.slug}</guid>
    </item>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${channelTitle}]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[${channelDesc}]]></description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;
  },

  async generateAtom(siteId: number, siteUrl: string): Promise<string> {
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null },
      limit: 20,
      orderBy: { publishedAt: "DESC" },
    });

    const title = brandInfo?.companyName || "Website";
    const entries = articles.map(a => {
      const updated = a.updatedAt ? new Date(a.updatedAt).toISOString() : "";
      const published = a.publishedAt ? new Date(a.publishedAt).toISOString() : "";
      return `  <entry>
    <title>${a.title}</title>
    <link href="${siteUrl}/articles/${a.slug}"/>
    <id>${siteUrl}/articles/${a.slug}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <summary>${a.excerpt || ""}</summary>
  </entry>`;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${title}</title>
  <link href="${siteUrl}"/>
  <id>${siteUrl}</id>
  <updated>${new Date().toISOString()}</updated>
${entries}
</feed>`;
  },
});
```

- [ ] **Step 2: 创建 feed controller**

创建 `server/src/controllers/content-api/feed.ts`：

```typescript
async function getSiteUrl(siteId: number, fallbackHost: string): Promise<string> {
  const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
    where: { id: siteId },
  });
  return siteConfig?.domain || `https://${fallbackHost}`;
}

export default {
  async rss(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("feed").generateRSS(siteId, siteUrl);
    ctx.type = "application/rss+xml";
    ctx.body = xml;
  },

  async atom(ctx: any) {
    const siteId = ctx.state.siteId;
    const siteUrl = await getSiteUrl(siteId, ctx.request.host);
    const xml = await strapi.plugin("zhao-website").service("feed").generateAtom(siteId, siteUrl);
    ctx.type = "application/atom+xml";
    ctx.body = xml;
  },
};
```

- [ ] **Step 3: 在 services/index.ts 中注册 feed**

在 `import cache from "./cache";` 之后添加：

```typescript
import feed from "./feed";
```

在导出对象中，`"cache": cache,` 之后添加：

```typescript
  "feed": feed,
```

- [ ] **Step 4: 在 controllers/content-api/index.ts 中注册 feed**

在 `import knowledgeGraph from "./knowledge-graph";` 之后添加：

```typescript
import feed from "./feed";
```

在导出对象中，`"knowledge-graph": knowledgeGraph,` 之后添加：

```typescript
  "feed": feed,
```

- [ ] **Step 5: 在 routes/content-api.ts 中新增路由**

在 `publicRoute("GET", "/facts.json", "knowledge-graph.exportFacts"),` 之后添加：

```typescript
    publicRoute("GET", "/feed.xml", "feed.rss"),
    publicRoute("GET", "/atom.xml", "feed.atom"),
```

- [ ] **Step 6: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/services/feed.ts plugins/zhao-website/server/src/controllers/content-api/feed.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/server/src/controllers/content-api/index.ts plugins/zhao-website/server/src/routes/content-api.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add RSS and Atom feed endpoints"
```

---

### Task 14: 301 重定向管理

**Files:**
- Create: `server/src/content-types/redirect-rule/schema.json`
- Modify: `server/src/content-types/index.ts`
- Create: `server/src/services/redirect.ts`
- Modify: `server/src/services/index.ts`
- Create: `server/src/middlewares/redirect.ts`
- Modify: `server/src/middlewares/index.ts`
- Modify: `server/src/bootstrap.ts`

- [ ] **Step 1: 创建 redirect-rule CT schema**

创建 `server/src/content-types/redirect-rule/schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_redirect_rules",
  "info": {
    "singularName": "redirect-rule",
    "pluralName": "redirect-rules",
    "displayName": "重定向规则"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "inversedBy": "website_redirect_rules"
    },
    "fromPath": {
      "type": "string",
      "required": true,
      "maxLength": 500
    },
    "toUrl": {
      "type": "string",
      "required": true,
      "maxLength": 500
    },
    "statusCode": {
      "type": "integer",
      "default": 301
    },
    "isActive": {
      "type": "boolean",
      "default": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
```

- [ ] **Step 2: 在 content-types/index.ts 中注册 redirect-rule**

在 `import brandVoice from "./brand-voice/schema.json";` 之后添加：

```typescript
import redirectRule from "./redirect-rule/schema.json";
```

在导出对象中，`"brand-voice": { schema: brandVoice },` 之后添加：

```typescript
  "redirect-rule": { schema: redirectRule },
```

- [ ] **Step 3: 创建 redirect service**

创建 `server/src/services/redirect.ts`：

```typescript
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.redirect-rule";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async match(siteId: number, requestPath: string): Promise<{ toUrl: string; statusCode: number } | null> {
    // 精确匹配
    const rule = await strapi.db.query(UID).findOne({
      where: {
        $or: [{ site: siteId, fromPath: requestPath, isActive: true, deletedAt: null },
              { site: null, fromPath: requestPath, isActive: true, deletedAt: null }],
      },
    });
    if (rule) {
      return { toUrl: rule.toUrl, statusCode: rule.statusCode || 301 };
    }
    // 通配符匹配（fromPath 以 * 结尾）
    const wildcardRules = await strapi.db.query(UID).findMany({
      where: {
        $or: [{ site: siteId, isActive: true, deletedAt: null },
              { site: null, isActive: true, deletedAt: null }],
      },
    });
    for (const wr of wildcardRules) {
      if (wr.fromPath.endsWith("*")) {
        const prefix = wr.fromPath.slice(0, -1);
        if (requestPath.startsWith(prefix)) {
          const suffix = requestPath.substring(prefix.length);
          const toUrl = wr.toUrl.endsWith("*") ? wr.toUrl.slice(0, -1) + suffix : wr.toUrl;
          return { toUrl, statusCode: wr.statusCode || 301 };
        }
      }
    }
    return null;
  },
});
```

- [ ] **Step 4: 在 services/index.ts 中注册 redirect**

在 `import feed from "./feed";` 之后添加：

```typescript
import redirect from "./redirect";
```

在导出对象中，`"feed": feed,` 之后添加：

```typescript
  "redirect": redirect,
```

- [ ] **Step 5: 创建 redirect middleware**

创建 `server/src/middlewares/redirect.ts`：

```typescript
export default async (ctx: any, next: any) => {
  const requestPath = ctx.path;
  // 仅处理 GET 请求
  if (ctx.method !== "GET") return next();
  // 排除 API 路径
  if (requestPath.startsWith("/api/") || requestPath.startsWith("/admin")) return next();

  const siteId = ctx.state?.siteId;
  if (!siteId) return next();

  try {
    const redirectService = strapi.plugin("zhao-website").service("redirect");
    const match = await redirectService.match(siteId, requestPath);
    if (match) {
      ctx.status = match.statusCode;
      ctx.redirect(match.toUrl);
      return;
    }
  } catch (e) {
    // 重定向匹配失败不影响正常请求
  }
  return next();
};
```

- [ ] **Step 6: 在 middlewares/index.ts 中注册 redirect**

读取现有 `server/src/middlewares/index.ts` 内容。在导出中添加 `"redirect"`。

- [ ] **Step 7: 在 bootstrap.ts 中注册重定向中间件**

在 `bootstrap.ts` 的 `// 2. 创建 DB 索引` 之前，添加：

```typescript
  // 注册 301 重定向中间件
  try {
    const redirectMiddleware = strapi.plugin("zhao-website").middleware("redirect");
    const koaApp = strapi.server.app as any;
    koaApp.use(async (ctx: any, next: any) => {
      const siteId = ctx.state?.siteId;
      if (siteId && ctx.method === "GET" && !ctx.path.startsWith("/api/") && !ctx.path.startsWith("/admin")) {
        try {
          const match = await strapi.plugin("zhao-website").service("redirect").match(siteId, ctx.path);
          if (match) {
            ctx.status = match.statusCode;
            ctx.redirect(match.toUrl);
            return;
          }
        } catch {}
      }
      return next();
    });
    if (!isTest) logger.info("[zhao-website] Redirect middleware registered");
  } catch (err) {
    logger.error("[zhao-website] Redirect middleware registration failed:", err);
  }
```

- [ ] **Step 8: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/server/src/content-types/redirect-rule/schema.json plugins/zhao-website/server/src/content-types/index.ts plugins/zhao-website/server/src/services/redirect.ts plugins/zhao-website/server/src/services/index.ts plugins/zhao-website/server/src/middlewares/redirect.ts plugins/zhao-website/server/src/middlewares/index.ts plugins/zhao-website/server/src/bootstrap.ts
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add 301 redirect management with CT, service, and middleware"
```

---

### Task 15: admin UI 结构化数据校验链接

**Files:**
- Modify: `admin/src/pages/SEOOutputPage.tsx`

- [ ] **Step 1: 读取现有 SEOOutputPage.tsx 并添加校验链接区块**

在 `SEOOutputPage.tsx` 中，找到页面输出的末尾区域，添加一个"结构化数据校验"区块：

```tsx
{/* 结构化数据校验 */}
<Card title="结构化数据校验" size="small" style={{ marginTop: 16 }}>
  <Space direction="vertical">
    <Typography.Text>使用外部工具校验你的结构化数据：</Typography.Text>
    <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">
      Google Rich Results Test
    </a>
    <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer">
      Schema.org Validator
    </a>
  </Space>
</Card>
```

需确认现有文件的 import 和组件结构，确保 `Card`、`Space`、`Typography` 已导入。

- [ ] **Step 2: Commit**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add plugins/zhao-website/admin/src/pages/SEOOutputPage.tsx
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "feat(zhao-website): add structured data validation links to SEO output page"
```

---

### Task 16: 全局验证

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1: 检查所有新建文件**

确认以下文件已创建：
- `server/src/services/seo-meta.ts`
- `server/src/controllers/content-api/seo-meta.ts`
- `server/src/services/cache.ts`
- `server/src/services/feed.ts`
- `server/src/controllers/content-api/feed.ts`
- `server/src/controllers/content-api/knowledge-graph.ts`
- `server/src/content-types/redirect-rule/schema.json`
- `server/src/services/redirect.ts`
- `server/src/middlewares/redirect.ts`

- [ ] **Step 2: 检查所有路由已注册**

确认 `content-api.ts` 包含以下路由：
- `GET /v1/seo-meta`
- `GET /v1/knowledge-graph.json`
- `GET /v1/knowledge-graph/:slug`
- `GET /v1/facts.json`
- `GET /v1/feed.xml`
- `GET /v1/atom.xml`

- [ ] **Step 3: 检查 services/index.ts 注册**

确认包含：`seo-meta`、`cache`、`feed`、`redirect`

- [ ] **Step 4: 检查 content-types/index.ts 注册**

确认包含：`redirect-rule`

- [ ] **Step 5: 最终 Commit（如有验证修复）**

```bash
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' add -A
& 'C:\Program Files\Git\cmd\git.exe' -C 'd:\zhao\strapi' commit -m "fix: verification and cleanup for SEO/GEO audit"
```

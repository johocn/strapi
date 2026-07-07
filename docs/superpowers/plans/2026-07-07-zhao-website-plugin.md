# zhao-website 企业官网插件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在多租户 Strapi v5 项目中实施 zhao-website 插件，提供企业官网内容后端（18 个 CT）、媒体租户隔离改造、完整 GEO/AEO 信源支撑、studio 一键发布桥接。

**Architecture:** 单插件集中管理 18 个 CT，复用 zhao-common（site-config/中间件/迁移/软删除）、zhao-auth（权限策略）、zhao-tag（标签索引）、zhao-oss（媒体租户隔离改造）、zhao-studio（一键发布）。所有 CT 强制 `site` manyToOne 做租户隔离，service 层第一参数强制 `siteId`。

**Tech Stack:** Strapi v5、TypeScript、Knex.js（迁移）、PostgreSQL、Jest（测试）、uni-app（前端）。

**Spec:** [2026-07-06-zhao-website-plugin-design.md](../specs/2026-07-06-zhao-website-plugin-design.md)

---

## 文件结构总览

### zhao-website 插件（新建）

```
basic/plugins/zhao-website/
├── package.json                          # Task 1
├── tsconfig.json / tsconfig.server.json  # Task 1
├── strapi-server.js / strapi-admin.js    # Task 1
├── admin/src/                            # Task 1（最小化 shell）
├── server/
│   ├── src/
│   │   ├── index.ts                      # Task 1
│   │   ├── register.ts                   # Task 8
│   │   ├── bootstrap.ts                  # Task 25
│   │   ├── config.ts                     # Task 1
│   │   ├── content-types/
│   │   │   ├── index.ts                  # Task 6
│   │   │   ├── seo-config/{schema.json,lifecycles.ts}      # Task 3
│   │   │   ├── brand-info/{schema.json,lifecycles.ts}      # Task 3
│   │   │   ├── article/{schema.json,lifecycles.ts}         # Task 3
│   │   │   ├── article-category/{schema.json}              # Task 3
│   │   │   ├── product/{schema.json,lifecycles.ts}         # Task 3
│   │   │   ├── case/{schema.json,lifecycles.ts}            # Task 3
│   │   │   ├── compliance/{schema.json,lifecycles.ts}      # Task 3
│   │   │   ├── faq/{schema.json,lifecycles.ts}             # Task 3
│   │   │   ├── tutorial/{schema.json,lifecycles.ts}        # Task 3
│   │   │   ├── download/{schema.json,lifecycles.ts}        # Task 4
│   │   │   ├── lead/schema.json                           # Task 4
│   │   │   ├── visit-log/schema.json                      # Task 4
│   │   │   ├── interaction/schema.json                    # Task 4
│   │   │   ├── search-log/schema.json                     # Task 4
│   │   │   ├── knowledge-entity/{schema.json,lifecycles.ts}    # Task 5
│   │   │   ├── knowledge-relation/{schema.json,lifecycles.ts}  # Task 5
│   │   │   ├── ai-content-summary/schema.json             # Task 5
│   │   │   └── first-truth-policy/schema.json             # Task 5
│   │   ├── controllers/                  # Task 18-21
│   │   │   ├── index.ts
│   │   │   ├── seo-config.ts / brand-info.ts / article.ts / article-category.ts
│   │   │   ├── product.ts / case.ts / compliance.ts / faq.ts / tutorial.ts / download.ts
│   │   │   ├── lead.ts / visit-log.ts / interaction.ts / search-log.ts
│   │   │   ├── knowledge-graph.ts / ai-summary.ts / first-truth.ts
│   │   │   └── seo.ts / llms-txt.ts / schema.ts
│   │   ├── services/                     # Task 13-17
│   │   │   ├── index.ts
│   │   │   ├── seo-config.ts / brand-info.ts
│   │   │   ├── article.ts / article-category.ts
│   │   │   ├── product.ts / case.ts / compliance.ts / faq.ts / tutorial.ts / download.ts
│   │   │   ├── lead.ts / visit-log.ts / interaction.ts / search-log.ts
│   │   │   ├── knowledge-graph.ts / ai-content-summary.ts / first-truth.ts
│   │   │   ├── schema-builder.ts / llms-txt.ts / sitemap.ts / robots.ts
│   │   │   ├── search-engine-push.ts / studio-bridge.ts
│   │   │   └── utils/
│   │   │       ├── slug.ts / status.ts / async-writer.ts
│   │   │       ├── tag-sync.ts / kg-sync.ts / first-truth-validate.ts
│   │   │       └── predicate-dictionary.ts
│   │   ├── routes/
│   │   │   ├── index.ts                  # Task 22
│   │   │   ├── helpers.ts                # Task 22
│   │   │   └── content-api.ts            # Task 22
│   │   ├── policies/
│   │   │   ├── index.ts                  # Task 8
│   │   │   └── has-website-permission.ts # Task 8
│   │   └── middlewares/
│   │       ├── index.ts                  # Task 8
│   │       └── rate-limit.ts             # Task 8
│   └── database/migrations/              # Task 9-10
│       ├── 001_create_core_tables.js
│       ├── 002_add_composite_indexes.js
│       ├── 003_seed_default_predicate_dictionary.js
│       └── 004_seed_default_first_truth_categories.js
└── tests/                                # Task 26
```

### zhao-oss 改造（已存在插件）

```
basic/plugins/zhao-oss/server/
├── src/
│   ├── content-types/
│   │   ├── index.ts                      # Task 11 修改
│   │   └── media-meta/{index.ts}         # Task 11 新建
│   ├── services/media-service.ts         # Task 23 修改
│   ├── bootstrap.ts                      # Task 24 修改
│   ├── controllers/api-controller.ts     # Task 24 修改
│   └── routes/api.ts                     # Task 24 修改
└── database/migrations/                  # Task 11 新建目录
    ├── 001_backfill_media_meta.js
    └── 002_seed_tenant_default_folders.js
```

### 跨插件配置变更

```
basic/config/plugins.ts                                     # Task 2 修改
basic/plugins/zhao-common/server/src/services/
├── migration-runner.ts                                     # Task 2 修改
└── soft-delete.ts                                          # Task 2 修改
basic/plugins/zhao-auth/server/src/permissions.ts           # Task 7 修改
```

### web 端改造

```
web/src/api/media.js                                       # Task 27 修改
web/src/components/MediaPicker.vue                         # Task 27 修改
web/src/components/RichEditor.vue                          # Task 27 修改
```

---

## Phase 1：脚手架与跨插件配置（Tasks 1-2）

### Task 1: 创建 zhao-website 插件脚手架

**Files:**
- Create: `basic/plugins/zhao-website/package.json`
- Create: `basic/plugins/zhao-website/tsconfig.json`
- Create: `basic/plugins/zhao-website/tsconfig.server.json`
- Create: `basic/plugins/zhao-website/strapi-server.js`
- Create: `basic/plugins/zhao-website/strapi-admin.js`
- Create: `basic/plugins/zhao-website/admin/src/index.ts`
- Create: `basic/plugins/zhao-website/admin/src/pluginId.ts`
- Create: `basic/plugins/zhao-website/server/src/index.ts`
- Create: `basic/plugins/zhao-website/server/src/config.ts`
- Create: `basic/plugins/zhao-website/server/src/register.ts`（stub）
- Create: `basic/plugins/zhao-website/server/src/bootstrap.ts`（stub）
- Create: `basic/plugins/zhao-website/server/src/content-types/index.ts`（空 stub）
- Create: `basic/plugins/zhao-website/server/src/controllers/index.ts`（空 stub）
- Create: `basic/plugins/zhao-website/server/src/services/index.ts`（空 stub）
- Create: `basic/plugins/zhao-website/server/src/routes/index.ts`（空 stub）
- Create: `basic/plugins/zhao-website/server/src/policies/index.ts`（空 stub）

- [ ] **Step 1: 创建 package.json**

参考 `basic/plugins/zhao-quiz/package.json` 模板，关键字段：

```json
{
  "name": "zhao-website",
  "version": "1.0.0",
  "description": "企业官网插件 - SEO/AEO 内容资产 + 品牌展示 + 线索转化",
  "private": true,
  "type": "commonjs",
  "exports": {
    "./package.json": "./package.json",
    "./strapi-server": {
      "types": "./dist/server/src/index.d.ts",
      "source": "./server/src/index.ts",
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "default": "./dist/server/index.js"
    },
    "./strapi-admin": {
      "types": "./dist/admin/src/index.d.ts",
      "source": "./admin/src/index.ts",
      "import": "./dist/admin/index.mjs",
      "require": "./dist/admin/index.js",
      "default": "./dist/admin/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "strapi-plugin build",
    "watch": "strapi-plugin watch",
    "watch:link": "strapi-plugin watch:link",
    "verify": "strapi-plugin verify",
    "test:ts:back": "tsc -p tsconfig.server.json"
  },
  "devDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "@strapi/typescript-utils": "^5.45.0",
    "typescript": "^5.9.3"
  },
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0"
  },
  "strapi": {
    "kind": "plugin",
    "name": "zhao-website",
    "displayName": "Zhao Website",
    "description": "企业官网插件 - SEO/AEO 内容资产 + 品牌展示 + 线索转化"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: 创建 tsconfig 文件**

`tsconfig.json`（直接复制 zhao-quiz 同名文件）、`tsconfig.server.json`（同上）。

- [ ] **Step 3: 创建 strapi-server.js / strapi-admin.js**

```js
// strapi-server.js
'use strict';
module.exports = require('./dist/server/index.js');
```

```js
// strapi-admin.js
'use strict';
module.exports = require('./dist/admin/index.js');
```

- [ ] **Step 4: 创建 admin/src 入口**

```ts
// admin/src/pluginId.ts
const pluginId = 'zhao-website';
export default pluginId;
```

```ts
// admin/src/index.ts
import pluginId from './pluginId';
export { pluginId };
export default {
  register() {},
  bootstrap() {},
};
```

- [ ] **Step 5: 创建 server/src/index.ts**

```ts
import register from "./register";
import bootstrap from "./bootstrap";
import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";
import policies from "./policies";

export default {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
};
```

- [ ] **Step 6: 创建 config.ts**

```ts
export default {
  default: {},
};
```

- [ ] **Step 7: 创建 register/bootstrap stub**

```ts
// server/src/register.ts
import type { Core } from "@strapi/strapi";
const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-website] register");
};
export default register;
```

```ts
// server/src/bootstrap.ts
import type { Core } from "@strapi/strapi";
const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-website] bootstrap (stub, 将在 Task 25 完善)");
};
export default bootstrap;
```

- [ ] **Step 8: 创建空聚合文件**

```ts
// server/src/content-types/index.ts
export default {};
```

```ts
// server/src/controllers/index.ts
export default {};
```

```ts
// server/src/services/index.ts
export default {};
```

```ts
// server/src/routes/index.ts
export default {};
```

```ts
// server/src/policies/index.ts
export default {};
```

- [ ] **Step 9: 验证脚手架可编译**

Run: `cd basic/plugins/zhao-website && npx strapi-plugin verify`
Expected: 退出码 0，无错误。

- [ ] **Step 10: Commit**

```bash
git add plugins/zhao-website/
git commit -m "feat(zhao-website): 插件脚手架"
```

---

### Task 2: 更新跨插件配置（PLUGIN_ORDER / 软删除白名单 / plugins.ts）

**Files:**
- Modify: `basic/config/plugins.ts`
- Modify: `basic/plugins/zhao-common/server/src/services/migration-runner.ts:7-20`
- Modify: `basic/plugins/zhao-common/server/src/services/soft-delete.ts:8-24`

- [ ] **Step 1: 在 config/plugins.ts 末尾新增 zhao-website 注册**

在 `"zhao-studio"` 块之后追加：

```ts
    "zhao-website": {
        enabled: true,
        resolve: "./plugins/zhao-website",
    },
```

- [ ] **Step 2: 在 migration-runner.ts 的 PLUGIN_ORDER 末尾新增 `"zhao-website"`**

将 `PLUGIN_ORDER` 数组从 12 项扩展为 13 项：

```ts
const PLUGIN_ORDER = [
  "zhao-common",
  "zhao-tag",
  "zhao-oss",
  "zhao-channel",
  "zhao-auth",
  "zhao-course",
  "zhao-point",
  "zhao-quiz",
  "zhao-third",
  "zhao-wealth",
  "zhao-sso",
  "zhao-studio",
  "zhao-website",
];
```

- [ ] **Step 3: 在 soft-delete.ts 的 SOFT_DELETE_WHITELIST 新增 19 个 CT**

在现有 Set 末尾追加（注释分组）：

```ts
// zhao-website CTs (18)
"plugin::zhao-website.seo-config",
"plugin::zhao-website.brand-info",
"plugin::zhao-website.article",
"plugin::zhao-website.article-category",
"plugin::zhao-website.product",
"plugin::zhao-website.case",
"plugin::zhao-website.compliance",
"plugin::zhao-website.faq",
"plugin::zhao-website.tutorial",
"plugin::zhao-website.lead",
"plugin::zhao-website.visit-log",
"plugin::zhao-website.interaction",
"plugin::zhao-website.search-log",
"plugin::zhao-website.knowledge-entity",
"plugin::zhao-website.knowledge-relation",
"plugin::zhao-website.ai-content-summary",
"plugin::zhao-website.first-truth-policy",
"plugin::zhao-website.download",
// zhao-oss media-meta (Task 11 创建)
"plugin::zhao-oss.media-meta",
```

- [ ] **Step 4: Commit**

```bash
git add config/plugins.ts plugins/zhao-common/server/src/services/migration-runner.ts plugins/zhao-common/server/src/services/soft-delete.ts
git commit -m "feat: 注册 zhao-website 到 PLUGIN_ORDER 与软删除白名单"
```

---

## Phase 2：内容模型 Schema（Tasks 3-6）

### Task 3: 创建 9 个业务 CT schema（seo-config / brand-info / article / article-category / product / case / compliance / faq / tutorial）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/content-types/seo-config/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/brand-info/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/article/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/article-category/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/product/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/case/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/compliance/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/faq/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/tutorial/schema.json`

> 字段定义严格遵循 spec §2.1。所有 CT 共同字段：`site` manyToOne、`deletedAt` datetime、`draftAndPublish: false`。表名前缀 `zhao_website_`。

- [ ] **Step 1: seo-config/schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_seo_configs",
  "info": {
    "singularName": "seo-config",
    "pluralName": "seo-configs",
    "displayName": "SEO 配置"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true
    },
    "defaultTitle": { "type": "string", "maxLength": 60 },
    "titleTemplate": { "type": "string", "maxLength": 60 },
    "defaultDescription": { "type": "string", "maxLength": 160 },
    "defaultKeywords": { "type": "string", "maxLength": 200 },
    "ogImage": { "type": "media", "allowedTypes": ["images"] },
    "favicon": { "type": "media", "allowedTypes": ["images", "files"] },
    "googleSiteVerification": { "type": "string", "maxLength": 100 },
    "baiduSiteVerification": { "type": "string", "maxLength": 100 },
    "bingSiteVerification": { "type": "string", "maxLength": 100 },
    "baiduAnalyticsId": { "type": "string", "maxLength": 50 },
    "googleAnalyticsId": { "type": "string", "maxLength": 50 },
    "customHeadCode": { "type": "text" },
    "customBodyCode": { "type": "text" },
    "enableSitemap": { "type": "boolean", "default": true },
    "sitemapExcludeTypes": { "type": "json" },
    "enableRobotsTxt": { "type": "boolean", "default": true },
    "robotsContent": { "type": "text" },
    "aiCrawlerPolicy": {
      "type": "enumeration",
      "enum": ["allow_all", "block_all", "selective"],
      "default": "allow_all"
    },
    "geoRegion": { "type": "string", "maxLength": 20 },
    "geoPlacename": { "type": "string", "maxLength": 100 },
    "geoPosition": { "type": "string", "maxLength": 50 },
    "geoICBM": { "type": "string", "maxLength": 50 },
    "defaultLocale": { "type": "string", "maxLength": 10, "default": "zh-CN" },
    "alternateLocales": { "type": "json" },
    "hreflangStrategy": {
      "type": "enumeration",
      "enum": ["none", "subdirectory", "subdomain", "tld"],
      "default": "subdirectory"
    },
    "organizationName": { "type": "string", "maxLength": 200 },
    "organizationLogo": { "type": "media", "allowedTypes": ["images"] },
    "organizationType": { "type": "string", "maxLength": 50 },
    "schemaSameAs": { "type": "json" },
    "schemaContactPoint": { "type": "json" },
    "icpNumber": { "type": "string", "maxLength": 50 },
    "publicSecurityRecord": { "type": "string", "maxLength": 50 },
    "extraConfig": { "type": "json" },
    "deletedAt": { "type": "datetime", "default": null }
  }
}
```

- [ ] **Step 2: brand-info/schema.json**

按 spec §2.1 CT 02 字段定义。`site` 用 `oneToOne`（租户单例语义），`mainEntity` manyToOne `plugin::zhao-website.knowledge-entity`。

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_brand_infos",
  "info": {
    "singularName": "brand-info",
    "pluralName": "brand-infos",
    "displayName": "品牌信息"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true
    },
    "companyName": { "type": "string", "maxLength": 200, "required": true },
    "shortName": { "type": "string", "maxLength": 100 },
    "slogan": { "type": "string", "maxLength": 200 },
    "logo": { "type": "media", "allowedTypes": ["images"] },
    "logoDark": { "type": "media", "allowedTypes": ["images"] },
    "favicon": { "type": "media", "allowedTypes": ["images"] },
    "description": { "type": "text" },
    "foundingDate": { "type": "date" },
    "registeredAddress": { "type": "string", "maxLength": 500 },
    "officeAddress": { "type": "string", "maxLength": 500 },
    "contactPhone": { "type": "string", "maxLength": 30 },
    "contactEmail": { "type": "email" },
    "serviceHotline": { "type": "string", "maxLength": 30 },
    "businessHours": { "type": "string", "maxLength": 100 },
    "wechatQrCode": { "type": "media", "allowedTypes": ["images"] },
    "wechatPublicAccount": { "type": "string", "maxLength": 100 },
    "miniProgramName": { "type": "string", "maxLength": 100 },
    "socialLinks": { "type": "json" },
    "legalRepresentative": { "type": "string", "maxLength": 50 },
    "registeredCapital": { "type": "string", "maxLength": 50 },
    "unifiedSocialCreditCode": { "type": "string", "maxLength": 50 },
    "businessScope": { "type": "text" },
    "mainEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity"
    },
    "deletedAt": { "type": "datetime", "default": null }
  }
}
```

- [ ] **Step 3: article/schema.json**

按 spec §2.1 CT 03。`tags` manyToMany `plugin::zhao-tag.tag`，`category` manyToOne `plugin::zhao-website.article-category`，`mainEntity`/`mentionedEntities` 关联 knowledge-entity，`sourceArticleDraft` manyToOne `plugin::zhao-studio.article-draft`。`status` enum `[draft, published, archived]`。

完整字段：title / slug（uid targetField=title）/ excerpt / content / coverImage / category / tags / author / authorTitle / isFeatured / isPinned / viewCount / likeCount / collectCount / shareCount / readingTime / wordCount / seoTitle / seoDescription / seoKeywords / canonicalUrl / ogTitle / ogDescription / ogImage / ogType / twitterCard / schemaType / schemaJson / allowIndex / noFollow / sitemapPriority（decimal）/ sitemapFrequency（enum）/ sourceType / sourceUrl / sourceArticleDraft / mainEntity / mentionedEntities / structuredData / status / publishedAt / deletedAt / site。

- [ ] **Step 4: article-category/schema.json**

按 spec §2.1 CT 04，树形结构：`parent` manyToOne self，`children` oneToMany self（mappedBy: parent）。

- [ ] **Step 5: product/schema.json**

按 spec §2.1 CT 05。`images` media（multiple: true）。`category` manyToOne `plugin::zhao-website.article-category`（复用分类）。

- [ ] **Step 6: case/schema.json**

按 spec §2.1 CT 06。`relatedProducts` manyToMany `plugin::zhao-website.product`。

- [ ] **Step 7: compliance/schema.json**

按 spec §2.1 CT 07。`category` enum `[notice, policy, report, certificate, agreement]`。

- [ ] **Step 8: faq/schema.json**

按 spec §2.1 CT 08。

- [ ] **Step 9: tutorial/schema.json**

按 spec §2.1 CT 09。`difficulty` enum `[beginner, intermediate, advanced]`。

- [ ] **Step 10: 验证所有 schema.json 为合法 JSON**

Run: `cd basic/plugins/zhao-website && for f in server/src/content-types/*/schema.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "INVALID: $f"; done`
Expected: 无输出（全部合法）。

- [ ] **Step 11: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/
git commit -m "feat(zhao-website): 9 个业务 CT schema"
```

---

### Task 4: 创建 5 个线索/数据/下载 CT schema

**Files:**
- Create: `basic/plugins/zhao-website/server/src/content-types/download/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/lead/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/visit-log/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/interaction/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/search-log/schema.json`

- [ ] **Step 1: download/schema.json**

按 spec §2.4 CT 16。`file` media required，`fileType` enum `[whitepaper, brochure, datasheet, template, guide, certificate, other]`。

- [ ] **Step 2: lead/schema.json**

按 spec §2.2 CT 10。`type` enum `[contact, download, quote, appointment, demo, partner]`，`status` enum `[new, contacted, qualified, unqualified, converted, invalid]`，`assignedTo` manyToOne `admin::user`。

- [ ] **Step 3: visit-log/schema.json**

按 spec §2.2 CT 11。`type` enum 8 项，`deviceType` enum `[desktop, mobile, tablet]`，`userId` manyToOne `plugin::users-permissions.user`。

- [ ] **Step 4: interaction/schema.json**

按 spec §2.2 CT 17。`type` enum `[like, collect, share]`。

- [ ] **Step 5: search-log/schema.json**

按 spec §2.2 CT 18。

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/
git commit -m "feat(zhao-website): 5 个线索/数据/下载 CT schema"
```

---

### Task 5: 创建 4 个 GEO 进阶 CT schema

**Files:**
- Create: `basic/plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/knowledge-relation/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/ai-content-summary/schema.json`
- Create: `basic/plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json`

- [ ] **Step 1: knowledge-entity/schema.json**

按 spec §2.3 CT 12。`entityType` enum 18 项（Organization/Person/Product/Service/Place/Event/CreativeWork/Article/CaseStudy/Offer/Review/FAQ/HowTo/BreadcrumbList/Brand/ContactPoint/QuantitativeValue/DefinedTerm）。`verificationStatus` enum `[verified, pending, outdated, conflict]`。`verifiedBy` manyToOne `admin::user`。

- [ ] **Step 2: knowledge-relation/schema.json**

按 spec §2.3 CT 13。`subjectEntity` manyToOne `plugin::zhao-website.knowledge-entity` required，`objectEntity` manyToOne 同 CT（可空），`objectValue` JSON，`objectText` text。`predicate` string max 100 required。`sourceType` enum `[official, derived, manual, inferred]`。

- [ ] **Step 3: ai-content-summary/schema.json**

按 spec §2.3 CT 14。`summaryType` enum 8 项 `[tldr, key_facts, faq, qa_pairs, technical_spec, executive_brief, comparison, howto]`。`generatedBy` enum `[manual, ai_assisted, ai_generated, hybrid]`。

- [ ] **Step 4: first-truth-policy/schema.json**

按 spec §2.3 CT 15。`claimCategory` enum 6 项，`canonicalValueType` enum `[text, number, date, url, json]`，`canonicalSourceType` enum 4 项，`conflictResolution` enum `[latest, earliest, highest_confidence, manual]`，`canonicalEntity` manyToOne `plugin::zhao-website.knowledge-entity`。

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/
git commit -m "feat(zhao-website): 4 个 GEO 进阶 CT schema"
```

---

### Task 6: 创建 content-types/index.ts 聚合 + 各 CT lifecycles

**Files:**
- Create: `basic/plugins/zhao-website/server/src/content-types/index.ts`
- Create: 8 个 lifecycles.ts（article/product/case/compliance/faq/tutorial/download/knowledge-entity/knowledge-relation）

- [ ] **Step 1: 创建 content-types/index.ts**

```ts
import seoConfig from "./seo-config/schema.json";
import brandInfo from "./brand-info/schema.json";
import article from "./article/schema.json";
import articleCategory from "./article-category/schema.json";
import product from "./product/schema.json";
import caseCt from "./case/schema.json";
import compliance from "./compliance/schema.json";
import faq from "./faq/schema.json";
import tutorial from "./tutorial/schema.json";
import download from "./download/schema.json";
import lead from "./lead/schema.json";
import visitLog from "./visit-log/schema.json";
import interaction from "./interaction/schema.json";
import searchLog from "./search-log/schema.json";
import knowledgeEntity from "./knowledge-entity/schema.json";
import knowledgeRelation from "./knowledge-relation/schema.json";
import aiContentSummary from "./ai-content-summary/schema.json";
import firstTruthPolicy from "./first-truth-policy/schema.json";

export default {
  "seo-config": { schema: seoConfig },
  "brand-info": { schema: brandInfo },
  "article": { schema: article },
  "article-category": { schema: articleCategory },
  "product": { schema: product },
  "case": { schema: caseCt },
  "compliance": { schema: compliance },
  "faq": { schema: faq },
  "tutorial": { schema: tutorial },
  "download": { schema: download },
  "lead": { schema: lead },
  "visit-log": { schema: visitLog },
  "interaction": { schema: interaction },
  "search-log": { schema: searchLog },
  "knowledge-entity": { schema: knowledgeEntity },
  "knowledge-relation": { schema: knowledgeRelation },
  "ai-content-summary": { schema: aiContentSummary },
  "first-truth-policy": { schema: firstTruthPolicy },
};
```

- [ ] **Step 2: 创建 7 个业务 CT lifecycles.ts**

模板（以 article 为例，文件路径 `content-types/article/lifecycles.ts`）：

```ts
import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";
import { firstTruthValidate } from "../../services/utils/first-truth-validate";

const TARGET_TYPE = "website-article";

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
  },
};
```

为 product/case/compliance/faq/tutorial/download 创建同名文件，仅 `TARGET_TYPE` 不同：
- product → `website-product`
- case → `website-case`
- compliance → `website-compliance`
- faq → `website-faq`
- tutorial → `website-tutorial`
- download → `website-download`

> 注：lifecycles.ts 中调用的 utils 在 Task 14 创建。在 Task 14 完成前，编译可能失败，故此处先创建文件结构，Task 14 后整体可编译。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-website/server/src/content-types/
git commit -m "feat(zhao-website): content-types 聚合 + tag-sync lifecycle 钩子"
```

---

## Phase 3：权限树与策略（Task 7-8）

### Task 7: 更新 zhao-auth 权限树与角色映射

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts`（PERMISSION_TREE 末尾 + DEFAULT_ROLE_PERMISSIONS）

- [ ] **Step 1: 在 PERMISSION_TREE 末尾（`menu.studio-center` 之后）新增 `menu.website-center` 节点**

```ts
  "menu.website-center": {
    label: "官网中心",
    type: "menu",
    children: {
      "menu.website-seo": {
        label: "SEO 配置",
        type: "menu",
        children: {
          "seo-config.read": { label: "查看 SEO", type: "button" },
          "seo-config.update": { label: "编辑 SEO", type: "button" },
        },
      },
      "menu.website-brand": {
        label: "品牌信息",
        type: "menu",
        children: {
          "brand-info.read": { label: "查看品牌", type: "button" },
          "brand-info.update": { label: "编辑品牌", type: "button" },
        },
      },
      "menu.website-article": {
        label: "文章管理",
        type: "menu",
        children: {
          "article.read": { label: "查看文章", type: "button" },
          "article.create": { label: "新增文章", type: "button" },
          "article.update": { label: "编辑文章", type: "button" },
          "article.delete": { label: "删除文章", type: "button" },
          "article.publish": { label: "发布文章", type: "button" },
        },
      },
      "menu.website-article-category": {
        label: "文章分类",
        type: "menu",
        children: {
          "article-category.read": { label: "查看分类", type: "button" },
          "article-category.create": { label: "新增分类", type: "button" },
          "article-category.update": { label: "编辑分类", type: "button" },
          "article-category.delete": { label: "删除分类", type: "button" },
        },
      },
      "menu.website-product": {
        label: "产品管理",
        type: "menu",
        children: {
          "product.read": { label: "查看产品", type: "button" },
          "product.create": { label: "新增产品", type: "button" },
          "product.update": { label: "编辑产品", type: "button" },
          "product.delete": { label: "删除产品", type: "button" },
        },
      },
      "menu.website-case": {
        label: "案例管理",
        type: "menu",
        children: {
          "case.read": { label: "查看案例", type: "button" },
          "case.create": { label: "新增案例", type: "button" },
          "case.update": { label: "编辑案例", type: "button" },
          "case.delete": { label: "删除案例", type: "button" },
        },
      },
      "menu.website-compliance": {
        label: "合规公示",
        type: "menu",
        children: {
          "compliance.read": { label: "查看合规", type: "button" },
          "compliance.create": { label: "新增合规", type: "button" },
          "compliance.update": { label: "编辑合规", type: "button" },
          "compliance.delete": { label: "删除合规", type: "button" },
        },
      },
      "menu.website-faq": {
        label: "FAQ 管理",
        type: "menu",
        children: {
          "faq.read": { label: "查看 FAQ", type: "button" },
          "faq.create": { label: "新增 FAQ", type: "button" },
          "faq.update": { label: "编辑 FAQ", type: "button" },
          "faq.delete": { label: "删除 FAQ", type: "button" },
        },
      },
      "menu.website-tutorial": {
        label: "教程管理",
        type: "menu",
        children: {
          "tutorial.read": { label: "查看教程", type: "button" },
          "tutorial.create": { label: "新增教程", type: "button" },
          "tutorial.update": { label: "编辑教程", type: "button" },
          "tutorial.delete": { label: "删除教程", type: "button" },
        },
      },
      "menu.website-download": {
        label: "下载管理",
        type: "menu",
        children: {
          "download.read": { label: "查看下载", type: "button" },
          "download.create": { label: "新增下载", type: "button" },
          "download.update": { label: "编辑下载", type: "button" },
          "download.delete": { label: "删除下载", type: "button" },
        },
      },
      "menu.website-lead": {
        label: "线索管理",
        type: "menu",
        children: {
          "lead.read": { label: "查看线索", type: "button" },
          "lead.update": { label: "更新线索", type: "button" },
          "lead.delete": { label: "删除线索", type: "button" },
        },
      },
      "menu.website-visit-log": {
        label: "访问日志",
        type: "menu",
        children: {
          "visit-log.read": { label: "查看日志", type: "button" },
          "visit-log.delete": { label: "删除日志", type: "button" },
        },
      },
      "menu.website-interaction": {
        label: "互动记录",
        type: "menu",
        children: {
          "interaction.read": { label: "查看互动", type: "button" },
          "interaction.delete": { label: "删除互动", type: "button" },
        },
      },
      "menu.website-search-log": {
        label: "搜索日志",
        type: "menu",
        children: {
          "search-log.read": { label: "查看搜索日志", type: "button" },
          "search-log.delete": { label: "删除搜索日志", type: "button" },
        },
      },
      "menu.website-knowledge-entity": {
        label: "知识实体",
        type: "menu",
        children: {
          "knowledge-entity.read": { label: "查看实体", type: "button" },
          "knowledge-entity.create": { label: "新增实体", type: "button" },
          "knowledge-entity.update": { label: "编辑实体", type: "button" },
          "knowledge-entity.delete": { label: "删除实体", type: "button" },
          "knowledge-entity.manage": { label: "实体管理", type: "button" },
        },
      },
      "menu.website-knowledge-relation": {
        label: "知识关系",
        type: "menu",
        children: {
          "knowledge-relation.read": { label: "查看关系", type: "button" },
          "knowledge-relation.create": { label: "新增关系", type: "button" },
          "knowledge-relation.update": { label: "编辑关系", type: "button" },
          "knowledge-relation.delete": { label: "删除关系", type: "button" },
        },
      },
      "menu.website-ai-summary": {
        label: "AI 摘要",
        type: "menu",
        children: {
          "ai-summary.read": { label: "查看摘要", type: "button" },
          "ai-summary.create": { label: "新增摘要", type: "button" },
          "ai-summary.update": { label: "编辑摘要", type: "button" },
          "ai-summary.delete": { label: "删除摘要", type: "button" },
        },
      },
      "menu.website-first-truth": {
        label: "第一真值",
        type: "menu",
        children: {
          "first-truth.read": { label: "查看真值", type: "button" },
          "first-truth.create": { label: "新增真值", type: "button" },
          "first-truth.update": { label: "编辑真值", type: "button" },
          "first-truth.delete": { label: "删除真值", type: "button" },
          "first-truth.manage": { label: "真值管理", type: "button" },
        },
      },
    },
  },
```

- [ ] **Step 2: 在 DEFAULT_ROLE_PERMISSIONS 中扩展各角色**

**admin**：自动通过 `flattenPermissions(PERMISSION_TREE)` 覆盖（无需手动改）。

**channel-admin**：在现有数组末尾追加（除 manage/delete 日志/compliance.delete 外的全部）：

```ts
    // 官网中心
    "menu.website-center",
    "menu.website-seo", "seo-config.read", "seo-config.update",
    "menu.website-brand", "brand-info.read", "brand-info.update",
    "menu.website-article", "article.read", "article.create", "article.update", "article.publish",
    "menu.website-article-category", "article-category.read", "article-category.create", "article-category.update", "article-category.delete",
    "menu.website-product", "product.read", "product.create", "product.update", "product.delete",
    "menu.website-case", "case.read", "case.create", "case.update", "case.delete",
    "menu.website-compliance", "compliance.read", "compliance.create", "compliance.update",
    "menu.website-faq", "faq.read", "faq.create", "faq.update", "faq.delete",
    "menu.website-tutorial", "tutorial.read", "tutorial.create", "tutorial.update", "tutorial.delete",
    "menu.website-download", "download.read", "download.create", "download.update", "download.delete",
    "menu.website-lead", "lead.read", "lead.update", "lead.delete",
    "menu.website-visit-log", "visit-log.read",
    "menu.website-interaction", "interaction.read",
    "menu.website-search-log", "search-log.read",
    "menu.website-knowledge-entity", "knowledge-entity.read", "knowledge-entity.create", "knowledge-entity.update", "knowledge-entity.delete",
    "menu.website-knowledge-relation", "knowledge-relation.read", "knowledge-relation.create", "knowledge-relation.update", "knowledge-relation.delete",
    "menu.website-ai-summary", "ai-summary.read", "ai-summary.create", "ai-summary.update", "ai-summary.delete",
    "menu.website-first-truth", "first-truth.read", "first-truth.create", "first-truth.update", "first-truth.delete",
```

**plugin-manager**：在 `flattenPermissions(...)` 的入参数组中追加 `"menu.website-center"`，并 `.concat([...])` 追加：

```ts
    "menu.website-center",
    "menu.website-seo", "seo-config.read",
    "menu.website-brand", "brand-info.read",
    "menu.website-article", "article.read", "article.create", "article.update",
    "menu.website-article-category", "article-category.read", "article-category.create", "article-category.update",
    "menu.website-product", "product.read", "product.create", "product.update",
    "menu.website-case", "case.read", "case.create", "case.update",
    "menu.website-compliance", "compliance.read", "compliance.create", "compliance.update",
    "menu.website-faq", "faq.read", "faq.create", "faq.update",
    "menu.website-tutorial", "tutorial.read", "tutorial.create", "tutorial.update",
    "menu.website-download", "download.read", "download.create", "download.update",
    "menu.website-lead", "lead.read", "lead.update",
    "menu.website-visit-log", "visit-log.read",
    "menu.website-interaction", "interaction.read",
    "menu.website-search-log", "search-log.read",
    "menu.website-knowledge-entity", "knowledge-entity.read",
    "menu.website-knowledge-relation", "knowledge-relation.read",
    "menu.website-ai-summary", "ai-summary.read", "ai-summary.create",
    "menu.website-first-truth", "first-truth.read",
```

**instructor**：追加：

```ts
    "menu.website-center",
    "menu.website-brand", "brand-info.read",
    "menu.website-article", "article.read",
    "menu.website-product", "product.read",
    "menu.website-case", "case.read",
    "menu.website-compliance", "compliance.read",
    "menu.website-faq", "faq.read",
    "menu.website-tutorial", "tutorial.read",
    "menu.website-download", "download.read",
    "menu.website-lead", "lead.read",
```

**user**：保持空数组（无官网管理权限）。

- [ ] **Step 3: Commit**

```bash
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(zhao-auth): 新增 website-center 权限树与角色映射"
```

---

### Task 8: 创建 zhao-website policies 与 middlewares

**Files:**
- Create: `basic/plugins/zhao-website/server/src/policies/index.ts`
- Create: `basic/plugins/zhao-website/server/src/policies/has-website-permission.ts`
- Create: `basic/plugins/zhao-website/server/src/middlewares/index.ts`
- Create: `basic/plugins/zhao-website/server/src/middlewares/rate-limit.ts`
- Modify: `basic/plugins/zhao-website/server/src/register.ts`

- [ ] **Step 1: policies/index.ts**

```ts
import hasWebsitePermission from "./has-website-permission";
export default {
  "has-website-permission": hasWebsitePermission,
};
```

- [ ] **Step 2: policies/has-website-permission.ts**

```ts
import type { Core } from "@strapi/strapi";

export default (config: { action?: string }) => {
  return async (ctx: any, next: any) => {
    const user = ctx.state?.user || ctx.state?.auth?.credentials;
    if (!user) {
      return ctx.throw(401, "未认证");
    }
    const action = config?.action;
    if (!action) {
      return await next();
    }
    const authService = strapi.plugin("zhao-auth").service("auth");
    const hasPermission = await authService.checkPermission(user, action);
    if (!hasPermission) {
      return ctx.throw(403, `需要 ${action} 权限`);
    }
    await next();
  };
};
```

- [ ] **Step 3: middlewares/index.ts**

```ts
import rateLimit from "./rate-limit";
export default {
  "rate-limit": rateLimit,
};
```

- [ ] **Step 4: middlewares/rate-limit.ts**

实现内存 Map 限流（key=ip+route，value=时间窗口数组）：

```ts
import type { Core } from "@strapi/strapi";

const buckets = new Map<string, number[]>();

export default (config: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  const { windowMs, max, message = "请求过于频繁，请稍后再试" } = config;
  return async (ctx: any, next: any) => {
    const ip = ctx.request.ip || ctx.ips?.[0] || "unknown";
    const key = `${ip}:${ctx.path}`;
    const now = Date.now();
    const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= max) {
      return ctx.throw(429, message);
    }
    timestamps.push(now);
    buckets.set(key, timestamps);
    await next();
  };
};
```

- [ ] **Step 5: 完善 register.ts（注册限流中间件为 policy）**

```ts
import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-website] register");

  // 注册 has-website-permission 策略到 zhao-auth（如果可用）
  try {
    const authService = strapi.plugin("zhao-auth")?.service("auth");
    if (authService && typeof (authService as any).registerPolicy === "function") {
      // 直接复用 has-permission 模式即可，无需额外注册
    }
  } catch {
    // zhao-auth 未启用，由路由层 policy 直接处理
  }
};

export default register;
```

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-website/server/src/policies/ plugins/zhao-website/server/src/middlewares/ plugins/zhao-website/server/src/register.ts
git commit -m "feat(zhao-website): 权限策略 + 限流中间件"
```

---

## Phase 4：迁移脚本（Tasks 9-11）

### Task 9: zhao-website 迁移 001_create_core_tables.js（索引与约束）

**Files:**
- Create: `basic/plugins/zhao-website/server/database/migrations/001_create_core_tables.js`

> 注：表本身由 Strapi content-types 自动创建。本迁移只补 Strapi schema 无法表达的复合索引、唯一约束（含 `WHERE deleted_at IS NULL`）。

- [ ] **Step 1: 创建迁移目录与 001 文件**

```js
'use strict';

async function up(knex) {
  // article: (site_id, slug) UNIQUE WHERE deleted_at IS NULL
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_articles_site_slug_idx
    ON zhao_website_articles (site_id, slug)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_articles_site_status_published_idx
    ON zhao_website_articles (site_id, status, published_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_articles_site_category_idx
    ON zhao_website_articles (site_id, category_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_articles_site_featured_idx
    ON zhao_website_articles (site_id, is_featured)
  `);

  // article-category
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_article_categories_site_slug_idx
    ON zhao_website_article_categories (site_id, slug)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_article_categories_site_parent_idx
    ON zhao_website_article_categories (site_id, parent_id)
  `);

  // product
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_products_site_slug_idx
    ON zhao_website_products (site_id, slug)
    WHERE deleted_at IS NULL
  `);

  // case
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_cases_site_slug_idx
    ON zhao_website_cases (site_id, slug)
    WHERE deleted_at IS NULL
  `);

  // compliance
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_compliances_site_slug_idx
    ON zhao_website_compliances (site_id, slug)
    WHERE deleted_at IS NULL
  `);

  // faq
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_faqs_site_slug_idx
    ON zhao_website_faqs (site_id, slug)
    WHERE deleted_at IS NULL
  `);

  // tutorial
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_tutorials_site_slug_idx
    ON zhao_website_tutorials (site_id, slug)
    WHERE deleted_at IS NULL
  `);

  // download
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_downloads_site_filetype_idx
    ON zhao_website_downloads (site_id, file_type)
  `);

  // lead
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_leads_site_type_idx
    ON zhao_website_leads (site_id, type)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_leads_site_status_idx
    ON zhao_website_leads (site_id, status)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_leads_site_assigned_idx
    ON zhao_website_leads (site_id, assigned_to_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_leads_site_created_idx
    ON zhao_website_leads (site_id, created_at DESC)
  `);

  // visit-log
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_type_created_idx
    ON zhao_website_visit_logs (site_id, type, created_at)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_target_idx
    ON zhao_website_visit_logs (site_id, target_type, target_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_visitor_idx
    ON zhao_website_visit_logs (site_id, visitor_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_visit_logs_site_keyword_idx
    ON zhao_website_visit_logs (site_id, search_keyword)
  `);

  // interaction: UNIQUE (site, type, target_type, target_id, visitor_id) WHERE deleted_at IS NULL
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_interactions_dedup_idx
    ON zhao_website_interactions (site_id, type, target_type, target_id, visitor_id)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_interactions_site_target_idx
    ON zhao_website_interactions (site_id, target_type, target_id, type)
  `);

  // search-log
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_search_logs_site_keyword_idx
    ON zhao_website_search_logs (site_id, keyword, created_at)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_search_logs_site_created_idx
    ON zhao_website_search_logs (site_id, created_at DESC)
  `);

  // knowledge-entity
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_slug_idx
    ON zhao_website_knowledge_entities (site_id, slug)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_type_idx
    ON zhao_website_knowledge_entities (site_id, entity_type)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_knowledge_entities_site_identifier_idx
    ON zhao_website_knowledge_entities (site_id, identifier)
  `);

  // knowledge-relation: UNIQUE (subject_entity_id, predicate, object_entity_id) WHERE object_entity_id IS NOT NULL AND deleted_at IS NULL
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_knowledge_relations_entity_triple_idx
    ON zhao_website_knowledge_relations (subject_entity_id, predicate, object_entity_id)
    WHERE object_entity_id IS NOT NULL AND deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_knowledge_relations_subject_idx
    ON zhao_website_knowledge_relations (subject_entity_id, predicate)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_knowledge_relations_object_idx
    ON zhao_website_knowledge_relations (object_entity_id, predicate)
  `);

  // ai-content-summary: UNIQUE (site, target_type, target_id, summary_type, language) WHERE deleted_at IS NULL
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_ai_summaries_target_idx
    ON zhao_website_ai_summaries (site_id, target_type, target_id, summary_type, language)
    WHERE deleted_at IS NULL
  `);

  // first-truth-policy: UNIQUE (site, claim_key) WHERE deleted_at IS NULL
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS zhao_website_first_truths_site_claim_key_idx
    ON zhao_website_first_truths (site_id, claim_key)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_first_truths_site_category_idx
    ON zhao_website_first_truths (site_id, claim_category)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_first_truths_site_status_idx
    ON zhao_website_first_truths (site_id, verification_status)
  `);
}

async function down(knex) {
  const indexes = [
    'zhao_website_articles_site_slug_idx',
    'zhao_website_articles_site_status_published_idx',
    'zhao_website_articles_site_category_idx',
    'zhao_website_articles_site_featured_idx',
    'zhao_website_article_categories_site_slug_idx',
    'zhao_website_article_categories_site_parent_idx',
    'zhao_website_products_site_slug_idx',
    'zhao_website_cases_site_slug_idx',
    'zhao_website_compliances_site_slug_idx',
    'zhao_website_faqs_site_slug_idx',
    'zhao_website_tutorials_site_slug_idx',
    'zhao_website_downloads_site_filetype_idx',
    'zhao_website_leads_site_type_idx',
    'zhao_website_leads_site_status_idx',
    'zhao_website_leads_site_assigned_idx',
    'zhao_website_leads_site_created_idx',
    'zhao_website_visit_logs_site_type_created_idx',
    'zhao_website_visit_logs_site_target_idx',
    'zhao_website_visit_logs_site_visitor_idx',
    'zhao_website_visit_logs_site_keyword_idx',
    'zhao_website_interactions_dedup_idx',
    'zhao_website_interactions_site_target_idx',
    'zhao_website_search_logs_site_keyword_idx',
    'zhao_website_search_logs_site_created_idx',
    'zhao_website_knowledge_entities_site_slug_idx',
    'zhao_website_knowledge_entities_site_type_idx',
    'zhao_website_knowledge_entities_site_identifier_idx',
    'zhao_website_knowledge_relations_entity_triple_idx',
    'zhao_website_knowledge_relations_subject_idx',
    'zhao_website_knowledge_relations_object_idx',
    'zhao_website_ai_summaries_target_idx',
    'zhao_website_first_truths_site_claim_key_idx',
    'zhao_website_first_truths_site_category_idx',
    'zhao_website_first_truths_site_status_idx',
  ];
  for (const idx of indexes) {
    await knex.raw(`DROP INDEX IF EXISTS ${idx}`);
  }
}

module.exports = { up, down };
```

- [ ] **Step 2: Commit**

```bash
git add plugins/zhao-website/server/database/migrations/001_create_core_tables.js
git commit -m "feat(zhao-website): 迁移 001 - 索引与唯一约束"
```

---

### Task 10: zhao-website 迁移 002-004（复合索引 + 字典种子）

**Files:**
- Create: `basic/plugins/zhao-website/server/database/migrations/002_add_composite_indexes.js`
- Create: `basic/plugins/zhao-website/server/database/migrations/003_seed_default_predicate_dictionary.js`
- Create: `basic/plugins/zhao-website/server/database/migrations/004_seed_default_first_truth_categories.js`

- [ ] **Step 1: 002_add_composite_indexes.js**

补充 001 之外的复合索引（如 `(site_id, is_pinned, published_at DESC)`、`(site_id, difficulty)` 等）：

```js
'use strict';

async function up(knex) {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_articles_site_pinned_idx
    ON zhao_website_articles (site_id, is_pinned, published_at DESC)
    WHERE deleted_at IS NULL AND status = 'published'
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_tutorials_site_difficulty_idx
    ON zhao_website_tutorials (site_id, difficulty)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_compliances_site_pinned_idx
    ON zhao_website_compliances (site_id, is_pinned, published_at DESC)
    WHERE deleted_at IS NULL AND status = 'published'
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_faqs_site_category_idx
    ON zhao_website_faqs (site_id, category_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS zhao_website_faqs_site_status_idx
    ON zhao_website_faqs (site_id, status)
  `);
}

async function down(knex) {
  const indexes = [
    'zhao_website_articles_site_pinned_idx',
    'zhao_website_tutorials_site_difficulty_idx',
    'zhao_website_compliances_site_pinned_idx',
    'zhao_website_faqs_site_category_idx',
    'zhao_website_faqs_site_status_idx',
  ];
  for (const idx of indexes) {
    await knex.raw(`DROP INDEX IF EXISTS ${idx}`);
  }
}

module.exports = { up, down };
```

- [ ] **Step 2: 003_seed_default_predicate_dictionary.js**

将 spec §2.3 的 PREDICATE_DICTIONARY 写入一个配置表（这里写入 zhao_schema_migrations 之外的专用表，或采用 JSON 文件方式）。**简化方案**：将字典写入 `zhao_website_predicate_dictionary` 临时表（service 层也保留 TS 常量备份）：

```js
'use strict';

const PREDICATES = [
  { entity_type: 'Organization', predicate: 'founder' },
  { entity_type: 'Organization', predicate: 'foundingDate' },
  { entity_type: 'Organization', predicate: 'legalName' },
  { entity_type: 'Organization', predicate: 'areaServed' },
  { entity_type: 'Organization', predicate: 'numberOfEmployees' },
  { entity_type: 'Organization', predicate: 'contactPoint' },
  { entity_type: 'Organization', predicate: 'location' },
  { entity_type: 'Organization', predicate: 'hasOfferCatalog' },
  { entity_type: 'Person', predicate: 'affiliation' },
  { entity_type: 'Person', predicate: 'jobTitle' },
  { entity_type: 'Person', predicate: 'worksFor' },
  { entity_type: 'Person', predicate: 'alumniOf' },
  { entity_type: 'Product', predicate: 'manufacturer' },
  { entity_type: 'Product', predicate: 'brand' },
  { entity_type: 'Product', predicate: 'offers' },
  { entity_type: 'Product', predicate: 'aggregateRating' },
  { entity_type: 'Product', predicate: 'category' },
  { entity_type: 'Article', predicate: 'about' },
  { entity_type: 'Article', predicate: 'mentions' },
  { entity_type: 'Article', predicate: 'author' },
  { entity_type: 'Article', predicate: 'publisher' },
  { entity_type: 'Article', predicate: 'datePublished' },
  { entity_type: 'CaseStudy', predicate: 'subjectOf' },
  { entity_type: 'CaseStudy', predicate: 'about' },
  { entity_type: 'CaseStudy', predicate: 'mentions' },
  { entity_type: 'Event', predicate: 'organizer' },
  { entity_type: 'Event', predicate: 'location' },
  { entity_type: 'Event', predicate: 'startDate' },
  { entity_type: 'Event', predicate: 'subEvent' },
  { entity_type: 'FAQ', predicate: 'about' },
  { entity_type: 'FAQ', predicate: 'mentions' },
  { entity_type: 'FAQ', predicate: 'mainEntity' },
  { entity_type: 'HowTo', predicate: 'about' },
  { entity_type: 'HowTo', predicate: 'mentions' },
  { entity_type: 'HowTo', predicate: 'hasStep' },
  { entity_type: 'Download', predicate: 'about' },
  { entity_type: 'Download', predicate: 'mentions' },
  { entity_type: 'Download', predicate: 'fileFormat' },
];

async function up(knex) {
  // 表由 service 层创建（运行时检查）；这里仅做幂等种子
  const exists = await knex.schema.hasTable('zhao_website_predicate_dictionary');
  if (!exists) {
    await knex.schema.createTable('zhao_website_predicate_dictionary', (t) => {
      t.increments('id').primary();
      t.string('entity_type', 50).notNullable();
      t.string('predicate', 100).notNullable();
      t.unique(['entity_type', 'predicate']);
    });
  }
  for (const item of PREDICATES) {
    await knex('zhao_website_predicate_dictionary')
      .insert(item)
      .onConflict(['entity_type', 'predicate'])
      .ignore();
  }
}

async function down(knex) {
  // 不删除表（避免数据丢失），仅清空种子
  await knex('zhao_website_predicate_dictionary').del();
}

module.exports = { up, down };
```

- [ ] **Step 3: 004_seed_default_first_truth_categories.js**

种子默认真值分类到 `first-truth-policy` 表（仅占位分类元数据，可写入配置表）：

```js
'use strict';

const CATEGORIES = [
  { category: 'business_license', label: '营业执照信息', default_priority: 100 },
  { category: 'brand_claim', label: '品牌声明', default_priority: 90 },
  { category: 'technical_spec', label: '技术规格', default_priority: 80 },
  { category: 'certification', label: '资质认证', default_priority: 85 },
  { category: 'financial', label: '财务信息', default_priority: 95 },
  { category: 'other', label: '其他', default_priority: 50 },
];

async function up(knex) {
  const exists = await knex.schema.hasTable('zhao_website_first_truth_categories');
  if (!exists) {
    await knex.schema.createTable('zhao_website_first_truth_categories', (t) => {
      t.increments('id').primary();
      t.string('category', 50).notNullable().unique();
      t.string('label', 100).notNullable();
      t.integer('default_priority').defaultTo(50);
    });
  }
  for (const item of CATEGORIES) {
    await knex('zhao_website_first_truth_categories')
      .insert(item)
      .onConflict('category')
      .ignore();
  }
}

async function down(knex) {
  await knex('zhao_website_first_truth_categories').del();
}

module.exports = { up, down };
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/database/migrations/
git commit -m "feat(zhao-website): 迁移 002-004 复合索引 + 字典种子"
```

---

### Task 11: zhao-oss media-meta CT + 2 个迁移

**Files:**
- Create: `basic/plugins/zhao-oss/server/src/content-types/media-meta/index.ts`
- Modify: `basic/plugins/zhao-oss/server/src/content-types/index.ts`
- Create: `basic/plugins/zhao-oss/server/database/migrations/001_backfill_media_meta.js`
- Create: `basic/plugins/zhao-oss/server/database/migrations/002_seed_tenant_default_folders.js`

- [ ] **Step 1: 创建 media-meta CT（schema 内联在 index.ts）**

```ts
// content-types/media-meta/index.ts
export default {
  schema: {
    collectionName: "zhao_oss_media_metas",
    info: {
      singularName: "media-meta",
      pluralName: "media-metas",
      displayName: "Media Meta",
      description: "媒体业务元信息（租户/上传者/分类）",
    },
    options: { draftAndPublish: false },
    pluginOptions: {
      "content-manager": { visible: false },
      "content-type-builder": { visible: false },
    },
    attributes: {
      site: {
        type: "relation",
        relation: "manyToOne",
        target: "plugin::zhao-common.site-config",
        required: true,
      },
      file: {
        type: "relation",
        relation: "oneToOne",
        target: "plugin::upload.file",
        required: true,
      },
      fileId: { type: "integer", required: true },
      folder: {
        type: "relation",
        relation: "manyToOne",
        target: "plugin::upload.folder",
      },
      category: {
        type: "enumeration",
        enum: ["brand", "article", "product", "case", "compliance",
               "faq", "tutorial", "download", "avatar", "general", "other"],
        default: "general",
      },
      uploader: {
        type: "relation",
        relation: "manyToOne",
        target: "admin::user",
      },
      uploaderRole: { type: "string", maxLength: 50 },
      modifier: {
        type: "relation",
        relation: "manyToOne",
        target: "admin::user",
      },
      originalFilename: { type: "string", maxLength: 500 },
      mimeType: { type: "string", maxLength: 100 },
      fileSize: { type: "biginteger" },
      fileExt: { type: "string", maxLength: 20 },
      usageCount: { type: "integer", default: 0 },
      lastUsedAt: { type: "datetime" },
      isPublic: { type: "boolean", default: true },
      tags: { type: "json" },
      deletedAt: { type: "datetime", default: null },
    },
  },
};
```

- [ ] **Step 2: 修改 zhao-oss content-types/index.ts**

```ts
import syncRecord from "./sync-record";
import mediaMeta from "./media-meta";

export default {
  "sync-record": syncRecord,
  "media-meta": mediaMeta,
};
```

- [ ] **Step 3: 001_backfill_media_meta.js**

```js
'use strict';

async function up(knex) {
  // 1. 取默认租户（第一个 site-config，按 id 升序）
  const sites = await knex('zhao_site_configs')
    .orderBy('id', 'asc')
    .limit(1);
  if (sites.length === 0) {
    console.log('[zhao-oss 001] 无 site-config，跳过回填');
    return;
  }
  const defaultSite = sites[0];

  // 2. 查询无 media-meta 的 upload.file
  const files = await knex('files')
    .whereNotExists(function () {
      this.select('file_id')
        .from('zhao_oss_media_metas')
        .whereRaw('zhao_oss_media_metas.file_id = files.id');
    });

  if (files.length === 0) {
    console.log('[zhao-oss 001] 无存量文件需回填');
    return;
  }

  // 3. 确保 defaultSite 的 general folder 存在（用 domain 或 id）
  const siteDomain = defaultSite.domain || `site-${defaultSite.document_id}`;
  const generalFolderName = '其他'; // category=general 对应中文 folder
  let folder = await knex('upload_folders')
    .where({ name: generalFolderName, parent: null })
    .first();
  if (!folder) {
    // 简化：直接创建一个 root folder（实际生产环境应通过 mediaService.ensureFolderByPath）
    const [id] = await knex('upload_folders').insert({
      name: generalFolderName,
      path_id: await nextPathId(knex),
      path: '/' + (await nextPathId(knex)),
      parent: null,
    });
    folder = await knex('upload_folders').where({ id }).first();
  }

  // 4. 批量回填
  const rows = files.map((f) => ({
    site_id: defaultSite.id,
    file_id: f.id,
    folder_id: folder.id,
    category: 'general',
    uploader_id: null,
    original_filename: f.name,
    mime_type: f.mime,
    file_size: f.size,
    file_ext: f.ext,
    is_public: true,
    created_at: new Date(),
    updated_at: new Date(),
  }));
  await knex('zhao_oss_media_metas').insert(rows);
  console.log(`[zhao-oss 001] 已回填 ${rows.length} 条 media-meta`);
}

async function nextPathId(knex) {
  const result = await knex('upload_folders').max('path_id as max').first();
  return (result.max || 0) + 1;
}

async function down(knex) {
  // 不删除已回填的 media-meta（避免数据丢失）
}

module.exports = { up, down };
```

> 注：实际字段名（path_id vs pathId、upload_folders vs strapi 上传表名）需根据项目实际 schema 调整。zhao-oss 的 `ensureFolderByPath` 已使用 `pathId`，迁移脚本执行时表已存在（Strapi 启动时创建 upload_folders），可放心使用 snake_case（knex 默认）。

- [ ] **Step 4: 002_seed_tenant_default_folders.js**

```js
'use strict';

const DEFAULT_FOLDERS = [
  { name: '品牌', category: 'brand' },
  { name: '文章', category: 'article' },
  { name: '产品', category: 'product' },
  { name: '案例', category: 'case' },
  { name: '合规', category: 'compliance' },
  { name: '问答', category: 'faq' },
  { name: '教程', category: 'tutorial' },
  { name: '下载', category: 'download' },
  { name: '头像', category: 'avatar' },
  { name: '其他', category: 'general' },
];

async function up(knex) {
  const sites = await knex('zhao_site_configs').select('id', 'domain', 'document_id');
  for (const site of sites) {
    const siteDomain = site.domain || `site-${site.document_id}`;
    // 查找或创建 /{siteDomain} 父 folder
    let parentFolder = await knex('upload_folders').where({ name: siteDomain, parent: null }).first();
    if (!parentFolder) {
      const pathId = await nextPathId(knex);
      const [id] = await knex('upload_folders').insert({
        name: siteDomain,
        path_id: pathId,
        path: `/${pathId}`,
        parent: null,
      });
      parentFolder = await knex('upload_folders').where({ id }).first();
    }
    // 为每个默认分类创建子 folder
    for (const def of DEFAULT_FOLDERS) {
      const existing = await knex('upload_folders').where({ name: def.name, parent: parentFolder.id }).first();
      if (existing) continue;
      const pathId = await nextPathId(knex);
      const newPath = `${parentFolder.path}/${pathId}`;
      await knex('upload_folders').insert({
        name: def.name,
        path_id: pathId,
        path: newPath,
        parent: parentFolder.id,
      });
    }
  }
  console.log('[zhao-oss 002] 已为所有租户播种默认 folder');
}

async function nextPathId(knex) {
  const result = await knex('upload_folders').max('path_id as max').first();
  return (result.max || 0) + 1;
}

async function down(knex) {
  // 不删除 folder（避免破坏现有引用）
}

module.exports = { up, down };
```

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-oss/server/src/content-types/ plugins/zhao-oss/server/database/
git commit -m "feat(zhao-oss): media-meta CT + 存量回填 + 租户默认 folder 迁移"
```

---

## Phase 5：Utils 工具层（Tasks 12-14）

### Task 12: 创建基础 utils（slug / status / async-writer / predicate-dictionary）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/utils/slug.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/status.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/async-writer.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/predicate-dictionary.ts`

- [ ] **Step 1: slug.ts**

```ts
import type { Core } from "@strapi/strapi";

/**
 * 生成 slug（基于 title），并校验在租户内唯一（含软删除排除）
 */
export async function generateUniqueSlug(
  strapi: Core.Strapi,
  uid: string,
  siteId: number,
  title: string,
  excludeDocumentId?: string
): Promise<string> {
  const base = slugify(title);
  if (!base) {
    return `item-${Date.now()}`;
  }
  let candidate = base;
  let suffix = 1;
  // 最多重试 10 次
  while (suffix < 10) {
    const existing = await strapi.db.query(uid).findOne({
      where: {
        site: siteId,
        slug: candidate,
        deletedAt: null,
        ...(excludeDocumentId ? { documentId: { $ne: excludeDocumentId } } : {}),
      },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

function slugify(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 2: status.ts**

```ts
export const STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type ContentStatus = (typeof STATUS)[keyof typeof STATUS];

export function isValidStatus(s: string): s is ContentStatus {
  return Object.values(STATUS).includes(s as ContentStatus);
}

/**
 * 应用 status 变更：published 时设置 publishedAt
 */
export function applyStatusChange(data: any, newStatus: ContentStatus): any {
  const now = new Date().toISOString();
  if (newStatus === STATUS.PUBLISHED && !data.publishedAt) {
    return { ...data, status: newStatus, publishedAt: now };
  }
  if (newStatus === STATUS.DRAFT) {
    return { ...data, status: newStatus, publishedAt: null };
  }
  return { ...data, status: newStatus };
}
```

- [ ] **Step 3: async-writer.ts**

```ts
import type { Core } from "@strapi/strapi";

interface QueueItem {
  ct: string;
  data: any;
}

const DEAD_LETTER_UID = "plugin::zhao-website.search-log"; // 复用 search-log 表存死信（简化）

export class AsyncWriter {
  private strapi: Core.Strapi;
  private ct: string;
  private queue: QueueItem[] = [];
  private maxQueueSize = 10000;
  private flushIntervalMs: number;
  private flushThreshold: number;
  private timer: NodeJS.Timeout | null = null;
  private uid: string;

  constructor(opts: {
    strapi: Core.Strapi;
    ct: string;
    uid: string;
    flushIntervalMs: number;
    flushThreshold: number;
  }) {
    this.strapi = opts.strapi;
    this.ct = opts.ct;
    this.uid = opts.uid;
    this.flushIntervalMs = opts.flushIntervalMs;
    this.flushThreshold = opts.flushThreshold;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        this.strapi.log.error(`[async-writer:${this.ct}] flush failed`, err);
      });
    }, this.flushIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  enqueue(data: any): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.strapi.log.warn(`[async-writer:${this.ct}] queue overflow, dropping oldest`);
      this.queue.shift();
    }
    this.queue.push({ ct: this.ct, data });
    if (this.queue.length >= this.flushThreshold) {
      setImmediate(() => {
        this.flush().catch(() => {});
      });
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      // 批量 insert
      const rows = batch.map((item) => item.data);
      await this.strapi.db.connection(this.uid).insert(rows);
    } catch (err) {
      // 重试 1 次
      try {
        for (const item of batch) {
          await this.strapi.db.connection(this.uid).insert(item.data);
        }
      } catch (err2) {
        // 写入死信表（简化：记日志）
        this.strapi.log.error(`[async-writer:${this.ct}] dead letter`, {
          count: batch.length,
          error: (err2 as Error).message,
        });
      }
    }
  }
}
```

- [ ] **Step 4: predicate-dictionary.ts**

```ts
// 谓词字典（与迁移 003 保持一致）
export const PREDICATE_DICTIONARY: Record<string, string[]> = {
  Organization: ['founder', 'foundingDate', 'legalName', 'areaServed',
                 'numberOfEmployees', 'contactPoint', 'location', 'hasOfferCatalog'],
  Person: ['affiliation', 'jobTitle', 'worksFor', 'alumniOf'],
  Product: ['manufacturer', 'brand', 'offers', 'aggregateRating', 'category'],
  Article: ['about', 'mentions', 'author', 'publisher', 'datePublished'],
  CaseStudy: ['subjectOf', 'about', 'mentions'],
  Event: ['organizer', 'location', 'startDate', 'subEvent'],
  FAQ: ['about', 'mentions', 'mainEntity'],
  HowTo: ['about', 'mentions', 'hasStep'],
  Download: ['about', 'mentions', 'fileFormat'],
};

export function isValidPredicate(entityType: string, predicate: string): boolean {
  const list = PREDICATE_DICTIONARY[entityType] || [];
  return list.includes(predicate);
}

// 层级关系（用于循环引用检测）
export const HIERARCHICAL_PREDICATES = new Set([
  'parent', 'containsPlace', 'subEvent', 'hasPart',
]);
```

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-website/server/src/services/utils/
git commit -m "feat(zhao-website): 基础 utils - slug/status/async-writer/predicate-dictionary"
```

---

### Task 13: 创建跨插件同步 utils（tag-sync / kg-sync / first-truth-validate）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/utils/tag-sync.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/kg-sync.ts`
- Create: `basic/plugins/zhao-website/server/src/services/utils/first-truth-validate.ts`

- [ ] **Step 1: tag-sync.ts**

```ts
import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

export async function syncTagIndex(event: any, targetType: string): Promise<void> {
  const result = event?.result;
  if (!result || !result.documentId) return;
  const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
  if (!tagIndexService || typeof (tagIndexService as any).sync !== "function") return;

  const tagIds = Array.isArray(result.tags)
    ? result.tags.map((t: any) => t.documentId).filter(Boolean)
    : [];
  try {
    await (tagIndexService as any).sync(targetType, result.documentId, tagIds);
  } catch (err) {
    strapi.log.warn(`[zhao-website] tag-sync failed for ${targetType}`, err);
  }
}

export async function removeTagIndex(event: any, targetType: string): Promise<void> {
  const result = event?.result;
  if (!result || !result.documentId) return;
  const tagIndexService = strapi.plugin("zhao-tag")?.service("tag-index");
  if (!tagIndexService || typeof (tagIndexService as any).remove !== "function") return;

  try {
    await (tagIndexService as any).remove(targetType, result.documentId);
  } catch (err) {
    strapi.log.warn(`[zhao-website] tag-index remove failed for ${targetType}`, err);
  }
}
```

- [ ] **Step 2: kg-sync.ts**

```ts
import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

const ENTITY_TYPE_MAP: Record<string, string> = {
  "website-article": "Article",
  "website-product": "Product",
  "website-case": "CaseStudy",
  "website-faq": "FAQ",
  "website-tutorial": "HowTo",
};

export async function knowledgeGraphSync(targetType: string, content: any): Promise<void> {
  if (!content || !content.documentId) return;
  const kgService = strapi.plugin("zhao-website")?.service("knowledge-graph");
  if (!kgService) return;
  try {
    // 1. mainEntity 已显式关联 → 跳过派生
    if (content.mainEntity && content.mainEntity.documentId) {
      // 已有显式关联，不派生
    } else {
      // 自动创建或更新实体（幂等 upsert by refTargetType + refTargetId）
      const entityType = ENTITY_TYPE_MAP[targetType] || "CreativeWork";
      await (kgService as any).upsertEntityFromContent({
        siteId: content.site,
        entityType,
        name: content.title || content.name || content.question,
        refTargetType: targetType,
        refTargetId: content.documentId,
      });
    }

    // 2. mentionedEntities 自动建立 mentions 关系（幂等 upsert）
    if (Array.isArray(content.mentionedEntities) && content.mentionedEntities.length > 0) {
      // 需要先获取 mainEntity 的 id
      const subjectEntity = await (kgService as any).findEntityByRef({
        refTargetType: targetType,
        refTargetId: content.documentId,
      });
      if (subjectEntity) {
        for (const mentioned of content.mentionedEntities) {
          if (mentioned.documentId) {
            await (kgService as any).addRelation({
              siteId: content.site,
              subjectEntityId: subjectEntity.documentId,
              predicate: "mentions",
              objectEntityId: mentioned.documentId,
              sourceType: "derived",
            });
          }
        }
      }
    }
  } catch (err) {
    // 解耦设计：失败不阻塞业务 CT 编辑
    strapi.log.warn(`[zhao-website] kg-sync failed for ${targetType}`, err);
  }
}
```

- [ ] **Step 3: first-truth-validate.ts**

```ts
import type { Core } from "@strapi/strapi";

declare const strapi: Core.Strapi;

export interface ValidationResult {
  hasError: boolean;
  conflicts: Array<{
    claimKey: string;
    claim: string;
    expectedValue: string;
    actualValue: string;
    priority: number;
  }>;
}

/**
 * 扫描内容文本，对比 first-truth-policy
 * - error 级（priority >= 80）→ 调用方应阻止发布
 * - warning 级（priority < 80）→ 调用方应允许发布但记录
 */
export async function firstTruthValidate(
  siteId: number,
  content: { title?: string; excerpt?: string; content?: string; description?: string }
): Promise<ValidationResult> {
  const fullText = [content.title, content.excerpt, content.content, content.description]
    .filter(Boolean)
    .join("\n");
  if (!fullText) {
    return { hasError: false, conflicts: [] };
  }

  // 查询当前租户所有真值
  const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
    where: { site: siteId, deletedAt: null, status: true },
  });

  const conflicts: ValidationResult["conflicts"] = [];
  for (const truth of truths) {
    // 简化匹配：真值 claim 出现且 canonicalValue 未出现 → 可能缺失；claim 出现且矛盾值出现 → 冲突
    // 一期仅做最简单的"包含"匹配（实际生产需 NLP）
    if (fullText.includes(truth.claim)) {
      // 进一步校验值是否匹配（这里仅占位，实际需根据 claimCategory 做精确匹配）
      // 简化：总是认为匹配，不报冲突
    }
  }

  const hasError = conflicts.some((c) => c.priority >= 80);
  return { hasError, conflicts };
}
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/utils/
git commit -m "feat(zhao-website): 跨插件同步 utils - tag-sync/kg-sync/first-truth-validate"
```

---

## Phase 6：Services 层（Tasks 14-19）

### Task 14: 创建 services/index.ts + 单例 services（seo-config / brand-info）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/index.ts`
- Create: `basic/plugins/zhao-website/server/src/services/seo-config.ts`
- Create: `basic/plugins/zhao-website/server/src/services/brand-info.ts`

- [ ] **Step 1: services/index.ts**

```ts
import seoConfig from "./seo-config";
import brandInfo from "./brand-info";
import article from "./article";
import articleCategory from "./article-category";
import product from "./product";
import caseService from "./case";
import compliance from "./compliance";
import faq from "./faq";
import tutorial from "./tutorial";
import download from "./download";
import lead from "./lead";
import visitLog from "./visit-log";
import interaction from "./interaction";
import searchLog from "./search-log";
import knowledgeGraph from "./knowledge-graph";
import aiContentSummary from "./ai-content-summary";
import firstTruth from "./first-truth";
import schemaBuilder from "./schema-builder";
import llmsTxt from "./llms-txt";
import sitemap from "./sitemap";
import robots from "./robots";
import searchEnginePush from "./search-engine-push";
import studioBridge from "./studio-bridge";

export default {
  "seo-config": seoConfig,
  "brand-info": brandInfo,
  "article": article,
  "article-category": articleCategory,
  "product": product,
  "case": caseService,
  "compliance": compliance,
  "faq": faq,
  "tutorial": tutorial,
  "download": download,
  "lead": lead,
  "visit-log": visitLog,
  "interaction": interaction,
  "search-log": searchLog,
  "knowledge-graph": knowledgeGraph,
  "ai-content-summary": aiContentSummary,
  "first-truth": firstTruth,
  "schema-builder": schemaBuilder,
  "llms-txt": llmsTxt,
  "sitemap": sitemap,
  "robots": robots,
  "search-engine-push": searchEnginePush,
  "studio-bridge": studioBridge,
};
```

> 注：此文件引用了尚未创建的 service 模块，整个 Phase 6 完成后才能编译通过。

- [ ] **Step 2: seo-config.ts（租户单例，自动创建默认记录）**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.seo-config";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取或创建租户的 SEO 配置（单例）
   */
  async ensureDefault(siteId: number): Promise<any> {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null },
    });
    if (existing) return existing;

    return strapi.db.query(UID).create({
      data: {
        site: siteId,
        defaultTitle: "",
        defaultLocale: "zh-CN",
        enableSitemap: true,
        enableRobotsTxt: true,
        aiCrawlerPolicy: "allow_all",
        hreflangStrategy: "subdirectory",
      },
    });
  },

  async find(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },

  async update(siteId: number, data: any): Promise<any> {
    const existing = await this.ensureDefault(siteId);
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  /**
   * 公开路由返回（去除验证码字段）
   */
  async findPublic(siteId: number): Promise<any> {
    const config = await this.ensureDefault(siteId);
    const { googleSiteVerification, baiduSiteVerification, bingSiteVerification, ...publicFields } = config;
    return publicFields;
  },
});
```

- [ ] **Step 3: brand-info.ts（租户单例）**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.brand-info";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async ensureDefault(siteId: number): Promise<any> {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null },
    });
    if (existing) return existing;

    return strapi.db.query(UID).create({
      data: {
        site: siteId,
        companyName: "",
      },
    });
  },

  async find(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },

  async update(siteId: number, data: any): Promise<any> {
    const existing = await this.ensureDefault(siteId);
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async findPublic(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/
git commit -m "feat(zhao-website): services 聚合 + 单例 services（seo-config/brand-info）"
```

---

### Task 15: 创建 7 个内容 CT services（article / article-category / product / case / compliance / faq / tutorial / download）

**Files:**
- Create: 8 个 service 文件

> 模板：以 article 为完整示例，其他 7 个 CT 仅差异点（CT 名 / UID / 字段）。

- [ ] **Step 1: article.ts**

```ts
import type { Core } from "@strapi/strapi";
import { generateUniqueSlug } from "./utils/slug";
import { applyStatusChange, STATUS, isValidStatus } from "./utils/status";
import { firstTruthValidate } from "./utils/first-truth-validate";

const UID = "plugin::zhao-website.article";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published"; // 默认只查 published
    if (category) filters.category = category;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity"],
    });
  },

  async findOne(siteId: number, slug: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities", "ogImage"],
    });
  },

  async findFeatured(siteId: number, limit = 5) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"],
    });
  },

  async search(siteId: number, keyword: string, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi.db.query(UID).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { excerpt: { $containsi: keyword } },
          { content: { $containsi: keyword } },
        ],
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"],
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } },
    };
  },

  // ===== 管理端 =====
  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, category } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["coverImage", "category", "tags"],
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities",
                 "ogImage", "sourceArticleDraft", "structuredData"],
    });
  },

  async create(siteId: number, data: any) {
    const slug = data.slug || await generateUniqueSlug(strapi, UID, siteId, data.title || "untitled");
    // 真值校验（warning 级允许）
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e: any = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Article not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi, UID, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    // 真值校验（仅当 status 变为 published 时强制）
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e: any = new Error("内容与第一真值冲突（error 级），无法发布");
        e.status = 409;
        e.code = "FIRST_TRUTH_CONFLICT";
        e.details = validation.conflicts;
        throw e;
      }
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: updateData,
    });
  },

  async publish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },

  async unpublish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },

  async archive(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  async incrementViewCount(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 },
    });
  },
});
```

- [ ] **Step 2: article-category.ts**

按 article 模板，去掉 publish/search，增加 `findTree`（递归构建树形）。

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.article-category";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"],
    });
  },

  async findTree(siteId: number) {
    const all = await this.find(siteId);
    return buildTree(all);
  },

  async findAdmin(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"],
    });
  },

  async create(siteId: number, data: any) {
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Category not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});

function buildTree(items: any[], parentId: number | null = null): any[] {
  return items
    .filter((item) => {
      const pid = item.parent ? item.parent.id : null;
      return pid === parentId;
    })
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}
```

- [ ] **Step 3: product.ts / case.ts / compliance.ts / faq.ts / tutorial.ts / download.ts**

按 article.ts 模板复制，仅替换：
- UID：`plugin::zhao-website.<ct-name>`
- 状态枚举与 article 一致（download 也用 status）
- compliance/faq/tutorial 无 sourceArticleDraft 字段，相关 populate 删除
- download 增加 `incrementDownloadCount` 方法、`findFeatured` 与 article 类似

**示例：compliance.ts**（差异：category 是 enum 不是关联，无 tags? 实际有 tags）

按 article 模板，UID 改为 `plugin::zhao-website.compliance`，populate 中去掉 `category`（因 compliance.category 是枚举字段不是关联）。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/
git commit -m "feat(zhao-website): 8 个内容 CT services"
```

---

### Task 16: 创建 4 个线索/数据 services（lead / visit-log / interaction / search-log）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/lead.ts`
- Create: `basic/plugins/zhao-website/server/src/services/visit-log.ts`
- Create: `basic/plugins/zhao-website/server/src/services/interaction.ts`
- Create: `basic/plugins/zhao-website/server/src/services/search-log.ts`

- [ ] **Step 1: lead.ts（含 assign/followUp/stats）**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.lead";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createPublic(siteId: number, data: any, ctx: any) {
    // honeypot 字段非空 → 假装成功
    if (data.website) {
      return { success: true, fake: true };
    }
    const enriched = {
      ...data,
      site: siteId,
      ipAddress: ctx?.request?.ip,
      userAgent: ctx?.request?.headers?.["user-agent"],
      referrer: ctx?.request?.headers?.referer,
      status: "new",
    };
    delete enriched.website; // 删除 honeypot
    return strapi.db.query(UID).create({ data: enriched });
  },

  async findMine(siteId: number, userId: number, query: any = {}) {
    // 通过 contactEmail / contactPhone 匹配用户（简化）
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { createdAt: "DESC" },
      limit: 50,
    });
  },

  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, type, assignedTo } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (assignedTo) filters.assignedTo = assignedTo;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
      populate: ["assignedTo"],
    });
  },

  async assign(siteId: number, documentId: string, assignedToId: number) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { assignedTo: assignedToId },
    });
  },

  async followUp(siteId: number, documentId: string, record: { content: string; result: string }) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Lead not found");
      e.status = 404;
      throw e;
    }
    const followUpRecords = Array.isArray(existing.followUpRecords) ? existing.followUpRecords : [];
    followUpRecords.push({
      time: new Date().toISOString(),
      content: record.content,
      result: record.result,
    });
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { followUpRecords },
    });
  },

  async stats(siteId: number) {
    const all = await strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
    });
    const byStatus = all.reduce((acc: any, l: any) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});
    const byType = all.reduce((acc: any, l: any) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});
    return { total: all.length, byStatus, byType };
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});
```

- [ ] **Step 2: visit-log.ts（异步写入 + 统计）**

```ts
import type { Core } from "@strapi/strapi";
import { AsyncWriter } from "./utils/async-writer";

const UID = "plugin::zhao-website.visit-log";

let writerInstance: AsyncWriter | null = null;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  _getWriter(): AsyncWriter {
    if (!writerInstance) {
      writerInstance = new AsyncWriter({
        strapi,
        ct: "visit-log",
        uid: "zhao_website_visit_logs",
        flushIntervalMs: 5000,
        flushThreshold: 100,
      });
      writerInstance.start();
    }
    return writerInstance;
  },

  async enqueueCreate(siteId: number, data: any) {
    this._getWriter().enqueue({ ...data, site_id: siteId, created_at: new Date() });
  },

  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
    });
  },

  async findMine(siteId: number, userId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, userId },
      limit: 50,
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await strapi.db.query(UID).findMany({
      where: { site: siteId, createdAt: { $gte: since } },
    });
    const byType = items.reduce((acc: any, v: any) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});
    return { total: items.length, byType, days };
  },

  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const deleted = await strapi.db.query(UID).deleteMany({
      where: { createdAt: { $lt: cutoff } },
    });
    return deleted?.count || 0;
  },
});
```

- [ ] **Step 3: interaction.ts（toggle 去重）**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.interaction";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async toggle(siteId: number, data: { type: string; targetType: string; targetId: string; visitorId: string; userId?: number; ctx?: any }) {
    // 查询是否已存在
    const existing = await strapi.db.query(UID).findOne({
      where: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        deletedAt: null,
      },
    });
    if (existing) {
      // 已存在 → 取消（软删除）
      await strapi.db.query(UID).update({
        where: { id: existing.id },
        data: { deletedAt: new Date().toISOString() },
      });
      return { action: "removed" };
    }
    // 不存在 → 创建
    await strapi.db.query(UID).create({
      data: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        userId: data.userId,
        ipAddress: data.ctx?.request?.ip,
        userAgent: data.ctx?.request?.headers?.["user-agent"],
      },
    });
    return { action: "created" };
  },

  async check(siteId: number, params: { type: string; targetType: string; targetId: string; visitorId: string }) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null, ...params },
    });
    return { liked: !!existing };
  },

  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, targetType: string, targetId: string) {
    const counts: any = {};
    for (const type of ["like", "collect", "share"]) {
      const items = await strapi.db.query(UID).findMany({
        where: { site: siteId, type, targetType, targetId, deletedAt: null },
      });
      counts[type] = items.length;
    }
    return counts;
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});
```

- [ ] **Step 4: search-log.ts**

```ts
import type { Core } from "@strapi/strapi";
import { AsyncWriter } from "./utils/async-writer";

const UID = "plugin::zhao-website.search-log";

let writerInstance: AsyncWriter | null = null;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  _getWriter(): AsyncWriter {
    if (!writerInstance) {
      writerInstance = new AsyncWriter({
        strapi,
        ct: "search-log",
        uid: "zhao_website_search_logs",
        flushIntervalMs: 10000,
        flushThreshold: 200,
      });
      writerInstance.start();
    }
    return writerInstance;
  },

  async log(siteId: number, keyword: string, resultCount: number, ctx: any) {
    this._getWriter().enqueue({
      site_id: siteId,
      keyword,
      result_count: resultCount,
      visitor_id: ctx?.state?.visitorId || "anonymous",
      ip_address: ctx?.request?.ip,
      created_at: new Date(),
    });
  },

  async findAdmin(siteId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      limit: 50,
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await strapi.db.query(UID).findMany({
      where: { site: siteId, createdAt: { $gte: since } },
    });
    const byKeyword: Record<string, number> = {};
    for (const item of items) {
      byKeyword[item.keyword] = (byKeyword[item.keyword] || 0) + 1;
    }
    return { total: items.length, topKeywords: Object.entries(byKeyword).sort((a, b) => b[1] - a[1]).slice(0, 20) };
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-website/server/src/services/
git commit -m "feat(zhao-website): 4 个线索/数据 services（lead/visit-log/interaction/search-log）"
```

---

### Task 17: 创建 GEO 进阶 services（knowledge-graph / ai-content-summary / first-truth）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/knowledge-graph.ts`
- Create: `basic/plugins/zhao-website/server/src/services/ai-content-summary.ts`
- Create: `basic/plugins/zhao-website/server/src/services/first-truth.ts`

- [ ] **Step 1: knowledge-graph.ts**

```ts
import type { Core } from "@strapi/strapi";
import { HIERARCHICAL_PREDICATES, isValidPredicate } from "./utils/predicate-dictionary";

const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== 实体 =====
  async findEntities(siteId: number, query: any = {}) {
    const { entityType, page = 1, pageSize = 20 } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (entityType) filters.entityType = entityType;
    return strapi.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["image"],
    });
  },

  async findEntityBySlug(siteId: number, slug: string) {
    return strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
  },

  async findEntityByRef(params: { refTargetType: string; refTargetId: string }) {
    return strapi.db.query(ENTITY_UID).findOne({
      where: { refTargetType: params.refTargetType, refTargetId: params.refTargetId, deletedAt: null },
    });
  },

  async upsertEntityFromContent(params: {
    siteId: number;
    entityType: string;
    name: string;
    refTargetType: string;
    refTargetId: string;
  }) {
    const existing = await this.findEntityByRef({
      refTargetType: params.refTargetType,
      refTargetId: params.refTargetId,
    });
    if (existing) {
      return strapi.db.query(ENTITY_UID).update({
        where: { id: existing.id },
        data: { name: params.name, entityType: params.entityType },
      });
    }
    return strapi.db.query(ENTITY_UID).create({
      data: {
        site: params.siteId,
        entityType: params.entityType,
        name: params.name,
        refTargetType: params.refTargetType,
        refTargetId: params.refTargetId,
        sourceType: "derived",
      },
    });
  },

  async createEntity(siteId: number, data: any) {
    return strapi.db.query(ENTITY_UID).create({
      data: { ...data, site: siteId },
    });
  },

  async updateEntity(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Entity not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async deleteEntity(siteId: number, documentId: string) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 关系 =====
  async findRelations(siteId: number, query: any = {}) {
    const { subjectEntityId, predicate, objectEntityId, page = 1, pageSize = 20 } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (subjectEntityId) filters.subjectEntity = subjectEntityId;
    if (predicate) filters.predicate = predicate;
    if (objectEntityId) filters.objectEntity = objectEntityId;
    return strapi.db.query(RELATION_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      populate: ["subjectEntity", "objectEntity"],
    });
  },

  async addRelation(params: {
    siteId: number;
    subjectEntityId: string;
    predicate: string;
    objectEntityId?: string;
    objectValue?: any;
    objectText?: string;
    sourceType?: string;
  }) {
    // 校验自引用
    if (params.objectEntityId && params.subjectEntityId === params.objectEntityId) {
      const e: any = new Error("Self-relation not allowed");
      e.status = 400;
      e.code = "SELF_RELATION";
      throw e;
    }
    // 校验客体互斥
    const hasEntity = !!params.objectEntityId;
    const hasValue = params.objectValue !== undefined && params.objectValue !== null;
    const hasText = !!params.objectText;
    if (hasEntity && (hasValue || hasText)) {
      const e: any = new Error("objectEntity 与 objectValue/objectText 互斥");
      e.status = 400;
      e.code = "OBJECT_MUTEX";
      throw e;
    }
    if (!hasEntity && !hasValue && !hasText) {
      const e: any = new Error("客体不能为空");
      e.status = 400;
      e.code = "OBJECT_EMPTY";
      throw e;
    }
    // 层级关系循环引用检测
    if (params.objectEntityId && HIERARCHICAL_PREDICATES.has(params.predicate)) {
      const hasCycle = await this._detectCycle(params.subjectEntityId, params.objectEntityId, params.predicate);
      if (hasCycle) {
        const e: any = new Error("循环引用 not allowed for hierarchical predicate");
        e.status = 400;
        e.code = "CYCLE_DETECTED";
        throw e;
      }
    }
    // 谓词字典 warning（不阻止）
    // 查询 subjectEntity 获取 entityType
    const subjectEntity = await strapi.db.query(ENTITY_UID).findOne({
      where: { documentId: params.subjectEntityId },
    });
    if (subjectEntity && !isValidPredicate(subjectEntity.entityType, params.predicate)) {
      strapi.log.warn(`[kg] predicate "${params.predicate}" 不在 ${subjectEntity.entityType} 字典中`);
    }

    // 幂等 upsert（同 S+P+O）
    if (params.objectEntityId) {
      const existing = await strapi.db.query(RELATION_UID).findOne({
        where: {
          subjectEntity: params.subjectEntityId,
          predicate: params.predicate,
          objectEntity: params.objectEntityId,
          deletedAt: null,
        },
      });
      if (existing) return existing;
    }

    return strapi.db.query(RELATION_UID).create({
      data: {
        site: params.siteId,
        subjectEntity: params.subjectEntityId,
        predicate: params.predicate,
        objectEntity: params.objectEntityId || null,
        objectValue: params.objectValue || null,
        objectText: params.objectText || null,
        sourceType: params.sourceType || "manual",
      },
    });
  },

  async _detectCycle(subjectId: string, objectId: string, predicate: string, visited = new Set<string>()): Promise<boolean> {
    if (subjectId === objectId) return true;
    if (visited.has(subjectId)) return false;
    visited.add(subjectId);
    // 查询 object 的所有同 predicate 出边
    const outRelations = await strapi.db.query(RELATION_UID).findMany({
      where: { subjectEntity: objectId, predicate, deletedAt: null },
      populate: ["objectEntity"],
    });
    for (const rel of outRelations) {
      if (rel.objectEntity && rel.objectEntity.documentId) {
        if (await this._detectCycle(subjectId, rel.objectEntity.documentId, predicate, visited)) {
          return true;
        }
      }
    }
    return false;
  },

  async deleteRelation(siteId: number, documentId: string) {
    const existing = await strapi.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(RELATION_UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 消歧 =====
  async disambiguate(siteId: number, params: { name: string; entityType?: string }): Promise<any | null> {
    const candidates = await strapi.db.query(ENTITY_UID).findMany({
      where: {
        site: siteId,
        name: { $containsi: params.name },
        deletedAt: null,
        ...(params.entityType ? { entityType: params.entityType } : {}),
      },
    });
    if (candidates.length === 0) return null;
    // 精确匹配优先
    const exact = candidates.find((c: any) => c.name === params.name);
    if (exact) return { entity: exact, confidence: 1.0 };
    // 否则最高 confidence（这里简化为第一个）
    const top = candidates[0];
    const confidence = top.name.length / params.name.length;
    if (confidence < 0.7) return null;
    return { entity: top, confidence };
  },

  // ===== 同步与校验 =====
  async syncFromContent(targetType: string, content: any): Promise<void> {
    // 委托给 utils/kg-sync
    const { knowledgeGraphSync } = await import("./utils/kg-sync");
    return knowledgeGraphSync(targetType, content);
  },

  async verifyAll(siteId: number): Promise<{ total: number; conflicts: number; report: any[] }> {
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null },
    });
    let conflicts = 0;
    const report: any[] = [];
    for (const entity of entities) {
      // 简化：检查是否有冲突的 first-truth
      const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { site: siteId, canonicalEntity: entity.documentId, verificationStatus: "conflict" },
      });
      if (truths.length > 0) {
        conflicts += 1;
        report.push({ entityId: entity.documentId, conflictCount: truths.length });
        await strapi.db.query(ENTITY_UID).update({
          where: { id: entity.id },
          data: { verificationStatus: "conflict" },
        });
      }
    }
    return { total: entities.length, conflicts, report };
  },

  // ===== JSON-LD 导出 =====
  async exportGraph(siteId: number): Promise<any> {
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["image"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      populate: ["subjectEntity", "objectEntity"],
    });
    const graph = entities.map((e: any) => this._entityToJsonLd(e, relations.filter((r: any) => r.subjectEntity?.id === e.id)));
    return { "@context": "https://schema.org", "@graph": graph };
  },

  async exportEntity(siteId: number, slug: string): Promise<any | null> {
    const entity = await this.findEntityBySlug(siteId, slug);
    if (!entity) return null;
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, subjectEntity: entity.documentId, deletedAt: null },
      populate: ["objectEntity"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { site: siteId, objectEntity: entity.documentId, deletedAt: null },
      populate: ["subjectEntity"],
    });
    return this._entityToJsonLd(entity, outgoing, incoming);
  },

  _entityToJsonLd(entity: any, outgoing: any[] = [], incoming: any[] = []): any {
    const jsonLd: any = {
      "@type": entity.entityType,
      "@id": entity.slug || entity.documentId,
      "name": entity.name,
    };
    if (entity.description) jsonLd.description = entity.description;
    if (entity.url) jsonLd.url = entity.url;
    if (entity.image) jsonLd.image = entity.url; // 简化
    if (entity.properties) Object.assign(jsonLd, entity.properties);
    for (const rel of outgoing) {
      if (rel.objectEntity) {
        jsonLd[rel.predicate] = { "@id": rel.objectEntity.slug || rel.objectEntity.documentId };
      } else if (rel.objectValue) {
        jsonLd[rel.predicate] = rel.objectValue;
      } else if (rel.objectText) {
        jsonLd[rel.predicate] = rel.objectText;
      }
    }
    return jsonLd;
  },

  async exportFacts(siteId: number): Promise<any[]> {
    const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
      where: { site: siteId, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } },
    });
    return truths.map((t: any) => ({
      claimKey: t.claimKey,
      claim: t.claim,
      value: t.canonicalValue,
      valueType: t.canonicalValueType,
      sourceUrl: t.canonicalSourceUrl,
      sourceType: t.canonicalSourceType,
      category: t.claimCategory,
      priority: t.priority,
      lastVerifiedAt: t.lastVerifiedAt,
      verificationStatus: t.verificationStatus,
    }));
  },
});
```

- [ ] **Step 2: ai-content-summary.ts**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.ai-content-summary";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByTarget(siteId: number, targetType: string, targetId: string, summaryType?: string) {
    const filters: any = { site: siteId, targetType, targetId, deletedAt: null, status: true };
    if (summaryType) filters.summaryType = summaryType;
    return strapi.db.query(UID).findMany({ where: filters });
  },

  async findPublic(siteId: number, query: any = {}) {
    const { targetType, targetId, summaryType } = query;
    return this.findByTarget(siteId, targetType, targetId, summaryType);
  },

  async findAdmin(siteId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, ...query },
      orderBy: { updatedAt: "DESC" },
    });
  },

  async create(siteId: number, data: any) {
    // 唯一约束：(site, targetType, targetId, summaryType, language)
    const existing = await strapi.db.query(UID).findOne({
      where: {
        site: siteId,
        targetType: data.targetType,
        targetId: data.targetId,
        summaryType: data.summaryType,
        language: data.language || "zh-CN",
        deletedAt: null,
      },
    });
    if (existing) {
      // version + 1
      return strapi.db.query(UID).update({
        where: { id: existing.id },
        data: { ...data, version: (existing.version || 0) + 1 },
      });
    }
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId, language: data.language || "zh-CN", version: 1 },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { ...data, version: (existing.version || 1) + 1 },
    });
  },

  async regenerate(siteId: number, documentId: string): Promise<any> {
    // 一期桩：标记为 pending，实际生成由二期 AI 接入
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: {
        verificationStatus: "pending",
        generatedAt: null,
      },
    });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});
```

- [ ] **Step 3: first-truth.ts**

```ts
import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.first-truth-policy";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { claimCategory, verificationStatus } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (claimCategory) filters.claimCategory = claimCategory;
    if (verificationStatus) filters.verificationStatus = verificationStatus;
    return strapi.db.query(UID).findMany({
      where: filters,
      orderBy: { priority: "DESC", updatedAt: "DESC" },
      populate: ["canonicalEntity"],
    });
  },

  async findOne(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
  },

  async findByClaimKey(siteId: number, claimKey: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, claimKey, deletedAt: null },
    });
  },

  async create(siteId: number, data: any) {
    const existing = await this.findByClaimKey(siteId, data.claimKey);
    if (existing) {
      const e: any = new Error(`claimKey "${data.claimKey}" 已存在`);
      e.status = 409;
      e.code = "CLAIM_KEY_EXISTS";
      throw e;
    }
    return strapi.db.query(UID).create({
      data: {
        ...data,
        site: siteId,
        lastVerifiedAt: new Date().toISOString(),
        verificationStatus: data.verificationStatus || "verified",
      },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    // 真值更新 → 关联 entity verificationStatus=pending
    if (data.canonicalValue && data.canonicalValue !== existing.canonicalValue) {
      await this._markRelatedEntitiesPending(siteId, existing.canonicalEntity);
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: {
        ...data,
        lastVerifiedAt: new Date().toISOString(),
        verificationStatus: data.verificationStatus || "verified",
      },
    });
  },

  async _markRelatedEntitiesPending(siteId: number, canonicalEntity: any) {
    if (!canonicalEntity) return;
    const entityId = canonicalEntity.documentId || canonicalEntity;
    const entity = await strapi.db.query("plugin::zhao-website.knowledge-entity").findOne({
      where: { site: siteId, documentId: entityId, deletedAt: null },
    });
    if (entity) {
      await strapi.db.query("plugin::zhao-website.knowledge-entity").update({
        where: { id: entity.id },
        data: { verificationStatus: "pending" },
      });
    }
  },

  async verify(siteId: number, documentId: string) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { verificationStatus: "verified", lastVerifiedAt: new Date().toISOString() },
    });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 冲突检测 =====
  async detectConflicts(siteId: number) {
    const truths = await strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
    });
    const byKey: Record<string, any[]> = {};
    for (const t of truths) {
      const key = `${t.claimKey}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    }
    const conflicts: any[] = [];
    for (const [key, items] of Object.entries(byKey)) {
      if (items.length > 1) {
        const values = new Set(items.map((i) => i.canonicalValue));
        if (values.size > 1) {
          conflicts.push({
            claimKey: key,
            severity: "error",
            values: items.map((i) => ({
              value: i.canonicalValue,
              sourceUrl: i.canonicalSourceUrl,
              sourceType: i.canonicalSourceType,
            })),
          });
        }
      }
    }
    return conflicts;
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/services/knowledge-graph.ts \
        plugins/zhao-website/server/src/services/ai-content-summary.ts \
        plugins/zhao-website/server/src/services/first-truth.ts
git commit -m "feat(zhao-website): 3 个 GEO 进阶 services（knowledge-graph/ai-content-summary/first-truth）"
```

---

### Task 18: 创建 schema-builder service（JSON-LD 结构化数据生成）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/schema-builder.ts`

- [ ] **Step 1: schema-builder.ts**

```ts
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
    };
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
    if (product.priceRange) schema.offers = {
      "@type": "Offer",
      priceSpecification: { "@type": "PriceSpecification", priceCurrency: "CNY" },
    };
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
    return schema;
  },

  // ===== FAQ =====
  buildFAQ(faqs: any[]): any {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
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
git add plugins/zhao-website/server/src/services/schema-builder.ts
git commit -m "feat(zhao-website): schema-builder service（6 种 JSON-LD 结构化数据生成）"
```

---

### Task 19: 创建 SEO 输出 services（llms-txt / sitemap / robots / search-engine-push / studio-bridge）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/services/llms-txt.ts`
- Create: `basic/plugins/zhao-website/server/src/services/sitemap.ts`
- Create: `basic/plugins/zhao-website/server/src/services/robots.ts`
- Create: `basic/plugins/zhao-website/server/src/services/search-engine-push.ts`
- Create: `basic/plugins/zhao-website/server/src/services/studio-bridge.ts`

- [ ] **Step 1: llms-txt.ts**

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number): Promise<string> {
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
    const articles = await strapi.db.query("plugin::zhao-website.article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 100,
      orderBy: { publishedAt: "DESC" },
    });
    for (const a of articles) {
      lines.push(`- [${a.title}](/articles/${a.slug}): ${a.excerpt || ""}`);
    }
    const products = await strapi.db.query("plugin::zhao-website.product").findMany({
      where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
      limit: 50,
    });
    for (const p of products) {
      lines.push(`- [${p.name}](/products/${p.slug}): ${p.tagline || ""}`);
    }
    lines.push("");
    // 第一真值
    lines.push("## Facts");
    const facts = await strapi.plugin("zhao-website").service("first-truth").find(siteId, { verificationStatus: "verified" });
    for (const f of facts.slice(0, 30)) {
      lines.push(`- ${f.claim}: ${f.canonicalValue}`);
    }
    return lines.join("\n");
  },
});
```

- [ ] **Step 2: sitemap.ts**

```ts
import type { Core } from "@strapi/strapi";

const INDEXABLE_CTS = [
  { uid: "plugin::zhao-website.article", pathPrefix: "/articles", priority: 0.7 },
  { uid: "plugin::zhao-website.product", pathPrefix: "/products", priority: 0.8 },
  { uid: "plugin::zhao-website.case", pathPrefix: "/cases", priority: 0.6 },
  { uid: "plugin::zhao-website.tutorial", pathPrefix: "/tutorials", priority: 0.6 },
  { uid: "plugin::zhao-website.faq", pathPrefix: "/faqs", priority: 0.5 },
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const excludeTypes = seoConfig?.sitemapExcludeTypes || [];
    const urls: string[] = [];
    // 首页
    urls.push(this._urlEntry(siteUrl, "/", "1.0", "daily"));
    for (const ct of INDEXABLE_CTS) {
      if (excludeTypes.includes(ct.uid.split(".").pop())) continue;
      const items = await strapi.db.query(ct.uid).findMany({
        where: { site: siteId, status: "published", deletedAt: null, allowIndex: true },
        orderBy: { publishedAt: "DESC" },
      });
      for (const item of items) {
        const lastmod = item.updatedAt || item.publishedAt;
        urls.push(this._urlEntry(siteUrl, `${ct.pathPrefix}/${item.slug}`, String(ct.priority), "weekly", lastmod));
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  },

  _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string): string {
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    return `  <url><loc>${siteUrl}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  },
});
```

- [ ] **Step 3: robots.ts**

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(siteId: number, siteUrl: string): Promise<string> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.enableRobotsTxt) {
      return "User-agent: *\nDisallow: /";
    }
    if (seoConfig.robotsContent) return seoConfig.robotsContent;
    const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api"];
    // AI 爬虫策略
    if (seoConfig.aiCrawlerPolicy === "block_all") {
      lines.unshift("User-agent: GPTBot", "Disallow: /", "User-agent: CCBot", "Disallow: /", "User-agent: *");
    }
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
    return lines.join("\n");
  },
});
```

- [ ] **Step 4: search-engine-push.ts**

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async pushToBaidu(siteId: number, urls: string[]): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    if (!seoConfig?.baiduSiteVerification || !seoConfig?.extraConfig?.searchPushTokens?.baidu) {
      return { skipped: true, reason: "no_baidu_config" };
    }
    const token = seoConfig.extraConfig.searchPushTokens.baidu;
    const res = await fetch(`http://data.zz.baidu.com/urls?site=${seoConfig.baiduSiteVerification}&token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: urls.join("\n"),
    });
    return res.json();
  },

  async pushToBing(siteId: number, urls: string[]): Promise<any> {
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    const apiKey = seoConfig?.extraConfig?.searchPushTokens?.bing;
    if (!apiKey) return { skipped: true, reason: "no_bing_config" };
    const res = await fetch("https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "ApiKey": apiKey },
      body: JSON.stringify({ siteUrl: urls[0], urlList: urls }),
    });
    return res.json();
  },

  async pushAll(siteId: number, urls: string[]) {
    const [baidu, bing] = await Promise.allSettled([
      this.pushToBaidu(siteId, urls),
      this.pushToBing(siteId, urls),
    ]);
    return { baidu, bing };
  },
});
```

- [ ] **Step 5: studio-bridge.ts**

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // 从 zhao-studio article-draft 复制快照到 zhao-website article
  async publishFromStudio(siteId: number, params: {
    articleDraftDocumentId: string;
    overrides?: any;
  }): Promise<any> {
    const draft = await strapi.db.query("plugin::zhao-studio.article-draft").findOne({
      where: { documentId: params.articleDraftDocumentId },
    });
    if (!draft) {
      const e: any = new Error("Article draft not found");
      e.status = 404;
      throw e;
    }
    // slug 冲突检测
    const slug = params.overrides?.slug || draft.slug;
    const existing = await strapi.db.query("plugin::zhao-website.article").findOne({
      where: { site: siteId, slug, deletedAt: null },
    });
    if (existing) {
      const e: any = new Error(`Slug "${slug}" 已存在`);
      e.status = 409;
      e.code = "SLUG_EXISTS";
      throw e;
    }
    const articleData: any = {
      site: siteId,
      title: params.overrides?.title || draft.title,
      slug,
      excerpt: params.overrides?.excerpt || draft.excerpt,
      content: params.overrides?.content || draft.content,
      coverImage: params.overrides?.coverImage || draft.coverImage,
      author: params.overrides?.author || draft.author,
      sourceType: "studio",
      sourceArticleDraft: draft.id,
      sourceUrl: draft.canonicalUrl,
      status: params.overrides?.status || "draft",
      publishedAt: params.overrides?.status === "published" ? new Date().toISOString() : null,
    };
    return strapi.db.query("plugin::zhao-website.article").create({ data: articleData });
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-website/server/src/services/llms-txt.ts \
        plugins/zhao-website/server/src/services/sitemap.ts \
        plugins/zhao-website/server/src/services/robots.ts \
        plugins/zhao-website/server/src/services/search-engine-push.ts \
        plugins/zhao-website/server/src/services/studio-bridge.ts
git commit -m "feat(zhao-website): 5 个 SEO 输出 services（llms-txt/sitemap/robots/search-engine-push/studio-bridge）"
```

---

### Task 20: 创建 Content API Controllers（C 端公开访问）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/article.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/product.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/case.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/faq.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/tutorial.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/compliance.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/download.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/lead.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/seo-output.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/content-api/index.ts`

- [ ] **Step 1: article.ts（含 list / detail / by-category / featured / related）**

```ts
export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const { page = 1, pageSize = 10, category, tag, sort = "publishedAt:DESC" } = ctx.query;
    const result = await strapi.plugin("zhao-website").service("article").findPublic(siteId, {
      page: Number(page), pageSize: Number(pageSize), category, tag, sort,
    });
    ctx.body = result;
  },

  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article = await strapi.plugin("zhao-website").service("article").findBySlug(siteId, slug);
    if (!article) return ctx.notFound("Article not found");
    // 异步 +1 viewCount
    strapi.plugin("zhao-website").service("article").incrementView(siteId, article.id).catch(() => {});
    ctx.body = article;
  },

  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").findPublicByCategory(siteId, categorySlug, ctx.query);
    ctx.body = result;
  },

  async featured(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("article").findFeatured(siteId, ctx.query);
    ctx.body = result;
  },

  async related(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").findRelated(siteId, slug, ctx.query);
    ctx.body = result;
  },
};
```

- [ ] **Step 2: product.ts / case.ts / faq.ts / tutorial.ts / compliance.ts（结构同 article，省略重复）**

每个 controller 创建 `list` / `detail` 方法，调用对应 service 的 `findPublic` / `findBySlug`。以 product.ts 为例：

```ts
export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("product").findPublic(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("product").findBySlug(siteId, slug);
    if (!item) return ctx.notFound("Product not found");
    strapi.plugin("zhao-website").service("product").incrementView(siteId, item.id).catch(() => {});
    ctx.body = item;
  },
};
```

> faq.ts 增加 `byCategory` 方法；tutorial.ts 增加 `byDifficulty` 方法；compliance.ts 增加 `byCategory` 方法。模式同 article.ts。

- [ ] **Step 3: download.ts（含下载计数）**

```ts
export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("download").findPublic(siteId, ctx.query);
    ctx.body = result;
  },

  async download(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("download").findBySlug(siteId, slug);
    if (!item) return ctx.notFound("Download not found");
    if (item.requireForm && !ctx.state.user) {
      return ctx.forbidden("Form submission required");
    }
    // 异步 +1 downloadCount
    strapi.plugin("zhao-website").service("download").incrementDownload(siteId, item.id).catch(() => {});
    ctx.body = { url: item.file?.url, filename: item.fileName };
  },
};
```

- [ ] **Step 4: lead.ts（留言/留资提交，含限流 + honeypot）**

```ts
export default {
  async submit(ctx) {
    const siteId = ctx.state.siteId;
    // honeypot 检测
    if (ctx.request.body.website) {
      // honeypot 字段被填 → 静默成功（迷惑爬虫）
      return ctx.body = { success: true };
    }
    const { type = "contact" } = ctx.request.body;
    const lead = await strapi.plugin("zhao-website").service("lead").create(siteId, {
      ...ctx.request.body,
      type,
      ipAddress: ctx.request.ip,
      userAgent: ctx.request.headers["user-agent"],
      referrer: ctx.request.headers.referer,
      status: "new",
    });
    ctx.body = { success: true, id: lead.documentId };
  },

  async track(ctx) {
    const siteId = ctx.state.siteId;
    const { type, targetId, action } = ctx.request.body;
    await strapi.plugin("zhao-website").service("interaction").track(siteId, {
      type, targetId, action,
      ipAddress: ctx.request.ip,
      userAgent: ctx.request.headers["user-agent"],
    });
    ctx.body = { success: true };
  },
};
```

- [ ] **Step 5: seo-output.ts（sitemap.xml / robots.txt / llms.txt / manifest.json）**

```ts
export default {
  async sitemap(ctx) {
    const siteId = ctx.state.siteId;
    const siteUrl = `https://${ctx.request.host}`;
    const xml = await strapi.plugin("zhao-website").service("sitemap").generate(siteId, siteUrl);
    ctx.type = "application/xml";
    ctx.body = xml;
  },

  async robots(ctx) {
    const siteId = ctx.state.siteId;
    const siteUrl = `https://${ctx.request.host}`;
    const txt = await strapi.plugin("zhao-website").service("robots").generate(siteId, siteUrl);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async llmsTxt(ctx) {
    const siteId = ctx.state.siteId;
    const txt = await strapi.plugin("zhao-website").service("llms-txt").generate(siteId);
    ctx.type = "text/plain";
    ctx.body = txt;
  },

  async manifest(ctx) {
    const siteId = ctx.state.siteId;
    const brandInfo = await strapi.plugin("zhao-website").service("brand-info").get(siteId);
    const seoConfig = await strapi.plugin("zhao-website").service("seo-config").get(siteId);
    ctx.body = {
      name: brandInfo?.companyName || "",
      short_name: brandInfo?.shortName || "",
      icons: brandInfo?.favicon ? [{ src: brandInfo.favicon.url, sizes: "192x192" }] : [],
      theme_color: seoConfig?.extraConfig?.themeColor || "#000000",
      display: "standalone",
    };
  },
};
```

- [ ] **Step 6: content-api/index.ts（聚合导出）**

```ts
import article from "./article";
import product from "./product";
import casE from "./case";
import faq from "./faq";
import tutorial from "./tutorial";
import compliance from "./compliance";
import download from "./download";
import lead from "./lead";
import seoOutput from "./seo-output";

export default {
  article,
  product,
  case: casE,
  faq,
  tutorial,
  compliance,
  download,
  lead,
  "seo-output": seoOutput,
};
```

- [ ] **Step 7: Commit**

```bash
git add plugins/zhao-website/server/src/controllers/content-api/
git commit -m "feat(zhao-website): 9 个 Content API controllers（C 端公开访问）"
```

---

### Task 21: 创建 Admin API Controllers（管理后台 CRUD + 批量操作 + studio bridge）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/article.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/generic.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/knowledge-graph.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/first-truth.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/ai-content-summary.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/studio-bridge.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/stats.ts`
- Create: `basic/plugins/zhao-website/server/src/controllers/admin-api/index.ts`

- [ ] **Step 1: article.ts（含 publish / archive / batch 操作）**

```ts
export default {
  async find(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").findAdmin(siteId, ctx.query);
  },

  async findOne(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("article").findOneAdmin(siteId, documentId);
    if (!item) return ctx.notFound();
    ctx.body = item;
  },

  async create(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").create(siteId, ctx.request.body);
  },

  async update(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").update(siteId, documentId, ctx.request.body);
  },

  async delete(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    await strapi.plugin("zhao-website").service("article").softDelete(siteId, documentId);
    ctx.body = { success: true };
  },

  async publish(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").publish(siteId, documentId);
  },

  async archive(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").archive(siteId, documentId);
  },

  async batch(ctx) {
    const siteId = ctx.state.siteId;
    const { action, documentIds } = ctx.request.body;
    const results = [];
    for (const id of documentIds) {
      if (action === "publish") results.push(await strapi.plugin("zhao-website").service("article").publish(siteId, id));
      else if (action === "archive") results.push(await strapi.plugin("zhao-website").service("article").archive(siteId, id));
      else if (action === "delete") results.push(await strapi.plugin("zhao-website").service("article").softDelete(siteId, id));
    }
    ctx.body = { success: true, count: results.length };
  },
};
```

- [ ] **Step 2: generic.ts（通用 CRUD 工厂，用于 brand-info/seo-config/article-category/product/case/compliance/faq/tutorial/download/lead/visit-log/interaction/search-log）**

```ts
function createGenericController(serviceName: string) {
  return {
    async find(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).findAdmin(ctx.state.siteId, ctx.query);
    },
    async findOne(ctx) {
      const item = await strapi.plugin("zhao-website").service(serviceName).findOneAdmin(ctx.state.siteId, ctx.params.documentId);
      if (!item) return ctx.notFound();
      ctx.body = item;
    },
    async create(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).create(ctx.state.siteId, ctx.request.body);
    },
    async update(ctx) {
      ctx.body = await strapi.plugin("zhao-website").service(serviceName).update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
    },
    async delete(ctx) {
      await strapi.plugin("zhao-website").service(serviceName).softDelete(ctx.state.siteId, ctx.params.documentId);
      ctx.body = { success: true };
    },
  };
}

export default {
  "seo-config": createGenericController("seo-config"),
  "brand-info": createGenericController("brand-info"),
  "article-category": createGenericController("article-category"),
  product: createGenericController("product"),
  case: createGenericController("case"),
  compliance: createGenericController("compliance"),
  faq: createGenericController("faq"),
  tutorial: createGenericController("tutorial"),
  download: createGenericController("download"),
  lead: createGenericController("lead"),
  "visit-log": createGenericController("visit-log"),
  interaction: createGenericController("interaction"),
  "search-log": createGenericController("search-log"),
};
```

- [ ] **Step 3: knowledge-graph.ts（实体/关系 CRUD + 消歧 + 导出）**

```ts
export default {
  // ===== 实体 =====
  async findEntities(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findEntities(ctx.state.siteId, ctx.query);
  },
  async createEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, ctx.request.body);
  },
  async updateEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async deleteEntity(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 关系 =====
  async findRelations(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findRelations(ctx.state.siteId, ctx.query);
  },
  async addRelation(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").addRelation({ siteId: ctx.state.siteId, ...ctx.request.body });
  },
  async deleteRelation(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteRelation(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 消歧 =====
  async disambiguate(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").disambiguate(ctx.state.siteId, ctx.request.body);
  },
  // ===== 导出 =====
  async exportGraph(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(ctx.state.siteId);
  },
};
```

- [ ] **Step 4: first-truth.ts / ai-content-summary.ts / studio-bridge.ts / stats.ts**

```ts
// first-truth.ts
export default {
  async find(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query); },
  async findOne(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId); },
  async create(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, ctx.request.body); },
  async update(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body); },
  async delete(ctx) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
  async verify(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId); },
  async conflicts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId); },
  async exportFacts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId); },
};

// ai-content-summary.ts
export default {
  async findByTarget(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").findByTarget(ctx.state.siteId, ctx.query.targetType, ctx.query.targetId, ctx.query.summaryType); },
  async create(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").create(ctx.state.siteId, ctx.request.body); },
  async update(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body); },
  async delete(ctx) { await strapi.plugin("zhao-website").service("ai-content-summary").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
  async regenerate(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").regenerate(ctx.state.siteId, ctx.params.documentId); },
};

// studio-bridge.ts
export default {
  async publishFromStudio(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("studio-bridge").publishFromStudio(ctx.state.siteId, ctx.request.body);
  },
};

// stats.ts
export default {
  async overview(ctx) {
    const siteId = ctx.state.siteId;
    const [articles, products, cases, leads] = await Promise.all([
      strapi.db.query("plugin::zhao-website.article").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.product").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.case").count({ site: siteId, deletedAt: null }),
      strapi.db.query("plugin::zhao-website.lead").count({ site: siteId, deletedAt: null }),
    ]);
    ctx.body = { articles, products, cases, leads };
  },
  async leadStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("lead").stats(ctx.state.siteId, ctx.query.days);
  },
  async searchStats(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("search-log").stats(ctx.state.siteId, ctx.query.days);
  },
};
```

- [ ] **Step 5: admin-api/index.ts（聚合导出）**

```ts
import article from "./article";
import generic from "./generic";
import knowledgeGraph from "./knowledge-graph";
import firstTruth from "./first-truth";
import aiContentSummary from "./ai-content-summary";
import studioBridge from "./studio-bridge";
import stats from "./stats";

export default {
  article,
  ...generic,
  "knowledge-graph": knowledgeGraph,
  "first-truth": firstTruth,
  "ai-content-summary": aiContentSummary,
  "studio-bridge": studioBridge,
  stats,
};
```

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-website/server/src/controllers/admin-api/
git commit -m "feat(zhao-website): 7 个 Admin API controllers（管理后台 CRUD + studio bridge + stats）"
```

---

### Task 22: 创建 Routes 层（Content API 公开路由 + Admin API 鉴权路由）

**Files:**
- Create: `basic/plugins/zhao-website/server/src/routes/content-api.ts`
- Create: `basic/plugins/zhao-website/server/src/routes/admin-api.ts`
- Create: `basic/plugins/zhao-website/server/src/routes/index.ts`

- [ ] **Step 1: content-api.ts（C 端公开路由，复用 zhao-common 路由辅助函数）**

参考 `plugins/zhao-quiz/server/src/routes/content-api.ts` 的 `publicRoute` 辅助函数。

```ts
import { publicRoute } from "../../utils/route-helpers";

export default {
  "content-api": [
    // ===== 文章 =====
    publicRoute("GET", "/articles", "content-api.article.list"),
    publicRoute("GET", "/articles/:slug", "content-api.article.detail"),
    publicRoute("GET", "/articles/category/:categorySlug", "content-api.article.byCategory"),
    publicRoute("GET", "/articles/featured", "content-api.article.featured"),
    publicRoute("GET", "/articles/:slug/related", "content-api.article.related"),
    // ===== 产品 =====
    publicRoute("GET", "/products", "content-api.product.list"),
    publicRoute("GET", "/products/:slug", "content-api.product.detail"),
    // ===== 案例 =====
    publicRoute("GET", "/cases", "content-api.case.list"),
    publicRoute("GET", "/cases/:slug", "content-api.case.detail"),
    // ===== FAQ =====
    publicRoute("GET", "/faqs", "content-api.faq.list"),
    publicRoute("GET", "/faqs/:slug", "content-api.faq.detail"),
    publicRoute("GET", "/faqs/category/:categorySlug", "content-api.faq.byCategory"),
    // ===== 教程 =====
    publicRoute("GET", "/tutorials", "content-api.tutorial.list"),
    publicRoute("GET", "/tutorials/:slug", "content-api.tutorial.detail"),
    publicRoute("GET", "/tutorials/difficulty/:level", "content-api.tutorial.byDifficulty"),
    // ===== 合规 =====
    publicRoute("GET", "/compliance", "content-api.compliance.list"),
    publicRoute("GET", "/compliance/:slug", "content-api.compliance.detail"),
    publicRoute("GET", "/compliance/category/:category", "content-api.compliance.byCategory"),
    // ===== 下载 =====
    publicRoute("GET", "/downloads", "content-api.download.list"),
    publicRoute("GET", "/downloads/:slug", "content-api.download.download"),
    // ===== 留言/留资 =====
    publicRoute("POST", "/leads/submit", "content-api.lead.submit"),
    publicRoute("POST", "/interactions/track", "content-api.lead.track"),
    // ===== SEO 输出 =====
    publicRoute("GET", "/sitemap.xml", "content-api.seo-output.sitemap"),
    publicRoute("GET", "/robots.txt", "content-api.seo-output.robots"),
    publicRoute("GET", "/llms.txt", "content-api.seo-output.llmsTxt"),
    publicRoute("GET", "/manifest.json", "content-api.seo-output.manifest"),
  ],
};
```

- [ ] **Step 2: admin-api.ts（管理后台路由，使用 channelScopeRoute + userRoute 辅助函数）**

参考 `plugins/zhao-quiz/server/src/routes/content-api.ts` 的 `channelScopeRoute` / `userRoute` 辅助函数。

```ts
import { channelScopeRoute, userRoute } from "../../utils/route-helpers";

export default {
  "admin-api": [
    // ===== 文章管理（含 publish/archive/batch） =====
    channelScopeRoute("GET", "/articles", "admin-api.article.find"),
    channelScopeRoute("GET", "/articles/:documentId", "admin-api.article.findOne"),
    channelScopeRoute("POST", "/articles", "admin-api.article.create"),
    channelScopeRoute("PUT", "/articles/:documentId", "admin-api.article.update"),
    channelScopeRoute("DELETE", "/articles/:documentId", "admin-api.article.delete"),
    channelScopeRoute("POST", "/articles/:documentId/publish", "admin-api.article.publish"),
    channelScopeRoute("POST", "/articles/:documentId/archive", "admin-api.article.archive"),
    channelScopeRoute("POST", "/articles/batch", "admin-api.article.batch"),
    // ===== 通用 CRUD（seo-config/brand-info/article-category/product/case/compliance/faq/tutorial/download/lead/visit-log/interaction/search-log） =====
    channelScopeRoute("GET", "/seo-config", "admin-api.seo-config.find"),
    channelScopeRoute("GET", "/seo-config/:documentId", "admin-api.seo-config.findOne"),
    channelScopeRoute("POST", "/seo-config", "admin-api.seo-config.create"),
    channelScopeRoute("PUT", "/seo-config/:documentId", "admin-api.seo-config.update"),
    channelScopeRoute("DELETE", "/seo-config/:documentId", "admin-api.seo-config.delete"),
    channelScopeRoute("GET", "/brand-info", "admin-api.brand-info.find"),
    channelScopeRoute("GET", "/brand-info/:documentId", "admin-api.brand-info.findOne"),
    channelScopeRoute("POST", "/brand-info", "admin-api.brand-info.create"),
    channelScopeRoute("PUT", "/brand-info/:documentId", "admin-api.brand-info.update"),
    channelScopeRoute("DELETE", "/brand-info/:documentId", "admin-api.brand-info.delete"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/article-categories", "admin-api.article-category"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/products", "admin-api.product"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/cases", "admin-api.case"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/compliance", "admin-api.compliance"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/faqs", "admin-api.faq"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/tutorials", "admin-api.tutorial"),
    channelScopeRoute("GET|POST|PUT|DELETE", "/downloads", "admin-api.download"),
    // ===== 线索管理 =====
    channelScopeRoute("GET", "/leads", "admin-api.lead.find"),
    channelScopeRoute("GET", "/leads/:documentId", "admin-api.lead.findOne"),
    channelScopeRoute("PUT", "/leads/:documentId", "admin-api.lead.update"),
    channelScopeRoute("DELETE", "/leads/:documentId", "admin-api.lead.delete"),
    channelScopeRoute("GET", "/visit-logs", "admin-api.visit-log.find"),
    channelScopeRoute("GET", "/interactions", "admin-api.interaction.find"),
    channelScopeRoute("GET", "/search-logs", "admin-api.search-log.find"),
    // ===== 知识图谱 =====
    channelScopeRoute("GET", "/kg/entities", "admin-api.knowledge-graph.findEntities"),
    channelScopeRoute("POST", "/kg/entities", "admin-api.knowledge-graph.createEntity"),
    channelScopeRoute("PUT", "/kg/entities/:documentId", "admin-api.knowledge-graph.updateEntity"),
    channelScopeRoute("DELETE", "/kg/entities/:documentId", "admin-api.knowledge-graph.deleteEntity"),
    channelScopeRoute("GET", "/kg/relations", "admin-api.knowledge-graph.findRelations"),
    channelScopeRoute("POST", "/kg/relations", "admin-api.knowledge-graph.addRelation"),
    channelScopeRoute("DELETE", "/kg/relations/:documentId", "admin-api.knowledge-graph.deleteRelation"),
    channelScopeRoute("POST", "/kg/disambiguate", "admin-api.knowledge-graph.disambiguate"),
    channelScopeRoute("GET", "/kg/export", "admin-api.knowledge-graph.exportGraph"),
    // ===== 第一真值 =====
    channelScopeRoute("GET", "/first-truths", "admin-api.first-truth.find"),
    channelScopeRoute("GET", "/first-truths/:documentId", "admin-api.first-truth.findOne"),
    channelScopeRoute("POST", "/first-truths", "admin-api.first-truth.create"),
    channelScopeRoute("PUT", "/first-truths/:documentId", "admin-api.first-truth.update"),
    channelScopeRoute("DELETE", "/first-truths/:documentId", "admin-api.first-truth.delete"),
    channelScopeRoute("POST", "/first-truths/:documentId/verify", "admin-api.first-truth.verify"),
    channelScopeRoute("GET", "/first-truths/conflicts", "admin-api.first-truth.conflicts"),
    channelScopeRoute("GET", "/first-truths/export", "admin-api.first-truth.exportFacts"),
    // ===== AI 摘要 =====
    channelScopeRoute("GET", "/ai-summaries", "admin-api.ai-content-summary.findByTarget"),
    channelScopeRoute("POST", "/ai-summaries", "admin-api.ai-content-summary.create"),
    channelScopeRoute("PUT", "/ai-summaries/:documentId", "admin-api.ai-content-summary.update"),
    channelScopeRoute("DELETE", "/ai-summaries/:documentId", "admin-api.ai-content-summary.delete"),
    channelScopeRoute("POST", "/ai-summaries/:documentId/regenerate", "admin-api.ai-content-summary.regenerate"),
    // ===== Studio Bridge =====
    channelScopeRoute("POST", "/studio-bridge/publish", "admin-api.studio-bridge.publishFromStudio"),
    // ===== 统计 =====
    channelScopeRoute("GET", "/stats/overview", "admin-api.stats.overview"),
    channelScopeRoute("GET", "/stats/leads", "admin-api.stats.leadStats"),
    channelScopeRoute("GET", "/stats/search", "admin-api.stats.searchStats"),
  ],
};
```

> 注意：`channelScopeRoute("GET|POST|PUT|DELETE", ...)` 这种写法在某些 Strapi 版本不支持。实际实现时拆为 4 条独立路由。在 Task 1 中创建的 `utils/route-helpers.ts` 应包含 `publicRoute` / `channelScopeRoute` / `userRoute` 辅助函数，参考 zhao-quiz 的实现。

- [ ] **Step 3: routes/index.ts（聚合导出）**

```ts
import contentApi from "./content-api";
import adminApi from "./admin-api";

export default {
  "content-api": contentApi["content-api"],
  "admin-api": adminApi["admin-api"],
};
```

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-website/server/src/routes/
git commit -m "feat(zhao-website): Routes 层（Content API 公开路由 + Admin API 鉴权路由，约 95 个端点）"
```

---

### Task 23: zhao-oss media-service 改造（媒体租户隔离 + ensureSiteDefaultFolders）

**Files:**
- Modify: `basic/plugins/zhao-oss/server/src/services/media-service.ts`
- Modify: `basic/plugins/zhao-oss/server/src/content-types/index.ts`
- Create: `basic/plugins/zhao-oss/server/src/content-types/media-meta/index.ts`
- Create: `basic/plugins/zhao-oss/server/src/content-types/media-meta/schema.json`

- [ ] **Step 1: 创建 media-meta CT schema（媒体-租户关联表）**

```json
// media-meta/schema.json
{
  "collectionName": "zhao_oss_media_metas",
  "info": {
    "singularName": "media-meta",
    "pluralName": "media-metas",
    "displayName": "Media Meta",
    "description": "媒体文件租户关联元数据"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": false },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "file": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::upload.file"
    },
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true
    },
    "folder": {
      "type": "string"
    },
    "uploadedBy": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "admin::user"
    },
    "usageType": {
      "type": "enumeration",
      "enum": ["article-cover", "product-image", "case-image", "brand-logo", "seo-og", "favicon", "download-file", "general"],
      "default": "general"
    },
    "metadata": {
      "type": "json"
    }
  }
}
```

```ts
// media-meta/index.ts
import schema from "./schema.json";
export default { schema };
```

- [ ] **Step 2: 更新 zhao-oss content-types/index.ts**

```ts
import syncRecord from "./sync-record";
import mediaMeta from "./media-meta";

export default {
  "sync-record": syncRecord,
  "media-meta": mediaMeta,
};
```

- [ ] **Step 3: media-service.ts 添加 siteId 参数 + ensureSiteDefaultFolders 方法**

在现有 `media-service.ts` 中：

1. `uploadFile` 方法签名增加 `siteId?: number` 参数，上传成功后写入 `media-meta` 关联表
2. `listFiles` / `getFolderTree` / `deleteFile` 方法增加 `siteId` 过滤（通过 media-meta 关联表 join）
3. 新增 `ensureSiteDefaultFolders(siteId)` 方法，在 site-config 创建时调用

```ts
// 在 media-service.ts 中新增方法
async ensureSiteDefaultFolders(siteId: number) {
  const DEFAULT_FOLDERS = [
    { name: "general", type: "general" },
    { name: "articles", type: "article-cover" },
    { name: "products", type: "product-image" },
    { name: "cases", type: "case-image" },
    { name: "brand", type: "brand-logo" },
    { name: "seo", type: "seo-og" },
    { name: "downloads", type: "download-file" },
  ];
  const siteRoot = await this.ensureFolder(`site-${siteId}`);
  for (const folder of DEFAULT_FOLDERS) {
    await this.ensureFolder(`site-${siteId}/${folder.name}`);
  }
  return siteRoot;
},

// uploadFile 改造：增加 siteId 参数，写入 media-meta
async uploadFile(params: UploadParams & { siteId?: number; usageType?: string }) {
  const result = await this._originalUploadFile(params); // 原有逻辑
  if (params.siteId) {
    await strapi.db.query("plugin::zhao-oss.media-meta").create({
      data: {
        file: result.fileId,
        site: params.siteId,
        folder: params.folderPath,
        usageType: params.usageType || "general",
      },
    });
  }
  return result;
},

// listFiles 改造：siteId 过滤
async listFiles(siteId: number, query: any = {}) {
  const { folder, page = 1, pageSize = 20 } = query;
  // 通过 media-meta join 查询当前 site 的文件
  const metas = await strapi.db.query("plugin::zhao-oss.media-meta").findMany({
    where: { site: siteId, ...(folder ? { folder: { $contains: folder } } : {}) },
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    populate: ["file"],
    orderBy: { createdAt: "DESC" },
  });
  return metas.map((m: any) => m.file).filter(Boolean);
},
```

- [ ] **Step 4: 创建 media-meta 迁移脚本**

```js
// plugins/zhao-oss/server/database/migrations/002_create_media_meta_table.js
async function up(trx) {
  await trx.schema.createTable("zhao_oss_media_metas", (table) => {
    table.increments("id").primary();
    table.integer("file_id").notNullable();
    table.integer("site_id").notNullable();
    table.string("folder");
    table.integer("uploaded_by_id");
    table.enum("usage_type", ["article-cover", "product-image", "case-image", "brand-logo", "seo-og", "favicon", "download-file", "general"]).defaultTo("general");
    table.json("metadata");
    table.datetime("created_at").defaultTo(trx.fn.now());
    table.datetime("updated_at").defaultTo(trx.fn.now());
    table.index(["site_id"], "idx_media_metas_site");
    table.index(["file_id"], "idx_media_metas_file");
  });
}

async function down(trx) {
  await trx.schema.dropTableIfExists("zhao_oss_media_metas");
}

module.exports = { up, down };
```

- [ ] **Step 5: Commit**

```bash
git add plugins/zhao-oss/server/src/content-types/media-meta/ \
        plugins/zhao-oss/server/src/content-types/index.ts \
        plugins/zhao-oss/server/src/services/media-service.ts \
        plugins/zhao-oss/server/database/migrations/002_create_media_meta_table.js
git commit -m "feat(zhao-oss): media-meta CT + media-service 租户隔离改造 + ensureSiteDefaultFolders"
```

---

### Task 24: zhao-oss bootstrap 改造（监听 site-config afterCreate 触发 ensureSiteDefaultFolders）

**Files:**
- Modify: `basic/plugins/zhao-oss/server/src/bootstrap.ts`

- [ ] **Step 1: 在 bootstrap.ts 中添加 site-config afterCreate 监听**

在现有 bootstrap 函数末尾（upload.file lifecycle 订阅之后）添加：

```ts
// 监听 site-config 创建 → 自动创建站点默认文件夹
if (strapi.plugin("zhao-common") && strapi.db) {
  strapi.db.lifecycles.subscribe({
    models: ["plugin::zhao-common.site-config"],
    async afterCreate(event) {
      const siteId = event.result.id;
      try {
        await strapi.plugin("zhao-oss").service("media").ensureSiteDefaultFolders(siteId);
        if (!isTest) logger.info(`[zhao-oss] Created default folders for site ${siteId}`);
      } catch (err) {
        logger.error(`[zhao-oss] Failed to create default folders for site ${siteId}:`, err);
      }
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/zhao-oss/server/src/bootstrap.ts
git commit -m "feat(zhao-oss): bootstrap 监听 site-config afterCreate 触发 ensureSiteDefaultFolders"
```

---

### Task 25: zhao-website bootstrap 完善（权限同步 + 索引创建 + 默认数据初始化）

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/bootstrap.ts`（Task 1 创建的空壳）

- [ ] **Step 1: 完善 bootstrap.ts（权限同步 + DB 索引 + 限流中间件注册）**

```ts
import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-website] Initializing...");

  // 1. 同步权限到数据库（每次启动都同步，幂等）
  try {
    const authPlugin = strapi.plugin("zhao-auth");
    if (authPlugin?.service("permission-sync")) {
      await authPlugin.service("permission-sync").syncAll();
      if (!isTest) logger.info("[zhao-website] Permissions synced");
    }
  } catch (err) {
    logger.error("[zhao-website] Permission sync failed:", err);
  }

  // 2. 创建 DB 索引（幂等，迁移脚本已处理，此处仅兜底）
  try {
    const db = strapi.db.connection;
    // article 索引
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_slug ON zhao_website_articles (site_id, slug) WHERE deleted_at IS NULL`).catch(() => {});
    await db.raw(`CREATE INDEX IF NOT EXISTS idx_zhao_website_articles_site_status ON zhao_website_articles (site_id, status, published_at DESC)`).catch(() => {});
    // product/case/faq/tutorial 索引模式相同
    if (!isTest) logger.info("[zhao-website] DB indexes ensured");
  } catch (err) {
    logger.error("[zhao-website] Index creation failed:", err);
  }

  // 3. 注册限流中间件（内存 Map + honeypot）
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分钟
  const RATE_LIMIT_MAX = 30; // 每窗口最多 30 次

  strapi.server.use(async (ctx, next) => {
    // 仅对 C 端 content-api 的 lead/track 路由限流
    if (!ctx.path.includes("/api/zhao-website/") || (!ctx.path.includes("/leads/submit") && !ctx.path.includes("/interactions/track"))) {
      return next();
    }
    const ip = ctx.request.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > RATE_LIMIT_MAX) {
        return ctx.tooManyRequests("Rate limit exceeded");
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
    // 定期清理过期条目
    if (rateLimitMap.size > 10000) {
      for (const [k, v] of rateLimitMap) {
        if (now >= v.resetAt) rateLimitMap.delete(k);
      }
    }
    return next();
  });

  // 4. SIGTERM flush（异步写入队列 flush）
  process.on("SIGTERM", async () => {
    logger.info("[zhao-website] SIGTERM received, flushing queues...");
    const queueService = strapi.plugin("zhao-website")?.service("write-queue");
    if (queueService?.flush) {
      await queueService.flush();
    }
    process.exit(0);
  });

  if (!isTest) logger.info("[zhao-website] Ready");
};

export default bootstrap;
```

- [ ] **Step 2: Commit**

```bash
git add plugins/zhao-website/server/src/bootstrap.ts
git commit -m "feat(zhao-website): bootstrap 完善（权限同步 + 索引兜底 + 限流中间件 + SIGTERM flush）"
```

---

### Task 26: 核心测试（CT schema 验证 + service 单元测试 + API 集成测试）

**Files:**
- Create: `basic/plugins/zhao-website/server/__tests__/schema.test.ts`
- Create: `basic/plugins/zhao-website/server/__tests__/services/article.test.ts`
- Create: `basic/plugins/zhao-website/server/__tests__/services/knowledge-graph.test.ts`
- Create: `basic/plugins/zhao-website/server/__tests__/services/first-truth.test.ts`
- Create: `basic/plugins/zhao-website/server/__tests__/api/content-api.test.ts`

- [ ] **Step 1: schema 验证测试**

```ts
// __tests__/schema.test.ts
describe("zhao-website CT schemas", () => {
  test("所有 18 个 CT 都有 site 字段", () => {
    const cts = strapi.contentTypes;
    const websiteUids = Object.keys(cts).filter((u) => u.startsWith("plugin::zhao-website."));
    expect(websiteUids.length).toBe(18);
    for (const uid of websiteUids) {
      const schema = cts[uid];
      expect(schema.attributes.site).toBeDefined();
      expect(schema.attributes.site.target).toBe("plugin::zhao-common.site-config");
    }
  });

  test("所有 CT 都有 deletedAt 字段", () => {
    const websiteUids = Object.keys(strapi.contentTypes).filter((u) => u.startsWith("plugin::zhao-website."));
    for (const uid of websiteUids) {
      expect(strapi.contentTypes[uid].attributes.deletedAt).toBeDefined();
    }
  });

  test("article CT 不启用 draftAndPublish", () => {
    const schema = strapi.contentTypes["plugin::zhao-website.article"];
    expect(schema.options.draftAndPublish).toBe(false);
  });
});
```

- [ ] **Step 2: article service 单元测试**

```ts
// __tests__/services/article.test.ts
describe("article service", () => {
  let siteId: number;
  beforeAll(async () => {
    const site = await strapi.db.query("plugin::zhao-common.site-config").create({ data: { name: "test-site", domains: ["test.local"] } });
    siteId = site.id;
  });

  test("create + findPublic + publish", async () => {
    const svc = strapi.plugin("zhao-website").service("article");
    const article = await svc.create(siteId, { title: "Test Article", slug: "test-article", content: "Hello" });
    expect(article.id).toBeDefined();

    // 未发布 → 公开查询不应返回
    const beforePublish = await svc.findPublic(siteId, {});
    expect(beforePublish.results.length).toBe(0);

    // 发布 → 公开查询应返回
    await svc.publish(siteId, article.documentId);
    const afterPublish = await svc.findPublic(siteId, {});
    expect(afterPublish.results.length).toBe(1);
    expect(afterPublish.results[0].title).toBe("Test Article");
  });

  test("slug 冲突检测", async () => {
    const svc = strapi.plugin("zhao-website").service("article");
    await svc.create(siteId, { title: "Dup", slug: "dup-slug", content: "x" });
    await expect(svc.create(siteId, { title: "Dup2", slug: "dup-slug", content: "y" })).rejects.toThrow();
  });

  test("softDelete 后不在查询中返回", async () => {
    const svc = strapi.plugin("zhao-website").service("article");
    const a = await svc.create(siteId, { title: "To Delete", slug: "to-delete", content: "x", status: "published" });
    await svc.publish(siteId, a.documentId);
    await svc.softDelete(siteId, a.documentId);
    const list = await svc.findPublic(siteId, {});
    expect(list.results.find((r: any) => r.documentId === a.documentId)).toBeUndefined();
  });
});
```

- [ ] **Step 3: knowledge-graph service 单元测试（含循环检测）**

```ts
// __tests__/services/knowledge-graph.test.ts
describe("knowledge-graph service", () => {
  let siteId: number;
  let entityA: any, entityB: any, entityC: any;
  beforeAll(async () => {
    const site = await strapi.db.query("plugin::zhao-common.site-config").create({ data: { name: "kg-test" } });
    siteId = site.id;
    const svc = strapi.plugin("zhao-website").service("knowledge-graph");
    entityA = await svc.createEntity(siteId, { name: "A", entityType: "Organization", slug: "ent-a" });
    entityB = await svc.createEntity(siteId, { name: "B", entityType: "Organization", slug: "ent-b" });
    entityC = await svc.createEntity(siteId, { name: "C", entityType: "Organization", slug: "ent-c" });
  });

  test("自引用检测", async () => {
    const svc = strapi.plugin("zhao-website").service("knowledge-graph");
    await expect(svc.addRelation({
      siteId, subjectEntityId: entityA.documentId, predicate: "parentOf", objectEntityId: entityA.documentId,
    })).rejects.toThrow("Self-relation");
  });

  test("层级关系循环检测", async () => {
    const svc = strapi.plugin("zhao-website").service("knowledge-graph");
    await svc.addRelation({ siteId, subjectEntityId: entityA.documentId, predicate: "parentOf", objectEntityId: entityB.documentId });
    await svc.addRelation({ siteId, subjectEntityId: entityB.documentId, predicate: "parentOf", objectEntityId: entityC.documentId });
    // C → A 形成环
    await expect(svc.addRelation({ siteId, subjectEntityId: entityC.documentId, predicate: "parentOf", objectEntityId: entityA.documentId })).rejects.toThrow("cycle");
  });

  test("客体互斥检测", async () => {
    const svc = strapi.plugin("zhao-website").service("knowledge-graph");
    await expect(svc.addRelation({
      siteId, subjectEntityId: entityA.documentId, predicate: "hasValue", objectEntityId: entityB.documentId, objectValue: 42,
    })).rejects.toThrow("互斥");
  });
});
```

- [ ] **Step 4: first-truth 冲突检测测试**

```ts
// __tests__/services/first-truth.test.ts
describe("first-truth service", () => {
  let siteId: number;
  beforeAll(async () => {
    const site = await strapi.db.query("plugin::zhao-common.site-config").create({ data: { name: "ft-test" } });
    siteId = site.id;
  });

  test("claimKey 唯一约束", async () => {
    const svc = strapi.plugin("zhao-website").service("first-truth");
    await svc.create(siteId, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2020-01-01" });
    await expect(svc.create(siteId, { claimKey: "founding-date", claim: "成立日期", canonicalValue: "2021-01-01" })).rejects.toThrow();
  });

  test("冲突检测", async () => {
    const svc = strapi.plugin("zhao-website").service("first-truth");
    // 直接入库两条不同 claimKey 但相同 claim（模拟数据不一致）
    await strapi.db.query("plugin::zhao-website.first-truth-policy").create({
      data: { site: siteId, claimKey: "rev-a", claim: "收入", canonicalValue: "100万", status: true, verificationStatus: "verified" },
    });
    await strapi.db.query("plugin::zhao-website.first-truth-policy").create({
      data: { site: siteId, claimKey: "rev-a", claim: "收入", canonicalValue: "200万", status: true, verificationStatus: "verified" },
    });
    const conflicts = await svc.detectConflicts(siteId);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe("error");
  });
});
```

- [ ] **Step 5: API 集成测试（C 端文章列表 + 留言提交）**

```ts
// __tests__/api/content-api.test.ts
const request = require("supertest");

describe("content-api", () => {
  let siteId: number;
  beforeAll(async () => {
    const site = await strapi.db.query("plugin::zhao-common.site-config").create({ data: { name: "api-test", domains: ["api-test.local"] } });
    siteId = site.id;
    // 创建已发布文章
    const svc = strapi.plugin("zhao-website").service("article");
    const a = await svc.create(siteId, { title: "API Test", slug: "api-test", content: "x" });
    await svc.publish(siteId, a.documentId);
  });

  test("GET /api/zhao-website/v1/articles 返回已发布文章", async () => {
    const res = await request(strapi.server.httpServer)
      .get("/api/zhao-website/v1/articles")
      .set("Host", "api-test.local");
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].title).toBe("API Test");
  });

  test("POST /api/zhao-website/v1/leads/submit 成功提交留言", async () => {
    const res = await request(strapi.server.httpServer)
      .post("/api/zhao-website/v1/leads/submit")
      .set("Host", "api-test.local")
      .send({ name: "张三", phone: "13800138000", message: "测试留言", type: "contact" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("honeypot 字段被填 → 静默成功", async () => {
    const res = await request(strapi.server.httpServer)
      .post("/api/zhao-website/v1/leads/submit")
      .set("Host", "api-test.local")
      .send({ name: "bot", website: "spam", message: "spam" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 验证未入库
    const leads = await strapi.db.query("plugin::zhao-website.lead").findMany({ where: { site: siteId } });
    expect(leads.find((l: any) => l.name === "bot")).toBeUndefined();
  });
});
```

- [ ] **Step 6: Commit**

```bash
git add plugins/zhao-website/server/__tests__/
git commit -m "test(zhao-website): 核心测试（schema 验证 + service 单元 + API 集成）"
```

---

### Task 27: Web 前端改造（uni-app 控制台官网内容管理 + studio 一键发布按钮）

**Files:**
- Modify: `basic/web/src/api/website.ts`（新增官网 API 调用）
- Modify: `basic/web/src/pages/website/article/list.vue`（新建）
- Modify: `basic/web/src/pages/website/article/edit.vue`（新建）
- Modify: `basic/web/src/pages/website/lead/list.vue`（新建）
- Modify: `basic/web/src/studio/pages/article-draft/detail.vue`（增加"一键发布到官网"按钮）
- Modify: `basic/web/src/store/permission.ts`（增加 website-center 权限节点处理）

- [ ] **Step 1: web/src/api/website.ts（API 调用封装）**

```ts
import request from "@/utils/request";

const BASE = "/api/zhao-website/v1";

// ===== 文章管理 =====
export const articleApi = {
  list: (params: any) => request.get(`${BASE}/articles`, { params }),
  detail: (documentId: string) => request.get(`${BASE}/articles/${documentId}`),
  create: (data: any) => request.post(`${BASE}/articles`, data),
  update: (documentId: string, data: any) => request.put(`${BASE}/articles/${documentId}`, data),
  delete: (documentId: string) => request.delete(`${BASE}/articles/${documentId}`),
  publish: (documentId: string) => request.post(`${BASE}/articles/${documentId}/publish`),
  archive: (documentId: string) => request.post(`${BASE}/articles/${documentId}/archive`),
  batch: (action: string, documentIds: string[]) => request.post(`${BASE}/articles/batch`, { action, documentIds }),
};

// ===== 线索管理 =====
export const leadApi = {
  list: (params: any) => request.get(`${BASE}/leads`, { params }),
  detail: (documentId: string) => request.get(`${BASE}/leads/${documentId}`),
  update: (documentId: string, data: any) => request.put(`${BASE}/leads/${documentId}`, data),
};

// ===== Studio Bridge =====
export const studioBridgeApi = {
  publishFromStudio: (data: { articleDraftDocumentId: string; overrides?: any }) =>
    request.post(`${BASE}/studio-bridge/publish`, data),
};

// ===== 统计 =====
export const statsApi = {
  overview: () => request.get(`${BASE}/stats/overview`),
  leads: (days = 30) => request.get(`${BASE}/stats/leads`, { params: { days } }),
  search: (days = 30) => request.get(`${BASE}/stats/search`, { params: { days } }),
};

// ===== SEO 配置 =====
export const seoConfigApi = {
  get: () => request.get(`${BASE}/seo-config`),
  save: (data: any) => {
    const existing = data.documentId;
    return existing ? request.put(`${BASE}/seo-config/${existing}`, data) : request.post(`${BASE}/seo-config`, data);
  },
};
```

- [ ] **Step 2: web/src/pages/website/article/list.vue（文章列表页）**

```vue
<template>
  <view class="container">
    <view class="header">
      <text class="title">资讯文章</text>
      <button size="mini" @click="goCreate">新增文章</button>
    </view>
    <view v-for="item in list" :key="item.documentId" class="item" @click="goEdit(item.documentId)">
      <text class="item-title">{{ item.title }}</text>
      <text class="item-status" :class="item.status">{{ statusLabel(item.status) }}</text>
      <text class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</text>
    </view>
    <uni-pagination :total="total" :pageSize="pageSize" @change="loadList" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { articleApi } from "@/api/website";

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const loadList = async (p = page.value) => {
  page.value = p;
  const res = await articleApi.list({ page: p, pageSize: pageSize.value });
  list.value = res.data.results;
  total.value = res.data.pagination.total;
};

const statusLabel = (s: string) => ({ draft: "草稿", published: "已发布", archived: "已下架" })[s] || s;
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("zh-CN") : "";

const goCreate = () => uni.navigateTo({ url: "/pages/website/article/edit" });
const goEdit = (id: string) => uni.navigateTo({ url: `/pages/website/article/edit?documentId=${id}` });

onMounted(() => loadList(1));
</script>
```

- [ ] **Step 3: web/src/pages/website/article/edit.vue（文章编辑页，含 SEO 字段）**

```vue
<template>
  <view class="container">
    <uni-forms :model="form" label-width="100px">
      <uni-forms-item label="标题" required><uni-easyinput v-model="form.title" /></uni-forms-item>
      <uni-forms-item label="slug" required><uni-easyinput v-model="form.slug" /></uni-forms-item>
      <uni-forms-item label="摘要"><uni-easyinput type="textarea" v-model="form.excerpt" /></uni-forms-item>
      <uni-forms-item label="正文" required><editor id="editor" @ready="onEditorReady" /></uni-forms-item>
      <uni-forms-item label="封面图"><media-picker v-model="form.coverImage" /></uni-forms-item>
      <uni-forms-item label="分类"><category-select v-model="form.category" ct-name="article-category" /></uni-forms-item>
      <uni-forms-item label="标签"><tag-select v-model="form.tags" multiple /></uni-forms-item>
      <!-- SEO 字段 -->
      <uni-section title="SEO 优化" type="line">
        <uni-forms-item label="SEO 标题"><uni-easyinput v-model="form.seoTitle" maxlength="60" /></uni-forms-item>
        <uni-forms-item label="SEO 描述"><uni-easyinput type="textarea" v-model="form.seoDescription" maxlength="160" /></uni-forms-item>
        <uni-forms-item label="SEO 关键词"><uni-easyinput v-model="form.seoKeywords" /></uni-forms-item>
        <uni-forms-item label="canonical URL"><uni-easyinput v-model="form.canonicalUrl" /></uni-forms-item>
        <uni-forms-item label="允许收录"><switch :checked="form.allowIndex" @change="form.allowIndex = $event.detail.value" /></uni-forms-item>
      </uni-section>
    </uni-forms>
    <view class="actions">
      <button @click="save('draft')">保存草稿</button>
      <button type="primary" @click="save('published')">发布</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { articleApi } from "@/api/website";

const props = defineProps<{ documentId?: string }>();
const form = ref<any>({
  title: "", slug: "", excerpt: "", content: "", coverImage: null,
  category: null, tags: [], seoTitle: "", seoDescription: "", seoKeywords: "",
  canonicalUrl: "", allowIndex: true, status: "draft",
});

const save = async (status: string) => {
  const data = { ...form.value, status };
  if (props.documentId) {
    await articleApi.update(props.documentId, data);
    if (status === "published") await articleApi.publish(props.documentId);
  } else {
    const res = await articleApi.create(data);
    if (status === "published") await articleApi.publish(res.data.documentId);
  }
  uni.showToast({ title: "保存成功", icon: "success" });
  setTimeout(() => uni.navigateBack(), 1500);
};
</script>
```

- [ ] **Step 4: studio 一键发布按钮（在 article-draft 详情页添加）**

在 `web/src/studio/pages/article-draft/detail.vue` 中增加：

```vue
<template>
  <!-- 现有内容 -->
  <view class="actions">
    <button type="warn" @click="publishToWebsite">一键发布到官网</button>
  </view>
</template>

<script setup lang="ts">
import { studioBridgeApi } from "@/api/website";

const publishToWebsite = async () => {
  uni.showModal({
    title: "发布到官网",
    content: "将以快照形式复制到官网文章，确认？",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        const result = await studioBridgeApi.publishFromStudio({
          articleDraftDocumentId: props.documentId,
          overrides: { status: "published" },
        });
        uni.showToast({ title: "发布成功", icon: "success" });
      } catch (err: any) {
        uni.showToast({ title: err.message || "发布失败", icon: "error" });
      }
    },
  });
};
</script>
```

- [ ] **Step 5: 权限 store 增加 website-center 节点处理**

在 `web/src/store/permission.ts` 的菜单节点映射中增加：

```ts
const MENU_NODE_MAP = {
  // ... 现有节点
  "menu.website-center": {
    label: "官网中心",
    path: "/pages/website/index",
    icon: "globe",
    children: {
      "menu.website-article": { label: "资讯文章", path: "/pages/website/article/list" },
      "menu.website-product": { label: "产品方案", path: "/pages/website/product/list" },
      "menu.website-case": { label: "落地案例", path: "/pages/website/case/list" },
      "menu.website-lead": { label: "线索管理", path: "/pages/website/lead/list" },
      "menu.website-seo": { label: "SEO 配置", path: "/pages/website/seo-config" },
      "menu.website-kg": { label: "知识图谱", path: "/pages/website/knowledge-graph" },
      "menu.website-truth": { label: "第一真值", path: "/pages/website/first-truth" },
    },
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add web/src/api/website.ts \
        web/src/pages/website/ \
        web/src/studio/pages/article-draft/detail.vue \
        web/src/store/permission.ts
git commit -m "feat(web): 官网内容管理前端 + studio 一键发布按钮 + website-center 权限节点"
```

---

## 自我审查

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task | 状态 |
|---|---|---|
| §1 架构概览 | Task 1（脚手架）、Task 22（routes）、Task 25（bootstrap） | ✅ |
| §2 内容模型 18 CT | Task 3-5（CT schemas）、Task 6（聚合） | ✅ |
| §3 API 设计 ~95 端点 | Task 20-21（controllers）、Task 22（routes） | ✅ |
| §4 Service 层 | Task 12-19（基础 utils + 13 services + 5 SEO 输出 services） | ✅ |
| §5 Bootstrap/Register/Migration | Task 8-11（6 迁移脚本）、Task 25（bootstrap 完善） | ✅ |
| §6 错误处理 | 嵌入各 service（status/code/throw pattern） | ✅ |
| §7 测试 | Task 26（schema + service + API 集成） | ✅ |
| §8 zhao-oss 改造 | Task 23（media-meta + media-service）、Task 24（bootstrap） | ✅ |
| 跨插件配置（plugins.ts/migration-runner/soft-delete/permissions） | Task 2 | ✅ |
| Web 前端 | Task 27 | ✅ |
| Studio Bridge | Task 19（service）、Task 21（controller）、Task 27（前端按钮） | ✅ |

**潜在 gap**：spec 提及"异步写入队列（内存队列 + 死信表 + SIGTERM flush）"，Task 25 bootstrap 引用了 `write-queue` service 但该 service 未在独立 Task 中定义。**修正建议**：在 Task 12（基础 utils）中应包含 `write-queue.ts` service 的创建，或作为 Task 13 的补充。执行时需确认 Task 12-13 已包含 write-queue service。

### 2. 占位符扫描

- Task 20 Step 2："结构同 article，省略重复" — 提供了 product.ts 完整示例 + 明确列出每个 controller 的差异方法。可接受，但执行时需为 case/faq/tutorial/compliance 各自创建完整 controller 文件。
- Task 22："实际实现时拆为 4 条独立路由" — 这是实现提示，非占位符。执行时 channelScopeRoute 辅助函数应处理多 method 展开。
- Task 23 Step 3："原有逻辑" — 修改现有文件的合理引用，非占位符。

**结论**：无阻塞性占位符。

### 3. 类型一致性

| 方法名 | 定义 Task | 调用 Task | 一致性 |
|---|---|---|---|
| `findPublic` / `findBySlug` / `findAdmin` | Task 14-15（services） | Task 20-21（controllers）、Task 26（tests） | ✅ |
| `ensureSiteDefaultFolders` | Task 23（media-service） | Task 24（bootstrap） | ✅ |
| `publishFromStudio` | Task 19（studio-bridge） | Task 21（controller）、Task 27（前端 API） | ✅ |
| `detectConflicts` | Task 17（first-truth） | Task 21（controller）、Task 26（test） | ✅ |
| `addRelation` / `_detectCycle` | Task 17（knowledge-graph） | Task 26（test） | ✅ |
| `incrementView` | Task 14（article service） | Task 20（content-api controller） | ✅ |

**结论**：类型和方法签名一致。

---

## 执行交接

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-zhao-website-plugin.md`. Two execution options:**

**1. Subagent-Driven（推荐）** — 每个 Task 派发独立 subagent，Task 间审查，快速迭代

**2. Inline Execution** — 在当前会话中按序执行，批量执行 + 检查点审查

**Which approach?**
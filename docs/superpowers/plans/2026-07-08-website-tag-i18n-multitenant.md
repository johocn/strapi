# 官网标签 CRUD 重设计 + i18n + 多租户隔离 + JSON 示例填充 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-tag 与官网 9 个 CT 启用 i18n（仅 zh-CN），实现公共/站点标签分级（isPublic + site 双字段），前端集成 TagSelector 与 JsonExampleBlock 组件，并补充 SEO 与标签关系文档。

**Architecture:** 后端先启用 Strapi i18n 插件并配置 zh-CN 默认 locale，再为 zhao-tag 的 tag/tag-group 加 pluginOptions.i18n + site 关联 + isPublic（tag-group 新增），同时为 zhao-website 9 个 CT 加 pluginOptions.i18n 并标记核心字段 localized；service 层增加 isPublic+site 合法性校验与 siteId 筛选；前端新建 TagSelector（按 tagGroup 分组 + 公共/站点徽章）与 JsonExampleBlock（JSON 示例一键填充）两个组件，并集成到 7 个 CT 的 edit/list 页。

**Tech Stack:** Strapi v5 / TypeScript / Knex / uni-app + Vue 3 (`<script setup>`) / Pinia

---

## 字段校准说明

spec 第 4.1 章列出的 localized 字段与实际 schema 存在差异。本计划仅针对**实际 schema 中已存在**的字段添加 `"localized": true`，不新增字段（避免越界 schema 变更）。校准结果：

| CT | spec 字段 | 实际存在字段（本次 localized 范围） |
|---|---|---|
| article | title/slug/excerpt/content/seoTitle/seoDescription/seoKeywords/canonicalUrl/ogTitle/ogDescription/schemaJson | 全部存在 ✓ |
| product | name/slug/summary/description/features/specifications/seoTitle/seoDescription/seoKeywords | name/slug/tagline/description/content/features/specifications/seoTitle/seoDescription/seoKeywords（spec 的 summary 实为 tagline；补充 content） |
| case | title/slug/clientName/summary/challenge/solution/result/testimonial/seoTitle/seoDescription/seoKeywords | title/slug/clientName/clientDescription/challenge/solution/results/testimonial/seoTitle/seoDescription（spec 的 summary 实为 clientDescription；result 实为 results；seoKeywords 实际不存在，跳过） |
| faq | question/answer/seoTitle/seoDescription/seoKeywords | question/answer（slug 是 uid 不 localized；seoTitle/seoDescription/seoKeywords 实际不存在，跳过） |
| tutorial | title/slug/summary/content/steps/seoTitle/seoDescription/seoKeywords | title/slug/description/steps/result（spec 的 summary 实为 description；content/seo* 实际不存在，跳过） |
| compliance | title/slug/summary/content/issuingAuthority/seoTitle/seoDescription/seoKeywords | title/slug/content/seoTitle/seoDescription（summary/issuingAuthority/seoKeywords 实际不存在，跳过） |
| download | title/slug/description/seoTitle/seoDescription/seoKeywords | name/description（spec 的 title 实为 name；slug/seo* 实际不存在，跳过） |
| article-category | name/slug/description/seoTitle/seoDescription | 全部存在 ✓ |
| brand-info | companyName/shortName/slogan/description/registeredAddress/officeAddress/businessScope | 全部存在 ✓ |

---

## File Structure

### 修改的文件

**Strapi 配置：**
- `basic/config/plugins.ts` — 启用 i18n 插件

**zhao-tag schema：**
- `basic/plugins/zhao-tag/server/src/content-types/tag/schema.json` — 加 pluginOptions.i18n + 字段 localized + site 关联
- `basic/plugins/zhao-tag/server/src/content-types/tag-group/schema.json` — 加 pluginOptions.i18n + 字段 localized + isPublic + site 关联

**zhao-website schema（9 个）：**
- `basic/plugins/zhao-website/server/src/content-types/article/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/product/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/case/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/faq/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/tutorial/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/compliance/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/download/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/article-category/schema.json`
- `basic/plugins/zhao-website/server/src/content-types/brand-info/schema.json`

**zhao-common schema：**
- `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json` — 增加 inversedBy tags / tagGroups

**zhao-tag service/controller：**
- `basic/plugins/zhao-tag/server/src/services/tag.ts` — create/update 校验 isPublic+site
- `basic/plugins/zhao-tag/server/src/services/tag-group.ts` — create/update 校验 isPublic+site
- `basic/plugins/zhao-tag/server/src/controllers/tag.ts` — list 支持 siteId/isPublic 筛选（透传 query）
- `basic/plugins/zhao-tag/server/src/controllers/tag-group.ts` — list 支持 siteId/isPublic 筛选

**zhao-website service（7 个 CT）：**
- `basic/plugins/zhao-website/server/src/services/article.ts` — populate tags.tagGroup + tagGroup 筛选
- `basic/plugins/zhao-website/server/src/services/product.ts`
- `basic/plugins/zhao-website/server/src/services/case.ts`
- `basic/plugins/zhao-website/server/src/services/faq.ts`
- `basic/plugins/zhao-website/server/src/services/tutorial.ts`
- `basic/plugins/zhao-website/server/src/services/compliance.ts`
- `basic/plugins/zhao-website/server/src/services/download.ts`

**zhao-website controller（7 个 CT，无需修改）：**
- `basic/plugins/zhao-website/server/src/controllers/admin-api/article.ts` 等 — 已通过 `ctx.query` 透传 `tagGroup` 到 service，无需改动

**前端 API：**
- `web/src/api/tag.js` — 新增 listBySite / listPublic / listTagGroups

**前端组件（新建）：**
- `web/src/components/TagSelector.vue` — 按 tagGroup 分组 + 公共/站点徽章
- `web/src/components/JsonExampleBlock.vue` — JSON 示例一键填充

**前端页面（修改）：**
- `web/pages/website/article/edit.vue` — 集成 TagSelector + schemaJson 示例
- `web/pages/website/article/list.vue` — 增加 tagGroup 筛选
- 同上 product/case/faq/tutorial/compliance/download 的 edit.vue + list.vue
- `web/pages/website/seo-config/edit.vue` — 多个 JSON 字段示例
- `web/pages/website/brand-info/edit.vue` — socialLinks 示例
- `web/pages/website/tutorial/edit.vue` — steps 示例
- `web/pages/website/knowledge-entity/edit.vue` — sameAs/properties 示例

**文档：**
- `basic/docs/admin-manual.md` — 增加"标签与 SEO 关系说明"章节

---

## Task 1: 启用 Strapi i18n 插件 + 配置 zh-CN locale

**Files:**
- Modify: `basic/config/plugins.ts`

- [ ] **Step 1: 在 config/plugins.ts 顶部增加 i18n 插件配置**

在 `config/plugins.ts` 的 config 函数返回对象**最顶部**（zhao-auth 之前）插入 i18n 配置：

```ts
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    i18n: {
        enabled: true,
        config: {
            defaultLocale: "zh-CN",
            locales: [
                { code: "zh-CN", name: "中文 (简体)" },
            ],
        },
    },
    "zhao-auth": {
        // ... 原有配置不动
```

- [ ] **Step 2: 重启 Strapi 后端验证 i18n 启用**

Run: `cd basic && npm run dev`
Expected: 启动日志无报错；Strapi Admin → Settings → Internationalization 可见 zh-CN locale

- [ ] **Step 3: 提交**

```bash
cd basic
git add config/plugins.ts
git commit -m "feat(config): 启用 Strapi i18n 插件并配置 zh-CN 默认 locale"
```

---

## Task 2: zhao-tag schema 改动（tag + tag-group 加 i18n + site）

**Files:**
- Modify: `basic/plugins/zhao-tag/server/src/content-types/tag/schema.json`
- Modify: `basic/plugins/zhao-tag/server/src/content-types/tag-group/schema.json`
- Modify: `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json`

### 2.1 tag schema

- [ ] **Step 1: tag/schema.json 顶层加 pluginOptions.i18n**

在 `tag/schema.json` 的 `options` 字段之后、`attributes` 之前插入：

```json
"pluginOptions": {
  "i18n": { "localized": true }
},
```

- [ ] **Step 2: tag/schema.json 标记 name/slug/description 为 localized**

将 `name` / `slug` / `description` 三个字段各增加 `"localized": true`：

```json
"name": {
  "type": "string",
  "required": true,
  "localized": true
},
"slug": {
  "type": "uid",
  "targetField": "name",
  "required": false,
  "localized": true
},
"description": {
  "type": "text",
  "localized": true
},
```

- [ ] **Step 3: tag/schema.json 在 isPublic 字段之后增加 site 关联**

在 `isPublic` 字段之后、`indexes` 字段之前插入：

```json
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "inversedBy": "tags"
},
```

### 2.2 tag-group schema

- [ ] **Step 4: tag-group/schema.json 顶层加 pluginOptions.i18n**

同 Step 1，在 `tag-group/schema.json` 的 `options` 之后插入：

```json
"pluginOptions": {
  "i18n": { "localized": true }
},
```

- [ ] **Step 5: tag-group/schema.json 标记 name/slug/description 为 localized**

```json
"name": {
  "type": "string",
  "required": true,
  "localized": true
},
"slug": {
  "type": "uid",
  "targetField": "name",
  "required": false,
  "localized": true
},
"description": {
  "type": "text",
  "localized": true
},
```

- [ ] **Step 6: tag-group/schema.json 在 sort 字段之后增加 isPublic + site 字段**

在 `sort` 字段之后、`parent` 字段之前插入：

```json
"isPublic": {
  "type": "boolean",
  "default": true
},
"site": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::zhao-common.site-config",
  "inversedBy": "tagGroups"
},
```

### 2.3 site-config 增加 inversedBy

- [ ] **Step 7: site-config/schema.json 增加 tags / tagGroups 反向关系**

在 `site-config/schema.json` 的 `channelUsage` 字段之后（attributes 末尾）增加：

```json
"tags": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-tag.tag",
  "mappedBy": "site"
},
"tagGroups": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "plugin::zhao-tag.tag-group",
  "mappedBy": "site"
}
```

- [ ] **Step 8: 重启 Strapi 验证 schema 生效**

Run: `cd basic && npm run dev`
Expected: 启动日志无报错；Strapi Admin → Content-Type Builder 可见 tag/tag-group 含 i18n 标识与 site 关联字段

- [ ] **Step 9: 提交**

```bash
cd basic
git add plugins/zhao-tag/server/src/content-types/tag/schema.json \
        plugins/zhao-tag/server/src/content-types/tag-group/schema.json \
        plugins/zhao-common/server/src/content-types/site-config/schema.json
git commit -m "feat(zhao-tag): tag/tag-group 启用 i18n + site 关联 + isPublic 双字段"
```

---

## Task 3: zhao-website 9 个 CT schema 加 i18n

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/content-types/article/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/product/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/case/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/faq/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/tutorial/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/compliance/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/download/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/article-category/schema.json`
- Modify: `basic/plugins/zhao-website/server/src/content-types/brand-info/schema.json`

**统一改动模式：** 每个 schema.json 顶层在 `options` 之后插入：
```json
"pluginOptions": {
  "i18n": { "localized": true },
  "content-manager": { "visible": true },
  "content-type-builder": { "visible": false }
},
```
（注意：article-category / brand-info 已有 content-manager/content-type-builder pluginOptions，需要合并为同一 pluginOptions 对象，不要重复定义）

- [ ] **Step 1: article/schema.json 改动**

pluginOptions 顶层加 i18n（已有 content-manager + content-type-builder，合并）：
```json
"pluginOptions": {
  "i18n": { "localized": true },
  "content-manager": { "visible": true },
  "content-type-builder": { "visible": false }
},
```

字段 localized：title / slug / excerpt / content / seoTitle / seoDescription / seoKeywords / canonicalUrl / ogTitle / ogDescription / schemaJson

- [ ] **Step 2: product/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：name / slug / tagline / description / content / features / specifications / seoTitle / seoDescription / seoKeywords

- [ ] **Step 3: case/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：title / slug / clientName / clientDescription / challenge / solution / results / testimonial / seoTitle / seoDescription

- [ ] **Step 4: faq/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：question / answer（slug 是 uid 不 localized；seo* 字段实际不存在，跳过）

- [ ] **Step 5: tutorial/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：title / slug / description / steps / result

- [ ] **Step 6: compliance/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：title / slug / content / seoTitle / seoDescription

- [ ] **Step 7: download/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：name / description（slug/seo* 实际不存在，跳过）

- [ ] **Step 8: article-category/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：name / slug / description / seoTitle / seoDescription

- [ ] **Step 9: brand-info/schema.json 改动**

pluginOptions 加 i18n（合并到现有 pluginOptions）

字段 localized：companyName / shortName / slogan / description / registeredAddress / officeAddress / businessScope

- [ ] **Step 10: 重启 Strapi 验证所有 CT 启用 i18n**

Run: `cd basic && npm run dev`
Expected: 启动无报错；Strapi Admin → Content-Type Builder 可见 9 个 CT 均含 i18n 标识

- [ ] **Step 11: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/content-types/
git commit -m "feat(zhao-website): 9 个 CT 启用 i18n 并标记核心字段 localized"
```

---

## Task 4: zhao-tag service 校验 isPublic+site + controller site 筛选

**Files:**
- Modify: `basic/plugins/zhao-tag/server/src/services/tag.ts`
- Modify: `basic/plugins/zhao-tag/server/src/services/tag-group.ts`
- Modify: `basic/plugins/zhao-tag/server/src/controllers/tag.ts`
- Modify: `basic/plugins/zhao-tag/server/src/controllers/tag-group.ts`

- [ ] **Step 1: tag service 增加 isPublic+site 合法性校验**

在 `services/tag.ts` 的 `create` 方法中，在 `strapi.documents(UID).create` 之前插入校验：

```ts
async create(data: any) {
  validatePublicSite(data);
  return strapi.documents(UID).create({
    data,
    populate: { parent: true, children: true, icon: true, tagGroup: true, site: true },
  });
},

async update(documentId: string, data: any) {
  validatePublicSite(data);
  return strapi.documents(UID).update({
    documentId,
    data,
    populate: { parent: true, children: true, icon: true, tagGroup: true, site: true },
  });
},
```

在文件顶部（UID 声明之后）增加校验函数：

```ts
function validatePublicSite(data: any) {
  if (data.isPublic === true && data.site) {
    const e: any = new Error("公共标签不能关联站点");
    e.status = 400;
    throw e;
  }
  if (data.isPublic === false && !data.site) {
    const e: any = new Error("站点标签必须关联站点");
    e.status = 400;
    throw e;
  }
}
```

- [ ] **Step 2: tag service find 增加 siteId/isPublic 筛选**

修改 `services/tag.ts` 的 `find` 方法：

1. 在解构 query 时增加 `siteId, isPublic`：
```ts
const { filters, populate, sort, pagination, fields, locale, siteId, isPublic } = query;
```

2. 在原有 `let effectiveFilters = { ...filters };`（第 14 行附近）之后、`tagGroupFilter` 处理之前，插入 siteId/isPublic 筛选逻辑：
```ts
  // siteId 筛选：返回公共标签 + 本站标签
  if (siteId) {
    const knex = strapi.db.connection;
    const siteRow = await knex('zhao_site_configs').where('document_id', siteId).first();
    const siteNumericId = siteRow?.id;
    if (siteNumericId) {
      effectiveFilters.$or = [
        { isPublic: true },
        { site: siteNumericId },
      ];
    }
  }

  // isPublic 显式筛选
  if (isPublic !== undefined) {
    effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
  }
```

注意：不要重复声明 `effectiveFilters`，在原有声明之后插入即可。原有 `tagGroupFilter` 逻辑保持不变（在 effectiveFilters 上继续操作）。

- [ ] **Step 3: tag-group service 同步增加校验与筛选**

在 `services/tag-group.ts` 顶部增加同样的 `validatePublicSite` 函数（复制粘贴），并修改 create/update：

```ts
async create(data: any) {
  validatePublicSite(data);
  return strapi.documents(UID).create({
    data,
    populate: { parent: true, children: true, icon: true, site: true },
  });
},

async update(documentId: string, data: any) {
  validatePublicSite(data);
  return strapi.documents(UID).update({
    documentId,
    data,
    populate: { parent: true, children: true, icon: true, site: true },
  });
},
```

在 `find` 方法中增加 siteId/isPublic 筛选（同 Step 2 逻辑）：

```ts
async find(query: any = {}) {
  const { filters, populate, sort, pagination, fields, locale, siteId, isPublic } = query;
  // ...
  let effectiveFilters = { ...(filters || {}) };

  if (siteId) {
    const knex = strapi.db.connection;
    const siteRow = await knex('zhao_site_configs').where('document_id', siteId).first();
    const siteNumericId = siteRow?.id;
    if (siteNumericId) {
      effectiveFilters.$or = [
        { isPublic: true },
        { site: siteNumericId },
      ];
    }
  }

  if (isPublic !== undefined) {
    effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
  }

  const docParams: any = {
    filters: effectiveFilters,
    // ... 其余原样
  };
```

- [ ] **Step 4: tag controller find 透传 siteId/isPublic**

`controllers/tag.ts` 的 `find` 方法已通过 `ctx.query` 透传到 service，**无需修改**（siteId/isPublic 会随 ctx.query 传入 service.find）。验证现有代码：

```ts
async find(ctx: any) {
  try {
    ctx.body = wrapList(await strapi.plugin("zhao-tag").service("tag").find(ctx.query));
  } catch (err) { /* ... */ }
},
```

`ctx.query` 自动包含 siteId/isPublic，service 已在 Step 2 解构。无需改动 controller。

- [ ] **Step 5: tag-group controller 同样无需修改**

`controllers/tag-group.ts` 的 `find` 方法同样通过 `ctx.query` 透传，无需改动。

- [ ] **Step 6: 重新编译 zhao-tag 插件**

Run: `cd basic/plugins/zhao-tag && npm run build`
Expected: dist/server/index.js 与 index.mjs 包含 validatePublicSite 函数与 siteId 筛选逻辑

- [ ] **Step 7: 重启 Strapi 验证校验生效**

Run: `cd basic && npm run dev`

测试用例（手动 curl 或在 Strapi Admin 触发）：
- 创建 isPublic=true 且 site=<某 site> 的 tag → 应返回 400 "公共标签不能关联站点"
- 创建 isPublic=false 且 site=null 的 tag → 应返回 400 "站点标签必须关联站点"
- 创建 isPublic=true 且 site=null 的 tag → 应成功
- list 接口带 `?siteId=<documentId>` → 应返回公共 + 本站标签

- [ ] **Step 8: 提交**

```bash
cd basic
git add plugins/zhao-tag/server/src/services/tag.ts \
        plugins/zhao-tag/server/src/services/tag-group.ts
git commit -m "feat(zhao-tag): service 增加 isPublic+site 校验与 siteId 筛选"
```

---

## Task 5: zhao-website 7 CT populate tags.tagGroup + tagGroup 筛选

**Files:**
- Modify: `basic/plugins/zhao-website/server/src/services/article.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/product.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/case.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/faq.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/tutorial.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/compliance.ts`
- Modify: `basic/plugins/zhao-website/server/src/services/download.ts`

**统一改动模式：** 7 个 service 的 `findAdmin` / `findOneAdmin` 方法中，将 `populate: ["tags"]` 改为 `populate: ["tags", "tags.tagGroup"]`，并在 `findAdmin` 中解析 `tagGroup` query 参数。

**Controller 无需修改：** 7 个 CT 的 admin-api controller（如 `article.ts`）已通过 `ctx.query` 透传到 `service.findAdmin(siteId, ctx.query)`，`tagGroup` 参数会随 query 传入 service，无需改动 controller 代码。

- [ ] **Step 1: article service 改动**

在 `services/article.ts` 的 `findAdmin` 方法中：

```ts
async findAdmin(siteId: number, query: any = {}) {
  const { page = 1, pageSize = 20, status, category, tagGroup } = query;
  const filters: any = { site: siteId, deletedAt: null };
  if (status) filters.status = status;
  if (category) filters.category = category;

  // tagGroup 筛选：knex 查 join 表拿 article_id 列表
  let tagGroupFilter = false;
  let articleIdScope: number[] | null = null;
  if (tagGroup) {
    const knex = strapi.db.connection;
    const groupRow = await knex('zhao_tag_groups').where('slug', tagGroup).first()
      || await knex('zhao_tag_groups').where('document_id', tagGroup).first();
    if (groupRow?.id) {
      const tagRows = await knex('zhao_tags_tag_group_lnk').where('tag_group_id', groupRow.id).select('tag_id');
      const tagIds = tagRows.map((r: any) => r.tag_id);
      if (tagIds.length > 0) {
        const articleRows = await knex('zhao_website_articles_tags_lnk')
          .whereIn('tag_id', tagIds).select('article_id');
        articleIdScope = [...new Set(articleRows.map((r: any) => r.article_id))];
        if (articleIdScope.length === 0) return [];
        filters.id = { $in: articleIdScope };
      } else {
        return [];
      }
    }
  }

  return strapi.db.query(UID).findMany({
    where: filters,
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
    orderBy: { updatedAt: "DESC" },
    populate: ["coverImage", "category", "tags", "tags.tagGroup"],
  });
},

async findOneAdmin(siteId: number, documentId: string) {
  return strapi.db.query(UID).findOne({
    where: { site: siteId, documentId, deletedAt: null },
    populate: ["coverImage", "category", "tags", "tags.tagGroup", "mainEntity", "mentionedEntities",
               "ogImage", "sourceArticleDraft", "structuredData"],
  });
},
```

- [ ] **Step 2: product service 改动**

同样模式应用到 `services/product.ts` 的 `findAdmin` / `findOneAdmin`。join 表名：
- tag→tag_group：`zhao_tags_tag_group_lnk`（tag_id, tag_group_id）
- product→tag：`zhao_website_products_tags_lnk`（product_id, tag_id）

populate 列表：`["coverImage", "category", "tags", "tags.tagGroup", "mainEntity", "images", "mentionedEntities", "ogImage"]`

- [ ] **Step 3: case service 改动**

`services/case.ts`，case→tag join 表：`zhao_website_cases_tags_lnk`（case_id, tag_id）

populate：`["coverImage", "clientLogo", "images", "tags", "tags.tagGroup", "mainEntity", "mentionedEntities", "relatedProducts"]`

- [ ] **Step 4: faq service 改动**

`services/faq.ts`，faq→tag join 表：`zhao_website_faqs_tags_lnk`（faq_id, tag_id）

populate：`["category", "tags", "tags.tagGroup", "mainEntity", "mentionedEntities"]`

- [ ] **Step 5: tutorial service 改动**

`services/tutorial.ts`，tutorial→tag join 表：`zhao_website_tutorials_tags_lnk`（tutorial_id, tag_id）

populate：`["coverImage", "category", "tags", "tags.tagGroup", "mainEntity", "mentionedEntities"]`

- [ ] **Step 6: compliance service 改动**

`services/compliance.ts`，compliance→tag join 表：`zhao_website_compliances_tags_lnk`（compliance_id, tag_id）

populate：`["tags", "tags.tagGroup"]`

- [ ] **Step 7: download service 改动**

`services/download.ts`，download→tag join 表：`zhao_website_downloads_tags_lnk`（download_id, tag_id）

populate：`["file", "category", "tags", "tags.tagGroup"]`

- [ ] **Step 8: 重新编译 zhao-website 插件**

Run: `cd basic/plugins/zhao-website && npm run build`
Expected: dist 包含 tagGroup 筛选与 populate tags.tagGroup

- [ ] **Step 9: 重启 Strapi 验证**

Run: `cd basic && npm run dev`

测试：调用 `/api/zhao-website/v1/admin/articles?tagGroup=industry` → 返回的 article 列表中 tags 应包含 tagGroup 对象；带 `?tagGroup=<不存在>` → 返回空数组

- [ ] **Step 10: 提交**

```bash
cd basic
git add plugins/zhao-website/server/src/services/article.ts \
        plugins/zhao-website/server/src/services/product.ts \
        plugins/zhao-website/server/src/services/case.ts \
        plugins/zhao-website/server/src/services/faq.ts \
        plugins/zhao-website/server/src/services/tutorial.ts \
        plugins/zhao-website/server/src/services/compliance.ts \
        plugins/zhao-website/server/src/services/download.ts
git commit -m "feat(zhao-website): 7 CT service populate tags.tagGroup + tagGroup 筛选"
```

---

## Task 6: web 前端 tag.js API + TagSelector + JsonExampleBlock 组件

**Files:**
- Modify: `web/src/api/tag.js`
- Create: `web/src/components/TagSelector.vue`
- Create: `web/src/components/JsonExampleBlock.vue`

### 6.1 tag.js API 扩展

- [ ] **Step 1: tag.js 增加 listBySite / listPublic / listTagGroups 方法**

在 `web/src/api/tag.js` 的"标签管理"区块，`getTagList` 之后增加：

```js
export function getTagListBySite(siteId, params = {}) {
  return get(`${ADMIN}/tags`, { ...params, siteId }).then(extractList)
}

export function getPublicTagListAdmin(params = {}) {
  return get(`${ADMIN}/tags`, { ...params, isPublic: true }).then(extractList)
}

export function getTagGroupListBySite(siteId, params = {}) {
  return get(`${ADMIN}/tag-groups`, { ...params, siteId }).then(extractList)
}
```

### 6.2 TagSelector 组件

- [ ] **Step 2: 创建 TagSelector.vue**

`web/src/components/TagSelector.vue`：基于现有 TagPicker.vue 改造，核心差异：
- 接收 `siteId` prop（用于筛选公共 + 本站标签）
- 标签项显示公共/站点徽章（`tag.isPublic` → "公共" 徽章；否则 → "站点" 徽章）
- v-model 绑定已选 tag documentId 数组（而非 tag 对象数组）

```vue
<template>
  <view class="tag-selector">
    <view class="selector-trigger" @click="openPicker">
      <view v-if="selectedTags.length === 0" class="placeholder">请选择标签</view>
      <view v-else class="selected-list">
        <view v-for="tag in selectedTags" :key="tag.documentId" class="selected-chip">
          <text class="chip-name">{{ tag.name }}</text>
          <text class="chip-badge" :class="{ public: tag.isPublic, site: !tag.isPublic }">
            {{ tag.isPublic ? '公共' : '站点' }}
          </text>
          <text class="chip-remove" @click.stop="removeTag(tag)">×</text>
        </view>
      </view>
    </view>

    <!-- 复用 TagPicker 的弹层结构 -->
    <TagPicker
      :visible="pickerVisible"
      :selected="selectedTags"
      :siteId="siteId"
      @select="handleSelect"
      @update:visible="pickerVisible = $event"
    />
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TagPicker from './TagPicker.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // tag documentId 数组
  siteId: { type: String, default: null },
  label: { type: String, default: '标签' },
})
const emit = defineEmits(['update:modelValue'])

const pickerVisible = ref(false)
const selectedTags = ref([]) // 完整 tag 对象数组（含 name/isPublic/documentId）

watch(() => props.modelValue, async (newVal) => {
  // modelValue 是 documentId 数组；若 selectedTags 已对齐则跳过
  const currentIds = selectedTags.value.map(t => t.documentId)
  if (JSON.stringify(currentIds) === JSON.stringify(newVal)) return
  // 这里简化处理：仅同步 ID，完整对象由 picker 返回时填充
}, { immediate: true })

function openPicker() {
  pickerVisible.value = true
}

function handleSelect(tags) {
  selectedTags.value = tags
  emit('update:modelValue', tags.map(t => t.documentId))
}

function removeTag(tag) {
  selectedTags.value = selectedTags.value.filter(t => t.documentId !== tag.documentId)
  emit('update:modelValue', selectedTags.value.map(t => t.documentId))
}
</script>

<style scoped>
.tag-selector { width: 100%; }
.selector-trigger {
  min-height: 72rpx;
  padding: 12rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  align-items: center;
}
.placeholder { color: #999; font-size: 28rpx; }
.selected-list { display: flex; flex-wrap: wrap; gap: 8rpx; }
.selected-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  background: #e3f2fd;
  border-radius: 16rpx;
  font-size: 24rpx;
}
.chip-name { color: #1989fa; }
.chip-badge {
  font-size: 18rpx;
  padding: 1rpx 8rpx;
  border-radius: 4rpx;
}
.chip-badge.public { background: #fff3e0; color: #faad14; }
.chip-badge.site { background: #e8f5e9; color: #07c160; }
.chip-remove { color: #999; margin-left: 4rpx; }
</style>
```

**注意：** 现有 TagPicker.vue 需要 minor 改动以支持 `siteId` prop（在 `loadTags` 时透传到 API）。在 Step 3 中处理。

- [ ] **Step 3: TagPicker.vue 增加 siteId prop 透传**

修改 `web/src/components/TagPicker.vue` 的 `defineProps` 增加 `siteId`：

```js
const props = defineProps({
  visible: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  defaultGroupId: { type: String, default: null },
  defaultGroupName: { type: String, default: null },
  mode: { type: String, default: 'all' },
  siteId: { type: String, default: null }, // 新增
})
```

在 `loadTags` 函数中透传 siteId：

```js
async function loadTags(append = false) {
  loadingTags.value = true
  try {
    const params = {
      page: tagPagination.value.page,
      pageSize: tagPagination.value.pageSize,
    }
    if (props.siteId) {
      params.siteId = props.siteId
    }
    if (selectedGroupId.value) {
      params['filters[tagGroup][documentId][$eq]'] = selectedGroupId.value
    }
    // ... 其余原样
```

同时在 `loadGroups` 中也透传 siteId（使用新的 `getTagGroupListBySite`）：

```js
async function loadGroups() {
  try {
    const result = props.siteId
      ? await getTagGroupListBySite(props.siteId, { pageSize: 200 })
      : await getTagGroupList({ pageSize: 200 })
    // ... 其余原样
```

并在 import 中补充：

```js
import { getTagList, getTagGroupList, getTagGroupListBySite, createTag, createTagGroup } from '../api/tag.js'
```

- [ ] **Step 4: tag-item 显示公共/站点徽章**

修改 TagPicker.vue 的 tag-item 模板，在 `tag-group-label` 之后增加：

```vue
<text v-if="tag.isPublic" class="tag-badge public">公共</text>
<text v-else class="tag-badge site">站点</text>
```

并在 `<style scoped>` 增加样式：

```css
.tag-badge {
  font-size: 18rpx;
  padding: 1rpx 8rpx;
  border-radius: 4rpx;
}
.tag-badge.public { background: #fff3e0; color: #faad14; }
.tag-badge.site { background: #e8f5e9; color: #07c160; }
```

### 6.3 JsonExampleBlock 组件

- [ ] **Step 5: 创建 JsonExampleBlock.vue**

`web/src/components/JsonExampleBlock.vue`：

```vue
<template>
  <view class="json-example-block">
    <view class="example-header">
      <text class="example-label">{{ fieldLabel }} 示例</text>
      <button class="btn-fill" @click="handleFill">填入示例</button>
    </view>
    <view class="example-content">
      <text class="example-text">{{ exampleJson }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  fieldLabel: { type: String, default: '' },
  exampleJson: { type: String, default: '' },
  fieldName: { type: String, default: '' },
})
const emit = defineEmits(['fill'])

function handleFill() {
  emit('fill', { fieldName: props.fieldName, exampleJson: props.exampleJson })
}
</script>

<style scoped>
.json-example-block {
  margin-top: 12rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border: 1rpx dashed #ddd;
  border-radius: 8rpx;
}
.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.example-label {
  font-size: 24rpx;
  color: #666;
}
.btn-fill {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 0 20rpx;
  height: 48rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  line-height: 48rpx;
}
.example-content {
  background: #fff;
  padding: 12rpx;
  border-radius: 6rpx;
  max-height: 200rpx;
  overflow-y: auto;
}
.example-text {
  font-size: 22rpx;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
}
</style>
```

- [ ] **Step 6: 提交**

```bash
cd e:/code
git add web/src/api/tag.js web/src/components/TagSelector.vue web/src/components/JsonExampleBlock.vue web/src/components/TagPicker.vue
git commit -m "feat(web): 新增 TagSelector/JsonExampleBlock 组件 + tag API listBySite"
```

---

## Task 7: web 7 CT edit 集成 TagSelector + list 增加 tagGroup 筛选

**Files:**
- Modify: `web/pages/website/article/edit.vue`
- Modify: `web/pages/website/article/list.vue`
- Modify: `web/pages/website/product/edit.vue`
- Modify: `web/pages/website/product/list.vue`
- Modify: `web/pages/website/case/edit.vue`
- Modify: `web/pages/website/case/list.vue`
- Modify: `web/pages/website/faq/edit.vue`
- Modify: `web/pages/website/faq/list.vue`
- Modify: `web/pages/website/tutorial/edit.vue`
- Modify: `web/pages/website/tutorial/list.vue`
- Modify: `web/pages/website/compliance/edit.vue`
- Modify: `web/pages/website/compliance/list.vue`
- Modify: `web/pages/website/download/edit.vue`
- Modify: `web/pages/website/download/list.vue`

**统一改动模式（edit）：** 替换原有 `tagsInput`（逗号分隔字符串）为 `<TagSelector v-model="form.tags" :siteId="siteId" />`

**统一改动模式（list）：** 在筛选区增加 tagGroup picker

- [ ] **Step 1: article edit 集成 TagSelector**

修改 `web/pages/website/article/edit.vue`：

1. 模板中替换"标签（逗号分隔）"的 input 为：
```vue
<view class="form-item">
  <text class="form-label">标签</text>
  <TagSelector v-model="form.tags" :siteId="siteId" label="标签" />
</view>
```

2. script 中：
```js
import TagSelector from '../../../src/components/TagSelector.vue'
// 删除 tagsInput ref 与 parseTags 函数
// form.tags 改为存储 documentId 数组（默认 []）
// loadDetail 中：form.value.tags = (item.tags || []).map(t => t.documentId)
// handleSubmit 中：payload.tags = form.value.tags（已是 documentId 数组）
```

3. 增加 siteId：
```js
import { useUserStore } from '../../../src/store/user.js'
const userStore = useUserStore()
const siteId = computed(() => userStore.currentSite?.documentId || '')
```

4. 删除 `tagsInput` ref、`parseTags` 函数及相关引用

- [ ] **Step 2: article list 增加 tagGroup 筛选**

修改 `web/pages/website/article/list.vue`：

1. 模板中在 `filter-row` 内增加 tagGroup picker：
```vue
<picker mode="selector" :range="tagGroupOptions" @change="handleTagGroupChange">
  <view class="filter-item">
    <text>{{ tagGroupOptions[tagGroupIndex] }}</text>
    <text class="arrow">▼</text>
  </view>
</picker>
```

2. script 中：
```js
import { getTagGroupList } from '../../../src/api/tag.js'

const tagGroupList = ref([])
const tagGroupIndex = ref(0)
const tagGroupOptions = computed(() => ['全部分组', ...tagGroupList.value.map(g => g.name)])

// onShow 中加载 tagGroups
async function loadTagGroups() {
  try {
    const { list } = await getTagGroupList({ pageSize: 100 })
    tagGroupList.value = list
  } catch (e) { /* ignore */ }
}

function handleTagGroupChange(e) {
  tagGroupIndex.value = e.detail.value
  loadData(1)
}

// loadData 中增加 tagGroup 参数
async function loadData(page = 1) {
  // ...
  if (tagGroupIndex.value > 0) {
    const group = tagGroupList.value[tagGroupIndex.value - 1]
    if (group?.slug) params.tagGroup = group.slug
  }
  // ...
}

onShow(() => {
  loadTagGroups()
  loadData(1)
})
```

- [ ] **Step 3-8: product / case / faq / tutorial / compliance / download 重复 Step 1+2 模式**

对每个 CT 的 edit.vue 与 list.vue 应用相同的改动模式：
- edit：替换 tagsInput 为 TagSelector，form.tags 存 documentId 数组
- list：增加 tagGroup picker + loadTagGroups + handleTagGroupChange + loadData 透传 tagGroup

注意 faq/tutorial/compliance/download 的 list.vue 可能结构略有不同，按实际结构调整 picker 位置。

- [ ] **Step 9: 验证前端编译**

Run: `cd web && npm run dev`
Expected: 无编译错误；访问 article edit 页可见 TagSelector；访问 article list 页可见 tagGroup 筛选器

- [ ] **Step 10: 提交**

```bash
cd e:/code
git add web/pages/website/article/ web/pages/website/product/ web/pages/website/case/ \
        web/pages/website/faq/ web/pages/website/tutorial/ web/pages/website/compliance/ \
        web/pages/website/download/
git commit -m "feat(web): 7 CT edit 集成 TagSelector + list 增加 tagGroup 筛选"
```

---

## Task 8: web JSON 字段示例填充集成

**Files:**
- Modify: `web/pages/website/article/edit.vue`（schemaJson）
- Modify: `web/pages/website/product/edit.vue`（features, specifications）
- Modify: `web/pages/website/seo-config/edit.vue`（alternateLocales, schemaSameAs, schemaContactPoint, sitemapExcludeTypes, extraConfig）
- Modify: `web/pages/website/brand-info/edit.vue`（socialLinks）
- Modify: `web/pages/website/tutorial/edit.vue`（steps）
- Modify: `web/pages/website/knowledge-entity/edit.vue`（sameAs, properties）

**统一改动模式：** 在每个 JSON 字段的 textarea 下方增加 `<JsonExampleBlock>`，并实现 `handleFillExample` 方法。

- [ ] **Step 1: article edit 增加 schemaJson 示例**

在 `article/edit.vue` 的 schemaJson form-item 之后增加：

```vue
<JsonExampleBlock
  fieldLabel="结构化数据"
  fieldName="schemaJson"
  :exampleJson="articleSchemaJsonExample"
  @fill="handleFillExample"
/>
```

script 中增加：

```js
import JsonExampleBlock from '../../../src/components/JsonExampleBlock.vue'

const articleSchemaJsonExample = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "image": ["https://example.com/photos/1x1/photo.jpg"],
  "datePublished": "2026-01-01",
  "dateModified": "2026-01-01",
  "author": { "@type": "Person", "name": "作者名" },
  "publisher": {
    "@type": "Organization",
    "name": "公司名",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.jpg" }
  },
  "description": "文章摘要"
}, null, 2)

function handleFillExample({ fieldName, exampleJson }) {
  if (form.value[fieldName] && form.value[fieldName].trim()) {
    uni.showModal({
      title: '确认覆盖',
      content: `字段「${fieldName}」已有内容，确定用示例覆盖吗？`,
      success: (res) => {
        if (res.confirm) {
          form.value[fieldName] = exampleJson
          uni.showToast({ title: '已填入示例', icon: 'success' })
        }
      }
    })
  } else {
    form.value[fieldName] = exampleJson
    uni.showToast({ title: '已填入示例', icon: 'success' })
  }
}
```

- [ ] **Step 2: product edit 增加 features + specifications 示例**

在 `product/edit.vue` 中增加两个 JsonExampleBlock：

```vue
<!-- features 字段下方 -->
<JsonExampleBlock
  fieldLabel="产品特性"
  fieldName="features"
  :exampleJson="productFeaturesExample"
  @fill="handleFillExample"
/>

<!-- specifications 字段下方 -->
<JsonExampleBlock
  fieldLabel="规格参数"
  fieldName="specifications"
  :exampleJson="productSpecExample"
  @fill="handleFillExample"
/>
```

script：

```js
const productFeaturesExample = JSON.stringify([
  { "icon": "⚡", "title": "高性能", "description": "毫秒级响应" },
  { "icon": "🔒", "title": "安全可靠", "description": "金融级加密" },
  { "icon": "📱", "title": "多端适配", "description": "PC/移动/小程序" }
], null, 2)

const productSpecExample = JSON.stringify([
  { "label": "版本", "value": "企业版" },
  { "label": "授权方式", "value": "年付订阅" },
  { "label": "用户数", "value": "不限" },
  { "label": "存储空间", "value": "100GB" }
], null, 2)
```

（handleFillExample 函数与 Step 1 相同，复制到 product edit 的 script 中）

- [ ] **Step 3: seo-config edit 增加 5 个 JSON 字段示例**

在 `seo-config/edit.vue` 中为以下字段各增加一个 JsonExampleBlock：
- `alternateLocales`：`["en-US", "ja-JP", "ko-KR"]`
- `schemaSameAs`：社交链接数组（见 spec 5.2）
- `schemaContactPoint`：ContactPoint 数组（见 spec 5.2）
- `sitemapExcludeTypes`：`["visit-log", "search-log", "interaction"]`
- `extraConfig`：`{ "cacheTTL": 3600, "enableBrotli": true, "cdnPurgeOnPublish": true }`

每个字段下方一个 JsonExampleBlock，共用同一个 `handleFillExample` 函数。

- [ ] **Step 4: brand-info edit 增加 socialLinks 示例**

在 `brand-info/edit.vue` 的 socialLinks 字段下方增加：

```vue
<JsonExampleBlock
  fieldLabel="社交链接"
  fieldName="socialLinks"
  :exampleJson="socialLinksExample"
  @fill="handleFillExample"
/>
```

```js
const socialLinksExample = JSON.stringify({
  "wechat": { "qrcode": "https://example.com/wechat-qr.png", "accountId": "gh_xxxx" },
  "weibo": { "url": "https://weibo.com/your-company", "label": "官方微博" },
  "douyin": { "url": "https://douyin.com/user/your-company", "label": "抖音" },
  "linkedin": { "url": "https://linkedin.com/company/your-company", "label": "LinkedIn" },
  "github": { "url": "https://github.com/your-company", "label": "GitHub" }
}, null, 2)
```

- [ ] **Step 5: tutorial edit 增加 steps 示例**

在 `tutorial/edit.vue` 的 steps 字段下方增加：

```js
const tutorialStepsExample = JSON.stringify([
  {
    "title": "步骤一：登录系统",
    "description": "使用管理员账号登录后台",
    "image": "https://example.com/step1.png",
    "tip": "默认账号 admin/admin"
  },
  {
    "title": "步骤二：进入配置页",
    "description": "点击左侧菜单「系统设置」",
    "image": "https://example.com/step2.png"
  },
  {
    "title": "步骤三：保存配置",
    "description": "填写完成后点击「保存」按钮",
    "tip": "保存后立即生效"
  }
], null, 2)
```

- [ ] **Step 6: knowledge-entity edit 增加 sameAs + properties 示例**

在 `knowledge-entity/edit.vue` 中：

```js
const sameAsExample = JSON.stringify([
  "https://zh.wikipedia.org/wiki/你的公司",
  "https://www.crunchbase.com/organization/your-company"
], null, 2)

const propertiesExample = JSON.stringify({
  "foundingDate": "2015-01-01",
  "foundingLocation": "北京",
  "numberOfEmployees": "50-200",
  "naics": "541511",
  "isicV4": "6201"
}, null, 2)
```

- [ ] **Step 7: 验证所有 JSON 示例填充功能**

Run: `cd web && npm run dev`

逐个页面验证：
- article edit → schemaJson 示例按钮 → 空字段直接填入，有内容弹确认框
- product edit → features / specifications 示例
- seo-config edit → 5 个 JSON 字段示例
- brand-info edit → socialLinks 示例
- tutorial edit → steps 示例
- knowledge-entity edit → sameAs / properties 示例

- [ ] **Step 8: 提交**

```bash
cd e:/code
git add web/pages/website/article/edit.vue web/pages/website/product/edit.vue \
        web/pages/website/seo-config/edit.vue web/pages/website/brand-info/edit.vue \
        web/pages/website/tutorial/edit.vue web/pages/website/knowledge-entity/edit.vue
git commit -m "feat(web): 6 CT edit 页集成 JsonExampleBlock 一键填充示例"
```

---

## Task 9: admin-manual.md 增加 SEO 与标签关系说明

**Files:**
- Modify: `basic/docs/admin-manual.md`

- [ ] **Step 1: 在 admin-manual.md 适当位置增加"标签与 SEO 关系"章节**

在"标签管理"章节之后插入：

```markdown
## 标签与 SEO 关系说明

官网中心的内容支持两种 SEO 关键词来源：

### 1. 自动模式（推荐）

从关联标签的 slug 自动生成 meta keywords。

- **渲染逻辑：** `meta keywords = tags.map(t => t.slug).join(',')`
- **适用场景：** 常规内容（文章、产品、案例等）
- **优点：** 无需手动维护关键词，标签变更自动同步

### 2. 手动覆盖模式

填写内容的 `seoKeywords` 字段。

- **渲染逻辑：** `meta keywords = seoKeywords || tags.map(t => t.slug).join(',')`
- **适用场景：** 着陆页、营销活动页等需要精确控制关键词的页面
- **优点：** 灵活覆盖自动模式

### 标签的 SEO 价值

| 字段 | SEO 作用 | 建议 |
|---|---|---|
| `tag.slug` | SEO 关键词载体 | 建议英文/拼音，避免中文 |
| `tag-group` | 语义化分组，用于 URL 结构与面包屑 | 如"解决方案/行业/产品线" |
| `tag.isPublic` | 公共标签跨站复用，站点标签仅本站可见 | admin 创建公共标签，站点管理员创建站点标签 |

### 公共标签 vs 站点标签

- **公共标签**（`isPublic=true` 且 `site=null`）：由 admin 创建，所有租户共享，适合通用分类（如"行业资讯"）
- **站点标签**（`isPublic=false` 且 `site=<某站点>`）：由站点管理员创建，仅本站可见，适合站点特色内容

非法组合（`isPublic=true` 且 `site=<某站点>`，或 `isPublic=false` 且 `site=null`）会被后端拒绝。
```

- [ ] **Step 2: 提交**

```bash
cd basic
git add docs/admin-manual.md
git commit -m "docs(admin-manual): 增加「标签与 SEO 关系说明」章节"
```

---

## 验收对照（spec 第 7 章）

执行完所有 Task 后，逐项核对 spec 验收标准：

### 后端
- [ ] Strapi i18n 插件已启用，zh-CN locale 已配置（Task 1）
- [ ] zhao-tag tag/tag-group schema 含 pluginOptions.i18n.localized（Task 2）
- [ ] zhao-tag tag/tag-group schema 含 site 关联字段（Task 2）
- [ ] zhao-tag tag-group schema 含 isPublic 字段（Task 2）
- [ ] zhao-website 9 个 CT schema 含 pluginOptions.i18n.localized（Task 3）
- [ ] zhao-tag create/update 拒绝非法 isPublic+site 组合（Task 4）
- [ ] zhao-tag list 接口支持 siteId 筛选（返回公共 + 本站）（Task 4）
- [ ] zhao-website 7 CT list 接口支持 tagGroup 筛选（Task 5）
- [ ] zhao-website 7 CT detail 接口 populate tags.tagGroup（Task 5）

### 前端
- [ ] TagSelector 组件按 tagGroup 分组展示（Task 6）
- [ ] TagSelector 显示公共/站点标签徽章（Task 6）
- [ ] 7 CT edit 页集成 TagSelector（Task 7）
- [ ] 7 CT list 页支持 tagGroup 筛选（Task 7）
- [ ] JsonExampleBlock 组件在 JSON 字段下方显示示例（Task 6 + Task 8）
- [ ] 一键填充按钮：空字段直接填入，有内容时弹确认框（Task 8）
- [ ] 各 JSON 字段示例内容完整（Task 8）

### 文档
- [ ] admin-manual.md 增加"标签与 SEO 关系说明"章节（Task 9）
- [ ] 说明自动模式 vs 手动覆盖模式（Task 9）

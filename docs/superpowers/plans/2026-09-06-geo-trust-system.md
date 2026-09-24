# GEO 信任体系扩展实施计划（第一真值 / 知识图谱 / 作者审核）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 local-comparison / local-list 两种 GEO 文章类型，建立文章与第一真值、知识实体的文章级关联，引入独立 author 模型与编辑/审核关联，前端渲染作者卡片/权威依据/实体关联/对比表/清单模块，输出 Person / ItemList 结构化数据。

**Architecture:** 数据层扩展 zhao-website 插件 content-type（author 新模型 + geo-article 扩展 + first-truth-policy/knowledge-entity/site-config 反向关系，m2m 由 Strapi 建 lnk 表）；前端扩展 strapi-site 四级模块体系（5 新模块组件 + 2 新路由 + GeoArticleView 组装 + geo-seo Person/ItemList），关系缺失降级隐藏。

**Tech Stack:** Strapi v5 插件（zhao-website / zhao-common）、PostgreSQL、Next.js App Router + TypeScript、纯 CSS。

**Spec:** `docs/superpowers/specs/2026-09-06-geo-trust-system-design.md`

**仓库边界：** basic 仓库 = `e:\code\basic`（Strapi 插件）；顶层仓库 = `e:\code`（strapi-site 前端 + docs）。

**关键铁律（执行前必读）：**

- **lnk 表铁律**：m2m 关系 SQL 直插测试数据必须同步写对应 lnk 表（`zhao_website_geo_articles_truth_basis_lnk` 等），否则关系查询为空。

- **dist 铁律**：zhao-website / zhao-common 的 `server/src` 改动必须先在对应插件目录 `npm run build` 重建 dist 再提交；只提交源码 dist 不更新会静默失效。

- 本地 Strapi dev 在 `:1337`，Next dev 在 `:3000`；前端路径经 `/api` 前缀（`http://localhost:1337/api/zhao-website/v1/...`）。

- 关系字段均为可选（兼容存量数据），不迁移已有扁平字段（authorName/authorBio/reviewerName 保留作回退）。

***

### Task 1: author 模型 + 注册 + site-config 反向关系（basic 仓库）

**Files:**

- Create: `e:\code\basic\plugins\zhao-website\server\src\content-types\author\schema.json`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\index.ts`（+ author 导入注册）

- Modify: `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`（尾部 + website\_authors 反向）

- [x] **Step 1: 创建 author schema**

创建 `e:\code\basic\plugins\zhao-website\server\src\content-types\author\schema.json`：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_website_authors",
  "info": {
    "singularName": "author",
    "pluralName": "authors",
    "displayName": "文章作者"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation", "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true, "inversedBy": "website_authors"
    },
    "name": { "type": "string", "maxLength": 50, "required": true },
    "slug": { "type": "uid", "targetField": "name", "required": true },
    "position": { "type": "string", "maxLength": 100, "description": "职位头衔，如「本地家装行业分析师」" },
    "bio": { "type": "text", "description": "从业背景（E-E-A-T 背书）" },
    "avatar": { "type": "media", "multiple": false },
    "experienceYears": { "type": "integer", "description": "从业年限" },
    "sameAs": { "type": "json", "description": "外部档案链接" },
    "status": { "type": "boolean", "default": true },
    "deletedAt": { "type": "datetime", "default": null },
    "geoArticles": {
      "type": "relation", "relation": "oneToMany",
      "target": "plugin::zhao-website.geo-article",
      "mappedBy": "author"
    }
  }
}
```

- [x] **Step 2: 注册 author content-type**

修改 `e:\code\basic\plugins\zhao-website\server\src\content-types\index.ts`：

- import 区加 `import author from "./author/schema.json";`（geoArticle 行后）

- export default 加 `"author": { schema: author },`

- [x] **Step 3: site-config 补反向关系**

修改 `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`，在 `website_geo_articles` 之后、闭合 `}` 之前追加：

```json
    ,
    "website_authors": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.author",
      "mappedBy": "site"
    }
```

注意：原文件 `website_geo_articles` 块末尾无逗号（见 370-375 行），追加时在上一块后补逗号分隔。

- [x] **Step 4: 验证 schema JSON 合法**

Run: `node -e "JSON.parse(require('fs').readFileSync('e:/code/basic/plugins/zhao-website/server/src/content-types/author/schema.json','utf8')); JSON.parse(require('fs').readFileSync('e:/code/basic/plugins/zhao-common/server/src/content-types/site-config/schema.json','utf8')); console.log('JSON OK')"`
Expected: `JSON OK`

- [x] **Step 5: Commit（basic 仓库）**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/content-types/author/schema.json plugins/zhao-website/server/src/content-types/index.ts plugins/zhao-common/server/src/content-types/site-config/schema.json
git -C e:/code/basic commit -m "feat(zhao-website): 新增 author 模型与 site-config 反向关系"
```

***

### Task 2: geo-article 扩展 + first-truth-policy / knowledge-entity 反向关系（basic 仓库）

**Files:**

- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\geo-article\schema.json`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\first-truth-policy\schema.json`

- Modify: `e:\code\basic\plugins\zhao-website\server\src\content-types\knowledge-entity\schema.json`

- [x] **Step 1: geo-article schema 扩展**

修改 `e:\code\basic\plugins\zhao-website\server\src\content-types\geo-article\schema.json`：

a) `type` 枚举扩为 5 种：

```json
"type": { "type": "enumeration",
  "enum": ["geo-article", "geo-faq", "local-report", "local-comparison", "local-list"],
  "default": "geo-article", "required": true },
```

b) `jsonLdType` 枚举加 ItemList：

```json
"jsonLdType": { "type": "enumeration",
  "enum": ["Article", "FAQPage", "LocalBusiness", "ItemList"], "default": "Article" },
```

c) 在 `deletedAt` 之前追加新关系与专属字段（保持 JSON 合法，前面字段加逗号）：

```json
    ,
    "author": {
      "type": "relation", "relation": "manyToOne",
      "target": "plugin::zhao-website.author",
      "description": "作者档案（可选；缺失时前端回退 authorName/authorBio）"
    },
    "editor": {
      "type": "relation", "relation": "manyToOne",
      "target": "admin::user",
      "description": "编辑人（仅后台记录，不参与前端展示）"
    },
    "reviewer": {
      "type": "relation", "relation": "manyToOne",
      "target": "admin::user",
      "description": "审核人（仅后台记录；前端审核展示用扁平 reviewerName/reviewedAt）"
    },
    "truthBasis": {
      "type": "relation", "relation": "manyToMany",
      "target": "plugin::zhao-website.first-truth-policy",
      "description": "文章背书的真值声明"
    },
    "mentionedEntities": {
      "type": "relation", "relation": "manyToMany",
      "target": "plugin::zhao-website.knowledge-entity",
      "description": "文中提及的知识图谱实体"
    },
    "comparisonData": { "type": "json", "default": [],
      "description": "type=local-comparison 评分维度：[{dimension, items:[{name, score, note}]}]" },
    "listItems": { "type": "json", "default": [],
      "description": "type=local-list 清单条目：[{name, desc, price, link}]" }
```

- [x] **Step 2: first-truth-policy 补反向**

修改 `e:\code\basic\plugins\zhao-website\server\src\content-types\first-truth-policy\schema.json`，在 `deletedAt` 之前追加：

```json
    ,
    "geoArticles": {
      "type": "relation", "relation": "manyToMany",
      "target": "plugin::zhao-website.geo-article",
      "mappedBy": "truthBasis"
    }
```

- [x] **Step 3: knowledge-entity 补反向**

修改 `e:\code\basic\plugins\zhao-website\server\src\content-types\knowledge-entity\schema.json`，在 `caseMentions` 之后、`deletedAt` 之前追加：

```json
    ,
    "geoArticleMentions": {
      "type": "relation", "relation": "manyToMany",
      "target": "plugin::zhao-website.geo-article",
      "mappedBy": "mentionedEntities"
    }
```

- [x] **Step 4: 验证 schema JSON 合法**

Run: 对 3 个改动文件执行与 Task 1 Step 4 相同的 JSON.parse 校验
Expected: `JSON OK`

- [x] **Step 5: Commit（basic 仓库）**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/content-types/geo-article/schema.json plugins/zhao-website/server/src/content-types/first-truth-policy/schema.json plugins/zhao-website/server/src/content-types/knowledge-entity/schema.json
git -C e:/code/basic commit -m "feat(zhao-website): geo-article 扩展 5 类型/真值实体关系/对比清单字段"
```

***

### Task 3: service populate + dist 重建 + 本地重启验证（basic 仓库）

**Files:**

- Modify: `e:\code\basic\plugins\zhao-website\server\src\services\geo-article.ts`

- [x] **Step 1: findOne populate 扩展**

修改 `e:\code\basic\plugins\zhao-website\server\src\services\geo-article.ts` 的 `findOne`（约 29 行）：

```typescript
    const doc = await strapi.db.query(UID).findOne({
      where,
      populate: ["coverImage", "category", "tags", "author", "truthBasis", "mentionedEntities"],
    });
```

`find` / `findFeatured` 保持不变（列表不需要关系数据）。

- [x] **Step 2: 重建两个插件 dist**

Run:

```bash
cd e:/code/basic/plugins/zhao-website && npm run build
cd e:/code/basic/plugins/zhao-common && npm run build
```

Expected: 两个 build 均以成功结束（无 TS 错误）

- [x] **Step 3: 验证 dist 含新模型关键字**

Run: `rg -l "zhao_website_authors|website_authors" e:/code/basic/plugins/zhao-website/dist e:/code/basic/plugins/zhao-common/dist | Measure-Object | Select-Object -ExpandProperty Count`
Expected: 输出 ≥ 1（dist 已含 author 模型定义，未命中则重跑 Step 2）

- [x] **Step 4: 重启本地 Strapi 验证模型注册**

重启本地 Strapi dev（:1337），查看启动日志：

- 无 `Model ... not found` / schema 关联错误

- `zhao_website_authors` 表自动创建

Run: `curl -s -o NUL -w "%{http_code}" "http://localhost:1337/admin"`
Expected: `200`

- [x] **Step 5: Commit（basic 仓库）**

```bash
git -C e:/code/basic add plugins/zhao-website/server/src/services/geo-article.ts plugins/zhao-website/dist plugins/zhao-common/dist
git -C e:/code/basic commit -m "feat(zhao-website): geo-article 详情 populate 作者/真值/实体关系，重建 dist"
```

***

### Task 4: 前端 lib 扩展（顶层仓库 strapi-site）

**Files:**

- Modify: `e:\code\strapi-site\lib\geo-article.ts`

- Modify: `e:\code\strapi-site\lib\geo-seo.ts`

- [x] **Step 1: GeoArticleType / GeoArticle 类型扩展**

修改 `e:\code\strapi-site\lib\geo-article.ts`：

a) 类型联合扩 5：

```typescript
export type GeoArticleType = "geo-article" | "geo-faq" | "local-report" | "local-comparison" | "local-list";
```

b) `GeoArticle` 增加字段（jsonLdType 枚举加 ItemList，新增 author/truthBasis/mentionedEntities/comparisonData/listItems）：

```typescript
  jsonLdType?: "Article" | "FAQPage" | "LocalBusiness" | "ItemList";
  author?: {
    id: number;
    name: string;
    position?: string;
    bio?: string;
    avatar?: { url?: string };
    experienceYears?: number;
  };
  truthBasis?: {
    id: number;
    claim: string;
    canonicalValue?: string;
    canonicalSourceUrl?: string;
    canonicalSourceType?: string;
    verificationStatus?: string;
    lastVerifiedAt?: string;
  }[];
  mentionedEntities?: {
    id: number;
    name: string;
    slug: string;
    entityType?: string;
  }[];
  comparisonData?: { dimension?: string; items?: { name?: string; score?: string | number; note?: string }[] }[];
  listItems?: { name?: string; desc?: string; price?: string; link?: string }[];
```

- [x] **Step 2: DEFAULT\_GEO\_MODULES 扩展**

修改 `DEFAULT_GEO_MODULES`（58-61 行）：

```typescript
export const DEFAULT_GEO_MODULES = [
  "risk-tip", "breadcrumb", "article-header", "geo-body", "comparison-table", "local-list",
  "citation", "internal-link", "summary-tips", "info-boundary", "truth-basis", "entity-mentions",
  "author-card", "cta", "lead-form", "geo-footer",
];
```

- [x] **Step 3: getGeoModules key 映射扩展**

修改 `getGeoModules`（63-70 行）：

```typescript
export function getGeoModules(bundle: any, type: GeoArticleType): string[] {
  const key =
    type === "geo-faq" ? "geoFaq" :
    type === "local-report" ? "localReport" :
    type === "local-comparison" ? "localComparison" :
    type === "local-list" ? "localList" : "geoArticle";
  const configured = resolveConfig(bundle, ["pages", key, "modules"]);
  if (Array.isArray(configured) && configured.length > 0) return configured;
  const detail = resolveConfig(bundle, ["pages", "detail", "modules"]);
  if (Array.isArray(detail) && detail.length > 0) return detail;
  return DEFAULT_GEO_MODULES;
}
```

- [x] **Step 4: resolveGeoRoutePrefix 扩展**

修改 `resolveGeoRoutePrefix`（72-74 行）：

```typescript
export function resolveGeoRoutePrefix(type: GeoArticleType): string {
  return type === "geo-faq" ? "/geo-faq" :
    type === "local-report" ? "/local-report" :
    type === "local-comparison" ? "/local-comparison" :
    type === "local-list" ? "/local-list" : "/geo-article";
}
```

- [x] **Step 5: geo-seo 扩展（Person author + ItemList）**

修改 `e:\code\strapi-site\lib\geo-seo.ts`：

a) `buildGeoJsonLd` 的 base 增加 author（author 关系 → 回退扁平）：

```typescript
  const authorName = article.author?.name || article.authorName;
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    headline: article.metaTitle || article.title,
    description: article.metaDescription || "",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    image: article.coverImage?.url,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    publisher: { "@type": "Organization", name: site?.siteName || "" },
    mainEntityOfPage: article.canonicalUrl || undefined,
  };
```

b) 在 `LocalBusiness` 分支之后、`return base` 之前加 ItemList 分支：

```typescript
  if (type === "ItemList") {
    const items =
      (article.listItems ?? []).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name })).length > 0
        ? (article.listItems ?? []).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name }))
        : (article.comparisonData ?? []).flatMap((d) =>
            (d.items ?? []).map((it) => ({ "@type": "ListItem", name: it.name }))
          ).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name }));
    if (items.length === 0) return null;
    return { ...base, name: site?.siteName, itemListElement: items };
  }
```

- [x] **Step 6: 类型检查**

Run: `cd e:/code/strapi-site && npx tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 20`
Expected: 无类型错误（Next 项目 tsconfig 通过）

- [x] **Step 7: Commit（顶层仓库）**

```bash
git -C e:/code add strapi-site/lib/geo-article.ts strapi-site/lib/geo-seo.ts
git -C e:/code commit -m "feat(strapi-site): GEO lib 扩展 5 类型/关系类型/Person+ItemList SEO"
```

***

### Task 5: 5 个新模块组件 + GeoHeader 增强（顶层仓库 strapi-site）

**Files:**

- Create: `e:\code\strapi-site\components\modules\geo\AuthorCard.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\TruthBasis.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\EntityMentions.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\ComparisonTable.tsx`

- Create: `e:\code\strapi-site\components\modules\geo\LocalList.tsx`

- Modify: `e:\code\strapi-site\components\modules\geo\GeoHeader.tsx`

- [x] **Step 1: AuthorCard.tsx**

```tsx
import type { GeoArticle } from "@/lib/geo-article";

/**
 * GEO 模块：作者卡片（author 关系 → 回退 authorName/authorBio 扁平字段）。
 */
export default function AuthorCard({ article }: { article: GeoArticle }) {
  const author = article.author;
  const name = author?.name || article.authorName;
  const bio = author?.bio || article.authorBio;
  if (!name && !bio) return null;
  return (
    <section className="geo-author-card">
      {author?.avatar?.url && (
        <img src={author.avatar.url} alt={name || "作者"} className="geo-author-avatar" />
      )}
      <div className="geo-author-info">
        {name && <div className="geo-author-name">{name}</div>}
        {author?.position && <div className="geo-author-position">{author.position}</div>}
        {author?.experienceYears ? <div className="geo-author-exp">从业 {author.experienceYears} 年</div> : null}
        {bio && <p className="geo-author-bio">{bio}</p>}
      </div>
    </section>
  );
}
```

- [x] **Step 2: TruthBasis.tsx**

```tsx
import type { GeoArticle } from "@/lib/geo-article";

const STATUS_LABEL: Record<string, string> = {
  verified: "已验证",
  pending: "待验证",
  outdated: "已过期",
  conflict: "存在冲突",
};

/**
 * GEO 模块：权威依据（文章背书的真值声明）。
 */
export default function TruthBasis({ article }: { article: GeoArticle }) {
  const basis = article.truthBasis ?? [];
  if (basis.length === 0) return null;
  return (
    <section className="geo-truth-basis">
      <h2>权威依据</h2>
      <ul>
        {basis.map((t) => (
          <li key={t.id} className="geo-truth-item">
            <div className="geo-truth-claim">{t.claim}</div>
            {t.canonicalValue && <div className="geo-truth-value">权威值：{t.canonicalValue}</div>}
            <div className="geo-truth-meta">
              {t.canonicalSourceUrl ? (
                <a href={t.canonicalSourceUrl} target="_blank" rel="noopener noreferrer">查看来源</a>
              ) : t.canonicalSourceType ? (
                <span>来源类型：{t.canonicalSourceType}</span>
              ) : null}
              {t.verificationStatus && (
                <span className={`geo-truth-badge geo-truth-${t.verificationStatus}`}>
                  {STATUS_LABEL[t.verificationStatus] ?? t.verificationStatus}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [x] **Step 3: EntityMentions.tsx**

```tsx
import type { GeoArticle } from "@/lib/geo-article";

/**
 * GEO 模块：实体关联（文中提及的知识图谱实体，展示名称与类型，不输出死链）。
 */
export default function EntityMentions({ article }: { article: GeoArticle }) {
  const entities = article.mentionedEntities ?? [];
  if (entities.length === 0) return null;
  return (
    <section className="geo-entity-mentions">
      <h2>文中涉及</h2>
      <ul className="geo-entity-list">
        {entities.map((e) => (
          <li key={e.id} className="geo-entity-item">
            <span className="geo-entity-name">{e.name}</span>
            {e.entityType && <span className="geo-entity-type">{e.entityType}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [x] **Step 4: ComparisonTable.tsx**

```tsx
import type { GeoArticle } from "@/lib/geo-article";

/**
 * GEO 模块：对比评测表（local-comparison 的 comparisonData 评分维度）。
 */
export default function ComparisonTable({ article }: { article: GeoArticle }) {
  const dims = article.comparisonData ?? [];
  if (dims.length === 0) return null;
  const rows = dims.flatMap((d) => (d.items ?? []).map((it) => ({ dimension: d.dimension, ...it })));
  return (
    <section className="geo-comparison">
      <h2>对比评测</h2>
      <div className="geo-table-wrap">
        <table className="geo-comparison-table">
          <thead>
            <tr><th>维度</th><th>选项</th><th>评分</th><th>说明</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.dimension}</td>
                <td>{r.name}</td>
                <td>{r.score}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [x] **Step 5: LocalList.tsx**

```tsx
import type { GeoArticle } from "@/lib/geo-article";

/**
 * GEO 模块：本地清单（local-list 的 listItems 条目）。
 */
export default function LocalList({ article }: { article: GeoArticle }) {
  const items = article.listItems ?? [];
  if (items.length === 0) return null;
  return (
    <section className="geo-local-list">
      <h2>本地清单</h2>
      <ul>
        {items.map((it, i) => (
          <li key={i} className="geo-list-item">
            {it.link ? (
              <a href={it.link} target="_blank" rel="noopener noreferrer" className="geo-list-name">{it.name}</a>
            ) : (
              <span className="geo-list-name">{it.name}</span>
            )}
            {it.price && <span className="geo-list-price">{it.price}</span>}
            {it.desc && <div className="geo-list-desc">{it.desc}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [x] **Step 6: GeoHeader 增强（作者/审核回退）**

修改 `e:\code\strapi-site\components\modules\geo\GeoHeader.tsx` 的 meta 数组（15-21 行）：

```tsx
  const authorName = article.author?.name || article.authorName;
  const authorBio = article.author?.bio || article.authorBio;
  const meta = [
    article.publishedAt ? `发布时间 ${formatDate(article.publishedAt)}` : "",
    article.updatedAt ? `更新时间 ${formatDate(article.updatedAt)}` : "",
    article.articleNo ? `编号 ${article.articleNo}` : "",
    authorName ? `作者 ${authorName}` : "",
    authorBio ? authorBio : "",
    article.reviewerName || article.reviewedAt
      ? `审核 ${article.reviewerName || ""}${article.reviewedAt ? ` ${formatDate(article.reviewedAt)}` : ""}`
      : "",
  ].filter(Boolean);
```

- [x] **Step 7: 类型检查 + Commit**

Run: `cd e:/code/strapi-site && npx tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 20`
Expected: 无类型错误

```bash
git -C e:/code add strapi-site/components/modules/geo/AuthorCard.tsx strapi-site/components/modules/geo/TruthBasis.tsx strapi-site/components/modules/geo/EntityMentions.tsx strapi-site/components/modules/geo/ComparisonTable.tsx strapi-site/components/modules/geo/LocalList.tsx strapi-site/components/modules/geo/GeoHeader.tsx
git -C e:/code commit -m "feat(strapi-site): GEO 新增作者卡片/权威依据/实体/对比表/清单模块"
```

***

### Task 6: GeoArticleView 组装 + 2 新路由（顶层仓库 strapi-site）

**Files:**

- Modify: `e:\code\strapi-site\components\views\GeoArticleView.tsx`

- Create: `e:\code\strapi-site\app\[locale]\local-comparison\[slug]\page.tsx`

- Create: `e:\code\strapi-site\app\[locale]\local-list\[slug]\page.tsx`

- [x] **Step 1: CATEGORY\_LABELS 扩展**

修改 `GeoArticleView.tsx` 的 `CATEGORY_LABELS`（29-33 行）：

```tsx
const CATEGORY_LABELS: Record<GeoArticleType, Record<string, string>> = {
  "geo-article": { "zh-CN": "本地资讯", en: "Local Guide" },
  "geo-faq": { "zh-CN": "本地问答", en: "Local FAQ" },
  "local-report": { "zh-CN": "本地报告", en: "Local Report" },
  "local-comparison": { "zh-CN": "对比评测", en: "Local Comparison" },
  "local-list": { "zh-CN": "本地清单", en: "Local List" },
};
```

- [x] **Step 2: import 5 个新组件**

`GeoArticleView.tsx` import 区（14-24 行之间）加：

```tsx
import ComparisonTable from "@/components/modules/geo/ComparisonTable";
import LocalList from "@/components/modules/geo/LocalList";
import TruthBasis from "@/components/modules/geo/TruthBasis";
import EntityMentions from "@/components/modules/geo/EntityMentions";
import AuthorCard from "@/components/modules/geo/AuthorCard";
```

- [x] **Step 3: 模块 switch 加 5 个 case**

`GeoArticleView.tsx` switch（106-131 行）在 `"geo-body"` case 后加：

```tsx
          case "comparison-table": return <ComparisonTable key={i} article={article} />;
          case "local-list": return <LocalList key={i} article={article} />;
```

在 `"info-boundary"` case 后加：

```tsx
          case "truth-basis": return <TruthBasis key={i} article={article} />;
          case "entity-mentions": return <EntityMentions key={i} article={article} />;
          case "author-card": return <AuthorCard key={i} article={article} />;
```

- [x] **Step 4: 新建 local-comparison 路由页**

创建 `e:\code\strapi-site\app\[locale]\local-comparison\[slug]\page.tsx`（复制 local-report 路由模式）：

```tsx
import type { Metadata } from "next";
import { GeoArticleView, generateGeoMetadata } from "@/components/views/GeoArticleView";
import { normalizeLocale, DEFAULT_LOCALE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale) ?? DEFAULT_LOCALE;
  return generateGeoMetadata({ type: "local-comparison", slug, locale });
}

export default async function LocalComparisonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = normalizeLocale(rawLocale) ?? DEFAULT_LOCALE;
  return <GeoArticleView type="local-comparison" slug={slug} locale={locale} />;
}
```

- [x] **Step 5: 新建 local-list 路由页**

创建 `e:\code\strapi-site\app\[locale]\local-list\[slug]\page.tsx`（同上模式，type 换 `"local-list"`，组件名 LocalListPage）。

- [x] **Step 6: 类型检查 + Commit**

Run: `cd e:/code/strapi-site && npx tsc --noEmit -p tsconfig.json 2>&1 | Select-Object -First 20`
Expected: 无类型错误

```bash
git -C e:/code add strapi-site/components/views/GeoArticleView.tsx "strapi-site/app/[locale]/local-comparison/[slug]/page.tsx" "strapi-site/app/[locale]/local-list/[slug]/page.tsx"
git -C e:/code commit -m "feat(strapi-site): GEO 新增对比评测/本地清单路由页与模块组装"
```

***

### Task 7: 集成验证（测试数据 + 接口 + 页面验收）

**Files:**

- Create: `e:\code\tmp_geo_trust_seed.sql`（一次性脚本，验证后可删）

- Modify: 无（验证用）

**前置：** 本地 Strapi（:1337，已含 Task 3 的新 dist）、Next dev（:3000）均在运行。

- [x] **Step 1: 通过 Strapi 后台/API 创建测试数据**

用 curl 走 content-manager 或直接 SQL 直插（注意 lnk 表铁律）。SQL 方式（PostgreSQL，库名 strapi-local 或实际本地库）：

```sql
-- author（site=26 为本地 localhost 站点）
INSERT INTO zhao_website_authors (site_id, name, slug, position, bio, experience_years, status, created_at, updated_at, published_at)
VALUES (26, '测试分析师', 'test-analyst', '本地行业分析师', '5 年本地行业调研经验', 5, true, now(), now(), now());

-- 真值 / 实体
INSERT INTO zhao_website_first_truths (site_id, claim, claim_key, canonical_value, canonical_source_url, canonical_source_type, last_verified_at, verification_status, priority, status, created_at, updated_at, published_at)
VALUES (26, '本地平均装修工期 60-90 天', 'avg_renovation_days', '60-90 天', 'https://example.gov.cn/faq', 'government', now(), 'verified', 100, true, now(), now(), now());

INSERT INTO zhao_website_knowledge_entities (site_id, entity_type, name, slug, status, created_at, updated_at, published_at)
VALUES (26, 'Organization', '示例装修公司', 'demo-company', true, now(), now(), now());

-- local-comparison 文章
INSERT INTO zhao_website_geo_articles (site_id, title, slug, content, type, status, published_at, comparison_data, list_items, read_points, allow_index, created_at, updated_at, published_at)
VALUES (26, '吉林本地装修公司对比评测', 'jilin-renovation-comparison', '<p>对比正文</p>', 'local-comparison', 'published', now(),
  '[{"dimension":"工期","items":[{"name":"A 公司","score":4,"note":"90 天"}]}]', '[]', 10, true, now(), now(), now());

-- local-list 文章
INSERT INTO zhao_website_geo_articles (site_id, title, slug, content, type, status, published_at, comparison_data, list_items, read_points, allow_index, created_at, updated_at, published_at)
VALUES (26, '吉林本地装修材料清单', 'jilin-material-list', '<p>清单正文</p>', 'local-list', 'published', now(),
  '[]', '[{"name":"水泥","desc":"32.5R","price":"25元/袋"}]', 10, true, now(), now(), now());

-- lnk 表同步（铁律）：comparison 文章 id 用上一步返回的 id（示例取 2 条新文章 id）
-- 通过查询确认：
-- SELECT id, slug FROM zhao_website_geo_articles WHERE slug IN ('jilin-renovation-comparison','jilin-material-list');
INSERT INTO zhao_website_geo_articles_truth_basis_lnk (geo_article_id, first_truth_policy_id)
SELECT g.id, f.id FROM zhao_website_geo_articles g, zhao_website_first_truths f
WHERE g.slug='jilin-renovation-comparison' AND f.claim_key='avg_renovation_days';

INSERT INTO zhao_website_geo_articles_mentioned_entities_lnk (geo_article_id, knowledge_entity_id)
SELECT g.id, k.id FROM zhao_website_geo_articles g, zhao_website_knowledge_entities k
WHERE g.slug='jilin-renovation-comparison' AND k.slug='demo-company';
```

注意：实际 lnk 表名与列名以 Strapi 建表为准（`zhao_website_geo_articles_truth_basis_lnk` 等），执行前 `\d zhao_website_geo_articles_truth_basis_lnk` 确认列名（通常为 `geo_article_id`/`first_truth_policy_id`，Strapi v5 m2m 列名为双方单数名 + `_id`）。

- [x] **Step 2: 后端接口验证**

Run:

```powershell
curl -s "http://localhost:1337/api/zhao-website/v1/geo-articles/jilin-renovation-comparison?locale=zh-CN" | ConvertFrom-Json | Select-Object type, @{n='author';e={$_.author.name}}, @{n='truthCount';e={$_.truthBasis.Count}}, @{n='entityCount';e={$_.mentionedEntities.Count}}, @{n='comparisonCount';e={$_.comparisonData.Count}}
```

Expected: `type=local-comparison`，`truthCount=1`，`entityCount=1`，`comparisonCount=1`
（truthBasis/mentionedEntities 为空 = lnk 表没写对，回头查 Step 1）

- [x] **Step 3: 前端页面验收**

Run:

```powershell
curl -s -o NUL -w "%{http_code}" "http://localhost:3000/local-comparison/jilin-renovation-comparison"
curl -s -o NUL -w "%{http_code}" "http://localhost:3000/local-list/jilin-material-list"
curl -s -o NUL -w "%{http_code}" "http://localhost:3000/geo-article/jilin-local-test"
```

Expected: 三个均 `200`（第三个为存量 3 类型回归）

Run（HTML 抽查）：`curl -s "http://localhost:3000/local-comparison/jilin-renovation-comparison" | rg -o "对比评测|权威依据|文中涉及|ItemList" | Sort-Object -Unique`
Expected: 输出包含 `对比评测`、`权威依据`、`文中涉及`、`ItemList`（模块渲染 + JSON-LD 输出）

- [x] **Step 4: 降级验证**

对存量文章 `jilin-local-test`（无 author 关系/无 comparisonData）：
Run: `curl -s "http://localhost:3000/geo-article/jilin-local-test" | rg -c "geo-author-card|geo-comparison"`
Expected: `0`（模块隐藏，页面正常）

- [x] **Step 5: 提交测试脚本（可选）并收尾**

删除临时 SQL（如需保留留痕则提交到 docs）：

```bash
Remove-Item e:/code/tmp_geo_trust_seed.sql
```

（若保留，则 `git -C e:/code add tmp_geo_trust_seed.sql && git -C e:/code commit -m "chore: GEO 信任体系集成验证种子脚本"`）

- [x] **Step 6: 更新计划勾选并提交**

在 `docs/superpowers/plans/2026-09-06-geo-trust-system.md` 勾选已完成 checkbox，然后：

```bash
git -C e:/code add docs/superpowers/plans/2026-09-06-geo-trust-system.md
git -C e:/code commit -m "docs: GEO 信任体系扩展实施计划完成验收"
```

***

## Self-Review 结论（计划编写时已核对）

- **Spec 覆盖**：author 模型（Task 1）、geo-article 扩展（Task 2）、3 反向关系（Task 1-2）、service populate（Task 3）、5 组件 + GeoHeader（Task 5）、2 路由 + GeoArticleView（Task 6）、lib/geo-seo（Task 4）、测试边界（Task 7）——全覆盖。

- **偏差修正（相对 spec）**：reviewer 关系不 populate、不进前端类型（与 editor 同为后台记录）；前端审核展示用扁平 reviewerName/reviewedAt——避免 admin::user populate 与展示歧义。

- **类型一致性**：`GeoArticleType` 5 值在 lib/视图/路由三处一致；模块 key（comparison-table/local-list/truth-basis/entity-mentions/author-card）在 DEFAULT\_GEO\_MODULES、switch、组件名一一对应。

- **铁律落实**：Task 3 Step 3 强制校验 dist 命中关键字；Task 7 Step 1 明确 lnk 表同步并给出列名确认命令。


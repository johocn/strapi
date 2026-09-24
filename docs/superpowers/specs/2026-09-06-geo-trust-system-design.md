# GEO 信任体系扩展设计（第一真值 / 知识图谱 / 作者审核）

> **For agentic workers:** 本 spec 为 GEO 文章体系的第二阶段扩展，覆盖数据模型层（basic 仓库）与前端模块层（顶层仓库），实施前须先经 writing-plans 生成实施计划。

**Goal:** 在现有 GEO 文章（geo-article/geo-faq/local-report）基础上，新增 local-comparison 与 local-list 两种类型，建立文章与第一真值（first-truth-policy）、知识实体（knowledge-entity）的文章级关联，引入独立作者模型与编辑/审核关联，并在前端渲染作者卡片、权威依据、实体关联、对比表、清单等模块，输出 Person / ItemList 结构化数据。

**Architecture:** 数据层沿用 zhao-website 插件 content-type 体系（关系 m2m 由 Strapi 建 lnk 表，符合既有 lnk 铁律）；前端沿用 strapi-site 四级模块体系（`components/modules/geo/*` + `GeoArticleView` 模块组装 + 数据缺失降级隐藏）。

**Tech Stack:** Strapi v5 插件（zhao-website）、PostgreSQL、Next.js App Router + TypeScript、纯 CSS 模块。

---

## 1. 设计目标

1. **后台数据复用优先**：第一真值、知识实体、作者均为独立模型，可被多篇文章引用，跨文章复用。
2. **类型扩展**：新增 `local-comparison`（对比评测）、`local-list`（本地清单）；`local-report` 保留并增强。
3. **文章级关联**：文章与第一真值（背书）、知识实体（mention）通过关系模型关联，不在正文内做锚点级标注（锚点级列入后续迭代）。
4. **作者独立模型** + 编辑/审核关联 admin::user，替代扁平字段为主、扁平字段保留作回退。

## 2. 数据模型层（basic 仓库 `plugins/zhao-website`）

### 2.1 新增 author 模型（`server/src/content-types/author/schema.json`）
- `kind: collectionType`，`collectionName: zhao_website_authors`，`draftAndPublish: false`
- 字段：
  - `site` manyToOne → site-config（`inversedBy: website_authors`，必填）
  - `name` string 必填 / `slug` uid(targetField=name) 必填
  - `position` string（职位头衔）
  - `bio` text（从业背景，E-E-A-T 背书）
  - `avatar` media
  - `experienceYears` integer（从业年限）
  - `sameAs` json（外部档案链接）
  - `status` boolean 默认 true / `deletedAt` datetime 默认 null
- 反向：`geoArticles` oneToMany → geo-article（mappedBy: author）

### 2.2 geo-article 扩展（修改 `server/src/content-types/geo-article/schema.json`）
- `type` 枚举扩为：`["geo-article", "geo-faq", "local-report", "local-comparison", "local-list"]`
- 新增关系（全部可选，兼容存量数据）：
  - `author` manyToOne → `plugin::zhao-website.author`
  - `editor` manyToOne → `admin::user`（编辑人）
  - `reviewer` manyToOne → `admin::user`（审核人）
  - `truthBasis` manyToMany → `plugin::zhao-website.first-truth-policy`（文章背书真值）
  - `mentionedEntities` manyToMany → `plugin::zhao-website.knowledge-entity`（文中实体）
- 新增专属字段：
  - `comparisonData` json 默认 `[]`（local-comparison）：`[{dimension, items: [{name, score, note}]}]`
  - `listItems` json 默认 `[]`（local-list）：`[{name, desc, price, link}]`
- `jsonLdType` 枚举加 `ItemList`

### 2.3 现有模型补反向关系
- `first-truth-policy/schema.json`：+ `geoArticles` manyToMany（mappedBy: truthBasis）
- `knowledge-entity/schema.json`：+ `geoArticleMentions` manyToMany（mappedBy: mentionedEntities）
- `zhao-common site-config/schema.json`：+ `website_authors` oneToMany（mappedBy: site）

### 2.4 服务层（`server/src/services/geo-article.ts`）
- `findOne` populate 增加：`author`、`truthBasis`、`mentionedEntities`
- `find` / `findFeatured` 不变（列表不需要关系数据）

### 2.5 约束
- 关系 m2m 由 Strapi 建 lnk 表（`zhao_website_geo_articles_truth_basis_lnk` 等），后台创建自动写；SQL 直插测试数据必须同步写对应 lnk 表（lnk 表铁律）
- 不新增依赖；重建 dist（zhao-website、zhao-common）

## 3. 前端模块层（顶层仓库 `strapi-site`）

### 3.1 新增 5 个模块组件（`components/modules/geo/`，均接收 article/site/bundle/locale 子集，数据缺失返回 null）
| 组件 | 数据 | 渲染条件 | 功能 |
|---|---|---|---|
| ComparisonTable.tsx | `comparisonData` | 有数据 | 评分维度对比表 |
| LocalList.tsx | `listItems` | 有数据 | 清单条目（名称/描述/价格/链接） |
| TruthBasis.tsx | `truthBasis` | 非空 | 权威依据卡：claim + canonicalValue + 来源 + 验证状态徽标 |
| EntityMentions.tsx | `mentionedEntities` | 非空 | 实体关联列表 |
| AuthorCard.tsx | `author`（回退扁平） | 有作者信息 | 作者卡片：姓名/职位/简介/头像/年限 |

### 3.2 路由扩展
- 新增 `app/[locale]/local-comparison/[slug]/page.tsx`、`app/[locale]/local-list/[slug]/page.tsx`（薄壳，复用 GeoArticleView）
- `resolveGeoRoutePrefix` / `getGeoModules` type key（geoArticle/geoFaq/localReport/localComparison/localList）/ `CATEGORY_LABELS` 同步扩展

### 3.3 GeoArticleView / lib 更新
- 模块 switch 加 5 个 case
- 默认模块顺序扩展：
  `risk-tip → breadcrumb → article-header → geo-body → comparison-table → local-list → citation → internal-link → summary-tips → info-boundary → truth-basis → entity-mentions → author-card → cta → lead-form → geo-footer`
- `GeoArticle` 类型增加 author/truthBasis/mentionedEntities/comparisonData/listItems（editor 与 reviewer 均仅后台记录，不参与前端 populate、不进类型；前端审核展示用扁平 reviewerName/reviewedAt）
- `getGeoArticle` 请求带 `?populate=author,truthBasis,mentionedEntities`

### 3.4 SEO（`lib/geo-seo.ts`）
- Article JSON-LD：内嵌 `author`（Person：author 关系 → 回退 authorName）+ 日期字段
- local-list / local-comparison：输出 `ItemList` JSON-LD（条目化）
- 审核人不输出 schema（避免误导）

### 3.5 GeoHeader 增强
- 元信息行并入作者（author 关系 → 回退 authorName/authorBio）与审核信息（reviewer 关系 → 回退 reviewerName + reviewedAt）

## 4. 数据流与降级

### 4.1 数据流
- 后台创建 geo-article → 关联 author/truthBasis/mentionedEntities/editor/reviewer → Strapi 自动写 lnk 表
- 复用：同一 first-truth-policy / knowledge-entity / author 被多篇文章引用
- 前端：page → getGeoArticle(populate) → GeoArticleView 组装模块 → SSR 输出 HTML + JSON-LD

### 4.2 降级规则
| 缺失项 | 行为 |
|---|---|
| author 关系 | 回退 authorName/authorBio；均缺 → author-card 隐藏 |
| reviewer 关系 | 回退 reviewerName + reviewedAt |
| truthBasis / mentionedEntities 空 | 模块隐藏 |
| comparisonData / listItems 空 | 模块隐藏（新类型退化为普通文章布局） |
| 非默认语言 404 | 302 回退默认语言同 slug |

### 4.3 兼容性
- 存量 geo-article 数据零迁移（新字段/关系可选，旧页面按数据降级）
- 现有 3 路由回归不受影响

## 5. 测试边界

1. 后端：5 种 type 的 list/detail/featured + populate 关系返回 + draft 404
2. 前端：3 旧页回归 + 2 新页渲染（对比表/清单/作者卡片/权威依据/实体模块）
3. 降级：无关系数据页面正常渲染（作者回退扁平字段）
4. 铁律：SQL 直插测试数据同步写 m2m lnk 表

## 6. 实施分解

- **Phase A（basic）**：author 模型 + geo-article schema 扩展 + 3 反向关系 + service populate + dist 重建（zhao-website + zhao-common）
- **Phase B（顶层）**：lib 类型扩展 + 5 新组件 + 2 新路由 + GeoArticleView/GeoHeader + geo-seo（Person/ItemList）
- **Phase C（集成）**：测试数据（含 lnk 同步）→ curl → 页面验收 → 提交

## 7. 风险与约束

- **lnk 表铁律**：m2m 关系 SQL 直插必须同步写 lnk 表，否则关系查询为空（既有教训）
- **dist 铁律**：zhao-website / zhao-common 改动必须重建 dist 再提交
- **author 回退**：不迁移存量扁平字段，前端做双路径读取
- 不新增 npm 依赖

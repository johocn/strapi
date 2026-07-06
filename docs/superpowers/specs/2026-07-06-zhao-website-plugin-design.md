# zhao-website 企业官网插件设计文档

- **创建日期**：2026-07-06
- **插件名**：`zhao-website`
- **定位**：企业自有官网内容与线索后端，承接 SEO/AEO 内容资产 + 品牌展示数据 + 线索转化收集。所有权完全归属企业，不受平台规则限制。
- **一期目标**：18 张内容 CT + 媒体租户隔离改造 + 完整 GEO/AEO 信源支撑 + studio 一键发布桥接

---

## §1 架构概览

### 1.1 系统边界

```
┌─────────────────────────────────────────────────────────────┐
│  前端层（独立部署）                                          │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Nuxt3 SSR        │    │  uni-app H5 控制台（存量）   │  │
│  │  官网 C 端         │    │  - 官网内容管理后台          │  │
│  │  - 文章/产品/案例  │    │  - 线索查看                  │  │
│  │  - 留言/留资       │    │  - 文章发布/编辑             │  │
│  │  - SEO/SSR        │    │  - studio 一键发布到官网     │  │
│  └────────┬─────────┘    └────────────┬─────────────────┘  │
└───────────┼───────────────────────────┼────────────────────┘
            │ Strapi Content API        │ Strapi Admin API
            ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Strapi 插件层（e:\code\basic\plugins）                      │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ zhao-website │◄──►│ zhao-studio  │    │ zhao-common  │   │
│  │  (新增)      │    │  (存量)       │    │  (存量)       │   │
│  │              │ 一键 │ - article-    │    │ - site-config│   │
│  │ 18 个 CT     │ 发布 │   draft       │    │ - middleware │   │
│  │              │ 复制 │ - publish-*   │    │ - policies   │   │
│  └──────┬───────┘    └──────────────┘    └──────────────┘   │
│         │                                                    │
│         ├──► zhao-tag（tag 关联 + tag-index 同步）           │
│         ├──► zhao-oss（媒体字段 + media-meta 租户隔离）       │
│         └──► zhao-auth（权限策略 + 角色同步）                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 多租户复用

完全复用现有 `site-config` 机制：
- 每个租户(site-config)的官网数据天然隔离，所有 CT 字段含 `site` (manyToOne → site-config)
- C 端访问经 `site-resolver` 中间件解析域名 → 注入 `ctx.state.siteId`
- 管理后台 API 经 `has-tenant-access-loose` policy 鉴权

### 1.3 与 zhao-studio 的边界

| 能力 | 归属 | 说明 |
|---|---|---|
| 采集 / AI 加工 / 多平台分发 | zhao-studio | article-draft 为内部母稿 |
| 官网资讯文章管理 / SEO / SSR | zhao-website | 独立 CT，可二次编辑 |
| 文章一键发布到官网 | 跨插件 | studio 调用 website service 复制快照 |

### 1.4 插件依赖

`zhao-website` 依赖 `zhao-common`、`zhao-tag`、`zhao-oss`、`zhao-auth`、`zhao-studio`，在 `basic/config/plugins.ts` 中按 PLUGIN_ORDER 排在 `zhao-studio` 之后。

---

## §2 内容模型（18 个 CT）

所有 CT 表名前缀 `zhao_website_`，全部含 `site` (manyToOne → site-config, required) 字段做租户隔离，含 `deletedAt` 接入 zhao-common 软删除机制。

### 2.1 业务内容 CT（9 张）

#### CT 01：seo-config（SEO 全局配置，租户单例）

```
site                    manyToOne site-config (required, unique per site)
defaultTitle            string max 60
titleTemplate           string max 60                    // 如 "%s - 公司名"
defaultDescription      string max 160
defaultKeywords         string max 200
ogImage                 media
favicon                 media
googleSiteVerification  string max 100
baiduSiteVerification   string max 100
bingSiteVerification    string max 100
baiduAnalyticsId        string max 50
googleAnalyticsId       string max 50
customHeadCode          text                             // 自定义 <head> 注入
customBodyCode          text                             // 自定义 <body> 注入
enableSitemap           bool default true
sitemapExcludeTypes     JSON                             // 排除的内容类型 ["compliance"]
enableRobotsTxt         bool default true
robotsContent           text                             // 自定义 robots.txt
aiCrawlerPolicy         enum [allow_all, block_all, selective] default allow_all
geoRegion               string max 20                   // ISO 3166-2 地域码
geoPlacename            string max 100
geoPosition             string max 50                   // "lat;lng"
geoICBM                 string max 50
defaultLocale           string max 10 default "zh-CN"
alternateLocales        JSON                             // ["en-US","ja-JP"]
hreflangStrategy        enum [none, subdirectory, subdomain, tld] default subdirectory
organizationName        string max 200
organizationLogo        media
organizationType        string max 50
schemaSameAs            JSON                             // 官方社媒链接
schemaContactPoint      JSON
icpNumber               string max 50
publicSecurityRecord    string max 50
extraConfig             JSON                             // searchPushTokens 等扩展配置
deletedAt               datetime
```

不设 DB unique 约束，由 service 层 `ensureDefault` 保证每租户一条；首次访问时自动创建默认记录。

#### CT 02：brand-info（企业品牌信息，租户单例）

```
site                    manyToOne site-config (required, unique per site)
companyName             string max 200 required
shortName               string max 100
slogan                  string max 200
logo                    media
logoDark                media                           // 深色模式 Logo
favicon                 media
description             text                            // 公司简介
foundingDate            date
registeredAddress       string max 500
officeAddress           string max 500
contactPhone            string max 30
contactEmail            email
serviceHotline          string max 30
businessHours           string max 100
wechatQrCode            media
wechatPublicAccount     string max 100
miniProgramName         string max 100
socialLinks             JSON                             // [{platform, url, icon}]
legalRepresentative     string max 50
registeredCapital       string max 50
unifiedSocialCreditCode string max 50
businessScope           text
mainEntity              manyToOne knowledge-entity      // 关联知识图谱实体
deletedAt               datetime
```

#### CT 03：article（资讯文章）

```
site                    manyToOne site-config (required)
title                   string max 200 required
slug                    uid unique per site
excerpt                 text max 300                    // 摘要
content                 text required                   // 富文本正文
coverImage              media
category                manyToOne article-category
tags                    manyToMany → plugin::zhao-tag.tag
author                  string max 50
authorTitle             string max 50                   // 作者头衔
isFeatured              bool default false
isPinned                bool default false
viewCount               bigInteger default 0
likeCount               bigInteger default 0
collectCount            bigInteger default 0
shareCount              bigInteger default 0
readingTime             integer                         // 阅读时长（分钟）
wordCount               integer
seoTitle                string max 60
seoDescription          string max 160
seoKeywords             string max 200
canonicalUrl            string max 500
ogTitle                 string max 200
ogDescription           text
ogImage                 media
ogType                  enum [article, product, website, video] default article
twitterCard             enum [summary, summary_large_image, product] default summary_large_image
schemaType              string max 50
schemaJson              JSON
allowIndex              bool default true
noFollow                bool default false
sitemapPriority         decimal default 0.7
sitemapFrequency        enum [always, hourly, daily, weekly, monthly, yearly, never] default weekly
sourceType              enum [original, studio, external] default original
sourceUrl               string
sourceArticleDraft      manyToOne plugin::zhao-studio.article-draft
mainEntity              manyToOne knowledge-entity
mentionedEntities       manyToMany knowledge-entity
structuredData          JSON                             // 自动生成的 JSON-LD 缓存
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

索引：`(site, slug)` 唯一（含 `WHERE deleted_at IS NULL`）；`(site, category)`；`(site, status, publishedAt DESC)`；`(site, isFeatured)`。

**重要决策**：不启用 Strapi `draftAndPublish`，改用自定义 `status` 枚举（含 `archived` 下架状态）+ `publishedAt`，便于与 lifecycle、tag-index 同步、知识图谱派生统一协调。公开路由 service 层显式过滤 `status: 'published'`。

#### CT 04：article-category（文章分类，树形）

```
site                    manyToOne site-config (required)
name                    string max 100 required
slug                    uid unique per site
description             text max 300
parent                  manyToOne self                  // 自引用（支持二级分类）
children                oneToMany self                  // mappedBy: parent
order                   integer default 0
seoTitle                string max 60
seoDescription          string max 160
status                  bool default true
deletedAt               datetime
```

索引：`(site, slug)` 唯一；`(site, parent)`。

#### CT 05：product（产品/方案）

```
site                    manyToOne site-config (required)
name                    string max 200 required
slug                    uid unique per site
tagline                 string max 200                  // 一句话卖点
description             text
content                 text                            // 详细说明（富文本）
coverImage              media
images                  media[]
category                manyToOne article-category      // 复用分类体系
tags                    manyToMany → plugin::zhao-tag.tag
features                JSON                             // [{title, description, icon}]
specifications          JSON                             // [{name, value, unit}]
scenarios               JSON                             // [{title, description, image}]
priceRange              string max 100
priceUnit               string max 20
isFeatured              bool default false
viewCount               bigInteger default 0
seoTitle                string max 60
seoDescription          string max 160
seoKeywords             string max 200
canonicalUrl            string max 500
ogImage                 media
allowIndex              bool default true
sitemapPriority         decimal default 0.7
sitemapFrequency        enum [...] default weekly
mainEntity              manyToOne knowledge-entity
mentionedEntities       manyToMany knowledge-entity
structuredData          JSON
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

#### CT 06：case（落地案例）

```
site                    manyToOne site-config (required)
title                   string max 200 required
slug                    uid unique per site
clientName              string max 100 required
clientLogo              media
clientIndustry          string max 50
clientDescription       text max 300
challenge               text required
solution                text required
results                 JSON required                   // [{metric, value, description}]
testimonial             text                            // 客户证言
testimonialAuthor       string max 50
testimonialTitle        string max 100
coverImage              media
images                  media[]
tags                    manyToMany → plugin::zhao-tag.tag
relatedProducts         manyToMany product
isFeatured              bool default false
viewCount               bigInteger default 0
seoTitle                string max 60
seoDescription          string max 160
allowIndex              bool default true
mainEntity              manyToOne knowledge-entity
mentionedEntities       manyToMany knowledge-entity
structuredData          JSON
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

#### CT 07：compliance（合规公示）

```
site                    manyToOne site-config (required)
title                   string max 200 required
slug                    uid unique per site
category                enum [notice, policy, report, certificate, agreement] required
content                 text required
effectiveDate           date
expiryDate              date
tags                    manyToMany → plugin::zhao-tag.tag
isPinned                bool default false
seoTitle                string max 60
seoDescription          string max 160
allowIndex              bool default true
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

#### CT 08：faq（常见问答）

```
site                    manyToOne site-config (required)
question                text required
answer                  text required                   // 富文本
slug                    uid unique per site
category                manyToOne article-category
tags                    manyToMany → plugin::zhao-tag.tag
order                   integer default 0
isFeatured              bool default false
viewCount               bigInteger default 0
mainEntity              manyToOne knowledge-entity
mentionedEntities       manyToMany knowledge-entity
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

索引：`(site, slug)` 唯一；`(site, category)`；`(site, status)`。

#### CT 09：tutorial（教程/操作指南）

> CT 命名用 `tutorial`（业务语义丰富：含难度、材料、时长），Schema 输出用标准 `@type: "HowTo"`（schema.org 标准，搜索引擎/AI 直读）。两者职责分离：CT 服务于运营编辑，schema 服务于 AI/搜索引擎。

```
site                    manyToOne site-config (required)
title                   string max 200 required
slug                    uid unique per site
description             text max 300
coverImage              media
steps                   JSON required                   // [{order, title, content, image, estimatedTime}]
materials               JSON                             // [{name, quantity, note}]
estimatedTime           string max 50
difficulty              enum [beginner, intermediate, advanced] default beginner
result                  text
category                manyToOne article-category
tags                    manyToMany → plugin::zhao-tag.tag
order                   integer default 0
isFeatured              bool default false
viewCount               bigInteger default 0
mainEntity              manyToOne knowledge-entity
mentionedEntities       manyToMany knowledge-entity
structuredData          JSON
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

索引：`(site, slug)` 唯一；`(site, difficulty)`；`(site, status)`。

### 2.2 线索与数据 CT（4 张）

#### CT 10：lead（线索/留资）

```
site                    manyToOne site-config (required)
type                    enum [contact, download, quote, appointment, demo, partner] required
contactName             string max 50
contactPhone            string max 30
contactEmail            email
contactCompany          string max 200
contactTitle            string max 100
message                 text
sourceType              string max 30                   // article/product/case/download/...
sourceId                string                           // 来源内容 documentId
sourceUrl               string max 500
downloadFileId          string                           // type=download 时关联 download CT
utmSource               string max 100
utmMedium               string max 100
utmCampaign             string max 200
utmContent              string max 200
utmTerm                 string max 200
referrer                string max 500
userAgent               string max 500
ipAddress               string max 50
assignedTo              manyToOne admin::user
status                  enum [new, contacted, qualified, unqualified, converted, invalid] default new
followUpRecords         JSON                             // [{time, content, result, createdBy}]
remark                  text
convertedAt             datetime
deletedAt               datetime
```

索引：`(site, type)`；`(site, status)`；`(site, assignedTo)`；`(site, createdAt DESC)`。

不接入软删除物理清理（数据保留合规要求），仅状态置 `invalid`。但 `deletedAt` 字段仍保留，管理端软删除用于隐藏。

#### CT 11：visit-log（访问日志）

```
site                    manyToOne site-config (required)
type                    enum [page_view, article_view, product_view, case_view, download_click, cta_click, search, external_click] required
pageUrl                 string max 500
pageTitle               string max 200
targetType              string max 30
targetId                string
referrer                string max 500
referrerDomain          string max 200
searchKeyword           string max 200
utmSource               string max 100
utmMedium               string max 100
utmCampaign             string max 200
userAgent               string max 500
deviceType              enum [desktop, mobile, tablet] default desktop
browser                 string max 50
os                      string max 50
ipAddress               string max 50
country                 string max 50
region                  string max 100
city                    string max 100
sessionId               string max 100
visitorId               string max 100                  // 匿名访客 ID（cookie）
userId                  manyToOne plugin::users-permissions.user
dwellTime               integer                          // 停留时间（秒）
scrollDepth             integer                          // 滚动深度（百分比）
deletedAt               datetime
```

索引：`(site, type, createdAt)`；`(site, targetType, targetId)`；`(site, visitorId)`；`(site, searchKeyword)`。

**一期降级**：数据量大，采用异步写入（前端埋点通过内存队列缓冲，5 秒批量写入）；数据保留 90 天，由 cron 每日凌晨 3:00 物理删除。

#### CT 17：interaction（内容互动记录）

```
site                    manyToOne site-config (required)
type                    enum [like, collect, share] required
targetType              string max 30 required          // article/product/case/faq/tutorial
targetId                string required
visitorId               string max 100 required
userId                  manyToOne plugin::users-permissions.user
ipAddress               string max 50
userAgent               string max 500
createdAt               datetime
deletedAt               datetime
```

唯一约束：`(site, type, targetType, targetId, visitorId)`（含 `WHERE deleted_at IS NULL`），同一访客对同一内容同类型互动仅一次（toggle 模式）。

索引：`(site, targetType, targetId, type)`；`(site, visitorId)`。

**一期降级**：异步写入，保留 90 天。

#### CT 18：search-log（搜索日志）

```
site                    manyToOne site-config (required)
keyword                 string max 200 required
resultCount             integer default 0
visitorId               string max 100
ipAddress               string max 50
createdAt               datetime
deletedAt               datetime
```

索引：`(site, keyword, createdAt)`；`(site, createdAt DESC)`。

由 search 端点内部写入，无公开管理路由。

### 2.3 GEO 进阶 CT（4 张）

#### CT 12：knowledge-entity（知识图谱实体）

```
site                    manyToOne site-config (required)
entityType              enum [Organization, Person, Product, Service, Place, Event,
                            CreativeWork, Article, CaseStudy, Offer, Review,
                            FAQ, HowTo, BreadcrumbList, Brand, ContactPoint,
                            QuantitativeValue, DefinedTerm] required
name                    string max 200 required
slug                    uid unique per site
identifier              string max 100                  // 内部唯一标识
description             text
sameAs                  JSON                             // 等价实体 URL
image                   media
url                     string max 500
properties              JSON                             // Schema.org 属性 KV
refTargetType           string max 30                   // 关联业务 CT
refTargetId             string
confidence              decimal default 1.0
sourceType              enum [official, derived, manual, imported] default official
lastVerifiedAt          datetime
verificationStatus      enum [verified, pending, outdated, conflict] default verified
verifiedBy              manyToOne admin::user
status                  bool default true
deletedAt               datetime
```

索引：`(site, slug)` 唯一；`(site, entityType)`；`(site, identifier)`。

#### CT 13：knowledge-relation（知识图谱关系三元组）

```
site                    manyToOne site-config (required)
subjectEntity           manyToOne knowledge-entity (required)
predicate               string max 100 required         // Schema.org 属性名
objectEntity            manyToOne knowledge-entity       // 客体为实体
objectValue             JSON                              // 客体为结构化值
objectText              text                              // 客体为纯文本
sourceUrl               string max 500
sourceType              enum [official, derived, manual, inferred] default manual
confidence              decimal default 1.0
lastVerifiedAt          datetime
verificationStatus      enum [verified, pending, outdated, conflict] default verified
status                  bool default true
deletedAt               datetime
```

约束：`objectEntity` 与 `objectValue/objectText` 互斥（service 层校验）。

**predicate 推荐字典**（service 层维护，创建时校验，不在字典内给 warning 不阻止）：

```typescript
const PREDICATE_DICTIONARY = {
  Organization: ['founder', 'foundingDate', 'legalName', 'areaServed',
                 'numberOfEmployees', 'contactPoint', 'location', 'hasOfferCatalog'],
  Person: ['affiliation', 'jobTitle', 'worksFor', 'alumniOf'],
  Product: ['manufacturer', 'brand', 'offers', 'aggregateRating', 'category'],
  Article: ['about', 'mentions', 'author', 'publisher', 'datePublished'],
  CaseStudy: ['subjectOf', 'about', 'mentions'],
  Event: ['organizer', 'location', 'startDate', 'subEvent'],
  FAQ: ['about', 'mentions', 'mainEntity'],
  Tutorial: ['about', 'mentions', 'hasStep'],
  Download: ['about', 'mentions', 'fileFormat'],
};
```

去重约束：`(subject_entity, predicate, object_entity)` 唯一（含 `WHERE object_entity_id IS NOT NULL AND deleted_at IS NULL`），幂等 upsert。

#### CT 14：ai-content-summary（机器可读摘要库）

```
site                    manyToOne site-config (required)
targetType              string max 30 required          // article/product/case/faq/tutorial
targetId                string required
summaryType             enum [tldr, key_facts, faq, qa_pairs, technical_spec,
                            executive_brief, comparison, howto] required
content                 JSON required                   // 结构化内容
contentText             text                            // 纯文本版本（LLM 直读）
language                string max 10 default "zh-CN"
version                 integer default 1               // 版本号（内容更新后递增）
generatedBy             enum [manual, ai_assisted, ai_generated, hybrid] default manual
aiProvider              string max 50
aiModel                 string max 100
generatedAt             datetime
verifiedAt              datetime
verificationStatus      enum [verified, pending, outdated, conflict] default verified
status                  bool default true
deletedAt               datetime
```

唯一约束：`(site, targetType, targetId, summaryType, language)`（service 层保证）。

索引：`(site, targetType, targetId)`；`(site, summaryType)`；`(site, verificationStatus)`。

#### CT 15：first-truth-policy（第一真值策略声明）

```
site                    manyToOne site-config (required)
claim                   string max 200 required          // 真值声明
claimKey                string max 100 required          // 机器可读键
claimCategory           enum [business_license, brand_claim, technical_spec,
                            certification, financial, other] default brand_claim
canonicalEntity         manyToOne knowledge-entity
canonicalValue          text required
canonicalValueType      enum [text, number, date, url, json] default text
canonicalSourceUrl      string max 500
canonicalSourceType     enum [government, official_site, third_party_verified, internal] default official_site
conflictResolution      enum [latest, earliest, highest_confidence, manual] default manual
lastVerifiedAt          datetime required
verificationStatus      enum [verified, pending, outdated, conflict] default verified
conflictDetails         JSON                             // [{foundIn, foundValue, sourceUrl}]
priority                integer default 100              // 高优先级冲突 severity=error
status                  bool default true
deletedAt               datetime
```

唯一约束：`(site, claimKey)`。

索引：`(site, claimCategory)`；`(site, verificationStatus)`。

### 2.4 内容矩阵补充 CT（1 张）

#### CT 16：download（下载文件管理）

```
site                    manyToOne site-config (required)
name                    string max 200 required
description             text max 500
file                    media required                   // Strapi upload
fileType                enum [whitepaper, brochure, datasheet, template, guide, certificate, other] default other
fileSize                bigInteger                       // 自动计算
category                manyToOne article-category
tags                    manyToMany → plugin::zhao-tag.tag
relatedContentType      string max 30
relatedContentId        string
requireLead             bool default true                // 是否需要留资
downloadCount           bigInteger default 0
isFeatured              bool default false
order                   integer default 0
status                  enum [draft, published, archived] default draft
publishedAt             datetime
deletedAt               datetime
```

索引：`(site, fileType)`；`(site, requireLead)`；`(site, status)`。

### 2.5 CT 总清单

| # | CT | 表名 | Tags | 图谱桥 | draftAndPublish |
|---|---|---|---|---|---|
| 01 | seo-config | `zhao_website_seo_configs` | - | - | 否（自定义单例） |
| 02 | brand-info | `zhao_website_brand_infos` | - | mainEntity | 否（自定义单例） |
| 03 | article | `zhao_website_articles` | ✅ | mainEntity + mentionedEntities | 否（status 枚举） |
| 04 | article-category | `zhao_website_article_categories` | - | - | 否 |
| 05 | product | `zhao_website_products` | ✅ | mainEntity + mentionedEntities | 否（status 枚举） |
| 06 | case | `zhao_website_cases` | ✅ | mainEntity + mentionedEntities | 否（status 枚举） |
| 07 | compliance | `zhao_website_compliances` | ✅ | - | 否（status 枚举） |
| 08 | faq | `zhao_website_faqs` | ✅ | mainEntity + mentionedEntities | 否（status 枚举） |
| 09 | tutorial | `zhao_website_tutorials` | ✅ | mainEntity + mentionedEntities | 否（status 枚举） |
| 10 | lead | `zhao_website_leads` | - | - | 否 |
| 11 | visit-log | `zhao_website_visit_logs` | - | - | 否 |
| 12 | knowledge-entity | `zhao_website_knowledge_entities` | - | - | 否 |
| 13 | knowledge-relation | `zhao_website_knowledge_relations` | - | - | 否 |
| 14 | ai-content-summary | `zhao_website_ai_summaries` | - | - | 否 |
| 15 | first-truth-policy | `zhao_website_first_truths` | - | canonicalEntity | 否 |
| 16 | download | `zhao_website_downloads` | ✅ | - | 否（status 枚举） |
| 17 | interaction | `zhao_website_interactions` | - | - | 否 |
| 18 | search-log | `zhao_website_search_logs` | - | - | 否 |

### 2.6 Tags 复用 zhao-tag

所有需要标签的业务 CT（article / product / case / compliance / faq / tutorial / download）通过 `manyToMany → plugin::zhao-tag.tag` 直接关联，并通过 lifecycle 调用 `tag-index.sync()` 同步多态索引。

#### Lifecycle 统一模式

```typescript
// content-types/<ct>/lifecycles.ts
import { syncTagIndex, removeTagIndex } from '../../services/utils/tag-sync';
const TARGET_TYPE = 'website-article'; // 各 CT 区分

export default {
  async afterCreate(event) { await syncTagIndex(event, TARGET_TYPE); },
  async afterUpdate(event) { await syncTagIndex(event, TARGET_TYPE); },
  async afterDelete(event) { await removeTagIndex(event, TARGET_TYPE); },
};
```

#### 跨插件检索

`tag-index.searchByTag(tagId, 'website-article')` → 返回该标签下所有官网文章。Nuxt3 前端可借此实现"相关文章""相关产品""相关案例"。

### 2.7 全站 SEO/GEO 优化要点

#### 多语言 SEO（一期仅配置层）

一期不启用 Strapi i18n 插件，采用以下策略：
- `seo-config.defaultLocale` + `alternateLocales` 配置多语言策略
- Nuxt3 层实现路由前缀：`/zh-CN/...`、`/en-US/...`
- `<link rel="alternate" hreflang="...">` 由 Nuxt3 SSR 渲染输出
- 内容多语言版本一期不做，二期按需启用 Strapi i18n

#### 国内 vs 国际搜索引擎优化矩阵

| 搜索引擎 | 地域 | 关键优化点 | 落地字段/机制 |
|---|---|---|---|
| 百度 | 国内 | 站点验证、sitemap 主动推送、原创内容标记 | `baiduSiteVerification` + 主动推送 service |
| 搜狗 | 国内 | 站点验证、sitemap | 通用 robots + sitemap |
| 神马 | 国内（移动） | 移动适配、MIP（二期） | Nuxt3 SSR 移动优先响应式 |
| 360 搜索 | 国内 | 站点验证、sitemap | 通用 robots + sitemap |
| Google | 国际 | 站点验证、sitemap、结构化数据、hreflang | `googleSiteVerification` + schema.org |
| Bing | 国际 | 站点验证、sitemap、IndexNow | `bingSiteVerification` + IndexNow 推送 |
| Yandex | 俄语区 | 站点验证、IndexNow | `yandexSiteVerification`（存 extraConfig） |
| Naver | 韩语区 | 站点验证 | `naverSiteVerification`（存 extraConfig） |

#### 主动推送 service

```typescript
class SearchEnginePushService {
  async pushToBaidu(siteId, urls: string[])      // 主动推送 URL
  async pushToBing(siteId, urls: string[])       // Bing IndexNow 协议
  async pushToYandex(siteId, urls: string[])     // Yandex IndexNow
  // 文章/产品/案例发布时由 lifecycle 自动触发
  // 配置项放在 seo-config.extraConfig.searchPushTokens
}
```

Google 已不再支持主动推送 API，通过 sitemap + 结构化数据覆盖。

### 2.8 GEO 进阶：品牌知识图谱 + 第一真值

面向 2026+ AI 大模型（豆包/文心一言/GPT/Claude/Gemini/通义/Perplexity 等）作为权威信源的技术支撑体系。区别于传统 SEO（面向关键词匹配），GEO/AEO 面向 LLM 的实体抽取、关系推理、事实核验。

#### 7 大支柱

1. **llms.txt 协议**：类似 robots.txt，面向 LLM 爬虫（GPTBot、ClaudeBot、PerplexityBot、Bytespider 等），声明 AI 爬取范围与机器可读端点
2. **机器可读事实库**：`ai-content-summary.summaryType=key_facts` 输出结构化事实列表，每事实含 `{claim, value, source, confidence, verifiedAt}`
3. **实体引用规范化**：业务 CT 通过 `mainEntity` + `mentionedEntities` 显式标注实体，service 自动建立 `knowledge-relation(predicate="about"/"mentions")`
4. **真值单一源（SSOT）**：`first-truth-policy` 维护关键事实权威值，内容引用时校验一致性，冲突标记 `verificationStatus=conflict`
5. **动态维护**：`lastVerifiedAt` + `verificationStatus` 驱动定期校验；cron 每日扫描 outdated、每周全量校验冲突
6. **AEO 多格式输出**：`application/ld+json`（JSON-LD）、`application/json`（纯事实 API）、`text/plain`（llms.txt）、`text/xml`（sitemap）
7. **内容溯源链（二期）**：`knowledge-relation.predicate="citation"` 记录内容→权威源引用链，`first-truth-policy.canonicalSourceUrl` 自动成为被引用源

#### 业务 CT → 图谱自动派生规则

| 业务 CT | 派生实体 | 派生关系 |
|---|---|---|
| brand-info | Organization（mainEntity） | founder/areaServed/contactPoint/foundingDate 等 |
| article | Article 实体 | about→mainEntity；mentions→mentionedEntities；publisher→Organization |
| product | Product 实体 | manufacturer→Organization；brand→Brand |
| case | CaseStudy 实体 | subjectOf→客户Organization；about→Product |
| faq | FAQ 实体 | about→mainEntity；mainEntity→主题实体 |
| tutorial | HowTo 实体 | about→mainEntity；hasStep→步骤实体 |

---

## §3 路由与 API 设计

### 3.1 路由分层

| 层级 | 前缀 | 鉴权 | 用途 |
|---|---|---|---|
| `publicRoute` | `/v1` | 无 auth | C 端访客 + AI 爬虫 |
| `userRoute` | `/v1` | `is-authenticated` | 登录用户 |
| `adminRoute` | `/v1/admin` | `is-authenticated` + `has-permission` + `has-channel-scope` + `has-tenant-access-loose` | 管理后台 CRUD |

> 路由辅助函数 `publicRoute/userRoute/adminRoute` 仿照 zhao-channel 实现，位于 `server/src/routes/helpers.ts`。

### 3.2 公开路由（C 端 + AI 爬虫，无鉴权）

| Method | Path | Handler | 说明 |
|---|---|---|---|
| **品牌信息** ||||
| GET | `/v1/brand-info` | brand-info.find-public | 企业名片 |
| **资讯文章** ||||
| GET | `/v1/articles` | article.find-public | 文章列表（分页/分类/标签过滤） |
| GET | `/v1/articles/:slug` | article.findOne-public | 文章详情（slug 路由） |
| GET | `/v1/articles/featured` | article.findFeatured-public | 推荐文章 |
| GET | `/v1/articles/search` | article.search-public | 全文搜索（一期 PG ILIKE） |
| GET | `/v1/article-categories` | article-category.find-public | 分类树 |
| **产品/方案** ||||
| GET | `/v1/products` | product.find-public | 产品列表 |
| GET | `/v1/products/:slug` | product.findOne-public | 产品详情 |
| GET | `/v1/products/featured` | product.findFeatured-public | 推荐产品 |
| **落地案例** ||||
| GET | `/v1/cases` | case.find-public | 案例列表 |
| GET | `/v1/cases/:slug` | case.findOne-public | 案例详情 |
| **合规公示** ||||
| GET | `/v1/compliances` | compliance.find-public | 合规列表 |
| GET | `/v1/compliances/:slug` | compliance.findOne-public | 合规详情 |
| **FAQ** ||||
| GET | `/v1/faqs` | faq.find-public | FAQ 列表 |
| GET | `/v1/faqs/:slug` | faq.findOne-public | FAQ 详情 |
| GET | `/v1/faqs/featured` | faq.findFeatured-public | 推荐问答 |
| **教程** ||||
| GET | `/v1/tutorials` | tutorial.find-public | 教程列表 |
| GET | `/v1/tutorials/:slug` | tutorial.findOne-public | 教程详情 |
| **下载** ||||
| GET | `/v1/downloads` | download.find-public | 下载资源列表 |
| GET | `/v1/downloads/:id` | download.findOne-public | 下载详情 |
| POST | `/v1/downloads/:id/request` | download.request-public | 留资后申请下载 |
| GET | `/v1/downloads/:id/file` | download.getFile-public | 校验留资后返回文件 URL |
| **线索 + 互动 + 埋点** ||||
| POST | `/v1/leads` | lead.create-public | 公开留资 |
| POST | `/v1/visit-logs` | visit-log.create-public | 埋点上报（异步） |
| POST | `/v1/interactions` | interaction.create-public | 点赞/收藏/分享 |
| DELETE | `/v1/interactions/:id` | interaction.remove-public | 取消互动 |
| GET | `/v1/interactions/check` | interaction.check-public | 检查互动状态 |
| **SEO/GEO 资源** ||||
| GET | `/v1/sitemap.xml` | seo.sitemap | 站点地图（text/xml） |
| GET | `/v1/robots.txt` | seo.robots | 爬虫规则（text/plain） |
| GET | `/v1/seo-config` | seo-config.find-public | 公开 SEO 元信息（不含验证码） |
| **GEO/AEO 资源** ||||
| GET | `/v1/llms.txt` | llms-txt.generate | AI 爬虫入口 |
| GET | `/v1/llms-full.txt` | llms-txt.generateFull | 完整 AI 摘要文本 |
| GET | `/v1/knowledge-graph.jsonld` | knowledge-graph.exportGraph | 全站知识图谱 |
| GET | `/v1/entity/:slug.jsonld` | knowledge-graph.exportEntity | 单实体 JSON-LD |
| GET | `/v1/entity/:slug/facts.json` | knowledge-graph.exportFacts | 单实体事实列表 |
| GET | `/v1/facts.json` | first-truth.exportFacts | 全站第一真值事实索引 |
| GET | `/v1/ai-summaries` | ai-summary.find-public | AI 摘要列表 |
| GET | `/v1/schema/faq` | schema.faq | FAQ schema |
| GET | `/v1/schema/howto` | schema.howto | HowTo schema |

### 3.3 用户路由（登录用户）

| Method | Path | Handler | 说明 |
|---|---|---|---|
| GET | `/v1/my/leads` | lead.findMine | 查看自己提交的线索 |
| GET | `/v1/my/visit-history` | visit-log.findMine | 个人浏览历史 |

### 3.4 管理路由（`/v1/admin/*`）

共约 55 个端点，按资源分组。每个内容 CT（article/product/case/compliance/faq/tutorial/download）含 5 标准 CRUD + publish/unpublish = 7 端点。seo-config/brand-info 为单例（仅 read + update）。lead 含 assign/followUp/stats。visit-log/interaction/search-log 仅 read + stats + purge。

特殊端点：
- `POST /v1/admin/articles/from-studio` —— studio 一键发布
- `POST /v1/admin/knowledge-graph/sync` —— 全站内容同步图谱
- `POST /v1/admin/knowledge-graph/verify` —— 真值校验
- `GET /v1/admin/knowledge-graph/conflicts` —— 冲突报告
- `GET /v1/admin/knowledge-graph/disambiguate` —— 实体消歧推荐
- `GET /v1/admin/knowledge-graph/predicate-dictionary` —— 谓词字典
- `POST /v1/admin/ai-summaries/:id/regenerate` —— 重新生成摘要
- `POST /v1/admin/first-truths/verify` —— 全量真值校验
- `GET /v1/admin/first-truths/conflicts` —— 冲突报告

### 3.5 权限 action 清单

权限统一由 zhao-auth 管理（zhao-website 不保留 permissions.ts）。权限 key 挂载在 zhao-auth `PERMISSION_TREE.website-center` 节点下。

```typescript
// zhao-auth PERMISSION_TREE 新增节点
"website-center": {
  label: "官网中心", type: "menu",
  children: {
    "menu.website-center": { label: "官网菜单", type: "menu" },
    "seo-config":     { ..., children: { "seo-config.read": {...}, "seo-config.update": {...} } },
    "brand-info":     { ..., children: { "brand-info.read": {...}, "brand-info.update": {...} } },
    "article":        { ..., children: { "article.read/create/update/delete" } },
    "article-category": { ..., children: { "article-category.read/create/update/delete" } },
    "product":        { ..., children: { "product.read/create/update/delete" } },
    "case":           { ..., children: { "case.read/create/update/delete" } },
    "compliance":     { ..., children: { "compliance.read/create/update/delete" } },
    "faq":            { ..., children: { "faq.read/create/update/delete" } },
    "tutorial":       { ..., children: { "tutorial.read/create/update/delete" } },
    "download":       { ..., children: { "download.read/create/update/delete" } },
    "lead":           { ..., children: { "lead.read/update/delete" } },
    "visit-log":      { ..., children: { "visit-log.read/delete" } },
    "interaction":    { ..., children: { "interaction.read/delete" } },
    "search-log":     { ..., children: { "search-log.read/delete" } },
    "knowledge-entity": { ..., children: { "knowledge-entity.read/create/update/delete/manage" } },
    "knowledge-relation": { ..., children: { "knowledge-relation.read/create/update/delete" } },
    "ai-summary":     { ..., children: { "ai-summary.read/create/update/delete" } },
    "first-truth":    { ..., children: { "first-truth.read/create/update/delete/manage" } },
  },
}
```

#### 角色默认权限映射

- **admin**：全部官网权限
- **channel-admin**：除 `first-truth.manage` / `knowledge-entity.manage` / `visit-log.delete` / `interaction.delete` / `search-log.delete` / `compliance.delete` 外的全部
- **plugin-manager**：内容 CT 的 read/create/update；brand-info/seo-config 的 read；lead 的 read/update；日志的 read；图谱的 read；ai-summary 的 read/create；first-truth 的 read
- **instructor**：内容 CT 的 read；brand-info 的 read；lead 的 read
- **user**：无官网管理权限

### 3.6 限流与防滥用

| 端点 | 限流策略 | 反爬措施 |
|---|---|---|
| `POST /v1/leads` | 同 IP 5 次/小时 | honeypot 字段（`website` 字段，人类留空） |
| `POST /v1/visit-logs` | 同 IP 60 次/分钟 | User-Agent 校验 |
| `GET /v1/articles/search` | 同 IP 30 次/分钟 | 关键词长度 ≥ 2 |
| `POST /v1/interactions` | 同 IP 30 次/分钟 | - |

一期用内存 Map 实现，二期接 Redis。限流中间件按路由 `config.policies` 挂载，非全局。

### 3.7 多租户隔离落地

所有 controller 入口从 `ctx.state.siteId` 取租户，service 层强制注入：

```typescript
async findPublic(ctx) {
  const siteId = ctx.state.siteId;
  if (!siteId) return ctx.throw(404, 'Site not found');
  const result = await strapi.plugin('zhao-website').service('article')
    .findPublic({ siteId, ...ctx.query });
  return ctx.body = result;
}
```

所有 service 方法第一个参数强制 `siteId`，杜绝跨租户查询。

### 3.8 响应格式约定

复用 zhao-tag 的响应包装：
- 列表：`{ data: [...], meta: { pagination: { page, pageSize, total, pageCount } } }`
- 单条：`{ data: {...}, meta: {} }`
- 错误：`{ error: { status, name, message, details } }`（由 zhao-common error-handler 统一）

### 3.9 SEO 友好 URL

公开路由使用 slug 而非 documentId：`/v1/articles/:slug`、`/v1/products/:slug`、`/v1/cases/:slug`、`/v1/compliances/:slug`、`/v1/entity/:slug.jsonld`。Nuxt3 前端路由直接映射 `/articles/:slug` 等。

---

## §4 Service 层与跨插件集成

### 4.1 复用清单

| 能力 | 复用来源 | 复用方式 |
|---|---|---|
| 权限策略 | zhao-auth | 路由 policies 直接引用 `plugin::zhao-auth.*` |
| 权限注册 | zhao-auth | 权限 key 合入 `PERMISSION_TREE.menu.website-center` |
| 角色同步 | zhao-auth | `initDefaultRoles()` 自动覆盖同步 |
| 媒体存储 | Strapi upload + zhao-oss | CT 字段用原生 `media` 类型，URL 重写透明 |
| 多租户隔离 | zhao-common | `site-resolver` + `tenant-context-resolver` + `has-tenant-access-loose` |
| 软删除 | zhao-common | 19 个 CT（18 zhao-website + 1 zhao-oss.media-meta）加入白名单 |
| 迁移执行 | zhao-common | 迁移文件放 `server/database/migrations/`，由 `migration-runner` 按顺序执行 |
| 标签体系 | zhao-tag | CT 字段 `manyToMany → plugin::zhao-tag.tag`，lifecycle 调用 `tag-index.sync()` |

### 4.2 Service 层结构

```
server/src/services/
├── index.ts                      # 聚合导出
├── seo-config.ts                 # 租户单例 CRUD（自动创建默认记录）
├── brand-info.ts                 # 租户单例 CRUD
├── article.ts                    # 文章（含 publish/unpublish/search）
├── article-category.ts           # 分类树
├── product.ts / case.ts / compliance.ts / faq.ts / tutorial.ts
├── lead.ts                       # 线索（含 assign/followUp/stats）
├── visit-log.ts                  # 异步写入 + 查询/统计/清理
├── download.ts                   # 下载（含 request/getFile 留资校验）
├── interaction.ts                # 互动（含 check/toggle 去重）
├── search-log.ts                 # 搜索日志
├── knowledge-graph.ts            # 知识图谱（实体/关系/同步/校验/消歧）
├── ai-content-summary.ts         # AI 摘要（含 regenerate）
├── first-truth.ts                # 第一真值（注册/校验/冲突报告）
├── schema-builder.ts             # JSON-LD 构建（Organization/Article/Product/Case/FAQ/HowTo/Breadcrumb）
├── llms-txt.ts                   # llms.txt / llms-full.txt 生成
├── sitemap.ts                    # sitemap.xml 生成
├── robots.ts                     # robots.txt 生成
├── search-engine-push.ts         # 百度/Bing/Yandex 主动推送
├── studio-bridge.ts              # zhao-studio 一键发布桥接
└── utils/
    ├── tag-sync.ts               # tag-index 同步工具
    ├── kg-sync.ts                # 知识图谱自动同步工具
    ├── first-truth-validate.ts   # 真值校验工具
    ├── slug.ts                   # slug 生成 + 唯一性校验
    ├── status.ts                 # status 枚举管理
    └── async-writer.ts           # 异步写入队列
```

### 4.3 跨插件集成

#### 4.3.1 zhao-studio 一键发布

`POST /v1/admin/articles/from-studio` → `studio-bridge.publishFromStudio`：

1. 调用 zhao-studio service 获取 article-draft
2. 复制快照到 article（不建立强引用，独立可编辑）
3. 设置 `sourceType: 'studio'` + `sourceArticleDraft` 溯源字段
4. 默认 `status: 'draft'`，需人工审核发布
5. 触发 tag-index + 知识图谱同步（lifecycle 自动）
6. slug 冲突 → 409 + 回滚不创建半成品
7. draft 修改不影响已发布 article（快照独立）

#### 4.3.2 zhao-tag lifecycle 同步

```typescript
// services/utils/tag-sync.ts
const TARGET_TYPES = {
  article: 'website-article', product: 'website-product',
  case: 'website-case', compliance: 'website-compliance',
  faq: 'website-faq', tutorial: 'website-tutorial',
  download: 'website-download',
};

export async function syncTagIndex(event, targetType) {
  const tagIndexService = strapi.plugin('zhao-tag').service('tag-index');
  const tagIds = (event.result.tags || []).map(t => t.documentId).filter(Boolean);
  await tagIndexService.sync(targetType, event.result.documentId, tagIds);
}
```

#### 4.3.3 知识图谱自动派生（kg-sync）

```typescript
// services/utils/kg-sync.ts
export async function knowledgeGraphSync(targetType, content) {
  const kgService = strapi.plugin('zhao-website').service('knowledge-graph');
  // 1. mainEntity 已显式关联时跳过派生；否则自动创建实体
  // 2. mentionedEntities 自动建立 mentions 关系（幂等 upsert）
  // 3. 失败不抛出（解耦设计，避免阻塞业务 CT 编辑）
}
```

#### 4.3.4 真值校验（first-truth-validate）

```typescript
// services/utils/first-truth-validate.ts
export async function firstTruthValidate(targetType, content) {
  // 扫描内容，对比 first-truth-policy
  // error 级冲突（priority>=80）→ 阻止发布 + 回滚 draft
  // warning 级冲突（priority<80）→ 允许发布 + 记录 conflictDetails
}
```

#### 4.3.5 异步写入队列

```typescript
// services/utils/async-writer.ts
class AsyncWriter {
  private maxQueueSize = 10000;
  enqueue(ct, data) {
    if (this.queue.length >= this.maxQueueSize) {
      strapi.log.warn(`[async-writer:${ct}] queue overflow, dropping oldest`);
      this.queue.shift();
    }
    this.queue.push({ ct, data });
    // 批量或定时 flush
  }
  private async flush() {
    // 批量 knex insert
    // 失败重试 1 次 → 死信表持久化
  }
}
```

visit-log（5s/100条）、interaction（3s/50条）、search-log（10s/200条）各一个 writer。SIGTERM 时 flush 剩余队列。

### 4.4 zhao-oss 前置改造（媒体租户隔离）

#### 4.4.1 新增 CT：media-meta

> 与 `sync-record` 并列：sync-record 跟踪 OSS 同步状态，media-meta 跟踪业务元信息。

```
site                manyToOne site-config (required)
file                oneToOne plugin::upload.file (required)
fileId              integer required                  // upload.file 主键（冗余便于查询）
folder              manyToOne plugin::upload.folder
category            enum [brand, article, product, case, compliance,
                      faq, tutorial, download, avatar, general, other] default general
uploader            manyToOne admin::user
uploaderRole        string max 50                     // 上传时角色快照
modifier            manyToOne admin::user
originalFilename    string max 500
mimeType            string max 100
fileSize            bigInteger
fileExt             string max 20
usageCount          integer default 0                 // 被引用次数（二期）
lastUsedAt          datetime
isPublic            boolean default true
tags                JSON                              // 业务标签
deletedAt           datetime
```

表名：`zhao_oss_media_metas`。索引：`(site, category)`；`(site, uploader)`；`(fileId)` unique；`(folder)`。

#### 4.4.2 folder 路径约定

```
/{siteDomain}/品牌          → category=brand
/{siteDomain}/文章          → category=article
/{siteDomain}/产品          → category=product
/{siteDomain}/案例          → category=case
/{siteDomain}/合规          → category=compliance
/{siteDomain}/问答          → category=faq
/{siteDomain}/教程          → category=tutorial
/{siteDomain}/下载          → category=download
/{siteDomain}/头像          → category=avatar
/{siteDomain}/其他          → category=general
```

site-config 创建时 zhao-oss bootstrap 监听 `afterCreate` → `ensureSiteDefaultFolders(siteDomain)` 自动播种。

#### 4.4.3 uploadFile 改造

```typescript
async uploadFile(params) {
  const { siteId, uploaderId, category = 'general' } = params;
  if (!siteId) throw new Error('siteId is required for tenant isolation');
  // 1. 解析 site domain
  // 2. 确保 folder 存在（/{siteDomain}/{category对应的中文folderName}）
  // 3. 调用原生上传逻辑（写本地 + OSS + upload.file 记录）
  // 4. 创建 media-meta 记录（绑定 site/uploader/category）
  // 5. sync-record 逻辑保持不变
}
```

#### 4.4.4 listFiles 强制租户 + 用户过滤

```typescript
async listFiles(params) {
  const { siteId, userId, userRole } = params;
  // 非管理员强制只看自己的（后端权限收敛，前端无法绕过）
  const isAdmin = ['admin', 'channel-admin'].includes(userRole);
  const effectiveUploaderId = isAdmin ? (params.mineOnly ? userId : undefined) : userId;
  // 通过 media-meta join 查询
}
```

#### 4.4.5 getFolderTree 按租户过滤

只返回 `/{siteDomain}/` 下的 folder 树。

#### 4.4.6 deleteMedia 租户 + 归属校验

- 通过 media-meta 校验文件归属当前租户
- 非 admin/channel-admin 只能删自己上传的
- 软删除 media-meta + 调用 sync-service 清理远端

#### 4.4.7 数据迁移分割

新增 `media-export.ts` service：
- `exportSiteMedia(siteId)` → 导出某租户全部媒体（folder 结构 + 文件元信息 + meta）
- `exportManifest(siteId)` → JSON 清单（一期，审计/核对）
- `importSiteMedia(targetSiteId, exportData)` → 跨租户导入（二期）

### 4.5 媒体组件前端改造（web 端）

#### 4.5.1 uploadToOss 注入 x-site-id

```javascript
// api/media.js
export function uploadToOss(filePath, folder, folderId, category = 'general') {
  const tenantId = uni.getStorageSync('tadmin_current_tenant_id');
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_API}${OSS}/upload`,
      filePath, name: 'file',
      formData: { folder, folderId: folderId || undefined, category },
      header: {
        'Authorization': `Bearer ${getToken()}`,
        'x-site-id': tenantId ? String(tenantId) : '',  // 修复现有 bug
      },
      // ...
    });
  });
}
```

#### 4.5.2 MediaPicker 新增过滤维度

```vue
<script setup>
defineProps({
  // 现有 props...
  category:  { type: String, default: '' },     // 按分类过滤
  mineOnly:  { type: Boolean, default: false }, // 仅显示自己上传的
})
</script>
```

#### 4.5.3 过滤维度矩阵

| 维度 | 来源 | 后端读取 | 前端控制 |
|---|---|---|---|
| site | `x-site-id` header | `ctx.state.siteId`（强制） | TenantSwitcher 切换 |
| uploader | JWT token | `ctx.state.user.id`（非管理员强制） | `mineOnly` prop |
| category | query param | `ctx.query.category` | `category` prop |
| folder | query param | `ctx.query.folderPath` | folder 树选择 |

#### 4.5.4 权限分级

| 角色 | 可见范围 | 可上传 | 可删除 |
|---|---|---|---|
| admin / channel-admin | 当前租户全部 | ✅ | 当前租户全部 |
| plugin-manager | 当前租户全部 | ✅ | 自己上传的 |
| instructor / user | 自己上传的 | ✅ | 自己上传的 |

后端实现：非管理员强制注入 `uploader: userId`，即使前端传 `mineOnly=false` 也无效。

---

## §5 bootstrap / register / 迁移设计

### 5.1 插件加载顺序

`zhao-common/server/src/services/migration-runner.ts` 的 `PLUGIN_ORDER` 新增 `zhao-website`（排在最后，依赖 common/tag/oss/auth/studio）。

`basic/config/plugins.ts` 同步新增 `zhao-website` 注册。

### 5.2 register 阶段

```typescript
const register = ({ strapi }) => {
  // 注册权限策略 handler 到 zhao-auth policy-registry
  strapi.plugin('zhao-auth').service('policy-registry')
    .register('has-website-permission', { handler: require('./policies/has-website-permission') });
  // 注册限流中间件
  strapi.server.use(require('./middlewares/rate-limit'));
};
```

### 5.3 bootstrap 阶段

```typescript
const bootstrap = ({ strapi }) => {
  registerContentLifecycles(strapi);     // 跨 CT lifecycle 订阅
  registerCronJobs(strapi);             // 3 个 cron 任务
  initAsyncWriters(strapi);             // 异步写入队列
  setTimeout(() => initTenantSingletons(strapi), 5000);  // 延迟初始化租户单例
};
```

#### Lifecycle 订阅

- 各 CT 自身的 tag-sync / kg-sync / first-truth-validate 通过 `content-types/<ct>/lifecycles.ts` 声明，Strapi 自动加载
- bootstrap 仅订阅跨 CT / 跨插件事件：
  - `site-config afterCreate` → ensureDefault（seo-config + brand-info）
  - 内容 CT `afterUpdate` status=published → search-engine-push

#### Cron 任务

```typescript
// 每日凌晨 3:00 清理 90 天日志
'0 3 * * *': async () => { /* 物理删除 90 天前 visit-log/interaction/search-log */ }

// 每日凌晨 4:00 扫描过期真值（30 天未校验）
'0 4 * * *': async () => { /* firstTruth.markOutdated(siteId) */ }

// 每周日凌晨 5:00 全量真值冲突校验
'0 5 * * 0': async () => { /* firstTruth.verifyAll(siteId) */ }
```

### 5.4 迁移脚本

#### zhao-website 迁移（4 个）

```
zhao-website/server/database/migrations/
├── 001_create_core_tables.js              # 18 个 CT 建表后补索引/约束
├── 002_add_composite_indexes.js           # 组合索引
├── 003_seed_default_predicate_dictionary.js  # 知识图谱谓词字典种子
└── 004_seed_default_first_truth_categories.js # 第一真值分类种子
```

**001_create_core_tables.js** 关键索引：
- `zhao_website_articles_site_slug_idx` UNIQUE `(site_id, slug) WHERE deleted_at IS NULL`
- `zhao_website_articles_site_status_published_idx` `(site_id, status, published_at DESC)`
- 7 个内容 CT 的 `site_slug_idx`
- `zhao_website_knowledge_entities_site_slug_idx` UNIQUE
- `zhao_website_knowledge_relations_entity_triple_idx` UNIQUE `(subject_entity_id, predicate, object_entity_id) WHERE object_entity_id IS NOT NULL AND deleted_at IS NULL`
- `zhao_website_ai_summaries_target_idx` UNIQUE `(site_id, target_type, target_id, summary_type, language) WHERE deleted_at IS NULL`
- `zhao_website_first_truths_site_claim_key_idx` UNIQUE `(site_id, claim_key) WHERE deleted_at IS NULL`
- `zhao_website_interactions_dedup_idx` UNIQUE `(site_id, type, target_type, target_id, visitor_id) WHERE deleted_at IS NULL`
- `zhao_website_visit_logs_site_created_idx`
- `zhao_website_search_logs_site_keyword_idx`

所有索引使用 `IF NOT EXISTS` 保证幂等。`down` 删除所有索引。

#### zhao-oss 改造迁移（2 个）

```
zhao-oss/server/database/migrations/
├── 001_backfill_media_meta.js              # 存量 upload.file 回填 media-meta
└── 002_seed_tenant_default_folders.js      # 为现有租户播种默认 folder
```

**001_backfill_media_meta.js**：
- 取默认租户（第一个 site-config）
- 确保默认租户的 `/其他` folder 存在
- 遍历存量 `upload.file`，跳过已有 meta 的，回填到默认租户 + category=general

**002_seed_tenant_default_folders.js**：
- 遍历所有 site-config
- 为每个租户调用 `mediaService.ensureSiteDefaultFolders(siteDomain)`

### 5.5 软删除白名单更新

`zhao-common/server/src/services/soft-delete.ts` 新增 19 个 CT（18 zhao-website + 1 zhao-oss.media-meta）。

> 注意：`visit-log` / `interaction` / `search-log` 虽接入软删除白名单，但一期由 cron 按 90 天物理删除。

### 5.6 zhao-auth 权限树更新

`zhao-auth/server/src/permissions.ts`：
- `PERMISSION_TREE` 新增 `website-center` 节点
- `DEFAULT_ROLE_PERMISSIONS` 新增 5 个角色的权限映射
- `bootstrap.ts` 的 `initDefaultRoles()` 自动同步

### 5.7 启动时序

```
1. Strapi 加载 config/plugins.ts
2. 各插件 register() 执行
   - zhao-website.register: 注册 policy handler + 限流中间件
3. 各插件 bootstrap() 执行（按 PLUGIN_ORDER 顺序）
   - zhao-common.bootstrap:
     a. migration-runner.runAllMigrations()  ← 先执行所有迁移
        - zhao-oss: 001_backfill_media_meta / 002_seed_tenant_default_folders
        - zhao-website: 001_create_core_tables / 002_add_composite_indexes / 003 / 004
     b. 挂载 tenant-context-resolver + site-resolver 中间件
     c. 订阅 soft-delete lifecycle
   - zhao-oss.bootstrap:
     a. 订阅 upload.file afterCreate/beforeDelete
     b. 注册 URL 重写中间件
     c. 订阅 site-config afterCreate → ensureSiteDefaultFolders（新增）
   - zhao-website.bootstrap:
     a. 注册跨 CT lifecycle
     b. 注册 cron（3 个定时任务）
     c. 初始化异步写入队列
     d. setTimeout(5000) 延迟初始化租户单例
4. Strapi 启动 HTTP 服务
5. setTimeout(3000) zhao-auth 角色同步执行
6. setTimeout(5000) zhao-website 租户单例初始化执行
```

### 5.8 配置变更清单

| 文件 | 变更 |
|---|---|
| `basic/config/plugins.ts` | 新增 `zhao-website` 插件注册 |
| `zhao-common/server/src/services/migration-runner.ts` | PLUGIN_ORDER 新增 `zhao-website` |
| `zhao-common/server/src/services/soft-delete.ts` | 白名单新增 19 个 CT |
| `zhao-auth/server/src/permissions.ts` | PERMISSION_TREE 新增 `website-center` + DEFAULT_ROLE_PERMISSIONS |
| `zhao-oss/server/src/bootstrap.ts` | 新增 site-config afterCreate 监听 |
| `zhao-oss/server/src/services/media-service.ts` | uploadFile/listFiles/getFolderTree/deleteFile 改造 + ensureSiteDefaultFolders |
| `zhao-oss/server/src/controllers/api-controller.ts` | upload/listFiles/delete 接口改造 |
| `zhao-oss/server/src/routes/content-api.ts` | `/media/*` 路由追加 has-channel-scope + has-tenant-access-loose + 新增 media-export 路由 |
| `zhao-website/server/src/bootstrap.ts` | 新建 |
| `zhao-website/server/src/register.ts` | 新建 |
| `zhao-website/server/database/migrations/` | 4 个迁移脚本 |
| `zhao-oss/server/database/migrations/` | 2 个迁移脚本（首次落地） |
| `web/src/api/media.js` | uploadToOss 注入 x-site-id + category；getOssMediaList 新增 category/mineOnly |
| `web/src/components/MediaPicker.vue` | 新增 category/mineOnly prop |
| `web/src/components/RichEditor.vue` | 调用 MediaPicker 时传 category |

---

## §6 错误处理与边界情况

### 6.1 错误分类

| 等级 | HTTP | name | 触发场景 |
|---|---|---|---|
| 业务校验错误 | 400 | ValidationError | 字段校验/slug 重复/status 非法 |
| 权限不足 | 403 | ForbiddenError | 无权限/跨租户访问 |
| 资源不存在 | 404 | NotFoundError | slug 不存在/已删除 |
| 冲突错误 | 409 | ConflictError | 真值冲突/三元组重复/slug 冲突 |
| 限流错误 | 429 | RateLimitError | 公开 API 超频 |
| 系统错误 | 500 | InternalError | 异步写入失败/外部服务异常 |

### 6.2 租户隔离失败

- 公开路由无 x-site-id → 404 `SITE_NOT_RESOLVED`
- 管理路由跨租户访问 → has-tenant-access-loose policy 拦截 403
- service 层强制 `siteId` 必填，未传抛错

### 6.3 异步写入失败

- 队列溢出（>10000）：丢弃最旧数据 + 日志告警，不阻塞 C 端请求
- 批量写入失败：重试 1 次 → 死信表持久化，不丢数据
- 进程退出：SIGTERM 时 flush 剩余队列

### 6.4 知识图谱边界

- **自引用**：subjectId === objectEntityId → 400 `Self-relation not allowed`
- **循环引用**：仅对层级关系（parent/containsPlace/subEvent/hasPart）检测，非层级双向引用允许
- **客体互斥**：objectEntity 与 objectValue/objectText 同时存在 → 400；都为空 → 400
- **消歧置信度**：< 0.7 返回 null，由调用方决定是否创建新实体
- **同步失败**：kg-sync 失败不抛出（解耦设计），仅记录 warning 日志，不阻塞业务 CT 编辑
- **幂等**：同 S+P+O 不重复创建，返回已有关系

### 6.5 第一真值冲突

- **error 级冲突**（priority >= 80）：阻止发布 + 回滚到 draft + 抛出 ConflictError
- **warning 级冲突**（priority < 80）：允许发布 + 记录到 `first-truth-policy.conflictDetails`
- **真值更新**：触发关联 entity `verificationStatus=pending`
- **30 天未校验**：cron 标记 `outdated`
- **每周全量校验**：cron 扫描所有真值，输出冲突报告

### 6.6 SEO/GEO 资源生成失败

- sitemap 生成失败 → 降级返回最小 sitemap（仅首页）
- llms.txt 生成失败 → 降级返回品牌信息 + 首页
- search-engine-push 失败 → 各引擎独立失败（Promise.allSettled），不阻塞发布流程

### 6.7 studio-bridge 失败

- article-draft 不存在 → 404
- slug 冲突 → 409 + 回滚（不创建半成品 article）
- 部分成功回滚：已创建 article 在后续步骤失败时删除

### 6.8 媒体失败

- 上传无 siteId → 403 `SITE_REQUIRED`
- 文件大小超限（50MB）→ 400
- OSS 上传失败 → 重试 3 次（指数退避）→ 清理本地临时文件 → 抛出
- 存量文件无 media-meta → 降级（仅 admin 可见无 meta 文件，非管理员返回空列表）

### 6.9 限流与反爬

- 超频 → 429 `RATE_LIMITED` + `retryAfter`
- honeypot 字段非空 → 假装成功（200）+ 不写 DB（避免机器人重试）

### 6.10 数据一致性

- **slug 竞争**：service 层校验 + DB 唯一索引双重保障
- **软删除后 slug 复用**：唯一索引含 `WHERE deleted_at IS NULL`，软删除记录的同 slug 可复用
- **interaction 去重**：toggle 模式（已点赞再点取消），唯一约束兜底
- **知识图谱与业务 CT 解耦**：kg-sync 失败不阻塞业务 CT 编辑

---

## §7 测试与验收

### 7.1 测试分层

```
E2E 验收（手动 + 脚本）         ← §7.7
API 集成测试（路由 + service + DB）  ← §7.4
Service 单元测试（纯逻辑 + mock）    ← §7.3
迁移测试（up/down 幂等）             ← §7.5
```

### 7.2 测试环境

- 数据库：sqlite（单元测试）或 pg-test 容器（集成测试）
- 迁移自动执行（zhao-common migration-runner 在 bootstrap 调用）
- 测试框架：Jest + supertest

### 7.3 Service 单元测试关键用例

#### knowledge-graph.test.ts

- `addRelation` 应拒绝自引用
- `addRelation` 应拒绝 objectEntity 与 objectValue 同时存在
- `addRelation` 应检测层级关系循环引用
- `addRelation` 应幂等（同 S+P+O 不重复创建）
- `addRelation` 应允许非层级关系的双向引用
- `disambiguate` 无候选时返回 null
- `disambiguate` 置信度 < 0.7 时返回 null
- `disambiguate` 精确匹配返回高置信度
- `syncFromContent` mainEntity 已显式关联时跳过派生
- `syncFromContent` mentionedEntities 自动建立 mentions 关系
- `syncFromContent` 失败不抛出（解耦）

#### first-truth.test.ts

- 内容含真值关键词但值匹配时不报冲突
- 内容含真值关键词但值不匹配时报 error 冲突
- 低优先级真值冲突为 warning
- `verifyAll` 应返回冲突报告
- 30 天未校验的真值标记为 outdated

#### async-writer.test.ts

- 队列满时丢弃最旧数据
- flush 失败后重试 1 次
- 重试仍失败写入死信表

### 7.4 API 集成测试关键用例

#### 多租户隔离

- A 租户文章在 B 租户不可见
- B 租户用户不能编辑 A 租户文章（403）
- 公开路由无 x-site-id 返回 404
- 公开路由按域名解析站点

#### 公开 C 端 API

- 仅返回 published 状态的内容
- 按分类/标签过滤
- 分页正确
- slug 不存在返回 404

#### GEO/AEO 资源端点

- `GET /v1/llms.txt` 返回 text/plain，包含站点摘要 + 资源链接
- `GET /v1/knowledge-graph.jsonld` 返回合法 JSON-LD @graph
- `GET /v1/sitemap.xml` 返回合法 XML
- `GET /v1/facts.json` 返回第一真值列表
- `GET /v1/entity/:slug.jsonld` 包含入边和出边关系

#### 限流

- `POST /v1/leads` 超 5 次/小时返回 429
- honeypot 字段非空时假装成功 + 不写入 DB

#### 媒体租户隔离

- listFiles 仅返回当前租户文件
- 非管理员仅能看自己上传的
- uploadToOss 无 x-site-id 返回 403
- A 租户用户不能删 B 租户文件（404）

### 7.5 迁移测试

- `001_create_core_tables` up 应创建所有唯一索引
- `001_create_core_tables` down 应删除所有索引
- `001_create_core_tables` 重复执行不报错（幂等）
- `001_backfill_media_meta` 存量 upload.file 回填到默认租户
- `001_backfill_media_meta` 已有 media-meta 的文件不重复回填

### 7.6 studio-bridge 集成测试

- article-draft → article 快照复制成功
- article-draft 不存在时返回 404
- slug 冲突时回滚（不创建半成品 article）
- 发布后 article 与 draft 独立编辑互不影响

### 7.7 端到端验收清单

#### 启动与迁移

- [ ] `npm run develop` 启动无报错
- [ ] `zhao_schema_migrations` 表新增 6 条记录
- [ ] 18 个 `zhao_website_*` 表已创建
- [ ] `zhao_oss_media_metas` 表已创建
- [ ] 现有 site-config 的默认 folder 已播种
- [ ] 现有 upload.file 已回填 media-meta

#### 权限验证

- [ ] admin 可见官网中心全部菜单
- [ ] channel-admin 可见官网中心（除 manage/delete 外）
- [ ] plugin-manager 可见官网中心（仅 read/create/update）
- [ ] instructor 仅可见 read 权限
- [ ] user 不可见官网中心

#### 内容 CRUD

- [ ] 创建文章 → slug 自动生成 → status=draft
- [ ] 发布文章 → status=published + publishedAt 设置
- [ ] 归档文章 → status=archived → 公开路由不可见
- [ ] 软删除文章 → 公开路由不可见 → 软删除后同 slug 可复用
- [ ] 文章关联 tag → tag-index 同步 → 按 tag 查询返回正确

#### 多租户隔离

- [ ] A 租户创建文章，B 租户管理端不可见
- [ ] B 租户用户用 A 租户 documentId 访问 → 403
- [ ] 公开路由无 x-site-id → 404
- [ ] 公开路由按 Host 域名解析 → 正确返回对应租户内容

#### 媒体租户隔离

- [ ] A 租户上传文件 → 仅 A 可见
- [ ] 非管理员仅看自己上传的
- [ ] A 用户删除 B 租户文件 → 404
- [ ] uploadToOss 请求头含 x-site-id

#### GEO/AEO 资源

- [ ] `GET /v1/llms.txt` 返回 text/plain
- [ ] `GET /v1/knowledge-graph.jsonld` 返回合法 JSON-LD
- [ ] `GET /v1/entity/:slug.jsonld` 返回单实体 + 关系
- [ ] `GET /v1/facts.json` 返回第一真值
- [ ] `GET /v1/sitemap.xml` 返回合法 sitemap
- [ ] `GET /v1/robots.txt` 返回正确规则

#### 知识图谱

- [ ] 创建实体 → JSON-LD 输出正确
- [ ] 创建关系（实体→实体）→ entity/:slug.jsonld 的 outgoing 含该关系
- [ ] 自引用 → 400
- [ ] 层级关系循环引用 → 400
- [ ] 非层级关系双向引用 → 允许
- [ ] 文章发布 → mainEntity/mentionedEntities 自动同步 mentions 关系
- [ ] 同 S+P+O 重复创建 → 幂等返回已有关系

#### 第一真值

- [ ] 注册真值声明 → facts.json 输出
- [ ] 发布含矛盾内容的文章 → error 级冲突 → 阻止发布 + 回滚 draft
- [ ] 发布含 warning 级冲突的文章 → 允许发布 + conflictDetails 记录
- [ ] 真值更新 → 关联 entity verificationStatus=pending
- [ ] 30 天未校验 → cron 标记 outdated

#### 线索与互动

- [ ] POST /v1/leads 公开留资 → 立即返回成功
- [ ] 同 IP 6 次/小时 → 第 6 次返回 429
- [ ] honeypot 字段非空 → 假装成功 + 不写入 DB
- [ ] POST /v1/interactions 点赞 → count +1
- [ ] 再次点赞 → 取消（toggle）→ count -1
- [ ] POST /v1/visit-logs → 立即返回 → 5 秒后 DB 可查（异步）

#### studio-bridge

- [ ] zhao-studio article-draft 一键发布 → zhao-website article 创建（sourceType=studio）
- [ ] 默认 status=draft，需人工发布
- [ ] 修改原 draft 不影响已发布 article
- [ ] slug 冲突 → 409 + 不创建半成品

#### 搜索引擎推送

- [ ] 文章发布 → 自动推送百度/Bing/Yandex（需配置 token）
- [ ] 推送失败不阻塞发布流程

#### 异步写入与清理

- [ ] visit-log 批量写入（>100 条/5 秒）→ 一次性 flush
- [ ] interaction 队列溢出 → 丢弃最旧 + 日志告警
- [ ] 凌晨 3:00 cron 清理 90 天前日志
- [ ] SIGTERM 时 flush 剩余队列

### 7.8 测试覆盖率目标

| 模块 | 单元测试覆盖率 | 集成测试覆盖 |
|---|---|---|
| knowledge-graph service | ≥ 90% | 关键路径 |
| first-truth service | ≥ 90% | 关键路径 |
| async-writer | ≥ 85% | - |
| 多租户隔离 | - | 100% 路由 |
| 媒体租户隔离 | - | 100% 路由 |
| GEO/AEO 资源端点 | - | 100% 路由 |
| studio-bridge | ≥ 80% | 关键路径 |
| 迁移脚本 | - | up/down 幂等 |

---

## §8 一期 vs 二期划分总览

### 8.1 一期交付（必须）

| 能力 | 说明 |
|---|---|
| 18 个 CT 建表 + 索引 | 含组合唯一索引、复合索引 |
| media-meta CT + 存量回填 | zhao-oss 前置改造 |
| 租户默认 folder 播种 | 10 个默认分类 |
| 媒体租户隔离 | listFiles/getFolderTree/upload/delete 全链路 |
| 媒体组件前端改造 | uploadToOss 注入 x-site-id + category/mineOnly 维度 |
| 软删除白名单扩展 | 19 个 CT |
| 权限树扩展 + 角色同步 | zhao-auth website-center 节点 |
| 内容 CRUD（7 个内容 CT + 单例 2 个） | article/product/case/compliance/faq/tutorial/download + seo-config/brand-info |
| 线索 + 互动 + 埋点 | lead/interaction/visit-log/search-log |
| 知识图谱（实体 + 关系 + 同步 + 校验 + 消歧） | 含 predicate 字典 |
| AI 摘要（手动 CRUD + regenerate 桩） | 8 种 summaryType |
| 第一真值（注册 + 校验 + 冲突报告） | 含 cron 定时扫描 |
| Schema builder（Organization/Article/Product/Case/FAQ/HowTo/Breadcrumb） | JSON-LD 输出 |
| llms.txt / llms-full.txt | AI 爬虫入口 |
| knowledge-graph.jsonld / entity/:slug.jsonld / facts.json | 机器可读端点 |
| sitemap.xml / robots.txt | 搜索引擎资源 |
| 搜索引擎主动推送 | 百度/Bing/Yandex |
| studio-bridge 一键发布 | 快照复制 + 溯源 |
| 异步写入队列（内存） | visit-log/interaction/search-log |
| 90 天日志清理 cron | 每日凌晨 3:00 |
| 真值扫描 + 冲突校验 cron | 每日 4:00 + 每周日 5:00 |
| 限流中间件（内存 Map） | 4 个公开端点 |
| honeypot 反爬 | lead 公开提交 |
| 完整测试套件 | 单元 + 集成 + 迁移 + E2E |

### 8.2 二期交付（可选）

| 能力 | 说明 |
|---|---|
| AI 辅助摘要生成 | 接入 zhao-studio.ai-assist |
| 知识图谱可视化编辑器 | 管理端图形化编辑 |
| 实体合并 | 发现重复实体时合并 |
| 图谱快照/回滚 | 稳健运营后需要 |
| citation 链查询 | 内容溯源链 |
| Wikidata/百度百科实体对齐 | 跨知识库对齐 |
| 多语言知识图谱 | 多语言内容版本 |
| 向量检索（LLM RAG 接入） | 语义检索 |
| 全文搜索升级（MeiliSearch） | 替代 PG ILIKE |
| 内容多语言版本 | 启用 Strapi i18n |
| 神马 MIP / AMP | 移动加速 |
| SEO 统计仪表盘 | 排名/收录/点击分析 |
| 真值冲突自动裁决 | 替代人工裁决 |
| 知识图谱同步失败重试 | 死信重试机制 |
| 异步队列升级 Redis/Bull MQ | 替代内存队列 |
| 限流升级 Redis | 替代内存 Map |
| 媒体引用计数（usageCount） | 被引用次数自动统计 |
| 媒体使用位置追踪 | 被哪些 CT 引用 |
| 私域文件签名 URL | 私域文件访问 |
| 媒体完整导出（含二进制） | 跨租户迁移 |
| 跨租户媒体导入 | 数据迁移 |
| Interaction 热力图分析 | 用户行为分析 |
| Search-log 长尾词挖掘 | 内容缺口提示 |
| Download 下载渠道归因 | 获客分析 |
| Interaction 数据冷存储归档 | 替代物理删除 |
| Visit-log 冷存储归档 | 替代物理删除 |

---

## 附录 A：关键设计决策汇总

1. **单插件方案 A**：18 个 CT 集中在 `zhao-website` 一个插件内，YAGNI，关联紧密，符合项目惯例，可演进
2. **status 枚举替代 draftAndPublish**：含 `archived` 状态，便于与 lifecycle/tag-index/知识图谱派生统一协调
3. **Tags 复用 zhao-tag**：通过 manyToMany + tag-index 多态索引，避免重复建设
4. **Tutorial CT + HowTo schema**：CT 命名用 tutorial（业务语义丰富），schema 输出用 HowTo（schema.org 标准），职责分离
5. **seo-config 独立 CT**：而非塞入 brand-info，职责清晰
6. **first-truth-policy 独立 CT**：而非放 seo-config.extraConfig，便于扩展
7. **knowledge-relation 三元组模型**：S-P-O，客体支持实体引用或字面值，符合 W3C RDF 标准
8. **predicate 推荐字典**：service 层校验，不在字典内给 warning 不阻止，避免自由文本导致图谱不一致
9. **ai-content-summary.version 字段**：支持内容迭代的摘要版本管理
10. **权限统一由 zhao-auth 管理**：zhao-website 不保留 permissions.ts，避免双源冲突
11. **studio-bridge 快照复制**：不建强引用，独立可编辑，sourceArticleDraft 保留溯源
12. **异步写入用内存队列**：一期，二期升级 Redis/Bull MQ
13. **限流中间件按路由挂载**：非全局，4 个公开端点
14. **honeypot 反爬**：假装成功 + 不写 DB，避免机器人重试
15. **不改 plugin::upload.file schema**：沿用 zhao-oss 现有"独立关联表"模式，新增 media-meta CT
16. **folder 用 `/{siteDomain}/{category}` 命名约定**：物理路径隔离 + media-meta 双重保障
17. **存量数据回填到默认租户 + general 分类**：不破坏现有引用
18. **非管理员强制只看自己上传的**：后端权限收敛，前端 mineOnly 仅是 UI 开关
19. **uploadToOss 必须注入 x-site-id**：修复现有 bug
20. **真值冲突 error 级阻止发布**：避免 AI 抓取矛盾信息
21. **kg-sync 失败不阻塞业务**：解耦设计，避免编辑文章时因图谱异常卡住
22. **interaction toggle 模式**：已点赞再点取消，唯一约束兜底

---

**文档结束**

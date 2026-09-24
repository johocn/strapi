# GEO 文章发布与前端页面 设计文档

> 日期：2026-09-06
> 状态：已通过分节确认（第 1-5 节全部认可）

## 一、目标与范围

在 strapi-site（Next.js App Router + TypeScript + 纯 CSS）上实现 GEO 文章发布与前端展示闭环：

- **后台**：Strapi content-manager 表单承载 GEO 文章全部录入字段（基础/E-E-AT/SEO/合规/业务闭环/审核 6 大类）

- **前端**：三种类型页面（科普文章 / 问答 / 本地报告）SSR 渲染，纳入四级可回退风格模板体系

- **闭环**：阅读 → 三种出口（跳转电商商品 / 表单留资拿积分 / 悬浮客服咨询），行为埋点回传运营迭代

### 范围分层（实施计划分 3 Phase）

| Phase | 内容                                              | 交付物                                                |
| ----- | ----------------------------------------------- | -------------------------------------------------- |
| 1 后端  | `geo-article` 内容类型 + 内容 API + content-filter 扩展 | 6 大类字段 schema、3 个公开接口、status 四态过滤                  |
| 2 前端  | GEO 文章页面纳入模板体系 + 11 个 GEO 模块                    | 3 个固定路由、GeoArticleView 渲染组件、模块组件                   |
| 3 集成  | 埋点 / 积分 / 留资 / 小程序跳转                            | trackGeoEvent SDK、earnPoints 对接、lead 落库、WebView 跳转 |

## 二、内容模型：`geo-article`

单一内容类型 + `type` 枚举，三类型共用一套字段；localized 多语言；`status` 四态（草稿/待审核/已发布/归档）。

```jsonc
// plugin::zhao-website.geo-article（collectionName: zhao_website_geo_articles）

// —— 1 基础通用 ——
"title": string(200, required, localized)
"slug": uid(targetField: title, required, localized)
"content": richtext(required, localized)          // 富文本：文字/表格/图片/锚链接/引用
"type": enum[geo-article|geo-faq|local-report](required, default geo-article)
"faqQuestion": string(200, localized)              // type=geo-faq 时替代 title 结构
"publishedAt": datetime
"articleNo": string(32, unique)                    // 唯一数字标签，前端展示
"authorName": string(50)                           // 作者姓名
"authorBio": text                                  // 从业背景简介（E-E-AT 背书）
"status": enum[draft|review|published|archived](default draft)
"category": relation → article-category            // 吉林本地相关标签
"tags": relation → zhao-tag.tag（复用现有）

// —— 2 E-E-AT 信任体系 ——
"sourceName": string(100)                          // 权威来源名称
"sourceUrl": string(500)                           // 来源 URL
"sourcePublishedAt": datetime                      // 来源发布时间
"serviceScope": text                               // 服务区县/自提仓库/线下咨询地址/履约时效/配送范围
"businessData": json                               // [{period, content, caliber}] 统计口径
"caseContent": text                                // 客观事实案例（描述提示：禁止收益承诺）
"internalLinks": json                              // [{text, url}] 1-2 处内部锚文本

// —— 3 SEO 结构化 ——
"metaTitle": string(60, localized)
"metaDescription": string(160, localized)          // 提示：包含吉林本地场景词
"canonicalUrl": string(500, localized)
"jsonLdType": enum[Article|FAQPage|LocalBusiness](default Article)
"coverImage": media

// —— 4 合规 ——
"isFinance": boolean(default false)                // 金融内容开关
"riskDisclaimer": text(localized)                  // 免责附加文本（默认模板可微调）

// —— 5 业务闭环 ——
"ctaType": enum[none|download-list|consult-appointment](default none)
"leadFormEnabled": boolean(default false)          // 留资表单开关
"vendureProductListId": string(50)                 // 关联 Vendure 商品列表
"readPoints": integer(default 0)                   // 阅读/提交后发放积分值
"miniProgramPath": string(200)                     // WebView 跳小程序原生商品页

// —— 6 审核 ——
"reviewerName": string(50)
"reviewedAt": datetime
"reviewChecks": json                              // {eaat, tech, compliance, business} 四个 bool
"reviewNote": text                                 // 上线备注

// —— 7 补充字段（模块渲染承载，2026-09-06 第 4 节增补）——
"summaryPoints": text(localized)                   // 知识点总结
"localTips": text(localized)                       // 本地注意事项
"infoBoundary": text(localized)                    // 信息边界说明（适用场景/局限性）
```

**字段描述（description）提示**：

- `caseContent`：「仅客观事实描述，禁止收益承诺」

- `readPoints`：「用户阅读/下载提交后发放积分数量」

- `metaDescription`：「建议包含吉林本地场景词」

**约束**：

- 审核字段放模型内（不走独立审核单、不关联用户表，避免跨插件依赖）

- 留资、埋点、积分、商品跳转全部走既有中间层/接口，geo-article 插件层只做**只读消费**，不跨表直查

## 三、后端 API（Phase 1）

### 路由（注册到 zhao-website content-api，走 site-resolver 识别租户）

```
GET /geo-articles                // 列表（?type=&page=&pageSize=&category=&tag=&locale=）
GET /geo-articles/:slug          // 详情（?locale=），返回含兄弟翻译 localizations
GET /geo-articles/featured       // 精选（?type=local-report&limit=）
```

- **单一 slug 详情接口**：前端按 type 生成 URL 前缀，后端只按 slug 查，不做三套接口

- 详情返回结构复用 article 模式：正文 + `localizations`（同 document 各语言 slug/title），供 hreflang 与 302 回退

### content-filter 扩展

- `buildWhere(siteId, uid, extra, locale)` 对 geo-article 的 `status` 过滤：**仅** **`published`** **对外可见**，draft/review/archived 一律不出现

- 站点隔离（siteScoped）、软删排除（excludeDeleted）、allowIndex（strict/auto/off）自动继承现有逻辑

- geo-article 全部公开查询走 content-filter，不写裸 where

### 管理端

- 走 Strapi 默认 content-manager 表单，schema `description` 承载运营提示，不新增自定义 admin 页面

- 审核操作在 content-manager 内完成（改 status + 填审核字段）

## 四、前端页面（Phase 2）

### 路由（纳入 \[locale] 子目录体系，无前缀=默认语言）

```
/geo-article/[slug]      → 科普文章
/geo-faq/[slug]          → 问答
/local-report/[slug]     → 本地报告
```

三个固定路由文件共享 `GeoArticleView` 渲染组件（数据获取 + 模块组装 + SEO 输出），薄壳路由各自校验 type 与回退，避免三份重复。

### 三级页面类型配置（模板体系新增，未配置逐级回退 pages.detail → 内置默认）

```
pages.geoArticle.modules    = ["risk-tip","breadcrumb","article-header","geo-body","citation",
                                "internal-link","summary-tips","info-boundary","cta","lead-form","geo-footer"]
pages.geoFaq.modules        = [同结构，正文为问答结构]
pages.localReport.modules   = [同结构]
```

### 11 个 GEO 模块与 Strapi 字段映射

| 模块                        | 渲染条件                               | 字段（类型）                                                                                                                               | 来源层级 |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| **risk-tip** 风险提示条        | `isFinance=true` 才渲染，置顶不可折叠        | `isFinance`(bool)、`riskDisclaimer`(text,localized)                                                                                   | 文章级  |
| **article-header** 标题+元信息 | 始终                                 | `title` / geo-faq 用 `faqQuestion`；`publishedAt`；`updatedAt`(自动)；`articleNo`(unique)；`authorName`；`authorBio`                         | 文章级  |
| **geo-body** SSR 正文       | 始终                                 | `content`(richtext,localized)；geo-faq=`faqQuestion`+`content`(答案)；图片懒加载、大表格分页                                                        | 文章级  |
| **citation** 权威引用         | source 三字段任一有值                     | `sourceName`、`sourceUrl`、`sourcePublishedAt`                                                                                         | 文章级  |
| **internal-link** 内链      | `internalLinks` 非空                 | `internalLinks`(json: `[{text,url}]`)                                                                                                | 文章级  |
| **summary-tips** 知识点/注意事项 | `summaryPoints` 或 `localTips` 非空   | `summaryPoints`(text,localized)、`localTips`(text,localized)                                                                          | 文章级  |
| **info-boundary** 信息边界    | `infoBoundary` 或 `businessData` 非空 | `infoBoundary`(text,localized)、`businessData`(json)                                                                                  | 文章级  |
| **cta** 文末转化              | `ctaType≠none`                     | `ctaType`(enum)、`vendureProductListId`、`readPoints`；download-list 跳 Vendure 商品列表；consult-appointment 展开 lead-form                    | 文章级  |
| **lead-form** 留资表单        | `leadFormEnabled=true`             | `leadFormEnabled`(bool)、`readPoints`(提交后发积分)；两字段固定（手机号+意向），落 `POST /leads/submit`                                                    | 文章级  |
| **floating-service** 悬浮客服 | 站点 `customer_service_url` 非空       | `customer_service_url`(string)                                                                                                       | 站点级  |
| **geo-footer** 业务公示       | 始终                                 | NAP=`site_name`+seo-config `organizationAddress`/`organizationPhone`/`geoPlacename`；链接组=站点 `extra_config`（隐私/售后/退换货 URL）；免责声明=站点固定文案 | 站点级  |

### SEO 结构化（SSR 输出）

- canonical → `canonicalUrl` 或默认当前 URL

- JSON-LD → 按 `jsonLdType` 输出 Article / FAQPage / LocalBusiness（复用 schema-builder，LocalBusiness 带 NAP/geo）

- hreflang + 302 回退 → 复用 article 详情页已验证模式（document 兄弟翻译 localizations）

## 五、集成设计（Phase 3）

### 埋点（复用 visit-log，不改后端）

- 前端统一 SDK `trackGeoEvent(type, payload)` → `POST /api/zhao-website/v1/interactions/track`（经 Next 代理），落 visit-log

- 事件：`page_view`、`dwell_time`（卸载上报）、`internal_link_click`、`cta_click`、`lead_submit`、`mini_program_jump`

- visit-log 字段映射：`targetType=geo-article`、`targetId=articleNo`、`pageUrl`/`referrer`/`dwellTime` 直填；失败静默

### 阅读积分（复用 zhao-point earnPoints）

- 新 action：`geo_article_read`（阅读时长达标 30s）、`geo_article_lead`（留资提交成功）

- 额度 = 文章 `readPoints` 覆盖，次数/冷却/每日上限走 point-rule 表配置

- 需 SSO 登录用户才发放；未登录触发时引导登录（补发或放弃取 point-rule 规则）

### 留资（复用 `POST /leads/submit`）

- 两字段表单（手机号+意向），`type=geo_lead`、关联 `targetId=文章 documentId`

- 手机号格式校验 + 已有 honeypot 防刷；提交成功 → 发积分 + 成功提示（含"已发放 N 积分"）

### 小程序 WebView 跳转

- 环境识别复用 shao `env.ts` 逻辑（UA/`servicewechat.com`/`__wxConfig`），不引新依赖

- 商品按钮在 WebView 环境 → `wx.miniProgram.navigateTo({url: miniProgramPath})`；H5 环境 → fallback 打开 Vendure 商品列表/详情 URL

## 六、错误处理与验证

### 错误处理

- 详情 404 → `notFound()`；非默认语言无翻译 → 302 回退默认语言（复用已验证模式）

- 正文/模块渲染异常 → 该模块降级隐藏，不整页崩溃

- 埋点失败静默，不影响页面

### 验证方式（沿用项目无自动化测试基建）

- Phase 1：插件 build + curl 列表/详情/featured + status 四态过滤验证

- Phase 2：本地 dev 渲染三类型页面、模块回退链、金融开关置顶、表格分页/图片懒加载

- Phase 3：表单提交落库、积分到账、埋点落 visit-log、WebView 环境模拟

## 七、关键约束

1. **不新增依赖**：前端零新依赖（纯 CSS + 原生 API）；后端复用既有中间层/接口
2. **表隔离铁律**：geo-article 只消费自身模型与站点配置，禁止跨表直查（留资/积分/埋点全走对应插件接口）
3. **四级模板体系**：三级页面类型与四级模块全部可在 strapi-site 插件配置，未配置回退内置默认
4. **i18n**：全字段 localized（运营侧字段除外），hreflang + 302 回退沿用已验证模式
5. **部署纪律**：插件改动需重建 dist 并随 git 提交；验证用 curl 走 `/api` 前缀

## 八、待实施计划拆分

实施计划将按 3 Phase 拆任务，含：

1. geo-article schema + 3 个 API + content-filter status 扩展（含 dist 重建与 curl 验证）
2. 三级页面类型配置 + GeoArticleView + 11 个模块组件 + SEO 输出（含回退链验证）
3. trackGeoEvent SDK + earnPoints/lead 对接 + WebView 跳转 + 埋点字段映射（含落库验证）


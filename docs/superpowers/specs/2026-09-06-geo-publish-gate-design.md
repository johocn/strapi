# GEO 文章发布达标门禁与知识图谱落地设计

日期：2026-09-06
状态：已批准（用户确认"全部执行"）

## 1. 背景与目标

12 条 GEO 文章整改标准（选型/标题/正文/核心模块/E-E-A-T/结构化/本地化/业务数据/转化/SEO 元信息/审核验收/对比清单）与现有《GEO文章写作手册》各章节高度一致，手册文字已基本覆盖。

**真正的缺口在执行机制**：发文实践未达标，且功能层无强制校验。

本设计分两部分：

- **A. 手册补充**（3 处）：门禁章节、jsonLdType 映射表、对比/清单细节

- **B. 功能完善**（3 项）：发布门禁、审核自检 API、知识实体页

## 2. 现状核对（功能支撑盘点）

| 能力              | 现状                                                                      | 结论    |
| --------------- | ----------------------------------------------------------------------- | ----- |
| jsonLdType 前端映射 | `strapi-site/lib/geo-seo.ts` 已实现 FAQPage/LocalBusiness/ItemList/Article | ✅ 有支撑 |
| 知识关系/真值/作者后端    | `zhao-website` admin-api + content-api + service 均已实现                   | ✅ 有支撑 |
| 发布必填校验          | `services/geo-article.ts` 无任何 validate/required 逻辑                      | ❌ 缺失  |
| 审核自检报告          | 无按整改标准的缺漏清单接口                                                           | ❌ 缺失  |
| 实体页/知识图谱聚合页     | 前端仅 5 类文章路由，无 `/knowledge/[slug]`                                       | ❌ 缺失  |

## 3. A. 手册补充

### A1. 新增第 25 章「上线达标门禁」

将 12 条整改标准压缩为发布前必过清单，分 6 组并回链对应章节：

1. 选型单一（第 1 章）：类型与专属字段匹配
2. 标题公式（第 2 章）：地域 + 行业/场景 + 需求词 + 价值词
3. 正文达标（第 3 章）：结论先行、分节、数据表格、出处、内链
4. 核心三模块（第 9/10 章）：summaryPoints≥1、localTips≥1、infoBoundary 非空
5. E-E-A-T 证据链（第 7/11/12/14 章）：引用、真值声明≥1、实体≥1、作者背书
6. 结构化与合规（第 18/20 章）：jsonLdType、报告类 businessData、riskType、canonical

### A2. 第 20 章补「文章类型 ↔ jsonLdType 映射表」

| 文章类型             | 推荐 jsonLdType                        |
| ---------------- | ------------------------------------ |
| geo-faq          | FAQPage                              |
| local-list       | ItemList                             |
| local-comparison | ItemList                             |
| local-report     | Article（site 配置本地地址时可 LocalBusiness） |
| geo-article      | Article                              |

规则：显式配置优先；未配置时前端按上表推导（现状默认已按 type 推导 geo-faq→FAQPage，其余 Article）。

### A3. 第 5/6 章细节加强

- 对比表：维度 3-6 个、每个分数必须带 note 依据

- 清单：每项必须含 名称 + 描述 + 价格 + 跳转链接

## 4. B. 功能完善

### B1. 发布门禁（后端，P0）

**位置**：`plugins/zhao-website/server/src/services/geo-article.ts` 新增 `auditGeoArticle(article)` 校验函数；在发布状态流转（draft→review、review→published）处调用。

**触发方式**：状态字段更新时校验；对 `published` 目标硬阻断。

**校验规则**（不达标返回缺漏项数组，禁止发布）：

| # | 组       | 规则                                                                                          | 阻断级别    |
| - | ------- | ------------------------------------------------------------------------------------------- | ------- |
| 1 | 选型      | type=geo-faq 必须有 faqQuestion；local-comparison 必须有 comparisonData；local-list 必须有 listItems   | error   |
| 2 | 标题      | title 含 site 城市词/区县词（site 配置城市词，无配置跳过此项）                                                    | error   |
| 3 | 核心模块    | summaryPoints 非空、localTips 非空、infoBoundary 非空                                               | error   |
| 4 | E-E-A-T | sourceName 或 sourceUrl 任一非空；truthBasis 关系≥1；mentionedEntities 关系≥1；author 关系或 authorName 非空 | error   |
| 5 | 结构化     | 报告/清单/对比/问答类已按 A2 配置 jsonLdType（或可推导）；type=local-report 时 businessData 非空                   | error   |
| 6 | 转化      | ctaType≠none 或 leadFormEnabled=true（local-report/local-comparison/local-list 高意向类型）         | warning |
| 7 | 合规      | riskType≠none；若正文含金融/健康/法律关键词而 riskType 未选对应细分类型则告警（关键词启发式，不硬阻断）                            | error   |
| 8 | 审核      | reviewChecks 四项全勾；reviewerName、reviewedAt 非空                                                | error   |

**返回结构**：

```ts
{ pass: boolean, missing: [{ group, field, rule, level: "error" | "warning" }] }
```

**逃生口**：admin 用户可带 `?force=true` 跳过门禁（日志留痕），非 admin 一律阻断。

### B2. 审核自检 API（后端，P0）

**路由**：`POST /api/zhao-website/v1/geo-articles/:documentId/audit-check`（admin 鉴权）

**行为**：复用 B1 校验逻辑，返回逐项达标报告，**不阻断**，供编辑/审核在发布前体检。

**返回结构**：

```ts
{ documentId, status, checks: [{ group, field, rule, level, passed, hint }], score }
```

### B3. 知识实体页（前端，P1）

**路由**：`/knowledge/[slug]`，复用 (default)/\[locale] 路由组策略（默认语言无前缀，备选语言带前缀），静态导出 `generateStaticParams`。

**数据源**：`knowledge-graph` content-api（实体详情 + 关系三元组 + 关联文章），经站点域隔离过滤。

**页面模块**：

- 实体头：名称、entityType、外部档案 sameAs 链接、置信度/核验状态

- 关系列表：主体-谓词-客体三元组（按 sourceType 标注来源）

- 关联文章列表：提到该实体的已发布 GEO 文章

- SEO：metaTitle=实体名；无 canonical 冲突；空数据仍生成（占位页）

**路由**：实体无内容时不返回 404（生成占位页，避免静态导出失败）。

## 5. 不做的事（范围外）

- 不做自定义知识关系维护界面（Strapi admin 基础 CRUD 够用）

- 不做前端编辑器/发布表单改造

- 不做自动内容生成

- 不动已有审核字段 schema

## 6. 风险与约束

| 风险         | 应对                                                         |
| ---------- | ---------------------------------------------------------- |
| 门禁阻断存量草稿发布 | admin 可 `?force=true` 跳过并留痕；校验仅拦截"转 published"动作，已发布文章不受影响 |
| 地域词检测误判    | site-config 未配城市词时跳过标题校验；区县词用"省市区县词典"宽松匹配                  |
| 静态导出体积     | 实体数量有限（单站点数十级），体积增量可忽略                                     |
| 审核自检接口鉴权   | 复用现有 admin-api 鉴权中间件                                       |


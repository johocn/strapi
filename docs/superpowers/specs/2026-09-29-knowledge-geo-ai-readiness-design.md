# 知识图谱 GEO / AI 可消费性治理 设计文档

**日期：** 2026-09-29
**范围：** `plugins/zhao-website`（知识实体 / 知识关系 / 第一真值 / 公开出口 / AI 投喂）
**前置：** `2026-09-29-knowledge-traceability-compliance-design.md`（可追溯与审核链，已完成）

---

## 1. 目标

让知识实体、知识关系、第一真值从"结构上存在"升级为"**AI 可无歧义消费、可引用、可核验**"，并建立可持续的缺口检测机制。

**不追求**：自动补全数据、自动清理历史数据、回滚能力。

---

## 2. 现状取证（2026-09-29 线上快照）

| 出口 | 实测 |
|---|---|
| `GET /api/zhao-website/v1/facts.json` | 18 条；`sourceUrl` 有值 **8/18**；`sourceType` = internal 10 / official_site 8；`claimCategory` = other 11 / brand_claim 7 |
| `GET /api/zhao-website/v1/knowledge-graph.json` | 15 节点（DefinedTerm 12 / Place 1 / Service 1 / Organization 1）；`description` 15/15；`sameAs` **0**；`identifier` **0**；`image` **0**；`termCode` 7 |
| `GET /api/zhao-website/v1/knowledge-graph/joho-cn` | `outgoing` 6 / `incoming` 1；`slogan` 与 `keywords` **各出现 2 条**，其中各 1 条客体是 300~500 字文章正文 |
| `GET /llms.txt` | 200，2973 字节；末尾 `## Brand Voice` 为空段 |
| `GET /llms-full.txt` | **404** |
| `GET /robots.txt` | 200，126 字节；`Disallow: /api` + `Allow: /api/zhao-website/v1/` |
| `GET /sitemap.xml` | 20 个 `<loc>`，含 15 个 `/knowledge/`；无 `lastmod` |

层分布：12/15 是 `DefinedTerm`，`FAQ`/`HowTo`/`Product`/`Offer`/`CaseStudy`/`Article` **零数据**（枚举已声明）。

---

## 3. 根因分析

### 3.1 属性断言被文章段落污染（高危）

[kg-sync.ts](../../../plugins/zhao-website/server/src/services/utils/kg-sync.ts) 的 `syncTruthBasisRelations` 与 [claim-predicate-map.ts](../../../plugins/zhao-website/server/src/services/utils/claim-predicate-map.ts) 组合产生：

- `geo-article.truthBasisSections` 的业务语义是「**本文某 H2 段落是某条真值的表述依据**」
- 派生时：谓词 = claimKey 前缀映射（`brand_slogan_*`→`slogan`、`core_keywords_*`→`keywords`、`domain_*`/`core_domain_*`→`termCode`），客体 = 该段落纯文本（`MAX_OBJECT_TEXT` 截断 500 字）

结果「这篇文章引用了该真值」被写成了「**该实体的 slogan / termCode 就是这段文章**」。实测 7/12 个 `DefinedTerm` 的 `termCode` 已是文章段落。

### 3.2 谓词字典不校验客体形态

[predicate-dictionary.ts](../../../plugins/zhao-website/server/src/services/utils/predicate-dictionary.ts) 的 `isValidPredicate(entityType, predicate)` 只判断"谓词是否属于该 entityType 的列表"，**对客体形态、类型、长度零约束**——标量谓词可以合法挂 500 字段落。

### 3.3 公开层解释链断开

[exportGraph](../../../plugins/zhao-website/server/src/services/knowledge-graph.ts) 的 scope 为 `{ deletedAt: null, status: true, sourceType: { $ne: "derived" } }`，把由内容 CT 派生出的 `Article`/`FAQ`/`HowTo` 实体排除在公开图谱之外。于是「术语实体」与「解释它的文章」在公开层是两个断开的图。

### 3.4 公开出口口径不一致

| 出口 | 是否过滤 `rejected` |
|---|---|
| `findEntityBySlug` | 是（`verificationStatus: { $ne: "rejected" }`） |
| `exportFacts` | 是（白名单 `verified/pending/outdated`） |
| **`exportGraph`** | **否** ← 被驳回的实体仍会出现在公开图谱 |

### 3.5 `@id` 口径不一致

`knowledge-graph.json` 节点 `@id` = slug（如 `vocational-education`）；实体页 JSON-LD `@id` = 绝对 URL（`https://www.joho.cn/knowledge/vocational-education`）。同一实体两个 ID，AI 无法把图谱节点挂到页面上。

### 3.6 映射语义错误

`brand_domain_*` → `sameAs`。官网域名是 `url` 语义；`sameAs` 应保留给"同一实体的外部权威页"（维基条目、工商登记等）。

---

## 4. 已确认约束与决策

| 项 | 决策 |
|---|---|
| 验收标准 | S1 机读可消费性、S2 结构化数据合规、S3 内容权威性治理、S4 喂养 AI 爬虫 **四项全选** |
| 数据写入边界 | **只检测不写**：脚本不补 `sameAs`/来源/真值，不清理历史关系；人工在后台处理 |
| 交付切法 | **单 spec 内部分批**（P0 止血 / P1 治理） |
| 技术方向 | **方案甲**：分离「断言」与「引用」，并给谓词加客体契约 |
| 段落文本处置 | 保留为 `knowledge-relation.evidenceText`，**仅后台可见**，不进任何公开序列化路径 |
| 历史污染处置 | 出口侧**读时隔离**（可逆、不改数据），而非等人工清理完 |
| 契约变更原则 | 公开出口只做**增量扩展**，不改变既有字段语义 |
| 映射修正 | `brand_domain_*` 由 `sameAs` 改为 `url` |
| 分类扩展 | `claimCategory` 新增 `terminology_definition` |

---

## 5. 验收判据

### S1 机读可消费性（机制层）

1. 每条对外断言可解析为 `(主体, 谓词, 客体, 来源, 可信度)` 五元组
2. 属性类谓词的客体必须是**实体引用或规范值**，且长度 ≤ 契约上限
3. 每条引用类断言能回溯到唯一 `truthPolicy`（`truthClaimKey` 非空）
4. 自动化校验：出现"标量谓词挂超长文本"即判定失败

### S2 结构化数据合规（机制层）

1. `/knowledge/*` JSON-LD 必含 `@context`/`@type`/`@id`/`name` + `version`/`dateModified`
2. `@id` 在两个出口口径一致（绝对 URL）
3. 关系项用 `@id` 互指；实体通过 `subjectOf` 指向解释文章
4. 人工用 Schema.org 校验器 + Google Rich Results 测试留档

### S3 内容权威性治理（数据层，人工）

1. 输出缺口清单：`sameAs` 缺失、`sourceUrl` 缺失、`sourceType=internal` 占比、`claimCategory=other` 占比、`canonicalEntity` 未绑定数、各 `claimCategory` 为 0 的类别
2. 「对外可引用门槛」定义：具备 `sourceUrl` **或** `canonicalSourceType ∈ {government, official_site, third_party_verified}`
3. 后台看板呈现，人工按清单补录

### S4 喂养 AI 爬虫

1. `llms.txt` 补空段（Brand Voice）+ 新增「引用指引与时效」段
2. 新增 `llms-full.txt` 并可从根路径访问
3. `robots.txt` 显式声明主流 AI UA
4. `sitemap.xml` 补 `lastmod`

> **S1/S2 验收"机制合格"（代码保证），S3 验收"数据完整度"（人工保证），两者分开验收。**

---

## 6. 设计

### 6.1 写入侧：谓词客体契约

新增契约表（与 `PREDICATE_DICTIONARY` 同级，按 `entityType → predicate` 索引）：

```ts
export type ObjectKind = "entity" | "value" | "citation";
export type PredicateContract = {
  objectKinds: ObjectKind[];
  maxLength?: number;                     // value/text 形态的字符上限
  allowedValueTypes?: string[];           // 只对 value 生效：text|number|date|url|json
};
export const PREDICATE_CONTRACTS: Record<string, Record<string, PredicateContract>>;
```

`objectKinds` 语义：

| kind | 允许的客体形态 |
|---|---|
| `entity` | 必须给 `objectEntity`（实体引用） |
| `value` | 必须给 `objectValue`，或给 `objectText` 且长度 ≤ `maxLength` |
| `citation` | 必须给 `objectEntity` 或 `objectValue`，**且必须绑定 `truthPolicy`** |

**已登记契约（P0 覆盖范围）**

| entityType | predicate | objectKinds | maxLength | 备注 |
|---|---|---|---|---|
| Organization | `slogan` | `value` | 200 | |
| Organization | `keywords` | `value` | 200 | |
| Organization | **`url`** | `value` | 500 | **字典新增**（配合 6.2 映射修正） |
| Organization | `sameAs` | `value` | 500 | |
| Organization | `areaServed` | `entity`,`value` | 100 | |
| DefinedTerm | `termCode` | `value` | 60 | |
| DefinedTerm | `sameAs` | `value` | 500 | |
| DefinedTerm | `inDefinedTermSet` | `entity` | — | |
| Service | `serviceType` | `value` | 100 | |
| Service | `areaServed` | `entity`,`value` | 100 | |
| Place | `areaServed` | `entity`,`value` | 100 | |
| Article / CreativeWork | **`cites`** | `citation` | — | **谓词新增** |

**分级校验策略**（避免一次性锁死全部字典）：

- 已登记契约 → 严格校验；违规 → 400 `RELATION_OBJECT_CONTRACT_VIOLATION`
- 字典内但未登记契约 → 放行，`strapi.log.warn` + 审计流水标注 `contractUnregistered`

校验位置：`knowledge-graph` service 的 `addRelation` / `updateRelation`，紧随现有 `objectEntity 与 objectValue/objectText 互斥` 校验之后。

### 6.2 写入侧：引用语义分离

`syncTruthBasisRelations` 改造（[kg-sync.ts](../../../plugins/zhao-website/server/src/services/utils/kg-sync.ts)）：

| | 现状 | 改后 |
|---|---|---|
| 主体 | 真值 `canonicalEntity` | **文章的派生实体**（`findEntityByRef`，已存在） |
| 谓词 | `slogan`/`keywords`/`termCode` | `cites` |
| 客体 | 段落正文（≤500 字） | `objectEntity` = 规范实体，否则 `objectValue` = 规范值 |
| 段落文本 | 占用属性谓词值域 | 写入 `evidenceText`（仅后台可见） |
| 幂等键 | `site + S + P + objectText` | `site + S + P + truthPolicy` |

**映射表修正**（[claim-predicate-map.ts](../../../plugins/zhao-website/server/src/services/utils/claim-predicate-map.ts)）：`brand_domain_*` 的目标谓词由 `sameAs` 改为 `url`。

### 6.3 出口侧：读时隔离

公开序列化前过滤"违反客体契约"的关系，并计入违规统计：

- 位置：`_entityToJsonLd`（图谱节点属性展开）与 `exportEntity`（实体详情 `outgoing`/`incoming`）
- 规则：谓词已登记契约但其客体形态/长度不匹配 → **不输出该条** + `strapi.log.warn` + 计数
- 性质：读时兜底，**不修改数据库**；人工清理后违规计数自然归零

### 6.4 公开出口契约（增量）

| 出口 | 变更 |
|---|---|
| `knowledge-graph.json` | 节点补 `verificationStatus`/`confidence`/`lastVerifiedAt`；`@id` 改绝对 URL；**补 `rejected` 过滤**（与另两个出口口径统一） |
| `knowledge-graph/{slug}` | `@id` 改绝对 URL；新增 `subjectOf` 指向解释文章；隔离违规关系 |
| `facts.json` | 结构不变；`claimCategory` 值域随枚举扩展（新增 `terminology_definition`） |

### 6.5 AI 投喂四件套

| 文件 | 位置 | 动作 |
|---|---|---|
| `llms.txt` | [services/llms-txt.ts](../../../plugins/zhao-website/server/src/services/llms-txt.ts) | 补空掉的 `## Brand Voice`；新增「引用指引与时效」段（`version`/`lastVerifiedAt`/免责边界） |
| `llms-full.txt` | 新增输出函数于 [services/llms-txt.ts](../../../plugins/zhao-website/server/src/services/llms-txt.ts)；路由挂 [routes/content-api.ts](../../../plugins/zhao-website/server/src/routes/content-api.ts)；控制器加 [controllers/content-api/seo-output.ts](../../../plugins/zhao-website/server/src/controllers/content-api/seo-output.ts) | 新增：实体（`@id`/类型/描述/版本/核验时间/同指）+ 关系三元组（含来源）+ 事实（含来源与可引用门槛标记） |
| `robots.txt` | [services/robots.ts](../../../plugins/zhao-website/server/src/services/robots.ts) | 显式声明主流 AI UA（GPTBot / ClaudeBot / PerplexityBot / Google-Extended 等）；保留 `Allow: /api/zhao-website/v1/` 与 `Disallow: /api` 的最长匹配写法并补注释 |
| `sitemap.xml` | [services/sitemap.ts](../../../plugins/zhao-website/server/src/services/sitemap.ts) | 补 `lastmod` |

**部署连带项**：`/llms-full.txt` 需在 [nginx/www.joho.cn.conf](../../../../strapi-site/nginx/www.joho.cn.conf) 增加 `location = /llms-full.txt` 反代到 `http://127.0.0.1:1337/api/zhao-website/v1/llms-full.txt`（现有 `/llms.txt`、`/robots.txt`、`/sitemap.xml` 同款写法）。

### 6.6 检测服务与后台看板

新增只读服务 `knowledge-health`（**零写操作**）：

```ts
completeness(siteId): {
  entities: { total, missingSameAs, missingDescription, missingUrl, missingIdentifier };
  facts: { total, missingSourceUrl, internalSourceCount, otherCategoryCount, unboundCanonicalEntity, emptyCategories };
  relations: { total, contractViolations, missingTruthPolicy };
}
violations(siteId): Array<{ relationDocumentId, subjectEntity, predicate, reason, objectPreview }>;
isCitable(fact): boolean;   // sourceUrl 有值 或 canonicalSourceType ∈ 权威集合
```

- 后台路由（admin-only）：`GET /knowledge-health/completeness`、`GET /knowledge-health/violations`
- 后台 UI：`KnowledgeGraphPage` 增设「知识完备度」面板——缺口表格 + 违规表格 + 导出 JSON 清理清单（人工拿去逐条处理）

---

## 7. 数据模型变更清单

| CT | 变更 | 说明 |
|---|---|---|
| `knowledge-relation` | 新增 `evidenceText`（`text`） | 段落举证文本；不进公开出口 |
| `first-truth-policy` | `claimCategory.enum` 新增 `terminology_definition` | 存量 11 条 `other` 由人工在看板按清单重分类 |

无其他 schema 变更（`version`、`rejected` 态已在前置工作中就位）。

---

## 8. 分批交付

### P0 — 止血

1. 谓词客体契约 + 写入侧拦截（6.1）
2. 引用语义分离：`cites` + `evidenceText` + 幂等键调整（6.2）
3. `brand_domain_*` → `url`，并补 `url` 字典项与契约（6.2）
4. 出口读时隔离（6.3）
5. `@id` 绝对化 + `rejected` 过滤口径统一 + 出口补可信度字段（6.4）

### P1 — 治理

6. `knowledge-health` 服务 + admin 路由 + 后台「知识完备度」面板（6.6）
7. `claimCategory` 新增 `terminology_definition` + 存量重分类清单（7）
8. `llms.txt` 完善 + `llms-full.txt` 新增 + nginx location（6.5）
9. `robots.txt` 显式 AI UA + `sitemap.xml` 补 `lastmod`（6.5）
10. 实体 JSON-LD 补 `subjectOf` 解释链（6.4）
11. `DefinedTermSet` 术语集实体，收纳 12 个术语——**结构侧仅需保证 `inDefinedTermSet` 契约与字典就位，实体数据由人工录入**（受"只检测不写"约束）
12. `cites` 公开输出限流：同一 `truthPolicy` 仅输出最新一条

---

## 9. 测试与验收

**自动化（`plugins/zhao-website/tests`）**

- 契约校验单测：各 `objectKinds` 的通过与拒绝分支；未登记契约仅告警
- `kg-sync` 改造单测：**反向用例——段落文本不得进入属性谓词值域**
- 出口隔离单测：违规关系不出现在 `_entityToJsonLd` / `exportEntity` 输出中
- 出口一致性单测：`exportGraph` 过滤 `rejected`；`@id` 为绝对 URL
- `knowledge-health` 统计单测：用固定夹具断言各计数
- 回归：现有 145 条用例全绿

**线上取证（部署后）**

- `facts.json`：`claimCategory` 出现 `terminology_definition`（人工重分类后）
- `knowledge-graph.json`：无 `rejected`；节点含 `verificationStatus`/`confidence`/`lastVerifiedAt`；`@id` 为绝对 URL
- `joho-cn` 详情的 `slogan`/`keywords` **各仅 1 条**且为规范值；长文本条目被隔离
- `/llms-full.txt` 200；`/llms.txt` 无空段；`/robots.txt` 含 AI UA 段

---

## 10. 风险与非目标

**风险**

| 风险 | 缓解 |
|---|---|
| `cites` 改变关系形态，静态站/后台若有硬编码依赖 `slogan`/`termCode` 会失效 | 实现前核对 `KnowledgeEntityView` 与后台渲染是否为通用谓词展开；若是硬编码则先通用化 |
| 出口隔离后页面「知识关系」区条目变少 | 预期行为；违规计数在看板可见，人工清理后恢复 |
| 契约过严会拒绝既有运营写入 | 分级策略：结构性错误硬拒，语义可疑仅告警 |
| `robots.txt` 的 `/api` 前缀在地摊实现下可能误拦业务 API | 规范下最长匹配有效（现状已正确）；补显式 AI UA 段；若线上 AI 抓取异常再评估 |
| 存量 11 条 `other` 事实重分类依赖人工 | 看板输出清单，纳入 S3 数据层验收，不阻塞 S1/S2 机制验收 |

**非目标（YAGNI）**

- 不做脚本批量写生产数据（数据补齐/历史清理一律人工）
- 不做事务、不做回滚（沿用前置结论）
- 不改变公开 URL 结构（`/api/zhao-website/v1/` 前缀不动）
- 不引入外部 Schema.org 校验服务作为 CI 阻断项（仅人工留档）
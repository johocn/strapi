# GEO 知识图谱管理端契约修复设计

日期：2026-09-15
范围：h.joho.cn 管理端四个知识图谱页面（知识实体 / 知识关系 / 第一真值 / AI 摘要）+ 其他内容模块列表分页契约
涉及仓库：basic（后端 zhao-website 插件）、web（管理端 H5）

## 一、背景与目标

管理端 GEO 知识图谱四个页面（`/pages/website/knowledge-entity|knowledge-relation|first-truth|ai-summary`）与后端 zhao-website 插件的字段契约存在系统性错配，导致：
- 实体/真值**保存必失败或数据丢失**
- 编辑页**加载到错误数据或 404**
- 列表页**分页、搜索、关键字段展示全部失效**
- 第一真值**冲突 tab 从未正常加载**

目标：修复全部契约错配，让四个页面保存、编辑、列表、搜索、分页、展示完整可用；同时建立统一查询参数解析工具，顺带修复 article/product 等其他内容模块列表页的分页/筛选失效。

## 二、现状诊断（已确认的契约错配）

### 2.1 后端（basic 仓库 zhao-website 插件）

| 位置 | 问题 | 影响 |
|------|------|------|
| `controllers/admin-api/knowledge-graph.ts` createEntity/updateEntity | 未解包 `{data}`（addRelation/updateRelation/createGlobalEntity 均有解包） | 前端传 `{data:{...}}` 整体当字段写入，实体创建/更新必失败 |
| `services/knowledge-graph.ts` findEntities | 只读裸参数 `entityType/page/pageSize`，返回纯数组无分页 meta，不支持 `filters[...]` 嵌套 | 列表分页失效、名称搜索失效、编辑页 `filters[documentId]` 详情加载失败 |
| `services/knowledge-graph.ts` findRelations | 分页读裸 `page/pageSize`；已支持 `filters.documentId` | 列表分页失效 |
| `services/first-truth.ts` find | 无分页，只读裸参数 | 真值列表全量返回、筛选失效 |
| `services/ai-content-summary.ts` findAdmin | 剥离 pagination 后把 `filters` 对象整个当 where 字段 | `filters[targetType]`/`filters[targetId]` 筛选失效 |
| `routes/admin-api.ts` | `GET /first-truths/conflicts`（L105）、`GET /first-truths/export`（L106）排在 `GET /first-truths/:documentId`（L100）之后 | 被通配参数抢先匹配，冲突 tab 实际调用 findOne('conflicts')，加载失败 |
| ai-summary | 无 `GET /ai-summaries/:documentId` 路由、controller 无 findOne、service 无 findOne | 编辑页 detail 404 |
| schema knowledge-entity | 无 `aliases` 字段 | 前端别名输入无处存放 |

### 2.2 前端（web 仓库）

| 页面 | 问题 | 影响 |
|------|------|------|
| knowledge-entity/edit.vue | typeOptions 小写 7 种 vs 后端 schema.org 18 种枚举；提交 `type` vs `entityType`；提交 `aliases` 后端无字段；详情加载用 `filters[documentId]` 后端不支持 | 保存必失败；编辑加载错实体 |
| knowledge-entity/list.vue | 模板 `item.aliases` 后端无字段；搜索参数后端不支持 | 别名永不显示；搜索失效 |
| knowledge-relation/list.vue | `item.subjectName/objectName` vs 后端 populate 出的 `subjectEntity.name/objectEntity.name` | 主客体名称显示不出 |
| first-truth/list.vue | `truth_value/confidence/source` vs `canonicalValue/无/canonicalSourceUrl`；`item.status`（boolean）当状态枚举 | 展示错配、状态徽标错误 |
| first-truth/edit.vue | `truth_value/source/confidence/status` 全错 | 保存必失败 |
| ai-summary/list.vue | `item.summary` vs `contentText`；`item.status` 同理 | 摘要显示不出、状态徽标错误 |
| ai-summary/edit.vue | detail 404；`item.summary` vs `contentText` | 编辑页加载失败 |
| api/website.js | knowledgeGraphApi 无 detail 方法 | 实体编辑页无法按 documentId 拉详情 |

### 2.3 平台级问题（影响其他内容模块）

前端所有管理列表页统一传 Strapi 风格参数（`pagination[page]`/`pagination[pageSize]`/`filters[...]`），Koa/qs 解析为嵌套对象；但 generic controller 下的 12 个 service（article/product/case/brand-info/faq/tutorial/compliance/download/lead/visit-log/interaction/search-log）的 `findAdmin` 普遍读裸参数（`query.page`/`query.status`）→ **这些列表页的分页与筛选同样失效**。

## 三、设计方案

### 3.1 新增统一查询工具（basic）

新增 `plugins/zhao-website/server/src/services/utils/query.ts`：

- `parseListQuery(query, { siteId, defaultPageSize })`：
  - 解析 `pagination[page]`/`pagination[pageSize]`（兼容裸 `page`/`pageSize`）
  - 解析 `filters[...]` 嵌套为 where 对象（兼容裸筛选参数，如 `entityType`/`status`）
  - 返回 `{ where, page, pageSize }`
- `wrapList(items, page, pageSize, total)`：
  - 返回 `{ data: items, meta: { pagination: { page, pageSize, total, pageCount } } }`（前端 `extractList` 已支持）

多租户约束：所有列表 where 必须保持 `$or: [{ site: tenantId, deletedAt: null }, { site: null, deletedAt: null }]` 双匹配结构，筛选条件需注入 $or 两侧。

### 3.2 后端契约修正（basic）

1. **knowledge-graph service**：
   - `findEntities`：接入 `parseListQuery`，支持 `filters[name][$containsi]`/`filters[entityType]`/`filters[verificationStatus]`，返回 `wrapList` 结构
   - 新增 `findOneEntity(siteId, documentId)`：tenant 优先，回退 global
   - `findRelations`：接入 `parseListQuery`，保留裸参数兼容（subjectEntityId/predicate/objectEntityId/documentId）
2. **knowledge-graph controller**：`createEntity`/`updateEntity` 补 `ctx.request.body?.data ?? ctx.request.body` 解包；新增 `findEntity`
3. **路由**：新增 `GET /knowledge-graph/entities/:documentId`（放在 `PUT /knowledge-graph/entities/:documentId` 附近，与 `/entities/global` 无冲突）
4. **first-truth service**：`find` 接入 `parseListQuery`（`filters[claimCategory]`/`filters[verificationStatus]`/`filters[claim][$containsi]`），返回 `wrapList` 结构
5. **ai-content-summary service**：`findAdmin` 修正 filters 展开 + 接入 `parseListQuery`；新增 `findOne(siteId, documentId)`
6. **ai-content-summary controller**：新增 `findOne` 方法
7. **路由**：新增 `GET /ai-summaries/:documentId`
8. **路由顺序修复**：将 `GET /first-truths/conflicts`、`GET /first-truths/export` 移到 `GET /first-truths/:documentId` 之前；同类型问题 `GET /brand-voices/by-category/:category` 移到 `GET /brand-voices/:documentId` 之前（顺带，无行为变更风险）
9. **schema**：knowledge-entity 新增 `aliases`（type: json，默认 `[]`），Strapi 启动自动同步表结构

### 3.3 前端契约修正（web）

1. **knowledge-entity/edit.vue**：
   - `typeOptions` 改为后端 18 种 schema.org 枚举（Organization/Person/Product/Service/Place/Event/CreativeWork/Article/CaseStudy/Offer/Review/FAQ/HowTo/BreadcrumbList/Brand/ContactPoint/QuantitativeValue/DefinedTerm）
   - 提交字段 `type` → `entityType`
   - `aliases` 提交为数组（逗号分隔输入）
   - 详情加载改用 `knowledgeGraphApi.detail(documentId)`（新 `GET /entities/:documentId`）
2. **knowledge-entity/list.vue**：列表项显示 `entityType`；`aliases` 存在时显示（非必展示）
3. **knowledge-relation/list.vue**：主体/客体显示 `subjectEntity?.name`/`objectEntity?.name`，客体外显 fallback `objectValue ?? objectText`；新增置信度与验证状态徽标展示
4. **first-truth/list.vue**：`truth_value` → `canonicalValue`；`confidence` → 改显示 `priority`；`source` → 显示 `canonicalSourceUrl`（截取域名）或 `claimCategory`；状态徽标用 `verificationStatus`
5. **first-truth/edit.vue**：字段对齐 `canonicalValue`/`canonicalSourceUrl`/`verificationStatus`；移除 `confidence`；补 `claimCategory`/`priority` 表单（schema 已有字段，低成本对齐）
6. **ai-summary/list.vue**：`summary` → `contentText`；状态徽标用 `verificationStatus`；targetType 筛选项与后端 `summaryType` 枚举核对修正
7. **ai-summary/edit.vue**：`summary` → `contentText`；状态用 `verificationStatus`
8. **api/website.js**：`knowledgeGraphApi` 补 `detail(documentId)` 方法

前端传参风格（`pagination[page]`/`filters[...]`）保持不变，由后端统一解析。

### 3.4 兼顾其他内容模块

generic controller 下的 12 个 service `findAdmin` 接入 `parseListQuery`，修复 article/product/case 等列表页的分页与 `filters[...]` 筛选。**逐 service 核对**：
- 现有裸参数名（如 `status`/`category`/`tagGroup`/`q`）与前端传参是否一致，不一致以前端 `filters[xxx]` 为准并记录
- 返回结构统一为 `wrapList`
- 逐个验证避免回归

## 四、有益补充（含于本次范围）

1. 知识关系编辑页补 `confidence`/`verificationStatus`/`sourceUrl` 可选字段表单（后端 `updateRelation` 已支持）
2. first-truth 冲突 tab 正确渲染 `detectConflicts` 结构（claimKey + values 数组），依赖路由顺序修复
3. 统一解析工具使其他内容模块分页/筛选恢复生效（正收益，非新增功能）

## 五、部署与验证

### 5.1 部署

**basic（后端）**：
1. 本地 `plugins/zhao-website` 下 `npm run build` 重建 dist（2G 服务器禁止构建）
2. 部署前自检：dist 产物含 `parseListQuery`/`findOneEntity`/`entities/:documentId`/`ai-summaries/:documentId` 关键字
3. schema `aliases` 由 Strapi 启动自动同步，无需手动 SQL
4. git commit + push → joho 走 deploy.sh（pull + pm2 restart，node 用 `/home/admin/.nvm/versions/node/v22.23.1/bin`）

**web（前端）**：`npm run build:h5`，产物上传 `/www/sites/h.joho.cn/index/`（**注意：实际部署域名为 h.joho.cn，DEPLOYMENT.md 中 admin.joho.cn 已过时**）

### 5.2 验证清单

1. 本地 curl（`/api/zhao-website/v1/admin/...`）：
   - `GET entities?pagination[page]=2&pagination[pageSize]=5`：分页生效、meta.total 正确
   - `GET entities?filters[name][$containsi]=xxx`：搜索生效
   - `GET entities/:documentId`：返回单实体
   - `POST entities`（带 `{data:{entityType,aliases:[...]}}`）：保存成功、aliases 入库
   - `GET first-truths?pagination[page]=1&pagination[pageSize]=10`：分页生效
   - `GET first-truths/conflicts`：返回冲突数组（验证路由顺序修复，而非 findOne('conflicts')）
   - `GET ai-summaries?filters[targetType]=article`：筛选生效
   - `GET ai-summaries/:documentId`：200
2. 未登录访问返回 401/403（而非 404）
3. 生产管理端四页面逐一操作：列表翻页、实体搜索、实体新增/编辑保存回显（含别名）、关系列表主客体名称、真值保存与状态徽标、冲突 tab、AI 摘要文本
4. 抽查 article/product 列表分页与筛选随统一工具恢复
5. 回归：既有 C 端知识图谱展示接口（exportGraph/exportEntity/exportFacts）不受影响

## 六、风险与卡点

| 卡点 | 应对 |
|------|------|
| `@koa/router` 对 `:documentId` 与静态段的匹配顺序 | 实施时 curl 实测 `/first-truths/conflicts` 行为；无论实测结果如何，静态段前置无副作用 |
| Strapi 5 未知字段写入行为（忽略或报错） | 修复后字段已对齐，验证时确认基线行为即可 |
| generic service 12 个模块接入回归 | 逐 service 核对参数名 + 逐个验证，分步提交 |
| `$or` 双匹配结构 | 统一工具强制注入 tenant+global 两侧，测试用例覆盖 |
| web 部署域名过时（DEPLOYMENT.md） | 以 h.joho.cn 为准，验证时访问 h.joho.cn 管理端 |

## 七、范围外（不做）

- 知识图谱 C 端展示优化（JSON-LD 输出、实体页渲染）
- AI 摘要的 AI 生成能力（一期桩标记 pending 保留）
- brand-voices 路由顺序之外的行为变更
- 列表页体验增强（筛选 UI、批量操作等）——契约修复完成后的下一步

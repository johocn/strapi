# GEO 文章后台发布接口补全设计

日期：2026-09-07
状态：待用户审批

## 1. 背景与目标

《GEO文章发布全流程手册》覆盖「分类/标签/作者/知识实体/真值/文章录入+8组关系/审核门禁」全链路，但审计发现 zhao-website 插件**后台 admin API 存在三处缺口**，导致发布主链路目前只能依赖 SQL 直插（`tmp_article_*.sql`）：

| 缺口 | 现状 | 影响 |
| --- | --- | --- |
| GEO 文章后台 CRUD | 仅 `POST /geo-articles/:documentId/audit-check` 一条路由；service 只有 find/findOne/findFeatured 三个读取方法 | 文章创建/编辑/发布/归档无接口，8 组关系无绑定入口 |
| 作者管理接口 | 全插件无 `/authors` 路由 | 文章 author 关系无法经接口绑定 |
| 知识关系更新 | 仅有 GET/POST/DELETE，无 PUT | 改关系只能删了重建 |

**目标**：补齐三处缺口，使发布主链路可经后台 API 完成（脱离 SQL 直插），同时不破坏现有 SQL 直插/内容管理器 UI 双通道。

**字段层面已确认无缺失**：`geo-article` schema 含手册全部字段及超集（coverImage/comparisonData/listItems 等），8 组关系（site/author/editor/reviewer/category/tags/truthBasis/mentionedEntities）已定义。

## 2. 设计决策（已确认）

- 关系入参用**数字 id 数组**（Strapi 原生自动写 lnk，与现有 knowledge-graph 接口一致）
- geo-article 权限**复用 `article.read/create/update/publish`**（与 audit-check 现状一致）
- 发布门禁沿用既有 lifecycle 机制，**补 `beforeCreate` 钩子**堵住创建即发布绕过口

## 3. 路由新增（admin-api.ts，channelScopeRoute）

### 3.1 geo-article（权限复用 article.*）

| 方法 | 路径 | handler | 权限 |
| --- | --- | --- | --- |
| GET | `/geo-articles` | geoArticleAdmin.find | article.read |
| GET | `/geo-articles/:documentId` | geoArticleAdmin.findOne | article.read |
| POST | `/geo-articles` | geoArticleAdmin.create | article.create |
| PUT | `/geo-articles/:documentId` | geoArticleAdmin.update | article.update |
| DELETE | `/geo-articles/:documentId` | geoArticleAdmin.softDelete | article.update |
| POST | `/geo-articles/:documentId/publish` | geoArticleAdmin.publish | article.publish |
| POST | `/geo-articles/:documentId/archive` | geoArticleAdmin.archive | article.publish |
| POST | `/geo-articles/batch` | geoArticleAdmin.batch | article.publish |

> 路由顺序说明：`POST /geo-articles/batch` 为两段路径，现有路由无 `POST /geo-articles/:documentId` 两段注册，无冲突。`status` 枚举：draft → review → published → archived。

### 3.2 author（新增权限 author.*，注册方式参照 knowledge-entity.* 现有模式）

| 方法 | 路径 | handler |
| --- | --- | --- |
| GET | `/authors` | author.find |
| GET | `/authors/:documentId` | author.findOne |
| POST | `/authors` | author.create |
| PUT | `/authors/:documentId` | author.update |
| DELETE | `/authors/:documentId` | author.softDelete |

### 3.3 knowledge-relation 更新（权限复用 knowledge-relation.create，与 DELETE 一致）

| 方法 | 路径 | handler |
| --- | --- | --- |
| PUT | `/knowledge-graph/relations/:documentId` | knowledgeGraph.updateRelation |

## 4. service 扩展

### 4.1 services/geo-article.ts（仿 article service 全量新增）

| 方法 | 行为 |
| --- | --- |
| findAdmin(siteId, params) | 分页 + 状态/类型筛选 + 关系 populate |
| findOneAdmin(siteId, documentId) | 详情 + 关系 populate |
| create(siteId, data) | **注入 site=siteId、locale='zh-CN'（data.locale 未传时）**；关系字段（author/category/tags/truthBasis/mentionedEntities/editor/reviewer）收数字 id 数组透传；`status` 强制非 published（draft/review） |
| update(siteId, documentId, data) | 关系字段同 create；status 变更由 lifecycle 门禁拦截 |
| softDelete(siteId, documentId) | 置 deletedAt，软删 |
| publish(siteId, documentId) | status='published'，触发 beforeUpdate 门禁 |
| archive(siteId, documentId) | status='archived' |
| batch(siteId, { action, documentIds }) | action ∈ publish/archive/delete，逐个执行 |

**关系 id 宽容解析**：body 中关系数组元素允许数字或数字字符串（如 `"3"`），service 统一转 int，防止直接拼入 lnk 整数列触发 PG `invalid input syntax for type integer` 500（同 knowledge-graph `_resolveEntityId` 思路）。

### 4.2 services/author.ts（新增）

实现 `findAdmin/findOneAdmin/create/update/softDelete`（site 绑定 + 关系 site 由 Strapi 自动写 lnk），方法名对齐 generic 控制器约定，**复用 `createGenericController("author")`，不新建 controller 文件**。

### 4.3 services/knowledge-graph.ts 新增

`updateRelation(siteId, documentId, data)`：支持更新 predicate/objectText/objectValue/confidence/verificationStatus/status；更新前校验关系归属当前 site。

## 5. lifecycle 门禁一致性

现有 `content-types/geo-article/lifecycles.ts` 只有 `beforeUpdate`，**补 `beforeCreate` 钩子**：`data.status==='published'` 时跑 `auditGeoArticle` 校验，不达标抛错阻断（逻辑抽公共函数，与 beforeUpdate 共用）。三条写入路径的门禁覆盖：

| 路径 | beforeCreate | beforeUpdate |
| --- | --- | --- |
| 后台 API（新增） | ✅ 拦 | ✅ 拦 |
| 内容管理器 UI | ✅ 拦 | ✅ 拦 |
| SQL 直插 | 绕过（预期，走 audit-check 人工门禁） | 绕过（预期） |

## 6. controllers 与注册

- 新增 `controllers/admin-api/geo-article-admin.ts`（薄控制器，仿 article.ts 调用 service）
- `controllers/admin-api/knowledge-graph.ts` 追加 `updateRelation` handler
- **铁律**：`controllers/index.ts` 必须 import+export `geoArticleAdmin`、`author`，键名 = 路由 handler 前缀（漏注册 = 启动即崩溃循环重启）

## 7. 风险与约束

1. **注册铁律**：新 controller 必须进 `controllers/index.ts`，否则 `Error creating endpoint ... Cannot read properties of undefined (reading 'check')` → pm2 循环重启 → 线上 502
2. **dist 重建铁律**：改 `server/src` 后必须 `npm run build` 重建 dist + grep 自检（如 `geoArticleAdmin` 关键字）+ deploy.sh 部署，只提交源码不重建 dist 会静默 404
3. **locale 默认值**：create 未传 locale 时注入 zh-CN，防「locale=NULL → 前端文章页不生成」重演
4. **create 直发 published**：双层防护（service 强制非 published + beforeCreate 门禁）
5. **多站点隔离**：所有查询/写入强制带 siteId（channelScopeRoute 已注入 ctx），author/relation 更新同样校验归属

## 8. 验收清单

- [ ] 本机 curl：未登录访问新接口 401（404=dist 未重建）
- [ ] geo-article：create(draft) → 读 → update 改关系 → publish（不达标被拦/达标通过）→ archive → batch → softDelete
- [ ] create 直接置 published 被 beforeCreate 拦截
- [ ] author CRUD + site 绑定
- [ ] relations PUT 更新生效（改 objectText/confidence）
- [ ] 关系传字符串数字 id 宽容通过；传 documentId 字符串返回 4xx 而非 500
- [ ] 线上部署后 audit-check 等旧接口不回退

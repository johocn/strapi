# 跨租户知识库设计

- 创建日期：2026-07-12
- 项目目录：E:\code\basic
- 插件目录：plugins\zhao-website、plugins\zhao-auth

## 背景

当前 `knowledge-entity` 和 `first-truth-policy` 均有必填的 `site` relation，所有查询按 `ctx.state.siteId` 过滤。GEO 内容（geo-topic、comparison-page、faq）在引用知识实体时，每个租户需独立创建通用概念实体（如"AI"、"云计算"），导致：

1. **提及率低** — 通用实体在各租户分散创建，JSON-LD 结构化数据覆盖面不足
2. **准确率低** — 各租户对同一概念的描述不一致，缺乏权威 canonical 定义
3. **维护成本高** — 通用实体重复创建，更新需逐租户操作

## 目标

引入全局共享知识层（`site = null`），所有租户可只读引用，提升 GEO 提及率和准确率。

## 设计

### 架构：全局共享层

不新建 CT，复用现有 `knowledge-entity` 和 `first-truth-policy`。通过 `site` 字段值区分层级：

- `site = null` → 全局实体，渠道管理员以上角色维护
- `site = 具体值` → 租户实体，网站管理员/编辑维护

查询时自动合并两层结果，租户编辑时只改自己的，全局实体对租户只读。

### schema 修改

#### knowledge-entity

```diff
  "site": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::zhao-common.site-config",
-   "required": true,
+   "required": false,
    "inversedBy": "website_knowledge_entities"
  },
```

#### first-truth-policy

```diff
  "site": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "plugin::zhao-common.site-config",
-   "required": true,
+   "required": false,
    "inversedBy": "website_first_truths"
  },
```

### 查询合并逻辑

修改 `services/knowledge-graph.ts` 和 `services/first-truth.ts` 的查询方法，从单租户过滤改为 `$or` 合并：

```ts
// 修改前
where: { site: siteId, deletedAt: null }

// 修改后
where: {
  $or: [
    { site: siteId, deletedAt: null },
    { site: null, deletedAt: null },
  ],
}
```

#### 涉及的 knowledge-graph.ts 方法

| 方法 | 修改方式 |
|------|----------|
| `findEntities` | `$or` 合并 |
| `findEntityBySlug` | **两步查询**：先查租户 `where: { site: siteId, slug, ... }`，未命中再查全局 `where: { site: null, slug, ... }`。不能用 `$or` + `findOne`，因为无法保证租户优先 |
| `findEntityByRef` | 不变（按 refTargetType/refTargetId 查询，无 site 过滤） |
| `disambiguate` | `$or` 合并候选实体 |
| `findRelations` | `$or` 合并（租户能看到全局实体的关系） |
| `exportGraph` | `$or` 合并实体和关系（JSON-LD 输出包含全局层） |
| `exportEntity` | 关系查询改为 `$or` 合并 |
| `exportFacts` | `$or` 合并（真值导出包含全局层） |
| `verifyAll` | `$or` 合并实体和真值查询 |

#### 涉及的 first-truth.ts 方法

| 方法 | 修改方式 |
|------|----------|
| `find` | `$or` 合并 |
| `findOne` | **两步查询**：先查租户，未命中再查全局（同 `findEntityBySlug` 逻辑） |
| `findByClaimKey` | 两步查询（先租户后全局） |
| `detectConflicts` | `$or` 合并所有真值，检测跨层 claimKey 冲突 |
| `exportFacts`（通过 knowledge-graph） | 已在上方覆盖 |

### Service 方法签名修改

所有涉及 `siteId` 的 service 方法签名从 `number` 改为 `number | null`：

#### knowledge-graph.ts

```ts
async createEntity(siteId: number | null, data: any)
async updateEntity(siteId: number | null, documentId: string, data: any)
async deleteEntity(siteId: number | null, documentId: string)
```

`updateEntity` 和 `deleteEntity` 的内部 findOne 查询需按 siteId 值区分：

```ts
async updateEntity(siteId: number | null, documentId: string, data: any) {
  const where: any = { documentId, deletedAt: null };
  // siteId 为 null 时查全局实体，为数字时查租户实体
  where.site = siteId;
  const existing = await strapi.db.query(ENTITY_UID).findOne({ where });
  if (!existing) {
    const e: any = new Error("Entity not found");
    e.status = 404;
    throw e;
  }
  return strapi.db.query(ENTITY_UID).update({
    where: { id: existing.id },
    data,
  });
}
```

`deleteEntity` 同理。

#### first-truth.ts

```ts
async find(siteId: number | null, query?: any)
async findOne(siteId: number | null, documentId: string)
async findByClaimKey(siteId: number | null, claimKey: string)
async create(siteId: number | null, data: any)
async update(siteId: number | null, documentId: string, data: any)
async softDelete(siteId: number | null, documentId: string)
async verify(siteId: number | null, documentId: string)
async detectConflicts(siteId: number | null)
```

`_markRelatedEntitiesPending` 的签名也改为 `siteId: number | null`，内部查询 `where: { site: siteId, ... }` 保持一致（全局真值关联全局实体，siteId=null 查询 site=null）。

### 权限分层

| 操作 | 全局实体 (site=null) | 租户实体 (site=具体值) |
|------|---------------------|----------------------|
| 读取 | 所有已登录用户 | 所有已登录用户 |
| 创建 | CHANNEL_ADMIN / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |
| 更新 | CHANNEL_ADMIN / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |
| 删除 | CHANNEL_ADMIN / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |

> **注意**：PLUGIN_MANAGER 当前在 permissions.ts 中只有 `knowledge-entity.read`，无 CRUD 权限（第 1202 行）。不将 PLUGIN_MANAGER 纳入全局实体操作者，保持其只读角色。

### 路由设计

路由路径从 `/kg/` 改为 `/knowledge-graph/`（破坏性变更，现有 `/kg/` 路由全部重命名）。

#### 现有路由重命名（租户层）

```ts
channelScopeRoute("GET", "/knowledge-graph/entities", "knowledge-graph.findEntities", "knowledge-entity.read"),
channelScopeRoute("POST", "/knowledge-graph/entities", "knowledge-graph.createEntity", "knowledge-entity.create"),
channelScopeRoute("PUT", "/knowledge-graph/entities/:documentId", "knowledge-graph.updateEntity", "knowledge-entity.update"),
channelScopeRoute("DELETE", "/knowledge-graph/entities/:documentId", "knowledge-graph.deleteEntity", "knowledge-entity.delete"),
channelScopeRoute("GET", "/knowledge-graph/relations", "knowledge-graph.findRelations", "knowledge-relation.read"),
channelScopeRoute("POST", "/knowledge-graph/relations", "knowledge-graph.addRelation", "knowledge-relation.create"),
channelScopeRoute("DELETE", "/knowledge-graph/relations/:documentId", "knowledge-graph.deleteRelation", "knowledge-relation.delete"),
channelScopeRoute("POST", "/knowledge-graph/disambiguate", "knowledge-graph.disambiguate", "knowledge-entity.read"),
channelScopeRoute("GET", "/knowledge-graph/export", "knowledge-graph.exportGraph", "knowledge-entity.read"),
```

#### 新增路由（全局层 — knowledge-entity）

```ts
channelScopeRoute("POST", "/knowledge-graph/entities/global", "knowledge-graph.createGlobalEntity", "knowledge-entity.create-global"),
channelScopeRoute("PUT", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.updateGlobalEntity", "knowledge-entity.update-global"),
channelScopeRoute("DELETE", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.deleteGlobalEntity", "knowledge-entity.delete-global"),
```

读取路由不新增 — `GET /knowledge-graph/entities` 自动合并全局+租户结果。

#### 新增路由（全局层 — first-truth）

```ts
channelScopeRoute("POST", "/first-truths/global", "first-truth.createGlobal", "first-truth.create-global"),
channelScopeRoute("PUT", "/first-truths/global/:documentId", "first-truth.updateGlobal", "first-truth.update-global"),
channelScopeRoute("DELETE", "/first-truths/global/:documentId", "first-truth.deleteGlobal", "first-truth.delete-global"),
channelScopeRoute("POST", "/first-truths/global/:documentId/verify", "first-truth.verifyGlobal", "first-truth.update-global"),
```

### Controller 方法

#### knowledge-graph controller

与现有 controller 保持一致的 body 格式 — 使用 `ctx.request.body` 而非 `ctx.request.body.data`：

```ts
async createGlobalEntity(ctx: any) {
  ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(null, ctx.request.body);
},
async updateGlobalEntity(ctx: any) {
  ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(null, ctx.params.documentId, ctx.request.body);
},
async deleteGlobalEntity(ctx: any) {
  await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(null, ctx.params.documentId);
  ctx.body = { success: true };
},
```

#### first-truth controller

```ts
async createGlobal(ctx: any) {
  ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, ctx.request.body);
},
async updateGlobal(ctx: any) {
  ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, ctx.request.body);
},
async deleteGlobal(ctx: any) {
  await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId);
  ctx.body = { success: true };
},
async verifyGlobal(ctx: any) {
  ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId);
},
```

### 权限设计

#### 权限树新增节点

在 `menu.website-knowledge-entity.children` 中追加：

```ts
"knowledge-entity.create-global": { label: "新增全局实体", type: "button" },
"knowledge-entity.update-global": { label: "编辑全局实体", type: "button" },
"knowledge-entity.delete-global": { label: "删除全局实体", type: "button" },
```

在 `menu.website-first-truth.children` 中追加：

```ts
"first-truth.create-global": { label: "新增全局真值", type: "button" },
"first-truth.update-global": { label: "编辑全局真值", type: "button" },
"first-truth.delete-global": { label: "删除全局真值", type: "button" },
```

#### 角色分配

- `ADMIN` — `flattenPermissions(PERMISSION_TREE)` 自动包含
- `CHANNEL_ADMIN` — 硬编码数组追加 6 个 global action（已有 `knowledge-entity.*` 和 `first-truth.*` 全套租户权限）
- `WEBSITE_MANAGER` — `centerPermissions("menu.website-center")` 自动继承，但 filter 掉 `-global` 后缀
- `WEBSITE_EDITOR` — `centerEditorPermissions("menu.website-center")` 自动继承，但 filter 掉 `-global` 后缀

> PLUGIN_MANAGER 不参与全局实体维护，保持只读角色（当前 permissions.ts 第 1202 行只有 `knowledge-entity.read`）。

#### WEBSITE_MANAGER/EDITOR 排除 global 权限

```ts
[ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center")
  .filter(k => !k.endsWith("-global")),

[ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center")
  .filter(k => !k.endsWith("-global")),
```

### GEO 联动

跨租户知识库建成后，GEO 内容类型自动受益：

1. `geo-topic` 的 `entities` 关系字段查询候选实体时，返回全局+租户合并列表
2. `comparison-page` 的对比实体引用全局知识实体，各租户共享同一套对比基准
3. `faq` 的 `mainEntity` / `mentionedEntities` 可关联全局实体，JSON-LD 输出时自动包含全局实体的 `sameAs`、`url` 等属性

这些联动不需要新建关系 — 现有 GEO CT 已通过 `mainEntity` / `mentionedEntities` 关系引用 `knowledge-entity`，只需查询时返回合并结果即可。

### has-tenant-access 策略兼容

现有 `has-tenant-access` 策略在 `siteId` 为空时直接放行（第 32-34 行），这意味着全局路由的 `has-tenant-access` 策略不会阻断。权限控制完全由 `has-permission` 策略的 `-global` action 实现。`channelScopeRoute` 的 4 个策略链中，`has-permission` 在 `has-tenant-access` 之前执行，非授权角色在 `has-permission` 阶段即被拒绝。

## 文件清单

### zhao-website 修改
| 文件 | 变更 |
|------|------|
| `server/src/content-types/knowledge-entity/schema.json` | `site.required: true → false` |
| `server/src/content-types/first-truth-policy/schema.json` | `site.required: true → false` |
| `server/src/services/knowledge-graph.ts` | `findEntities`/`findEntityBySlug`/`disambiguate`/`findRelations`/`exportGraph`/`exportEntity`/`exportFacts`/`verifyAll` 改为 `$or` 合并或两步查询；`createEntity`/`updateEntity`/`deleteEntity` 签名改为 `number | null` |
| `server/src/services/first-truth.ts` | `find`/`findOne`/`findByClaimKey`/`detectConflicts` 改为 `$or` 合并或两步查询；`create`/`update`/`softDelete`/`verify`/`_markRelatedEntitiesPending` 签名改为 `number | null` |
| `server/src/controllers/admin-api/knowledge-graph.ts` | 新增 `createGlobalEntity` / `updateGlobalEntity` / `deleteGlobalEntity` |
| `server/src/controllers/admin-api/first-truth.ts` | 新增 `createGlobal` / `updateGlobal` / `deleteGlobal` / `verifyGlobal` |
| `server/src/routes/admin-api.ts` | `/kg/` → `/knowledge-graph/`；新增 7 条全局路由（3 entity + 4 first-truth） |

### zhao-auth 修改
| 文件 | 变更 |
|------|------|
| `server/src/permissions.ts` | `menu.website-knowledge-entity.children` 追加 3 个 global action；`menu.website-first-truth.children` 追加 3 个 global action；CHANNEL_ADMIN 硬编码追加 6 个；WEBSITE_MANAGER / WEBSITE_EDITOR 加 filter 排除 global |

### zhao-website 新增测试
| 文件 | 说明 |
|------|------|
| `tests/services/knowledge-graph-global.test.ts` | 全局实体 service 测试：合并查询、两步查询优先级、全局 CRUD、签名兼容 |
| `tests/services/first-truth-global.test.ts` | 全局真值 service 测试：合并查询、全局 CRUD、跨层冲突检测 |

## 测试策略

### service 层测试
- `findEntities` 返回全局+租户合并结果
- `findEntityBySlug` 两步查询：租户有同 slug 时返回租户的，租户没有时返回全局的
- `createEntity(null, data)` 正确写入 site=null
- `createEntity(siteId, data)` 正确写入 site=siteId
- `updateEntity(null, ...)` 仅更新 site=null 的实体
- `updateEntity(siteId, ...)` 仅更新 site=siteId 的实体（不误更新全局实体）
- `first-truth.find` 返回合并结果
- `first-truth.findByClaimKey` 两步查询优先级
- `first-truth.detectConflicts` 检测跨层 claimKey 冲突（全局和租户同 claimKey 不同值）
- `_markRelatedEntitiesPending(null, ...)` 正确查询全局实体

### 权限测试
- CHANNEL_ADMIN 调用 `/knowledge-graph/entities/global` POST → 200
- WEBSITE_MANAGER 调用同一路由 → 403
- WEBSITE_MANAGER 调用 `/knowledge-graph/entities` POST → 200（租户层正常）
- `centerPermissions("menu.website-center")` 结果不含 `-global` 后缀的 key

### controller 测试
- `createGlobalEntity` 设置 site=null，body 格式使用 `ctx.request.body`
- `updateGlobalEntity` 仅允许更新 site=null 的实体
- `deleteGlobalEntity` 仅允许删除 site=null 的实体
- `verifyGlobal` 正确调用 service 的 `verify(null, ...)`

### 回归测试
- 现有 knowledge-graph 测试全部通过（路由从 `/kg/` 改为 `/knowledge-graph/` 后，如有 API 调用需同步更新）
- 现有 first-truth 测试全部通过

## 不做

- 不做全局实体的版本管理
- 不做租户覆盖全局实体的能力（租户只能创建自己的实体，不能修改全局实体）
- 不做 knowledge-relation 的全局/租户分离（关系始终在同一层级内连接）
- 不做跨层级关系（全局实体与租户实体之间不建立 relation）
- 不做 PLUGIN_MANAGER 的全局写入权限（保持只读）

## 验收标准

1. `knowledge-entity` 和 `first-truth-policy` 的 `site` 字段允许 null
2. 租户查询知识实体时自动合并全局实体（site=null）
3. `findEntityBySlug` 两步查询，租户有同 slug 时优先返回租户的
4. CHANNEL_ADMIN 可创建/更新/删除/验证全局实体和全局真值
5. WEBSITE_MANAGER 可创建/更新/删除租户实体，不可操作全局实体（403）
6. PLUGIN_MANAGER 保持只读，不可操作全局实体
7. 路由路径从 `/kg/` 改为 `/knowledge-graph/`
8. `exportGraph`/`exportFacts`/`disambiguate`/`verifyAll` 均合并全局+租户结果
9. `detectConflicts` 检测跨层 claimKey 冲突
10. 现有测试全部通过，无回归

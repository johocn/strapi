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
- `site = 具体值` → 租户实体，插件管理员以下角色维护

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

涉及的方法：
- `knowledge-graph.ts`: `findEntities`、`findEntityBySlug`、`findEntityByRef`（`findEntityByRef` 不变，按 refTargetType/refTargetId 查询无 site 过滤）
- `first-truth.ts`: `find`、`findOne`（`conflicts`、`exportFacts` 同步修改）

### 权限分层

| 操作 | 全局实体 (site=null) | 租户实体 (site=具体值) |
|------|---------------------|----------------------|
| 读取 | 所有已登录用户 | 所有已登录用户 |
| 创建 | CHANNEL_ADMIN / PLUGIN_MANAGER / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |
| 更新 | CHANNEL_ADMIN / PLUGIN_MANAGER / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |
| 删除 | CHANNEL_ADMIN / PLUGIN_MANAGER / ADMIN | WEBSITE_MANAGER / WEBSITE_EDITOR |

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

#### 新增路由（全局层）

```ts
channelScopeRoute("POST", "/knowledge-graph/entities/global", "knowledge-graph.createGlobalEntity", "knowledge-entity.create-global"),
channelScopeRoute("PUT", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.updateGlobalEntity", "knowledge-entity.update-global"),
channelScopeRoute("DELETE", "/knowledge-graph/entities/global/:documentId", "knowledge-graph.deleteGlobalEntity", "knowledge-entity.delete-global"),
```

读取路由不新增 — `GET /knowledge-graph/entities` 自动合并全局+租户结果。

#### first-truth 新增路由（全局层）

```ts
channelScopeRoute("POST", "/first-truths/global", "first-truth.createGlobal", "first-truth.create-global"),
channelScopeRoute("PUT", "/first-truths/global/:documentId", "first-truth.updateGlobal", "first-truth.update-global"),
channelScopeRoute("DELETE", "/first-truths/global/:documentId", "first-truth.deleteGlobal", "first-truth.delete-global"),
```

### Controller 方法

`knowledge-graph.ts` controller 新增 3 个全局方法。与租户方法逻辑一致，区别是 `site` 设为 `null`：

```ts
async createGlobalEntity(ctx) {
  const data = ctx.request.body.data;
  const result = await strapi.plugin('zhao-website').service('knowledge-graph').createEntity(null, data);
  ctx.body = { data: result };
},

async updateGlobalEntity(ctx) {
  const { documentId } = ctx.params;
  const data = ctx.request.body.data;
  const result = await strapi.plugin('zhao-website').service('knowledge-graph').updateEntity(null, documentId, data);
  ctx.body = { data: result };
},

async deleteGlobalEntity(ctx) {
  const { documentId } = ctx.params;
  await strapi.plugin('zhao-website').service('knowledge-graph').deleteEntity(null, documentId);
  ctx.body = { data: { success: true } };
},
```

`first-truth.ts` controller 同理新增 3 个全局方法。

### Service 方法

`createEntity` / `updateEntity` / `deleteEntity` 的 service 方法已有 `site: siteId` 逻辑，传入 `null` 即可写入全局层。但 `updateEntity` 和 `deleteEntity` 的 `findOneAdmin` 查询需调整 — 全局实体的查询条件为 `site: null`：

```ts
// updateEntity 修改 — 支持全局实体
async updateEntity(siteId: number | null, documentId: string, data: any) {
  const where: any = { documentId, deletedAt: null };
  if (siteId !== null) where.site = siteId;
  else where.site = null;
  const existing = await strapi.db.query(ENTITY_UID).findOne({ where });
  if (!existing) {
    const e: any = new Error("Entity not found");
    e.status = 404;
    throw e;
  }
  // ... 后续更新逻辑不变
}
```

`deleteEntity` 同理。

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
- `CHANNEL_ADMIN` — 硬编码数组追加 6 个 global action
- `PLUGIN_MANAGER` — 需在硬编码数组中追加 6 个 global action
- `WEBSITE_MANAGER` — `centerPermissions("menu.website-center")` 自动继承，但 filter 掉 `-global` 后缀
- `WEBSITE_EDITOR` — `centerEditorPermissions("menu.website-center")` 自动继承，但 filter 掉 `-global` 后缀

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
| `server/src/services/knowledge-graph.ts` | 查询方法改为 `$or` 合并；`updateEntity` / `deleteEntity` 支持 `siteId = null` |
| `server/src/services/first-truth.ts` | 查询方法改为 `$or` 合并；新增全局 CRUD 方法 |
| `server/src/controllers/admin-api/knowledge-graph.ts` | 新增 `createGlobalEntity` / `updateGlobalEntity` / `deleteGlobalEntity` |
| `server/src/controllers/admin-api/first-truth.ts` | 新增 `createGlobal` / `updateGlobal` / `deleteGlobal` |
| `server/src/routes/admin-api.ts` | `/kg/` → `/knowledge-graph/`；新增 6 条全局路由 |

### zhao-auth 修改
| 文件 | 变更 |
|------|------|
| `server/src/permissions.ts` | `menu.website-knowledge-entity.children` 追加 3 个 global action；`menu.website-first-truth.children` 追加 3 个 global action；CHANNEL_ADMIN / PLUGIN_MANAGER 硬编码追加；WEBSITE_MANAGER / WEBSITE_EDITOR 加 filter 排除 global |

### zhao-website 新增测试
| 文件 | 说明 |
|------|------|
| `tests/services/knowledge-graph-global.test.ts` | 全局实体 service 测试：合并查询、全局 CRUD、权限校验 |
| `tests/services/first-truth-global.test.ts` | 全局真值 service 测试：合并查询、全局 CRUD |

## 测试策略

### service 层测试
- `findEntities` 返回全局+租户合并结果
- `createEntity(null, data)` 正确写入 site=null
- `createEntity(siteId, data)` 正确写入 site=siteId
- `findEntityBySlug` 同时匹配全局和租户 slug
- `updateEntity(null, ...)` 仅更新 site=null 的实体
- `first-truth` service 的 `find` 返回合并结果

### 权限测试
- CHANNEL_ADMIN 调用 `/knowledge-graph/entities/global` POST → 200
- WEBSITE_MANAGER 调用同一路由 → 403
- WEBSITE_MANAGER 调用 `/knowledge-graph/entities` POST → 200（租户层正常）
- `centerPermissions("menu.website-center")` 结果不含 `-global` 后缀的 key

### controller 测试
- `createGlobalEntity` 设置 site=null
- `updateGlobalEntity` 仅允许更新 site=null 的实体
- `deleteGlobalEntity` 仅允许删除 site=null 的实体

## 不做

- 不做全局实体的版本管理
- 不做租户覆盖全局实体的能力（租户只能创建自己的实体，不能修改全局实体）
- 不做 knowledge-relation 的全局/租户分离（关系始终在同一层级内连接）
- 不做跨层级关系（全局实体与租户实体之间不建立 relation）

## 验收标准

1. `knowledge-entity` 和 `first-truth-policy` 的 `site` 字段允许 null
2. 租户查询知识实体时自动合并全局实体（site=null）
3. CHANNEL_ADMIN 可创建/更新/删除全局实体
4. WEBSITE_MANAGER 可创建/更新/删除租户实体，不可操作全局实体
5. 路由路径从 `/kg/` 改为 `/knowledge-graph/`
6. 现有测试全部通过，无回归

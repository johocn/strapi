# 插件功能更新 — Brand Voice + Sync-Event + 前端统一适配设计

> 日期：2026-07-12
> 范围：zhao-website（Brand Voice 后端+前端）、zhao-studio（Sync-Event 后端+前端）、两个插件 admin/src API 路径统一适配、跨租户知识库全局管理 UI 补充

## 1. 背景与问题

### 1.1 Brand Voice 和 Sync-Event 实现丢失
Brand Voice（zhao-website）和 Sync-Event（zhao-studio）的后端和前端实现曾在上一轮会话中完成，但由于 git reset 操作，所有相关 commit 已丢失。当前代码库中这两个功能完全缺失。

### 1.2 前端 API 路径不匹配后端实际路由
- `zhao-website/admin/src/utils/api.ts` 使用旧路径模式（`/api/zhao-website/admin/knowledge-graph/find-entities`），后端实际路由为 `/api/zhao-website/v1/admin/knowledge-graph/entities`（RESTful + `/v1` 前缀）
- `zhao-studio` 前端各 `utils/*Api.ts` 使用 `/admin/plugins/${pluginId}/...` 模式，后端实际路由为 `/api/zhao-studio/v1/admin/...`（content-api 类型）

### 1.3 跨租户知识库前端缺失全局管理 UI
后端已完成跨租户知识库（全局实体/真值的 CRUD 路由和权限），但 `KnowledgeGraphPage.tsx` 和 `FirstTruthPage.tsx` 没有全局管理入口。

### 1.4 前端调用原则
- `admin/src/`（后台管理端）→ 请求走 admin 路由（`/v1/admin/...`）
- `dsite` / `shao`（C 端前端）→ 请求走公开路由（不带 admin 前缀）

## 2. 技术栈

- Strapi 5 插件架构（zhao-website、zhao-studio、zhao-auth）
- TypeScript + Jest（后端 TDD）
- React + antd 5 + react-router-dom（前端）
- 多租户隔离：`site` relation to `plugin::zhao-common.site-config`

## 3. Brand Voice 后端（zhao-website）

### 3.1 数据模型

`brand-voice` CT，归属于 `zhao-website` 插件：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string, required, maxLength 100 | 话术模板名称 |
| `category` | enumeration: `tone/style/phrase/disclaimer/cta`, required | 话术类目 |
| `content` | richtext, required | 话术内容模板（支持 `{{variable}}` 占位符） |
| `variables` | json | 变量定义列表 `[{name, description, defaultValue}]` |
| `status` | boolean, default true | 启用/禁用 |
| `tags` | json | 标签数组 |
| `site` | relation manyToOne → `plugin::zhao-common.site-config`, required | 租户隔离 |
| `deletedAt` | datetime, default null | 软删除标记 |

**文件**：`plugins/zhao-website/server/src/content-types/brand-voice/schema.json` + `index.ts`

### 3.2 Service（`brand-voice.ts`）

**文件**：`plugins/zhao-website/server/src/services/brand-voice.ts`

方法列表：
- `findAdmin(siteId, query)` — 按 site 过滤列表，支持 category/status 筛选，分页
- `findOneAdmin(siteId, documentId)` — 单条查询
- `create(siteId, data)` — 创建，自动填充 site
- `update(siteId, documentId, data)` — 更新（先查 existing，404 if not found）
- `softDelete(siteId, documentId)` — 软删除（设置 deletedAt）
- `listByCategory(siteId, category)` — 按类目查询启用的话术
- `resolveVariables(siteId, documentId, variables)` — 替换 `{{variable}}` 占位符，返回最终文本
- `getRefContent(siteId, category)` — 获取某类目下所有话术作为参考集

常量：`const UID = "plugin::zhao-website.brand-voice";`

### 3.3 Controller

复用 `createGenericController("brand-voice")` 注册到 `generic.ts`。额外两个特殊操作注册到独立 controller：

**文件**：`plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts`

```ts
export default {
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").resolveVariables(
      ctx.state.siteId, ctx.params.documentId, ctx.request.body.variables || {}
    );
  },
  async listByCategory(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(
      ctx.state.siteId, ctx.params.category
    );
  },
};
```

**注册**：`controllers/index.ts` 新增 `"brand-voice": brandVoice` 导入。

### 3.4 Routes（`admin-api.ts`，`channelScopeRoute`）

| Method | Path | Handler | Permission |
|--------|------|---------|------------|
| GET | `/brand-voices` | `brand-voice-admin.find` | `brand-voice.read` |
| GET | `/brand-voices/:documentId` | `brand-voice-admin.findOne` | `brand-voice.read` |
| POST | `/brand-voices` | `brand-voice-admin.create` | `brand-voice.create` |
| PUT | `/brand-voices/:documentId` | `brand-voice-admin.update` | `brand-voice.update` |
| DELETE | `/brand-voices/:documentId` | `brand-voice-admin.delete` | `brand-voice.delete` |
| POST | `/brand-voices/:documentId/resolve` | `brand-voice.resolve` | `brand-voice.read` |
| GET | `/brand-voices/by-category/:category` | `brand-voice.listByCategory` | `brand-voice.read` |

### 3.5 Permissions（`zhao-auth/permissions.ts`）

**PERMISSION_TREE** 在 `menu.website-center.children` 中新增：

```ts
"menu.website-brand-voice": {
  label: "品牌话术",
  type: "menu",
  children: {
    "brand-voice.read": { label: "查看话术", type: "button" },
    "brand-voice.create": { label: "新增话术", type: "button" },
    "brand-voice.update": { label: "编辑话术", type: "button" },
    "brand-voice.delete": { label: "删除话术", type: "button" },
  },
},
```

**角色分配**：
- `CHANNEL_ADMIN` 硬编码数组追加：`"menu.website-brand-voice"`, `"brand-voice.read"`, `"brand-voice.create"`, `"brand-voice.update"`, `"brand-voice.delete"`
- `PLUGIN_MANAGER` 硬编码数组追加：同上
- `WEBSITE_MANAGER` = `centerPermissions("menu.website-center")`（自动继承，非 `-global`，不需要 filter）
- `WEBSITE_EDITOR` = `centerEditorPermissions("menu.website-center")`（自动继承）

### 3.6 注册文件修改

| 文件 | 操作 |
|------|------|
| `content-types/index.ts` | 新增 `brand-voice` 导入和导出 |
| `services/index.ts` | 新增 `brand-voice` 导入和导出 |
| `controllers/admin-api/generic.ts` | 新增 `"brand-voice": createGenericController("brand-voice")` |
| `controllers/admin-api/brand-voice.ts` | 新建 |
| `controllers/index.ts` | 新增 `brand-voice` 导入和导出 |

## 4. Sync-Event 后端（zhao-studio）

### 4.1 数据模型

`sync-event` CT，归属于 `zhao-studio` 插件：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sourceType` | enumeration: `website`, required | 来源类型 |
| `sourceContentType` | string, required | 来源内容类型（article/product/case/faq 等） |
| `sourceDocumentId` | string | 来源文档 ID |
| `sourceUrl` | string | 来源内容 URL |
| `sourceTitle` | string | 来源内容标题 |
| `targetDraftId` | relation manyToOne → `plugin::zhao-studio.article-draft` | 关联草稿 |
| `eventStatus` | enumeration: `pending/resolved/ignored`, default `pending` | 事件状态 |
| `eventPayload` | json | 原始 webhook payload 快照 |
| `resolvedAt` | datetime | 处理时间 |
| `resolvedBy` | string | 处理人 |
| `site` | relation manyToOne → `plugin::zhao-common.site-config`, required | 租户隔离 |

**文件**：`plugins/zhao-studio/server/src/content-types/sync-event/schema.json` + `index.ts`

### 4.2 Service（`sync-event.ts`）

**文件**：`plugins/zhao-studio/server/src/services/sync-event.ts`

方法列表：
- `list(siteId, query)` — 按 site 过滤，支持 `eventStatus`/`sourceContentType` 筛选，分页，populate `targetDraftId`
- `findOne(siteId, documentId)` — 单条查询，populate `targetDraftId`
- `resolve(siteId, documentId, body)` — 处理事件：
  - `action: "create"` — 从 payload 创建新 `article-draft`，关联 `targetDraftId`
  - `action: "update"` — 更新已有 `article-draft`（需提供 `draftId`）
  - `action: "ignore"` — 标记为 `ignored`
  - 统一设置 `eventStatus=resolved`（或 `ignored`）、`resolvedAt`、`resolvedBy`
- `createFromWebhook(payload)` — 供 `website-bridge` webhook 调用，自动创建 `pending` 事件

常量：`const UID = "plugin::zhao-studio.sync-event";` `const DRAFT_UID = "plugin::zhao-studio.article-draft";`

### 4.3 Controller（`sync-event-api.ts`）

**文件**：`plugins/zhao-studio/server/src/controllers/sync-event-api.ts`

```ts
export default {
  async list(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").list(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").findOne(ctx.state.siteId, ctx.params.documentId);
  },
  async resolve(ctx: any) {
    ctx.body = await strapi.plugin("zhao-studio").service("sync-event").resolve(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
};
```

### 4.4 Routes（`content-api.ts`，`adminRoute`）

| Method | Path | Handler | Permission |
|--------|------|---------|------------|
| GET | `/sync-events` | `sync-event-api.list` | `sync-event.read` |
| GET | `/sync-events/:documentId` | `sync-event-api.findOne` | `sync-event.read` |
| POST | `/sync-events/:documentId/resolve` | `sync-event-api.resolve` | `sync-event.update` |

### 4.5 Permissions（`zhao-auth/permissions.ts`）

**PERMISSION_TREE** 在 `menu.studio-center.children` 中新增：

```ts
"menu.studio-sync-event": {
  label: "同步事件",
  type: "menu",
  children: {
    "sync-event.read": { label: "查看同步事件", type: "button" },
    "sync-event.update": { label: "处理同步事件", type: "button" },
    "sync-event.manage": { label: "同步事件管理", type: "button" },
  },
},
```

**角色分配**：
- `CHANNEL_ADMIN` 硬编码数组追加：`"menu.studio-sync-event"`, `"sync-event.read"`, `"sync-event.update"`, `"sync-event.manage"`
- `PLUGIN_MANAGER` 硬编码数组追加：同上
- `STUDIO_MANAGER` = `centerPermissions("menu.studio-center")`（自动继承）
- `STUDIO_EDITOR` = `centerEditorPermissions("menu.studio-center")`（自动继承，仅 read）

### 4.6 注册文件修改

| 文件 | 操作 |
|------|------|
| `content-types/index.ts` | 新增 `sync-event` 导入和导出 |
| `services/index.ts` | 新增 `sync-event` 导入和导出 |
| `controllers/sync-event-api.ts` | 新建 |
| `controllers/index.ts` | 新增 `sync-event-api` 导入和导出 |

## 5. 前端 API 统一适配

### 5.1 原则

`admin/src/` 请求统一走 `/api/{plugin}/v1/admin/` 前缀，对齐后端 `channelScopeRoute`/`adminRoute` 实际路径。

### 5.2 zhao-website API 适配（`admin/src/utils/api.ts`）

**当前路径 → 修正后路径**：

| 常量名 | 当前路径 | 修正后路径 |
|--------|---------|----------|
| `ADMIN_BASE` | `/api/zhao-website/admin` | `/api/zhao-website/v1/admin` |
| `kgFindEntities` | `.../knowledge-graph/find-entities` | `.../knowledge-graph/entities` |
| `kgCreateEntity` | `.../knowledge-graph/create-entity` | `.../knowledge-graph/entities` |
| `kgUpdateEntity` | （缺失） | `.../knowledge-graph/entities/${id}` |
| `kgDeleteEntity` | `.../knowledge-graph/delete-entity/${id}` | `.../knowledge-graph/entities/${id}` |
| `kgFindRelations` | `.../knowledge-graph/find-relations` | `.../knowledge-graph/relations` |
| `kgAddRelation` | `.../knowledge-graph/add-relation` | `.../knowledge-graph/relations` |
| `kgDeleteRelation` | `.../knowledge-graph/delete-relation/${id}` | `.../knowledge-graph/relations/${id}` |
| `kgDisambiguate` | （缺失） | `.../knowledge-graph/disambiguate` |
| `kgExportGraph` | `.../knowledge-graph/export-graph` | `.../knowledge-graph/export` |
| `kgCreateGlobalEntity` | （缺失） | `.../knowledge-graph/entities/global` |
| `kgUpdateGlobalEntity` | （缺失） | `.../knowledge-graph/entities/global/${id}` |
| `kgDeleteGlobalEntity` | （缺失） | `.../knowledge-graph/entities/global/${id}` |
| `ftFind` | `.../first-truth/find` | `.../first-truths` |
| `ftFindOne` | `.../first-truth/find-one/${id}` | `.../first-truths/${id}` |
| `ftCreate` | `.../first-truth/create` | `.../first-truths` |
| `ftUpdate` | `.../first-truth/update/${id}` | `.../first-truths/${id}` |
| `ftDelete` | `.../first-truth/delete/${id}` | `.../first-truths/${id}` |
| `ftVerify` | `.../first-truth/verify/${id}` | `.../first-truths/${id}/verify` |
| `ftConflicts` | `.../first-truth/conflicts` | `.../first-truths/conflicts` |
| `ftExportFacts` | `.../first-truth/export-facts` | `.../first-truths/export` |
| `ftCreateGlobal` | （缺失） | `.../first-truths/global` |
| `ftUpdateGlobal` | （缺失） | `.../first-truths/global/${id}` |
| `ftDeleteGlobal` | （缺失） | `.../first-truths/global/${id}` |
| `ftVerifyGlobal` | （缺失） | `.../first-truths/global/${id}/verify` |
| `bvFind` | （新增） | `.../brand-voices` |
| `bvFindOne` | （新增） | `.../brand-voices/${id}` |
| `bvCreate` | （新增） | `.../brand-voices` |
| `bvUpdate` | （新增） | `.../brand-voices/${id}` |
| `bvDelete` | （新增） | `.../brand-voices/${id}` |
| `bvResolve` | （新增） | `.../brand-voices/${id}/resolve` |
| `bvListByCategory` | （新增） | `.../brand-voices/by-category/${category}` |

### 5.3 zhao-studio API 适配

**当前模式**：`baseUrl = '/admin/plugins/${pluginId}'`

**修正为**：`baseUrl = '/api/zhao-studio/v1/admin'`

涉及文件：
- `utils/collectApi.ts` — sources/tasks 路径
- `utils/publishApi.ts` — platforms/accounts/records 路径
- `utils/aiApi.ts` — ai/config 路径
- `utils/analyticsApi.ts` — ad-slots/stats 路径
- 新增 `utils/syncEventApi.ts` — sync-events 路径

### 5.4 zhao-studio hooks 适配

当前各 hooks 从 `response.data` 取值（适配 Strapi 原生 admin 路由的 wrapper 格式）。后端 `content-api` 类型路由直接返回数组/对象，无 wrapper。

**修改**：所有 hooks 中 `response.data || []` 改为直接使用 `response`。

涉及 hooks：
- `useCollectSources.ts`
- `useCollectTasks.ts`
- `usePublishAccounts.ts`
- `usePublishPlatforms.ts`
- `usePublishRecords.ts`
- `useAdSlots.ts`
- `useStats.ts`
- `useAIConfig.ts`
- `useAIActions.ts`
- `usePublishActions.ts`

## 6. 前端页面补全

### 6.1 BrandVoicePage.tsx（zhao-website，新建）

**文件**：`plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx`

**UI 布局**：
- 顶部筛选：category Select + status Switch
- 「新建话术」按钮
- Table 列：name / category / status（Switch 显示）/ tags / 操作（编辑/删除）
- 新建/编辑 Modal：name / category / content（richtext）/ variables（JSON 编辑器）/ tags / status
- 「变量预览」按钮 → 调用 `bvResolve`，Modal 展示替换后文本

### 6.2 跨租户知识图谱全局管理 UI（KnowledgeGraphPage.tsx，修改）

现有页面补充：
- 实体 Table 新增「层级」列（`site === null` 显示「全局」，否则显示「租户」）
- 新增「新建全局实体」按钮（仅 CHANNEL_ADMIN 可见，调用 `kgCreateGlobalEntity`）
- 全局实体的操作列：编辑（`kgUpdateGlobalEntity`）/ 删除（`kgDeleteGlobalEntity`）

### 6.3 跨租户第一真值全局管理 UI（FirstTruthPage.tsx，修改）

现有页面补充：
- 真值列表新增「层级」列
- 新增「新建全局真值」按钮（仅 CHANNEL_ADMIN 可见）
- 全局真值操作列：编辑 / 删除 / verify

### 6.4 SyncEventPage.tsx（zhao-studio，新建）

**文件**：`plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx`

**UI 布局**：
- 顶部筛选：eventStatus Select + sourceContentType Select
- Table 列：sourceTitle / sourceContentType / eventStatus（Tag 标签）/ createdAt / 操作
- 操作列：
  - `pending` →「处理」按钮 → 打开处理 Modal
  - `resolved` →「查看」按钮 → 查看详情 Modal
- 处理 Modal：
  - 操作选择 Radio：`create`（新建草稿）/ `update`（更新已有草稿）/ `ignore`（忽略）
  - `update` 时显示草稿选择 Select
  - 确认后调用 `resolve` API

### 6.5 路由注册

**zhao-website `App.tsx`** 新增：
```tsx
<Route path="/brand-voice" element={<BrandVoicePage />} />
```

**zhao-studio `App.tsx`** 新增：
```tsx
<Route path="/sync-events" element={<SyncEventPage />} />
```

### 6.6 侧边栏菜单

**zhao-website `PluginLayout.tsx`** menuItems 新增：
```ts
{ key: 'brand-voice', icon: <MessageOutlined />, label: '品牌话术' },
```

**zhao-studio `PluginLayout.tsx`** menuItems 新增：
```ts
{ key: 'sync-events', icon: <SyncOutlined />, label: '同步事件' },
```

## 7. 完整文件清单

### 新建文件

| 文件 | 责任 |
|------|------|
| `plugins/zhao-website/server/src/content-types/brand-voice/schema.json` | Brand Voice CT schema |
| `plugins/zhao-website/server/src/content-types/brand-voice/index.ts` | CT 导出 |
| `plugins/zhao-website/server/src/services/brand-voice.ts` | Brand Voice service |
| `plugins/zhao-website/server/src/controllers/admin-api/brand-voice.ts` | Brand Voice 特殊操作 controller |
| `plugins/zhao-website/tests/services/brand-voice.test.ts` | Brand Voice service 测试 |
| `plugins/zhao-studio/server/src/content-types/sync-event/schema.json` | Sync-Event CT schema |
| `plugins/zhao-studio/server/src/content-types/sync-event/index.ts` | CT 导出 |
| `plugins/zhao-studio/server/src/services/sync-event.ts` | Sync-Event service |
| `plugins/zhao-studio/server/src/controllers/sync-event-api.ts` | Sync-Event controller |
| `plugins/zhao-studio/tests/services/sync-event.test.ts` | Sync-Event service 测试 |
| `plugins/zhao-website/admin/src/pages/BrandVoicePage.tsx` | 品牌话术管理页面 |
| `plugins/zhao-studio/admin/src/pages/SyncEventPage.tsx` | 同步事件管理页面 |
| `plugins/zhao-studio/admin/src/utils/syncEventApi.ts` | Sync-Event API 封装 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `plugins/zhao-website/server/src/content-types/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/services/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/controllers/admin-api/generic.ts` | 新增 `"brand-voice": createGenericController("brand-voice")` |
| `plugins/zhao-website/server/src/controllers/index.ts` | 新增 brand-voice 导入 |
| `plugins/zhao-website/server/src/routes/admin-api.ts` | 新增 7 条 brand-voice 路由 |
| `plugins/zhao-studio/server/src/content-types/index.ts` | 新增 sync-event 导入 |
| `plugins/zhao-studio/server/src/services/index.ts` | 新增 sync-event 导入 |
| `plugins/zhao-studio/server/src/controllers/index.ts` | 新增 sync-event-api 导入 |
| `plugins/zhao-studio/server/src/routes/content-api.ts` | 新增 3 条 sync-event 路由 |
| `plugins/zhao-auth/server/src/permissions.ts` | 新增 brand-voice + sync-event 权限节点和角色分配 |
| `plugins/zhao-website/admin/src/utils/api.ts` | ADMIN_BASE 修正 + 全部路径改为 RESTful + 新增 brand-voice/global 常量 |
| `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx` | 全局实体管理 UI |
| `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx` | 全局真值管理 UI |
| `plugins/zhao-website/admin/src/pages/App.tsx` | 新增 brand-voice 路由 |
| `plugins/zhao-website/admin/src/components/PluginLayout.tsx` | 新增菜单项 |
| `plugins/zhao-studio/admin/src/pages/App.tsx` | 新增 sync-events 路由 |
| `plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx` | 新增菜单项 |
| `plugins/zhao-studio/admin/src/utils/collectApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/publishApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/aiApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/utils/analyticsApi.ts` | baseUrl 修正 |
| `plugins/zhao-studio/admin/src/hooks/useCollectSources.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useCollectTasks.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishAccounts.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishPlatforms.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishRecords.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAdSlots.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useStats.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAIConfig.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/useAIActions.ts` | response.data → response |
| `plugins/zhao-studio/admin/src/hooks/usePublishActions.ts` | response.data → response |

## 8. 测试策略

### 8.1 后端单元测试（TDD）

| 测试文件 | 覆盖范围 |
|---------|---------|
| `zhao-website/tests/services/brand-voice.test.ts` | findAdmin / findOneAdmin / create / update / softDelete / listByCategory / resolveVariables / getRefContent |
| `zhao-studio/tests/services/sync-event.test.ts` | list / findOne / resolve（create/update/ignore）/ createFromWebhook |

测试使用 `createMockStrapi` 手写 mock（不引入新依赖），与现有测试模式一致。

### 8.2 前端类型检查

```bash
cd plugins/zhao-website && npx tsc --noEmit -p admin/tsconfig.json
cd plugins/zhao-studio && npx tsc --noEmit -p admin/tsconfig.json
```

### 8.3 构建

```bash
cd plugins/zhao-website && npm run build
cd plugins/zhao-studio && npm run build
```

## 9. 验收标准

1. `brand-voice` CT schema 正确注册，`site` 关联 `plugin::zhao-common.site-config`
2. Brand Voice 7 个 API 路由可访问，权限校验生效
3. `sync-event` CT schema 正确注册，`targetDraftId` 关联 `plugin::zhao-studio.article-draft`
4. Sync-Event 3 个 API 路由可访问，权限校验生效
5. `zhao-website` 前端 `api.ts` 所有路径对齐后端实际路由
6. `zhao-studio` 前端所有 `*Api.ts` 的 `baseUrl` 改为 `/api/zhao-studio/v1/admin`
7. `zhao-studio` hooks 从 `response.data` 改为直接使用 `response`
8. BrandVoicePage 可渲染，话术 CRUD 正常
9. KnowledgeGraphPage 全局实体管理按钮可见（CHANNEL_ADMIN）
10. FirstTruthPage 全局真值管理按钮可见（CHANNEL_ADMIN）
11. SyncEventPage 可渲染，事件列表加载 + 处理流程正常
12. 侧边栏菜单出现「品牌话术」和「同步事件」
13. 两个插件 `npx tsc --noEmit -p admin/tsconfig.json` 退出码 0
14. 两个插件 `npm test` 后端测试全通过（不含预存失败）
15. 两个插件 `npm run build` dist 重新生成

## 10. 不做的事

- 不为 Brand Voice / Sync-Event 做前端单元测试（无 Jest 配置）
- 不修改 zhao-studio 后端路由的 `type`（保持 `content-api` 类型）
- 不修改 zhao-website 后端路由的 `type`（保持 `content-api` 类型，admin 路由混入其中）
- 不做 C 端前端（dsite/shao）的 API 适配
- 不做 Brand Voice 的 AI 自动生成（仅模板管理 + 手动变量替换）
- 不做 Sync-Event 的自动处理（仅手动处理流程）

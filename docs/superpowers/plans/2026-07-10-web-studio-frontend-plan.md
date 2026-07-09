# 媒体发布中心：后端补全 + 前端补全实施计划

**Goal:** Phase A 补全后端缺失的 admin API + 可见性字段，Phase B 从零补全前端

**Architecture:** Strapi 插件 zhao-studio（后端）+ uniapp（前端 e:\code\web）

**Tech Stack:** TypeScript / Strapi v5 / Vue 3 / uni-app

---

## Phase A：后端补全

### Task A1: article-draft CT 增加 scope 字段 + draft controller 补全 CRUD + 可见性逻辑

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\content-types\article-draft\schema.json`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\draft.ts`

- [ ] **Step 1: schema.json 追加 scope/scopeTenantId 字段**

在 `publishedAt` 字段之前追加：
```json
"scope": {
  "type": "enumeration",
  "enum": ["current", "global", "tenant"],
  "default": "current"
},
"scopeTenantId": {
  "type": "string"
}
```

- [ ] **Step 2: draft.ts 补充 create/update/delete + 可见性逻辑**

现有 draft.ts 只有 list + findOne。补充：
- `create(ctx)`: 从 body 取数据；检查用户是否有 `menu.tenant` 权限，有则接受 scope/scopeTenantId，无则强制 scope=current
- `update(ctx)`: 同上逻辑
- `delete(ctx)`: 按 documentId 删除
- 修改 `list(ctx)`: 渠道管理员以上可查全局+所有租户+当前租户；普通用户只查 scope=current 且当前租户

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/content-types/article-draft/schema.json plugins/zhao-studio/server/src/controllers/draft.ts
git commit -m "feat(studio): article-draft CT 增加 scope 字段 + draft controller 补全 CRUD + 可见性逻辑"
```

---

### Task A2: 新增 knowledge-index / browser-log / stat-summary controller

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\controllers\knowledge-index.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\controllers\browser-log.ts`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\controllers\stat-summary.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\index.ts`

- [ ] **Step 1: 创建 knowledge-index.ts**

CRUD controller 操作 `plugin::zhao-studio.knowledge-point-index` CT：
- list / findOne / create / update / delete

- [ ] **Step 2: 创建 browser-log.ts**

只读 controller 操作 `plugin::zhao-studio.browser-log` CT：
- list（支持分页 + 筛选 eventType/deviceType/city/sessionId）
- findOne

- [ ] **Step 3: 创建 stat-summary.ts**

只读 controller 操作 `plugin::zhao-studio.stat-summary` CT：
- list（支持分页 + 筛选 summaryType/date）
- findOne

- [ ] **Step 4: controllers/index.ts 追加导出**

```ts
import knowledgeIndex from './knowledge-index';
import browserLog from './browser-log';
import statSummary from './stat-summary';

export default {
  // ...existing
  'knowledge-index': knowledgeIndex,
  'browser-log': browserLog,
  'stat-summary': statSummary,
};
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/controllers/
git commit -m "feat(studio): 新增 knowledge-index/browser-log/stat-summary controller"
```

---

### Task A3: 补全现有 controller 的 findOne 方法

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\collect.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\publish.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\controllers\analytics.ts`

- [ ] **Step 1: collect.ts 补充 findOne**

```ts
async findOne(ctx) {
  const { id } = ctx.params;
  const source = await strapi.documents('plugin::zhao-studio.collect-source').findOne({ documentId: id });
  ctx.body = { data: source };
}
```

- [ ] **Step 2: publish.ts 补充 findOne / findOnePlatform / findOneAccount**

```ts
async findOne(ctx) {
  // publish-record 详情
  const record = await strapi.documents('plugin::zhao-studio.publish-record').findOne({ documentId: ctx.params.id });
  ctx.body = { data: record };
}
async findOnePlatform(ctx) {
  const platform = await strapi.documents('plugin::zhao-studio.publish-platform').findOne({ documentId: ctx.params.id });
  ctx.body = { data: platform };
}
async findOneAccount(ctx) {
  const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: ctx.params.id });
  ctx.body = { data: account };
}
```

- [ ] **Step 3: analytics.ts 补充 findOneAdSlot**

```ts
async findOneAdSlot(ctx) {
  const slot = await strapi.documents('plugin::zhao-studio.ad-slot').findOne({ documentId: ctx.params.id });
  ctx.body = { data: slot };
}
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/controllers/collect.ts plugins/zhao-studio/server/src/controllers/publish.ts plugins/zhao-studio/server/src/controllers/analytics.ts
git commit -m "feat(studio): 补全 collect/publish/analytics controller 的 findOne 方法"
```

---

### Task A4: 路由注册 + 编译

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\routes\content-api.ts`

- [ ] **Step 1: 追加路由**

在 routes 数组中追加：

```ts
// 草稿文章 admin CRUD
adminRoute('GET', '/articles', 'draft.list', 'zhao-studio.read'),
adminRoute('GET', '/articles/:id', 'draft.findOne', 'zhao-studio.read'),
adminRoute('POST', '/articles', 'draft.create', 'zhao-studio.create'),
adminRoute('PUT', '/articles/:id', 'draft.update', 'zhao-studio.update'),
adminRoute('DELETE', '/articles/:id', 'draft.delete', 'zhao-studio.delete'),

// knowledge-index CRUD
adminRoute('GET', '/knowledge-indices', 'knowledge-index.list', 'zhao-studio.read'),
adminRoute('GET', '/knowledge-indices/:id', 'knowledge-index.findOne', 'zhao-studio.read'),
adminRoute('POST', '/knowledge-indices', 'knowledge-index.create', 'zhao-studio.create'),
adminRoute('PUT', '/knowledge-indices/:id', 'knowledge-index.update', 'zhao-studio.update'),
adminRoute('DELETE', '/knowledge-indices/:id', 'knowledge-index.delete', 'zhao-studio.delete'),

// browser-log 查询
adminRoute('GET', '/browser-logs', 'browser-log.list', 'zhao-studio.read'),
adminRoute('GET', '/browser-logs/:id', 'browser-log.findOne', 'zhao-studio.read'),

// stat-summary 查询
adminRoute('GET', '/stat-summaries', 'stat-summary.list', 'zhao-studio.read'),
adminRoute('GET', '/stat-summaries/:id', 'stat-summary.findOne', 'zhao-studio.read'),

// 详情查询补全
adminRoute('GET', '/sources/:id', 'collect.findOne', 'zhao-studio.read'),
adminRoute('GET', '/records/:id', 'publish.findOne', 'zhao-studio.read'),
adminRoute('GET', '/platforms/:id', 'publish.findOnePlatform', 'zhao-studio.read'),
adminRoute('GET', '/accounts/:id', 'publish.findOneAccount', 'zhao-studio.read'),
adminRoute('GET', '/ad-slots/:id', 'analytics.findOneAdSlot', 'zhao-studio.read'),
```

注意：删除原有 publicRoute 的 `GET /articles` 和 `GET /articles/:id`（它们是公开路由，路径与 admin 路由冲突）。将公开文章查询改为 `GET /v1/articles/public` 和 `GET /v1/articles/public/:id`。

- [ ] **Step 2: 编译**

```bash
cd e:\code\basic
npm run build
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/routes/content-api.ts dist/
git commit -m "feat(studio): 注册后端补全路由（20 条 admin）+ 编译 dist"
```

---

## Phase B：前端补全

### Task B1: 创建 studio API 模块

**Files:**
- Create: `e:\code\web\src\api\studio.js`
- Modify: `e:\code\web\src\api\index.js`

- [ ] **Step 1: 创建 studio.js**

参照 logistics.js 模式，路径前缀 `/zhao-studio/v1/admin`：
- 10 个 CT 的 CRUD（注意 stat-summary 用 `stat-summaries` 路径）
- collectActionApi（createTask/getTask/fetchSelectedContent/confirmImport）
- publishActionApi（publishArticle/retryPublish/syncStatus）
- aiActionApi（getConfig/updateConfig/testAi/generateSummary/optimizeTitle/rewrite/convert/chat）
- statsApi（overview/articles/adSlots/devices/regions/users）

- [ ] **Step 2: index.js 追加导出**

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add web/src/api/studio.js web/src/api/index.js
git commit -m "feat(web): 新建 studio API 模块（10 CT CRUD + 4 类自定义端点）"
```

---

### Task B2: 创建 TenantSelector 组件

**Files:**
- Create: `e:\code\web\src\components\TenantSelector.vue`

- [ ] **Step 1: 创建组件**

Props: modelValue（tenantId），仅 hasPermission('menu.tenant') 时渲染。调用 tenantApi.list() 获取列表，发出 @change 事件。

- [ ] **Step 2: 提交**

```bash
cd e:\code
git add web/src/components/TenantSelector.vue
git commit -m "feat(web): 新建 TenantSelector 多租户选择器组件"
```

---

### Task B3: 创建标准页面第一批（5 个可编辑 CT × 2 = 10 页面）

**Files:**
- Create: `pages/studio/article-draft/{list,edit}.vue`
- Create: `pages/studio/knowledge-index/{list,edit}.vue`
- Create: `pages/studio/collect-source/{list,edit}.vue`
- Create: `pages/studio/publish-platform/{list,edit}.vue`
- Create: `pages/studio/publish-account/{list,edit}.vue`

- [ ] **Step 1: 读取各 CT schema.json 获取字段**

- [ ] **Step 2: 创建 5 个 CT 的 list + edit 页面**

参照 website/article 的 list+edit 模式。

**article-draft 特殊**：
- list.vue：渠道管理员以上增加"归属"列和筛选器
- edit.vue：增加 AI 工具栏（5 按钮：生成摘要/优化标题/改写内容/转换格式/AI对话）+ 可见范围选择器（v-if="hasPermission('menu.tenant')"）

**publish-account 特殊**：
- config 字段是 json 类型，用 textarea 展示

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add web/pages/studio/
git commit -m "feat(web): studio 标准页面第一批（article-draft/knowledge-index/collect-source/publish-platform/publish-account 5 CT × 2）"
```

---

### Task B4: 创建标准页面第二批（5 个 CT × 2 = 10 页面）

**Files:**
- Create: `pages/studio/ad-slot/{list,edit}.vue`
- Create: `pages/studio/collect-task/{list,detail}.vue`
- Create: `pages/studio/publish-record/{list,detail}.vue`
- Create: `pages/studio/stat-summary/{list,detail}.vue`
- Create: `pages/studio/browser-log/{list,detail}.vue`

- [ ] **Step 1: 创建 ad-slot 的 list + edit（可编辑 CT）**

- [ ] **Step 2: 创建 4 个只读 CT 的 list + detail**

- list.vue：搜索 + 列表 + 详情查看（无新增/编辑/删除）
- detail.vue：只读详情展示

**publish-record 特殊**：list.vue 增加 status 筛选 + 失败记录 retry 按钮
**collect-task 特殊**：detail.vue 展示 titles/selectedTitles JSON

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add web/pages/studio/
git commit -m "feat(web): studio 标准页面第二批（ad-slot/collect-task/publish-record/stat-summary/browser-log 5 CT × 2）"
```

---

### Task B5: 创建 3 个特殊页面

**Files:**
- Create: `pages/studio/collect-workflow/index.vue`
- Create: `pages/studio/publish-center/index.vue`
- Create: `pages/studio/analytics/index.vue`

- [ ] **Step 1: 创建采集工作流（4 步向导）**

Step 1 选采集源 → Step 2 选标题 → Step 3 内容预览+可见范围(超管) → Step 4 完成

- [ ] **Step 2: 创建发布中心（多选发布）**

顶部 TenantSelector → Step 1 选文章(超管看全局+所有租户) → Step 2 选账号 → Step 3 发布+结果展示+重试

- [ ] **Step 3: 创建数据分析看板（6 维度）**

顶部 TenantSelector + 日期范围 → 并行请求 statsApi 6 个端点 → 展示概览卡片/文章排行/设备分布/地域分布/用户转化/广告效果

- [ ] **Step 4: 提交**

```bash
cd e:\code
git add web/pages/studio/
git commit -m "feat(web): studio 特殊页面（采集工作流/发布中心/数据分析看板）"
```

---

### Task B6: 路由注册 + dashboard 菜单 + featureFlags

**Files:**
- Modify: `e:\code\web\pages.json`（追加 23 条路由）
- Modify: `e:\code\web\pages\dashboard\index.vue`（追加 studio module-section 13 菜单项 + studioEnabled）
- Modify: `e:\code\web\src\utils\config-helper.js`（featureFlags 补 studio: true）

- [ ] **Step 1: 注册 23 条路由**

- [ ] **Step 2: 添加 dashboard 媒体发布中心 section（13 菜单项）**

在物流中心之后、系统设置之前插入。同时追加 `const studioEnabled = ref(true)` 和 onShow 赋值。

- [ ] **Step 3: featureFlags 补 studio: true**

- [ ] **Step 4: 提交**

```bash
cd e:\code
git add web/pages.json web/pages/dashboard/index.vue web/src/utils/config-helper.js
git commit -m "feat(web): 注册 studio 路由 23 条 + dashboard 媒体发布中心菜单 13 项 + featureFlags"
```

---

### Task B7: 验证 + 最终提交

- [ ] **Step 1: 验证路由数 = 23**

- [ ] **Step 2: 验证页面文件数 = 23（20 标准 + 3 特殊）**

- [ ] **Step 3: 验证菜单项 = 13**

- [ ] **Step 4: 验证 API 导出**

- [ ] **Step 5: 验证后端路由无冲突**

检查 content-api.ts 中公开路由 `/v1/articles` 是否已改名为 `/v1/articles/public`，避免与 admin `/v1/admin/articles` 冲突。

- [ ] **Step 6: 如有遗漏补充并提交**

```bash
cd e:\code
git add -A
git commit -m "chore(web): 媒体发布中心前端补全验证通过"
```

---

## Self-Review

### 1. Spec coverage

| Spec 要求 | 对应 Task |
|---|---|
| 后端 article-draft CRUD + scope 字段 | A1 |
| 后端 knowledge-index/browser-log/stat-summary controller | A2 |
| 后端 4 个 CT findOne 补全 | A3 |
| 后端路由注册 + 编译 | A4 |
| 前端 API 模块 | B1 |
| 前端 TenantSelector 组件 | B2 |
| 前端 5 可编辑 CT 页面 | B3 |
| 前端 1 可编辑 + 4 只读 CT 页面 | B4 |
| 前端 3 特殊页面 | B5 |
| 前端路由 + 菜单 + featureFlags | B6 |
| 验证 | B7 |

✅ 全覆盖

### 2. 依赖顺序

A1 → A2 → A3 → A4（后端先完成）→ B1 → B2 → B3+B4（可并行）→ B5 → B6 → B7

### 3. 已知风险

- 公开路由 `/v1/articles` 与 admin 路由 `/v1/admin/articles` 路径前缀不同（`/v1` vs `/v1/admin`），实际不冲突。但如果前端 request 工具拼接 BASE_URL 时有歧义，需验证。Task A4 Step 1 中改为 `/v1/articles/public` 是预防性措施。
- article-draft CT 开启了 `draftAndPublish`，创建/查询时需注意 status 参数。

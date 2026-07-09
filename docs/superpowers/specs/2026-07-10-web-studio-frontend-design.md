# 媒体发布中心：后端补全 + 前端补全设计

## 目标

补全"媒体发布中心"后端缺失的 admin API 路由 + 文章可见性支持，然后从零补全前端，实现内容采集 → AI 加工 → 多平台发布 → 效果分析 → 广告管理的完整闭环。

后端 `zhao-studio` 插件已有 10 个 CT + 部分自定义 API，但存在 6 个 CT 缺少 admin CRUD 路由、4 个 CT 缺少详情查询、文章可见性不支持等问题。

## 范围

**改动目录**：
- `e:\code\basic\plugins\zhao-studio`（后端补全）
- `e:\code\web`（前端补全）

**参考模板**：website 中心 / logistics 中心的 list+edit 配对模式

---

## 0. 后端补全（Phase A）

### 0.1 草稿文章 admin CRUD 路由

后端已有 `draft` controller（list + findOne），但未注册路由。需补充：

**路由**（`routes/content-api.ts` 追加）：
```ts
adminRoute('GET', '/articles', 'draft.list', 'zhao-studio.read'),
adminRoute('GET', '/articles/:id', 'draft.findOne', 'zhao-studio.read'),
adminRoute('POST', '/articles', 'draft.create', 'zhao-studio.create'),
adminRoute('PUT', '/articles/:id', 'draft.update', 'zhao-studio.update'),
adminRoute('DELETE', '/articles/:id', 'draft.delete', 'zhao-studio.delete'),
```

**controller**（`controllers/draft.ts` 补充 create/update/delete）：
```ts
async create(ctx) {
  const { body } = ctx.request;
  // 渠道管理员以上：支持 scope/tenantId 参数
  // 普通用户：后端自动绑定当前租户
  const draft = await strapi.documents('plugin::zhao-studio.article-draft').create({ data: body });
  ctx.body = { data: draft };
}

async update(ctx) {
  const { id } = ctx.params;
  const { body } = ctx.request;
  const draft = await strapi.documents('plugin::zhao-studio.article-draft').update({ documentId: id, data: body });
  ctx.body = { data: draft };
}

async delete(ctx) {
  const { id } = ctx.params;
  await strapi.documents('plugin::zhao-studio.article-draft').delete({ documentId: id });
  ctx.body = { data: { success: true } };
}
```

### 0.2 article-draft CT 增加可见性字段

**schema.json 追加字段**：
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

**draft controller create/update 逻辑**：
- 渠道管理员以上（有 `menu.tenant` 权限）：接受 `scope` 和 `scopeTenantId` 参数
- 普通用户：强制 `scope = 'current'`，忽略 `scopeTenantId`
- 查询时：渠道管理员以上可看到 `scope=global` + 所有租户 + 当前租户的文章；普通用户只看到 `scope=current` 且属于当前租户的文章

### 0.3 knowledge-point-index admin CRUD

**新增 controller**（`controllers/knowledge-index.ts`）：
- list / findOne / create / update / delete
- 操作 `plugin::zhao-studio.knowledge-point-index` CT

**路由**：
```ts
adminRoute('GET', '/knowledge-indices', 'knowledge-index.list', 'zhao-studio.read'),
adminRoute('GET', '/knowledge-indices/:id', 'knowledge-index.findOne', 'zhao-studio.read'),
adminRoute('POST', '/knowledge-indices', 'knowledge-index.create', 'zhao-studio.create'),
adminRoute('PUT', '/knowledge-indices/:id', 'knowledge-index.update', 'zhao-studio.update'),
adminRoute('DELETE', '/knowledge-indices/:id', 'knowledge-index.delete', 'zhao-studio.delete'),
```

**controllers/index.ts 追加导出**。

### 0.4 browser-log admin 查询

**新增 controller**（`controllers/browser-log.ts`）：
- list（支持分页/筛选 eventType/deviceType/city）
- findOne

**路由**：
```ts
adminRoute('GET', '/browser-logs', 'browser-log.list', 'zhao-studio.read'),
adminRoute('GET', '/browser-logs/:id', 'browser-log.findOne', 'zhao-studio.read'),
```

### 0.5 stat-summary admin 查询

**新增 controller**（`controllers/stat-summary.ts`）：
- list（支持分页/筛选 summaryType/date）
- findOne

**路由**：
```ts
adminRoute('GET', '/stat-summaries', 'stat-summary.list', 'zhao-studio.read'),
adminRoute('GET', '/stat-summaries/:id', 'stat-summary.findOne', 'zhao-studio.read'),
```

注意：路径用 `/stat-summaries` 避免与 `/stats/overview` 等查询端点冲突。

### 0.6 publish-record 详情查询

**publish controller 追加 findOne**：
```ts
adminRoute('GET', '/records/:id', 'publish.findOne', 'zhao-studio.read'),
```

### 0.7 各 CT 详情查询补全

追加 4 条详情路由：
```ts
adminRoute('GET', '/sources/:id', 'collect.findOne', 'zhao-studio.read'),
adminRoute('GET', '/platforms/:id', 'publish.findOnePlatform', 'zhao-studio.read'),
adminRoute('GET', '/accounts/:id', 'publish.findOneAccount', 'zhao-studio.read'),
adminRoute('GET', '/ad-slots/:id', 'analytics.findOneAdSlot', 'zhao-studio.read'),
```

对应 controller 补充 findOne 方法。

### 0.8 编译

后端改动后需执行 `npm run build` 更新 dist。

### 0.9 后端改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `plugins/zhao-studio/server/src/routes/content-api.ts` | 修改 | 追加 ~20 条 admin 路由 |
| `plugins/zhao-studio/server/src/controllers/draft.ts` | 修改 | 补充 create/update/delete + 可见性逻辑 |
| `plugins/zhao-studio/server/src/controllers/knowledge-index.ts` | 新建 | CRUD controller |
| `plugins/zhao-studio/server/src/controllers/browser-log.ts` | 新建 | list/findOne controller |
| `plugins/zhao-studio/server/src/controllers/stat-summary.ts` | 新建 | list/findOne controller |
| `plugins/zhao-studio/server/src/controllers/collect.ts` | 修改 | 补充 findOne |
| `plugins/zhao-studio/server/src/controllers/publish.ts` | 修改 | 补充 findOne/findOnePlatform/findOneAccount |
| `plugins/zhao-studio/server/src/controllers/analytics.ts` | 修改 | 补充 findOneAdSlot |
| `plugins/zhao-studio/server/src/controllers/index.ts` | 修改 | 追加 3 个新 controller 导出 |
| `plugins/zhao-studio/server/src/content-types/article-draft/schema.json` | 修改 | 追加 scope/scopeTenantId 字段 |

共新建 3 文件，修改 7 文件。

---

## 1. 架构总览（前端）

### 模块定位

"媒体发布中心"（Studio Center）= 内容采集 → AI 加工 → 多平台发布 → 效果分析 → 广告管理

### 文件结构

```
e:\code\web\
├── src/api/
│   ├── studio.js              # 新建：10 CT CRUD + 自定义端点
│   └── index.js               # 修改：追加 export
├── src/components/
│   └── TenantSelector.vue     # 新建：多租户选择器（超管可见）
├── pages/studio/              # 新建目录
│   ├── article-draft/         # 草稿文章（list + edit）
│   ├── knowledge-index/       # 知识点索引（list + edit）
│   ├── collect-source/        # 采集源（list + edit）
│   ├── collect-task/          # 采集任务（list + detail）
│   ├── publish-platform/      # 发布平台（list + edit）
│   ├── publish-account/       # 发布账号（list + edit）
│   ├── publish-record/        # 发布记录（list + detail）
│   ├── stat-summary/          # 统计汇总（list + detail）
│   ├── browser-log/           # 浏览日志（list + detail）
│   ├── ad-slot/               # 广告位（list + edit）
│   ├── collect-workflow/      # 特殊：采集工作流（4 步向导）
│   ├── publish-center/        # 特殊：发布中心（多选发布）
│   └── analytics/             # 特殊：数据分析看板
├── pages/dashboard/index.vue  # 修改：追加 studio module-section
├── pages.json                 # 修改：追加 23 条路由
└── src/utils/config-helper.js # 修改：featureFlags 补 studio: true
```

### 总量

- 新建：25 文件（1 API + 1 组件 + 23 页面）
- 修改：4 文件（api/index.js + dashboard + pages.json + config-helper.js）

---

## 2. API 模块设计（`src/api/studio.js`）

参照 website.js / logistics.js 的 `createContentApi` 工厂模式，路径前缀 `/zhao-studio/v1/admin`。

### 2.1 10 个 CT 的 CRUD

```js
const ADMIN_BASE = '/zhao-studio/v1/admin'

// 路径已对齐后端 content-api.ts 实际路由（Phase A 补全后）
export const articleDraftApi = createContentApi('articles')           // /articles CRUD（Phase A 补全）
export const knowledgeIndexApi = createContentApi('knowledge-indices') // /knowledge-indices CRUD（Phase A 新增）
export const collectSourceApi = createContentApi('sources')           // /sources CRUD + detail（Phase A 补全 detail）
export const collectTaskApi = createContentApi('tasks')               // /tasks list + detail（只读，POST 语义为创建采集任务）
export const publishPlatformApi = createContentApi('platforms')       // /platforms CRUD + detail（Phase A 补全 detail）
export const publishAccountApi = createContentApi('accounts')         // /accounts CRUD + detail（Phase A 补全 detail）
export const publishRecordApi = createContentApi('records')           // /records list + detail（Phase A 补全 detail）
export const statSummaryApi = createContentApi('stat-summaries')      // /stat-summaries list + detail（Phase A 新增，注意路径不同于 /stats/*）
export const browserLogApi = createContentApi('browser-logs')         // /browser-logs list + detail（Phase A 新增）
export const adSlotApi = createContentApi('ad-slots')                 // /ad-slots CRUD + detail（Phase A 补全 detail）
```

### 2.2 自定义端点（4 类）

```js
// 1. 采集工作流
export const collectActionApi = {
  createTask: (sourceId) => post(`${ADMIN_BASE}/tasks`, { data: { sourceId } }),
  getTask: (taskId) => get(`${ADMIN_BASE}/tasks/${taskId}`),
  fetchSelectedContent: (taskId, selectedTitles) =>
    post(`${ADMIN_BASE}/tasks/${taskId}/content`, { data: { selectedTitles } }),
  confirmImport: (taskId, contents, scope, tenantId) =>
    post(`${ADMIN_BASE}/tasks/${taskId}/confirm`, { data: { contents, scope, tenantId } }),
}

// 2. 发布工作流
export const publishActionApi = {
  publishArticle: (articleId, accountIds) =>
    post(`${ADMIN_BASE}/articles/${articleId}/publish`, { data: { accountIds } }),
  retryPublish: (recordId) => post(`${ADMIN_BASE}/records/${recordId}/retry`),
  syncStatus: (articleId) => post(`${ADMIN_BASE}/articles/${articleId}/sync`),
}

// 3. AI 能力
export const aiActionApi = {
  getConfig: () => get(`${ADMIN_BASE}/ai/config`),
  updateConfig: (config) => post(`${ADMIN_BASE}/ai/config`, { data: config }),
  testAi: () => post(`${ADMIN_BASE}/ai/test`),
  generateSummary: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/summary`),
  optimizeTitle: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/title`),
  rewrite: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/rewrite`),
  convert: (articleId) => post(`${ADMIN_BASE}/ai/articles/${articleId}/convert`),
  chat: (message) => post(`${ADMIN_BASE}/ai/chat`, { data: { message } }),
}

// 4. 统计查询（6 维度）
export const statsApi = {
  overview: (params) => get(`${ADMIN_BASE}/stats/overview`, params),
  articles: (params) => get(`${ADMIN_BASE}/stats/articles`, params),
  adSlots: (params) => get(`${ADMIN_BASE}/stats/ad-slots`, params),
  devices: (params) => get(`${ADMIN_BASE}/stats/devices`, params),
  regions: (params) => get(`${ADMIN_BASE}/stats/regions`, params),
  users: (params) => get(`${ADMIN_BASE}/stats/users`, params),
}
```

---

## 3. 文章可见性规则

### 规则

| 角色 | 采集文章可见范围 | 可使用范围 |
|---|---|---|
| 渠道管理员及以上（CHANNEL_ADMIN / PLUGIN_MANAGER / SUPER_ADMIN）| 全局共享 或 指定租户 | 全局 + 所有租户 |
| 其他角色 | 仅当前租户（后端自动绑定）| 仅当前租户 |

### 前端实现

**article-draft edit.vue**：增加可见性选择器（`v-if="hasPermission('menu.tenant')"`）
- 选项：全局共享（scope=global）/ 指定租户（scope=tenant, tenantId=xxx）/ 仅当前租户（scope=current，默认）
- 普通用户不显示此项，提交时不传 scope 参数

**article-draft list.vue**：
- 渠道管理员以上：增加"归属"列（全局/租户名）+ 筛选器
- 普通用户：不显示归属列

**采集工作流 Step 3（确认导入）**：增加导入可见范围设置（仅渠道管理员以上显示）
- `collectActionApi.confirmImport` 调用时增加 `scope` 和 `tenantId` 参数

**发布中心选文章时**：
- 渠道管理员以上：文章列表显示全局 + 所有租户文章，每篇标注归属
- 普通用户：仅当前租户文章

### API 参数约定

涉及文章的 API 请求增加可选参数：
- `scope`：`global` | `tenant` | `current`（不传则后端按用户角色自动判断）
- `tenantId`：当 scope=tenant 时必传

---

## 4. 10 个标准 CT 页面

### 页面清单

| CT | 中文名 | list 核心展示字段 | edit 表单字段 | 特殊操作 |
|---|---|---|---|---|
| article-draft | 草稿文章 | title, category, status, aiProcessed, publishedAt, 归属(超管) | title*, content*, sourceUrl, sourceTitle, sourcePublishedAt, sourceAuthor, category, status, aiProcessed, aiSummary, aiOptimizedTitle, publishedAt, 可见范围(超管) | AI 加工按钮（5 个）|
| knowledge-index | 知识点索引 | targetType, targetId, knowledgePoint.name | targetType*, targetId*, knowledgePoint | 无 |
| collect-source | 采集源 | name, url, type, isActive, lastCollectedAt | name*, url*, type, template, titleSelector, contentSelector, authorSelector, dateSelector, isActive | 无 |
| collect-task | 采集任务 | source.name, status, createdAt | 只读展示 | 查看详情（titles/selectedTitles）|
| publish-platform | 发布平台 | name, type, isActive | name*, type*, description, isActive | 无 |
| publish-account | 发布账号 | name, platform.name, isActive, lastPublishedAt | name*, platform*, config(json), isActive | 无 |
| publish-record | 发布记录 | article.title, account.name, status, publishedAt | 只读展示 | retry（重试失败记录）|
| stat-summary | 统计汇总 | date, summaryType, pv, uv, clickCount | 只读展示 | 无 |
| browser-log | 浏览日志 | timestamp, eventType, platform, deviceType, city | 只读展示 | 无 |
| ad-slot | 广告位 | name, code, position, type, isActive | name*, code*, position, type, targetUrl, productId, imageUrl, isActive | 无 |

### 页面模式

**可编辑 CT**（6 个）：article-draft, knowledge-index, collect-source, publish-platform, publish-account, ad-slot
- list.vue：搜索 + 列表 + 新增/编辑/删除
- edit.vue：表单 + 保存/取消

**只读 CT**（4 个）：collect-task, publish-record, stat-summary, browser-log
- list.vue：搜索 + 列表 + 详情查看（无新增/编辑/删除）
- detail.vue：只读详情展示

### article-draft edit.vue 特殊功能

草稿文章编辑页增加 AI 工具栏：
- [生成摘要] → 调 `aiActionApi.generateSummary`，返回后填充 aiSummary 字段
- [优化标题] → 调 `aiActionApi.optimizeTitle`，返回后填充 aiOptimizedTitle 字段
- [改写内容] → 调 `aiActionApi.rewrite`，返回后更新 content 字段
- [转换格式] → 调 `aiActionApi.convert`，返回后更新 content 字段
- [AI 对话] → 调 `aiActionApi.chat`，弹出对话框

### publish-record list.vue 特殊功能

- status 筛选（pending/success/failed）
- 失败记录显示"重试"按钮，调用 `publishActionApi.retryPublish`
- 显示 externalId（第三方平台文章 ID）

---

## 5. 3 个特殊页面

### 5.1 采集工作流（`pages/studio/collect-workflow/index.vue`）

4 步向导页面：

**Step 1: 选择采集源**
- 下拉选择采集源（调 `collectSourceApi.list`）
- 点击"开始采集"调 `collectActionApi.createTask(sourceId)`
- 进入 Step 2

**Step 2: 标题列表（等待选择）**
- 调 `collectActionApi.getTask(taskId)` 获取 titles
- 复选框选择标题
- 点击"抓取选中内容"调 `collectActionApi.fetchSelectedContent(taskId, selectedTitles)`
- 进入 Step 3

**Step 3: 内容预览（质量评分）**
- 展示 selectedTitles（含质量评分）
- 渠道管理员以上：显示"导入可见范围"选择器（全局/指定租户/仅当前租户）
- 点击"确认导入"调 `collectActionApi.confirmImport(taskId, contents, scope, tenantId)`
- 进入 Step 4

**Step 4: 完成**
- 显示成功导入的草稿数量
- "查看草稿列表"跳转 `/pages/studio/article-draft/list`

### 5.2 发布中心（`pages/studio/publish-center/index.vue`）

多选草稿文章 + 多选发布账号 → 一键发布：

**顶部**：租户筛选器（`v-if="hasPermission('menu.tenant')"`），切换时重新加载文章和账号列表

**Step 1: 选择文章**
- 筛选：状态（ready）/ 分类
- 渠道管理员以上：显示全局 + 所有租户文章，每篇标注归属
- 普通用户：仅当前租户文章
- 复选框选择

**Step 2: 选择发布账号**
- 按平台分组展示激活账号
- 复选框选择

**Step 3: 发布**
- 点击"发布到选中平台"
- 逐篇调 `publishActionApi.publishArticle(articleId, accountIds)`
- 实时展示每条发布结果（成功/失败 + externalId/error）
- 失败记录可调 `publishActionApi.retryPublish`

### 5.3 数据分析看板（`pages/studio/analytics/index.vue`）

**顶部**：租户筛选器（`v-if="hasPermission('menu.tenant')"`）+ 日期范围选择器

**6 个数据区块**（并行请求 `statsApi` 的 6 个端点）：

1. **概览卡片**（`statsApi.overview`）：PV / UV / 点击量 / 点击率 / 平均阅读时长 / 平均滚动深度
2. **文章排行 TOP 10**（`statsApi.articles`）：标题 + PV + UV + 点击率
3. **设备分布**（`statsApi.devices`）：Desktop / Mobile / Tablet 占比 + 进度条
4. **地域分布 TOP 10**（`statsApi.regions`）：城市 + 访问量
5. **用户注册转化**（`statsApi.users`）：访客数 / 注册数 / 转化率
6. **广告位效果**（`statsApi.adSlots`）：广告位名 + 展示量 + 点击量 + 点击率

切换租户时重新请求所有统计数据。

### 5.4 租户选择器组件（`src/components/TenantSelector.vue`）

- Props: `modelValue`（选中的 tenantId）
- 仅在有 `menu.tenant` 权限时渲染
- 调用 `tenantApi.list()` 获取租户列表
- 发出 `@change` 事件，父组件监听后重新加载数据
- 可复用于 publish-center 和 analytics 页面

---

## 6. dashboard 菜单 + featureFlags + 路由

### 6.1 dashboard 菜单

在物流中心 section 之后、系统设置 section 之前追加：

```vue
<!-- 媒体发布中心 -->
<view class="module-section" v-if="studioEnabled && hasPermission('menu.studio-center')">
  <view class="section-title">🎬 媒体发布中心</view>
  <view class="module-grid">
    <view class="module-item" v-if="hasPermission('menu.studio')" @click="navigateTo('/pages/studio/article-draft/list')">
      <view class="module-icon">📝</view>
      <view class="module-name">草稿文章</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-collect')" @click="navigateTo('/pages/studio/collect-workflow/index')">
      <view class="module-icon">🔍</view>
      <view class="module-name">内容采集</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-collect')" @click="navigateTo('/pages/studio/collect-source/list')">
      <view class="module-icon">📡</view>
      <view class="module-name">采集源管理</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-collect')" @click="navigateTo('/pages/studio/collect-task/list')">
      <view class="module-icon">📋</view>
      <view class="module-name">采集任务</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-publish')" @click="navigateTo('/pages/studio/publish-center/index')">
      <view class="module-icon">📤</view>
      <view class="module-name">多平台发布</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-publish')" @click="navigateTo('/pages/studio/publish-platform/list')">
      <view class="module-icon">🌐</view>
      <view class="module-name">平台管理</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-publish')" @click="navigateTo('/pages/studio/publish-account/list')">
      <view class="module-icon">👤</view>
      <view class="module-name">账号管理</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-publish')" @click="navigateTo('/pages/studio/publish-record/list')">
      <view class="module-icon">📑</view>
      <view class="module-name">发布记录</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-stats')" @click="navigateTo('/pages/studio/analytics/index')">
      <view class="module-icon">📊</view>
      <view class="module-name">数据分析</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-stats')" @click="navigateTo('/pages/studio/stat-summary/list')">
      <view class="module-icon">📈</view>
      <view class="module-name">统计汇总</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-stats')" @click="navigateTo('/pages/studio/browser-log/list')">
      <view class="module-icon">👁️</view>
      <view class="module-name">浏览日志</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.studio-ad')" @click="navigateTo('/pages/studio/ad-slot/list')">
      <view class="module-icon">📢</view>
      <view class="module-name">广告位</view>
    </view>
  </view>
</view>
```

菜单映射（13 个菜单项，复用后端 5 个子菜单权限 key）：

| 菜单项 | 权限 key | navigateTo |
|---|---|---|
| 草稿文章 | `menu.studio` | /pages/studio/article-draft/list |
| 内容采集 | `menu.studio-collect` | /pages/studio/collect-workflow/index |
| 采集源管理 | `menu.studio-collect` | /pages/studio/collect-source/list |
| 采集任务 | `menu.studio-collect` | /pages/studio/collect-task/list |
| 多平台发布 | `menu.studio-publish` | /pages/studio/publish-center/index |
| 平台管理 | `menu.studio-publish` | /pages/studio/publish-platform/list |
| 账号管理 | `menu.studio-publish` | /pages/studio/publish-account/list |
| 发布记录 | `menu.studio-publish` | /pages/studio/publish-record/list |
| 数据分析 | `menu.studio-stats` | /pages/studio/analytics/index |
| 统计汇总 | `menu.studio-stats` | /pages/studio/stat-summary/list |
| 浏览日志 | `menu.studio-stats` | /pages/studio/browser-log/list |
| 广告位 | `menu.studio-ad` | /pages/studio/ad-slot/list |

注意：knowledge-index 不单独占菜单项，通过草稿文章编辑页的"关联知识点"入口进入。

### 6.2 featureFlags

config-helper.js 的 `getDefaultConfig` featureFlags 追加 `studio: true`。

dashboard 新增 `const studioEnabled = ref(true)`，onShow 中追加 `studioEnabled.value = config.featureFlags?.studio !== false`。

### 6.3 路由注册（pages.json）

追加 23 条路由：

| 路由 | 标题 |
|---|---|
| pages/studio/article-draft/list | 草稿文章 |
| pages/studio/article-draft/edit | 编辑草稿 |
| pages/studio/knowledge-index/list | 知识点索引 |
| pages/studio/knowledge-index/edit | 编辑索引 |
| pages/studio/collect-source/list | 采集源管理 |
| pages/studio/collect-source/edit | 编辑采集源 |
| pages/studio/collect-task/list | 采集任务 |
| pages/studio/collect-task/detail | 采集任务详情 |
| pages/studio/publish-platform/list | 发布平台 |
| pages/studio/publish-platform/edit | 编辑平台 |
| pages/studio/publish-account/list | 发布账号 |
| pages/studio/publish-account/edit | 编辑账号 |
| pages/studio/publish-record/list | 发布记录 |
| pages/studio/publish-record/detail | 发布记录详情 |
| pages/studio/stat-summary/list | 统计汇总 |
| pages/studio/stat-summary/detail | 统计详情 |
| pages/studio/browser-log/list | 浏览日志 |
| pages/studio/browser-log/detail | 日志详情 |
| pages/studio/ad-slot/list | 广告位管理 |
| pages/studio/ad-slot/edit | 编辑广告位 |
| pages/studio/collect-workflow/index | 采集工作流 |
| pages/studio/publish-center/index | 发布中心 |
| pages/studio/analytics/index | 数据分析 |

---

## 7. 完整改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/api/studio.js` | 新建 | 10 CT CRUD + 4 类自定义端点 |
| `src/api/index.js` | 修改 | 追加 `export * from './studio.js'` |
| `src/components/TenantSelector.vue` | 新建 | 多租户选择器（超管可见）|
| `pages/studio/article-draft/list.vue` | 新建 | CRUD + 归属列(超管) |
| `pages/studio/article-draft/edit.vue` | 新建 | 表单 + AI 工具栏(5按钮) + 可见范围(超管) |
| `pages/studio/knowledge-index/list.vue` | 新建 | CRUD |
| `pages/studio/knowledge-index/edit.vue` | 新建 | CRUD |
| `pages/studio/collect-source/list.vue` | 新建 | CRUD |
| `pages/studio/collect-source/edit.vue` | 新建 | CRUD |
| `pages/studio/collect-task/list.vue` | 新建 | 只读列表 |
| `pages/studio/collect-task/detail.vue` | 新建 | 只读详情 |
| `pages/studio/publish-platform/list.vue` | 新建 | CRUD |
| `pages/studio/publish-platform/edit.vue` | 新建 | CRUD |
| `pages/studio/publish-account/list.vue` | 新建 | CRUD |
| `pages/studio/publish-account/edit.vue` | 新建 | CRUD |
| `pages/studio/publish-record/list.vue` | 新建 | 只读 + retry 按钮 |
| `pages/studio/publish-record/detail.vue` | 新建 | 只读详情 |
| `pages/studio/stat-summary/list.vue` | 新建 | 只读列表 |
| `pages/studio/stat-summary/detail.vue` | 新建 | 只读详情 |
| `pages/studio/browser-log/list.vue` | 新建 | 只读列表 |
| `pages/studio/browser-log/detail.vue` | 新建 | 只读详情 |
| `pages/studio/ad-slot/list.vue` | 新建 | CRUD |
| `pages/studio/ad-slot/edit.vue` | 新建 | CRUD |
| `pages/studio/collect-workflow/index.vue` | 新建 | 4 步采集向导 + 导入可见范围(超管) |
| `pages/studio/publish-center/index.vue` | 新建 | 多选发布 + 租户筛选 + 文章归属标注 |
| `pages/studio/analytics/index.vue` | 新建 | 6 维度统计看板 + 租户筛选 |
| `pages/dashboard/index.vue` | 修改 | 追加 studio module-section + studioEnabled |
| `pages.json` | 修改 | 追加 23 条路由 |
| `src/utils/config-helper.js` | 修改 | featureFlags 补 studio: true |

共新建 25 文件，修改 4 文件。

---

## Self-Review

### 1. Placeholder 扫描
- 无 TBD/TODO，所有页面有明确字段和操作定义

### 2. 内部一致性
- Phase A（后端）：新建 3 controller + 修改 7 文件，补全 6 个 CT 的 admin API + 4 个详情查询 + 可见性字段
- Phase B（前端）：10 CT × 2 页面 = 20 文件 + 3 特殊页 + 1 组件 + 1 API = 25 新建文件，与文件清单一致
- 23 条路由 = 10 CT × 2 + 3 特殊页，与路由清单一致
- 13 个菜单项复用后端 5 个子菜单权限 key
- 文章可见性规则在后端（schema 字段 + controller 逻辑）和前端（article-draft edit/list、collect-workflow、publish-center）中一致体现
- API 路径已全部对齐：Phase A 补全后，前端 createContentApi 生成的路径与后端路由完全匹配

### 3. 范围检查
- Phase A（后端）+ Phase B（前端）分阶段执行，先 A 后 B
- 后端 3 新建 + 7 修改，前端 25 新建 + 4 修改，工作量较大但分阶段可控

### 4. 歧义检查
- stat-summary 路径用 `/stat-summaries` 避免与 `/stats/overview` 等查询端点冲突
- collect-task 的 `POST /tasks` 语义是"创建采集任务"（需 sourceId），前端 collect-task 为只读 CT 不调用 create
- 可见性规则有明确的角色判断条件（hasPermission('menu.tenant')）
- knowledge-index 无独立菜单项，通过草稿文章编辑页入口进入

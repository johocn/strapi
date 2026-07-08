# Web 目录官网中心补齐设计

**日期：** 2026-07-08
**目标：** web 目录 dashboard 官网中心 17 个子菜单全部可用，权限走 zhao-auth，前端与后端 admin-api.ts 完全对齐。

---

## 1. 背景与问题

### 1.1 现状问题

web 目录 dashboard 的"官网中心" section 当前只展示 7 个菜单项，且存在以下问题：

| 类型 | 问题 |
|---|---|
| 菜单缺失 | dashboard 只展示 7 个菜单，permissions.ts 定义了 17 个子菜单 |
| 权限 key 错误 | dashboard 用 `menu.website-kg` 应为 `menu.website-knowledge-entity`；用 `menu.website-truth` 应为 `menu.website-first-truth` |
| 指向死链 | `/pages/website/seo-config`、`/pages/website/knowledge-graph`、`/pages/website/first-truth` 页面不存在 |
| 已有页面未挂菜单 | compliance / faq / tutorial / download 已有 list+edit 但 dashboard 没入口 |
| 完全缺失页面 | brand-info / article-category / visit-log / interaction / search-log / ai-summary / knowledge-relation / seo-config / knowledge-entity / first-truth |

### 1.2 就绪情况

- **后端 API**（`basic/plugins/zhao-website/server/src/routes/admin-api.ts`）：17 个 CT 全部就绪
- **权限树**（`basic/plugins/zhao-auth/server/src/permissions.ts`）：17 个子菜单全部定义 + DEFAULT_ROLE_PERMISSIONS 已配置
- **前端 API 封装**（`web/src/api/website.js`）：缺 brand-info / article-category / visit-log / interaction / search-log / ai-summary

### 1.3 权限处理原则

- 权限控制走 **zhao-auth**（非 Strapi admin）
- 不新增权限 key，permissions.ts 已完整定义
- dashboard 每个 menu-item 用 `hasPermission('menu.website-xxx')` 控制可见性
- list 页内操作按钮用 `hasPermission('xxx.create')` 等子权限控制
- 项目 memory 已约束"系统角色权限启动时同步到数据库"，前端无需处理权限同步

---

## 2. 架构总览

### 2.1 改动范围

| 类型 | 文件 | 数量 |
|---|---|---|
| 修改 | `web/pages/dashboard/index.vue`（官网中心 section 重写） | 1 |
| 修改 | `web/pages.json`（注册 14 个新路由） | 1 |
| 修改 | `web/src/api/website.js`（补 6 个 API） | 1 |
| 新建 | `web/pages/website/**.vue`（10 个 CT 的页面） | 18 |

### 2.2 页面分类与对应

| 类型 | CT | 页面结构 | API 来源 |
|---|---|---|---|
| 标准 CRUD | article-category | list + edit | 新增 createContentApi('article-categories') |
| 标准 CRUD | knowledge-entity | list + edit | 已有 knowledgeGraphApi |
| 标准 CRUD | knowledge-relation | list + edit | 已有 knowledgeGraphApi |
| 标准 CRUD | first-truth | list + edit | 已有 firstTruthApi |
| 标准 CRUD | ai-summary | list + edit | 新增 aiSummaryApi |
| 单例表单 | seo-config | edit 单文件 | 已有 seoConfigApi |
| 单例表单 | brand-info | edit 单文件 | 新增 brandInfoApi |
| 只读列表 | visit-log | list | 新增 visitLogApi |
| 只读列表 | interaction | list | 新增 interactionApi |
| 只读列表 | search-log | list | 新增 searchLogApi |

---

## 3. Dashboard 菜单重写

**位置：** `web/pages/dashboard/index.vue` 第 241-274 行（官网中心 section）

### 3.1 权限 key 对齐表（17 个菜单，按 permissions.ts 顺序）

| 权限 key | 菜单名 | 图标 | 跳转路径 |
|---|---|---|---|
| menu.website-seo | SEO 配置 | 🔍 | /pages/website/seo-config/edit |
| menu.website-brand | 品牌信息 | 🏷️ | /pages/website/brand-info/edit |
| menu.website-article | 资讯文章 | 📄 | /pages/website/article/list |
| menu.website-article-category | 文章分类 | 📂 | /pages/website/article-category/list |
| menu.website-product | 产品方案 | 📦 | /pages/website/product/list |
| menu.website-case | 落地案例 | 🏆 | /pages/website/case/list |
| menu.website-compliance | 合规公示 | 📋 | /pages/website/compliance/list |
| menu.website-faq | 常见问答 | ❓ | /pages/website/faq/list |
| menu.website-tutorial | 教程指南 | 📖 | /pages/website/tutorial/list |
| menu.website-download | 下载管理 | 💾 | /pages/website/download/list |
| menu.website-lead | 线索管理 | 📝 | /pages/website/lead/list |
| menu.website-visit-log | 访问日志 | 👁️ | /pages/website/visit-log/list |
| menu.website-interaction | 互动记录 | 💬 | /pages/website/interaction/list |
| menu.website-search-log | 搜索日志 | 🔎 | /pages/website/search-log/list |
| menu.website-knowledge-entity | 知识实体 | 🧠 | /pages/website/knowledge-entity/list |
| menu.website-knowledge-relation | 知识关系 | 🔗 | /pages/website/knowledge-relation/list |
| menu.website-ai-summary | AI 摘要 | ✨ | /pages/website/ai-summary/list |
| menu.website-first-truth | 第一真值 | 💎 | /pages/website/first-truth/list |

### 3.2 修复项

- 原 `menu.website-kg` → 改为 `menu.website-knowledge-entity` + 新增 `menu.website-knowledge-relation`
- 原 `menu.website-truth` → 改为 `menu.website-first-truth`
- 原 `/pages/website/seo-config` → 改为 `/pages/website/seo-config/edit`（单例表单）
- 原 `/pages/website/knowledge-graph` → 删除，拆为两个独立菜单
- 原 `/pages/website/first-truth` → 改为 `/pages/website/first-truth/list`

### 3.3 模板结构

保持现有 module-grid 样式，每个菜单项一个 `module-item`：

```vue
<view class="module-section" v-if="hasPermission('menu.website-center')">
  <view class="section-title">🌐 官网中心</view>
  <view class="module-grid">
    <view class="module-item" v-if="hasPermission('menu.website-seo')" @click="navigateTo('/pages/website/seo-config/edit')">
      <view class="module-icon">🔍</view>
      <view class="module-name">SEO 配置</view>
    </view>
    <!-- ...17 个菜单项... -->
  </view>
</view>
```

---

## 4. 前端 API 封装

**位置：** `web/src/api/website.js`（追加到文件末尾）

### 4.1 新增 API 定义

```js
// ==================== 品牌信息（单例） ====================
export const brandInfoApi = {
  get: () => get(`${ADMIN_BASE}/brand-info`).then(res => extractList(res)).then(list => list[0] || null),
  save: (data) => {
    const existing = data.documentId
    return existing
      ? put(`${ADMIN_BASE}/brand-info/${existing}`, { data }).then(extractItem)
      : post(`${ADMIN_BASE}/brand-info`, { data }).then(extractItem)
  },
}

// ==================== 文章分类 ====================
export const articleCategoryApi = createContentApi('article-categories')

// ==================== AI 摘要 ====================
export const aiSummaryApi = {
  list: (params = {}) => get(`${ADMIN_BASE}/ai-summaries`, params).then(extractList),
  detail: (documentId) => get(`${ADMIN_BASE}/ai-summaries/${documentId}`).then(extractItem),
  create: (data) => post(`${ADMIN_BASE}/ai-summaries`, { data }).then(extractItem),
  update: (documentId, data) => put(`${ADMIN_BASE}/ai-summaries/${documentId}`, { data }).then(extractItem),
  delete: (documentId) => del(`${ADMIN_BASE}/ai-summaries/${documentId}`).then(extractItem),
  regenerate: (documentId) => post(`${ADMIN_BASE}/ai-summaries/${documentId}/regenerate`).then(extractItem),
}

// ==================== 只读日志 ====================
export const visitLogApi = {
  list: (params = {}) => get(`${ADMIN_BASE}/visit-logs`, params).then(extractList),
}
export const interactionApi = {
  list: (params = {}) => get(`${ADMIN_BASE}/interactions`, params).then(extractList),
}
export const searchLogApi = {
  list: (params = {}) => get(`${ADMIN_BASE}/search-logs`, params).then(extractList),
}
```

### 4.2 设计说明

- `brandInfoApi.get` 复用 seoConfigApi 的单例模式：调 list 取首条
- `articleCategoryApi` 复用 `createContentApi` 工厂，与 product/case 等一致
- `aiSummaryApi` 单独定义，包含 `regenerate` 特殊操作
- 三个日志 API 只暴露 `list`，与后端只读路由对齐

### 4.3 已有 API（无需修改）

- `seoConfigApi`（第 39-47 行）
- `knowledgeGraphApi`（第 50-59 行）：同时供 knowledge-entity 和 knowledge-relation 页面使用
- `firstTruthApi`（第 62-70 行）：含 verify/conflicts

---

## 5. 页面实现

### 5.1 标准 CRUD 页面（4 个 CT）

**模板：** 复用 `web/pages/website/compliance/list.vue` + `compliance/edit.vue` 模式

| CT | 路径 | list 字段展示 | edit 表单字段 | 特殊操作 |
|---|---|---|---|---|
| article-category | /pages/website/article-category/{list,edit}.vue | name / slug / 文章数 | name, slug, description | - |
| knowledge-entity | /pages/website/knowledge-entity/{list,edit}.vue | name, type, aliases | name, type, aliases[], description | 调用 knowledgeGraphApi |
| knowledge-relation | /pages/website/knowledge-relation/{list,edit}.vue | subject, predicate, object | subject_id, predicate, object_id | 调用 knowledgeGraphApi |
| first-truth | /pages/website/first-truth/{list,edit}.vue | claim, status, confidence | claim, truth_value, source, confidence | verify 按钮（调 firstTruthApi.verify） |

**list 页权限按钮：**
- 新增按钮：`v-if="hasPermission('xxx.create')"`
- 编辑按钮：`v-if="hasPermission('xxx.update')"`
- 删除按钮：`v-if="hasPermission('xxx.delete')"`
- first-truth 额外：verify 按钮 `v-if="hasPermission('first-truth.update')"`

**first-truth list 特殊：**
- 新增 `conflicts` 筛选 tab（调用 `firstTruthApi.conflicts()` 切换显示冲突真值）
- 列表项 status 含 `verified`/`pending`/`conflict` 三态

### 5.2 单例表单页（2 个 CT）

**模板：** 单文件 edit.vue，无 list 页

**seo-config/edit.vue 流程：**
```
onShow → seoConfigApi.get() → 有数据填表单 / 无数据置空
保存按钮 → seoConfigApi.save(formData) → 有 documentId 走 PUT / 无走 POST
```

**brand-info/edit.vue 流程：** 同上，调 `brandInfoApi`

**表单字段：**

seo-config:
- title, description, keywords (meta 标签)
- ogTitle, ogDescription, ogImage (Open Graph)
- structuredData (JSON)
- robots

brand-info:
- brandName, slogan, logo, contactEmail, contactPhone
- contactAddress, icpRecord, businessLicense
- socialLinks (wechat/weibo/douyin 等 JSON)

### 5.3 AI 摘要页（1 个 CT）

**ai-summary/list.vue：**
- 顶部筛选：`targetType`（article/case/product/faq/tutorial/compliance）下拉 + `targetId` 输入框
- 列表展示：targetType, targetId, summary, status, createdAt
- 操作：查看详情（跳 edit）、regenerate（调 `aiSummaryApi.regenerate`）

**ai-summary/edit.vue：**
- 展示 targetType/targetId/summary 字段（只读）
- 提供 regenerate 按钮（`v-if="hasPermission('ai-summary.update')"`)
- 提供删除按钮（`v-if="hasPermission('ai-summary.delete')"`)

### 5.4 只读日志页（3 个 CT）

**模板：** 复用 `web/pages/website/lead/list.vue` 去掉所有操作按钮

| CT | 路径 | 筛选 | 字段展示 |
|---|---|---|---|
| visit-log | /pages/website/visit-log/list.vue | path, visitorIp, 日期范围 | path, visitorIp, userAgent, visitedAt |
| interaction | /pages/website/interaction/list.vue | type, targetType | type, targetType, targetId, content, createdAt |
| search-log | /pages/website/search-log/list.vue | keyword, 日期范围 | keyword, resultCount, visitorIp, searchedAt |

**共同特征：**
- 无新增/编辑/删除按钮
- 顶部 search-box + filter-row
- 标准 pagination
- 权限：`hasPermission('visit-log.read')` / `interaction.read` / `search-log.read`

---

## 6. 路由注册

**位置：** `web/pages.json` 第 410-438 行附近

### 6.1 新增 14 个路由

```json
{ "path": "pages/website/article-category/list", "style": { "navigationBarTitleText": "文章分类" } },
{ "path": "pages/website/article-category/edit", "style": { "navigationBarTitleText": "分类编辑" } },
{ "path": "pages/website/brand-info/edit", "style": { "navigationBarTitleText": "品牌信息" } },
{ "path": "pages/website/seo-config/edit", "style": { "navigationBarTitleText": "SEO 配置" } },
{ "path": "pages/website/knowledge-entity/list", "style": { "navigationBarTitleText": "知识实体" } },
{ "path": "pages/website/knowledge-entity/edit", "style": { "navigationBarTitleText": "实体编辑" } },
{ "path": "pages/website/knowledge-relation/list", "style": { "navigationBarTitleText": "知识关系" } },
{ "path": "pages/website/knowledge-relation/edit", "style": { "navigationBarTitleText": "关系编辑" } },
{ "path": "pages/website/first-truth/list", "style": { "navigationBarTitleText": "第一真值" } },
{ "path": "pages/website/first-truth/edit", "style": { "navigationBarTitleText": "真值编辑" } },
{ "path": "pages/website/ai-summary/list", "style": { "navigationBarTitleText": "AI 摘要" } },
{ "path": "pages/website/ai-summary/edit", "style": { "navigationBarTitleText": "摘要详情" } },
{ "path": "pages/website/visit-log/list", "style": { "navigationBarTitleText": "访问日志" } },
{ "path": "pages/website/interaction/list", "style": { "navigationBarTitleText": "互动记录" } },
{ "path": "pages/website/search-log/list", "style": { "navigationBarTitleText": "搜索日志" } }
```

### 6.2 说明

- 单例表单（seo-config/brand-info）只注册 edit 路由，无 list
- 只读日志（visit-log/interaction/search-log）只注册 list 路由，无 edit
- 路由 title 与 dashboard 菜单名保持一致

---

## 7. 实施顺序

1. **API 封装**（website.js）— 后续页面的依赖
2. **路由注册**（pages.json）— 避免 navigateTo 失败
3. **Dashboard 菜单重写**（dashboard/index.vue）— 入口对齐
4. **标准 CRUD 页面**（4 个 CT × 2 文件 = 8 文件）
5. **单例表单页**（2 个 CT × 1 文件 = 2 文件）
6. **AI 摘要页**（2 文件）
7. **只读日志页**（3 文件）

---

## 8. 验收标准

- [ ] dashboard 官网中心展示 17 个菜单项（权限全开时）
- [ ] 17 个菜单点击均可跳转到对应页面，无死链
- [ ] 权限不足时菜单项隐藏（用 instructor 角色验证只读权限）
- [ ] 10 个 CT 的 list 页可正常加载数据
- [ ] 4 个标准 CRUD 的 create/update/delete 流程通畅
- [ ] seo-config/brand-info 单例表单可保存
- [ ] first-truth verify 按钮可触发验证
- [ ] ai-summary regenerate 按钮可重新生成
- [ ] 3 个只读日志页无操作按钮，仅展示

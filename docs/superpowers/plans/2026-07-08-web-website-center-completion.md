# Web 目录官网中心补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 web 目录 dashboard 官网中心 17 个子菜单，创建 10 个 CT 的页面（共 18 个新文件），权限走 zhao-auth，与后端 admin-api.ts 完全对齐。

**Architecture:** 复用 web 目录现有 compliance/list+edit 模式，标准 CRUD 用 `createContentApi(resource)` 工厂；单例配置（seo-config/brand-info）用单文件 edit 页；只读日志（visit-log/interaction/search-log）只有 list 页。权限检查统一用 `useUserStore.hasPermission(key)`，key 与 `basic/plugins/zhao-auth/server/src/permissions.ts` 中 `menu.website-center` 子树一一对应。

**Tech Stack:** uni-app + Vue 3 (`<script setup>`) + Pinia + onShow/onLoad

**Spec:** `docs/superpowers/specs/2026-07-08-web-website-center-completion-design.md`

---

## File Structure

**修改：**
- `web/src/api/website.js` — 追加 6 个 API（brandInfoApi/articleCategoryApi/aiSummaryApi/visitLogApi/interactionApi/searchLogApi）
- `web/pages.json` — 追加 14 个路由
- `web/pages/dashboard/index.vue` — 重写第 241-274 行官网中心 section

**新建（18 个 .vue 文件）：**
- `web/pages/website/article-category/{list,edit}.vue` — 标准 CRUD
- `web/pages/website/knowledge-entity/{list,edit}.vue` — 标准 CRUD（调 knowledgeGraphApi）
- `web/pages/website/knowledge-relation/{list,edit}.vue` — 标准 CRUD（调 knowledgeGraphApi）
- `web/pages/website/first-truth/{list,edit}.vue` — 标准 CRUD + verify 按钮
- `web/pages/website/ai-summary/{list,edit}.vue` — 列表 + regenerate
- `web/pages/website/seo-config/edit.vue` — 单例表单
- `web/pages/website/brand-info/edit.vue` — 单例表单
- `web/pages/website/visit-log/list.vue` — 只读
- `web/pages/website/interaction/list.vue` — 只读
- `web/pages/website/search-log/list.vue` — 只读

**参考模板：**
- `web/pages/website/compliance/list.vue` + `compliance/edit.vue` — 标准 CRUD 模板
- `web/pages/website/lead/list.vue` — 只读列表模板
- `web/src/api/website.js` 第 39-47 行 `seoConfigApi` — 单例 API 模板

**通用约定：**
- 所有页面 import 路径用相对路径 `../../../src/api/website.js`、`../../../src/store/user.js`、`../../../src/components/PageHeader.vue`、`../../../src/utils/format.js`
- 权限检查：`const userStore = useUserStore(); const hasPermission = userStore.hasPermission`
- 列表分页参数：`'pagination[page]': page, 'pagination[pageSize]': 10`
- 筛选参数：`'filters[field][$contains]': value` 或 `'filters[field]': value`
- 颜色风格与 compliance 一致：primary `#ff0000`，section title 左边框 `6rpx solid #ff0000`

---

## Task 1: 前端 API 封装

**Files:**
- Modify: `web/src/api/website.js`（追加到文件末尾，第 89 行后）

- [ ] **Step 1: 追加 6 个 API 到 website.js**

Edit `web/src/api/website.js`，在第 89 行 `export const downloadApi = createContentApi('downloads')` 后追加：

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

- [ ] **Step 2: 验证语法**

Run: `node -c web/src/api/website.js`
Expected: 无输出（语法正确）

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add src/api/website.js
git commit -m "feat(web): add 6 website APIs (brand-info/article-category/ai-summary/visit-log/interaction/search-log)"
```

---

## Task 2: 路由注册

**Files:**
- Modify: `web/pages.json`（在第 438 行 `"path": "pages/website/download/edit"` 后追加）

- [ ] **Step 1: 追加 14 个路由**

Edit `web/pages.json`，将第 438 行：
```json
    { "path": "pages/website/download/edit", "style": { "navigationBarTitleText": "下载编辑" } }
```
改为：
```json
    { "path": "pages/website/download/edit", "style": { "navigationBarTitleText": "下载编辑" } },
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

- [ ] **Step 2: 验证 JSON 合法性**

Run: `node -e "JSON.parse(require('fs').readFileSync('web/pages.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add pages.json
git commit -m "feat(web): register 14 new website routes"
```

---

## Task 3: Dashboard 菜单重写

**Files:**
- Modify: `web/pages/dashboard/index.vue` 第 241-274 行

- [ ] **Step 1: 替换官网中心 section**

Edit `web/pages/dashboard/index.vue`，将第 241-274 行整个 `<!-- 官网中心 -->` section 替换为：

```vue
    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
      <view class="module-grid">
        <view class="module-item" v-if="hasPermission('menu.website-seo')" @click="navigateTo('/pages/website/seo-config/edit')">
          <view class="module-icon">🔍</view>
          <view class="module-name">SEO 配置</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-brand')" @click="navigateTo('/pages/website/brand-info/edit')">
          <view class="module-icon">🏷️</view>
          <view class="module-name">品牌信息</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article')" @click="navigateTo('/pages/website/article/list')">
          <view class="module-icon">📄</view>
          <view class="module-name">资讯文章</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-article-category')" @click="navigateTo('/pages/website/article-category/list')">
          <view class="module-icon">📂</view>
          <view class="module-name">文章分类</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-product')" @click="navigateTo('/pages/website/product/list')">
          <view class="module-icon">📦</view>
          <view class="module-name">产品方案</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-case')" @click="navigateTo('/pages/website/case/list')">
          <view class="module-icon">🏆</view>
          <view class="module-name">落地案例</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-compliance')" @click="navigateTo('/pages/website/compliance/list')">
          <view class="module-icon">📋</view>
          <view class="module-name">合规公示</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-faq')" @click="navigateTo('/pages/website/faq/list')">
          <view class="module-icon">❓</view>
          <view class="module-name">常见问答</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-tutorial')" @click="navigateTo('/pages/website/tutorial/list')">
          <view class="module-icon">📖</view>
          <view class="module-name">教程指南</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-download')" @click="navigateTo('/pages/website/download/list')">
          <view class="module-icon">💾</view>
          <view class="module-name">下载管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-lead')" @click="navigateTo('/pages/website/lead/list')">
          <view class="module-icon">📝</view>
          <view class="module-name">线索管理</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-visit-log')" @click="navigateTo('/pages/website/visit-log/list')">
          <view class="module-icon">👁️</view>
          <view class="module-name">访问日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-interaction')" @click="navigateTo('/pages/website/interaction/list')">
          <view class="module-icon">💬</view>
          <view class="module-name">互动记录</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-search-log')" @click="navigateTo('/pages/website/search-log/list')">
          <view class="module-icon">🔎</view>
          <view class="module-name">搜索日志</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-entity')" @click="navigateTo('/pages/website/knowledge-entity/list')">
          <view class="module-icon">🧠</view>
          <view class="module-name">知识实体</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-knowledge-relation')" @click="navigateTo('/pages/website/knowledge-relation/list')">
          <view class="module-icon">🔗</view>
          <view class="module-name">知识关系</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-ai-summary')" @click="navigateTo('/pages/website/ai-summary/list')">
          <view class="module-icon">✨</view>
          <view class="module-name">AI 摘要</view>
        </view>
        <view class="module-item" v-if="hasPermission('menu.website-first-truth')" @click="navigateTo('/pages/website/first-truth/list')">
          <view class="module-icon">💎</view>
          <view class="module-name">第一真值</view>
        </view>
      </view>
    </view>
```

- [ ] **Step 2: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): rewrite dashboard website-center section with 17 menus"
```

---

## Task 4: article-category 标准 CRUD

**Files:**
- Create: `web/pages/website/article-category/list.vue`
- Create: `web/pages/website/article-category/edit.vue`

- [ ] **Step 1: 创建 list.vue**

`web/pages/website/article-category/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="文章分类">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('article-category.create')">+ 新增分类</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索分类名称" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.name }}</view>
          <view class="item-meta">
            <text class="meta-item">🔗 {{ item.slug }}</text>
            <text class="meta-item" v-if="item.description">📝 {{ item.description }}</text>
          </view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="hasPermission('article-category.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('article-category.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📂</text>
      <text class="empty-text">暂无分类</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('article-category.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { articleCategoryApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[name][$contains]'] = searchKeyword.value
    const { list, pagination: pg } = await articleCategoryApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function goCreate() { uni.navigateTo({ url: '/pages/website/article-category/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/article-category/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除分类「${item.name}」吗？`, success: async (res) => {
    if (res.confirm) { try { await articleCategoryApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 edit.vue**

`web/pages/website/article-category/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑分类' : '新增分类'">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission(isEdit ? 'article-category.update' : 'article-category.create')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">名称 *</text><input type="text" v-model="form.name" placeholder="分类名称" class="form-input" /></view>
        <view class="form-item"><text class="form-label">slug</text><input type="text" v-model="form.slug" placeholder="URL 别名" class="form-input" /></view>
        <view class="form-item"><text class="form-label">描述</text><textarea v-model="form.description" placeholder="分类描述" class="form-textarea" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { articleCategoryApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const form = ref({ name: '', slug: '', description: '' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await articleCategoryApi.detail(documentId.value)
    if (item) {
      form.value = { name: item.name || '', slug: item.slug || '', description: item.description || '' }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  if (!form.value.name) { uni.showToast({ title: '请填写名称', icon: 'none' }); return }
  try {
    if (isEdit.value) await articleCategoryApi.update(documentId.value, form.value)
    else await articleCategoryApi.create(form.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onLoad((options) => { if (options?.documentId) { documentId.value = options.documentId; loadDetail() } })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add pages/website/article-category/
git commit -m "feat(web): add article-category list+edit pages"
```

---

## Task 5: knowledge-entity + knowledge-relation 标准 CRUD

**Files:**
- Create: `web/pages/website/knowledge-entity/list.vue`
- Create: `web/pages/website/knowledge-entity/edit.vue`
- Create: `web/pages/website/knowledge-relation/list.vue`
- Create: `web/pages/website/knowledge-relation/edit.vue`

- [ ] **Step 1: 创建 knowledge-entity/list.vue**

`web/pages/website/knowledge-entity/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="知识实体">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('knowledge-entity.create')">+ 新增实体</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索实体名称" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.name }}</view>
          <view class="item-meta">
            <text class="meta-item">🏷️ {{ item.type || '-' }}</text>
            <text class="meta-item" v-if="item.aliases">_aliases: {{ Array.isArray(item.aliases) ? item.aliases.join(', ') : item.aliases }}</text>
          </view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="hasPermission('knowledge-entity.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('knowledge-entity.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">🧠</text>
      <text class="empty-text">暂无实体</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('knowledge-entity.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { knowledgeGraphApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[name][$contains]'] = searchKeyword.value
    const { list, pagination: pg } = await knowledgeGraphApi.listEntities(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function goCreate() { uni.navigateTo({ url: '/pages/website/knowledge-entity/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/knowledge-entity/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除实体「${item.name}」吗？`, success: async (res) => {
    if (res.confirm) { try { await knowledgeGraphApi.deleteEntity(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 knowledge-entity/edit.vue**

`web/pages/website/knowledge-entity/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑实体' : '新增实体'">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission(isEdit ? 'knowledge-entity.update' : 'knowledge-entity.create')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">名称 *</text><input type="text" v-model="form.name" placeholder="实体名称" class="form-input" /></view>
        <view class="form-item">
          <text class="form-label">类型</text>
          <picker mode="selector" :range="typeOptions" @change="(e) => form.type = typeOptions[e.detail.value]">
            <view class="form-input picker-display">{{ form.type || '请选择' }}</view>
          </picker>
        </view>
        <view class="form-item"><text class="form-label">别名（逗号分隔）</text><input type="text" v-model="aliasesInput" placeholder="别名1,别名2" class="form-input" /></view>
        <view class="form-item"><text class="form-label">描述</text><textarea v-model="form.description" placeholder="实体描述" class="form-textarea" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { knowledgeGraphApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const typeOptions = ['concept', 'person', 'organization', 'product', 'location', 'event', 'other']
const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const aliasesInput = ref('')
const form = ref({ name: '', type: '', aliases: [], description: '' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await knowledgeGraphApi.listEntities({ 'filters[documentId]': documentId.value }).then(res => res.list?.[0]) || null
    if (item) {
      form.value = { name: item.name || '', type: item.type || '', aliases: item.aliases || [], description: item.description || '' }
      aliasesInput.value = Array.isArray(item.aliases) ? item.aliases.join(',') : (item.aliases || '')
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  if (!form.value.name) { uni.showToast({ title: '请填写名称', icon: 'none' }); return }
  const payload = { ...form.value, aliases: aliasesInput.value ? aliasesInput.value.split(',').map(s => s.trim()).filter(Boolean) : [] }
  try {
    if (isEdit.value) await knowledgeGraphApi.updateEntity(documentId.value, payload)
    else await knowledgeGraphApi.createEntity(payload)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onLoad((options) => { if (options?.documentId) { documentId.value = options.documentId; loadDetail() } })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-display { display: flex; align-items: center; line-height: 72rpx; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
</style>
```

- [ ] **Step 3: 创建 knowledge-relation/list.vue**

`web/pages/website/knowledge-relation/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="知识关系">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('knowledge-relation.create')">+ 新增关系</button>
    </PageHeader>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card">
        <view class="item-info">
          <view class="item-title">{{ item.subjectName || item.subject_id }} → {{ item.predicate }} → {{ item.objectName || item.object_id }}</view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="hasPermission('knowledge-relation.update')" class="action-btn edit" @click="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('knowledge-relation.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">🔗</text>
      <text class="empty-text">暂无关系</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('knowledge-relation.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { knowledgeGraphApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    const { list, pagination: pg } = await knowledgeGraphApi.listRelations(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function goCreate() { uni.navigateTo({ url: '/pages/website/knowledge-relation/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/knowledge-relation/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: '确定要删除此关系吗？', success: async (res) => {
    if (res.confirm) { try { await knowledgeGraphApi.deleteRelation(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 4: 创建 knowledge-relation/edit.vue**

`web/pages/website/knowledge-relation/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑关系' : '新增关系'">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission(isEdit ? 'knowledge-relation.update' : 'knowledge-relation.create')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">关系信息</view>
        <view class="form-item"><text class="form-label">主体 ID *</text><input type="text" v-model="form.subject_id" placeholder="主体实体 ID" class="form-input" /></view>
        <view class="form-item"><text class="form-label">谓词 *</text><input type="text" v-model="form.predicate" placeholder="例: belongs_to, related_to" class="form-input" /></view>
        <view class="form-item"><text class="form-label">客体 ID *</text><input type="text" v-model="form.object_id" placeholder="客体实体 ID" class="form-input" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { knowledgeGraphApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const form = ref({ subject_id: '', predicate: '', object_id: '' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const res = await knowledgeGraphApi.listRelations({ 'filters[documentId]': documentId.value })
    const item = res.list?.[0]
    if (item) {
      form.value = { subject_id: item.subject_id || '', predicate: item.predicate || '', object_id: item.object_id || '' }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  if (!form.value.subject_id || !form.value.predicate || !form.value.object_id) {
    uni.showToast({ title: '请填写完整', icon: 'none' }); return
  }
  try {
    if (isEdit.value) await knowledgeGraphApi.updateRelation(documentId.value, form.value)
    else await knowledgeGraphApi.addRelation(form.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onLoad((options) => { if (options?.documentId) { documentId.value = options.documentId; loadDetail() } })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
</style>
```

- [ ] **Step 5: Commit**

```bash
cd e:\code\web
git add pages/website/knowledge-entity/ pages/website/knowledge-relation/
git commit -m "feat(web): add knowledge-entity and knowledge-relation list+edit pages"
```

---

## Task 6: first-truth 标准 CRUD + verify

**Files:**
- Create: `web/pages/website/first-truth/list.vue`
- Create: `web/pages/website/first-truth/edit.vue`

- [ ] **Step 1: 创建 first-truth/list.vue**

`web/pages/website/first-truth/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="第一真值">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('first-truth.create')">+ 新增真值</button>
    </PageHeader>

    <view class="filter-section">
      <view class="tab-row">
        <view class="tab-item" :class="{ active: tab === 'all' }" @click="switchTab('all')">全部</view>
        <view class="tab-item" :class="{ active: tab === 'conflicts' }" @click="switchTab('conflicts')">冲突</view>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.claim }}</view>
          <view class="item-meta">
            <text class="meta-item">💎 {{ item.truth_value }}</text>
            <text class="meta-item" v-if="item.confidence != null">置信度: {{ (item.confidence * 100).toFixed(0) }}%</text>
            <text class="meta-item" v-if="item.source">来源: {{ item.source }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status !== 'verified' && hasPermission('first-truth.update')" class="action-btn verify" @click.stop="handleVerify(item)">验证</view>
          <view v-if="hasPermission('first-truth.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('first-truth.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">💎</text>
      <text class="empty-text">暂无真值</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('first-truth.create')">立即添加</button>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { firstTruthApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const tab = ref('all')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

const statusMap = { verified: '已验证', pending: '待验证', conflict: '冲突' }
function getStatusText(s) { return statusMap[s] || s }

async function loadData(page = 1) {
  loading.value = true
  try {
    if (tab.value === 'conflicts') {
      const list = await firstTruthApi.conflicts()
      itemList.value = list || []
      pagination.value = { page: 1, pageSize: 10, total: list?.length || 0 }
      currentPage.value = 1
    } else {
      const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
      const { list, pagination: pg } = await firstTruthApi.list(params)
      itemList.value = list
      pagination.value = pg
      currentPage.value = page
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function switchTab(t) { tab.value = t; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/first-truth/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/first-truth/edit?documentId=${id}` }) }

async function handleVerify(item) {
  uni.showModal({ title: '确认验证', content: `确定要将「${item.claim}」标记为已验证吗？`, success: async (res) => {
    if (res.confirm) { try { await firstTruthApi.verify(item.documentId); uni.showToast({ title: '验证成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '验证失败', icon: 'none' }) } }
  }})
}
async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除「${item.claim}」吗？`, success: async (res) => {
    if (res.confirm) { try { await firstTruthApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.filter-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.tab-row { display: flex; gap: 20rpx; }
.tab-item { padding: 12rpx 32rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.tab-item.active { background: #ff0000; color: #fff; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; background: #999; }
.item-status.verified { background: #07c160; }
.item-status.pending { background: #faad14; }
.item-status.conflict { background: #ff4d4f; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.verify { background: #e8f5e9; color: #07c160; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 first-truth/edit.vue**

`web/pages/website/first-truth/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑真值' : '新增真值'">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission(isEdit ? 'first-truth.update' : 'first-truth.create')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">真值信息</view>
        <view class="form-item"><text class="form-label">声明 *</text><textarea v-model="form.claim" placeholder="事实声明" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">真值 *</text><textarea v-model="form.truth_value" placeholder="事实真相" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">来源</text><input type="text" v-model="form.source" placeholder="来源引用" class="form-input" /></view>
        <view class="form-item">
          <text class="form-label">置信度（0-1）</text>
          <input type="digit" v-model="form.confidence" placeholder="例: 0.95" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">状态</text>
          <picker mode="selector" :range="statusOptions" :range-key="'label'" @change="(e) => form.status = statusOptions[e.detail.value].value">
            <view class="form-input picker-display">{{ getStatusText(form.status) }}</view>
          </picker>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { firstTruthApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const statusOptions = [
  { label: '待验证', value: 'pending' },
  { label: '已验证', value: 'verified' },
  { label: '冲突', value: 'conflict' },
]
const statusMap = { pending: '待验证', verified: '已验证', conflict: '冲突' }
function getStatusText(s) { return statusMap[s] || s }

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const form = ref({ claim: '', truth_value: '', source: '', confidence: 0, status: 'pending' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await firstTruthApi.detail(documentId.value)
    if (item) {
      form.value = {
        claim: item.claim || '', truth_value: item.truth_value || '',
        source: item.source || '', confidence: item.confidence ?? 0,
        status: item.status || 'pending',
      }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  if (!form.value.claim || !form.value.truth_value) { uni.showToast({ title: '请填写完整', icon: 'none' }); return }
  try {
    const payload = { ...form.value, confidence: Number(form.value.confidence) || 0 }
    if (isEdit.value) await firstTruthApi.update(documentId.value, payload)
    else await firstTruthApi.create(payload)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onLoad((options) => { if (options?.documentId) { documentId.value = options.documentId; loadDetail() } })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-display { display: flex; align-items: center; line-height: 72rpx; }
.form-textarea { width: 100%; min-height: 120rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add pages/website/first-truth/
git commit -m "feat(web): add first-truth list+edit pages with verify/conflicts"
```

---

## Task 7: ai-summary 列表 + regenerate

**Files:**
- Create: `web/pages/website/ai-summary/list.vue`
- Create: `web/pages/website/ai-summary/edit.vue`

- [ ] **Step 1: 创建 ai-summary/list.vue**

`web/pages/website/ai-summary/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="AI 摘要" />

    <view class="filter-section">
      <view class="filter-row">
        <picker mode="selector" :range="targetTypeOptions" @change="handleTypeChange">
          <view class="filter-item"><text>{{ targetType || '全部类型' }}</text><text class="arrow">▼</text></view>
        </picker>
        <input type="text" v-model="targetIdFilter" placeholder="按 targetId 筛选" class="filter-input" @confirm="loadData(1)" />
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goDetail(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.summary?.slice(0, 80) || '(无摘要)' }}{{ item.summary?.length > 80 ? '...' : '' }}</view>
          <view class="item-meta">
            <text class="meta-item">📄 {{ item.targetType }}</text>
            <text class="meta-item">ID: {{ item.targetId }}</text>
            <text class="meta-item" v-if="item.status">状态: {{ item.status }}</text>
          </view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="hasPermission('ai-summary.update')" class="action-btn regen" @click.stop="handleRegenerate(item)">重新生成</view>
          <view v-if="hasPermission('ai-summary.delete')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">✨</text>
      <text class="empty-text">暂无 AI 摘要</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { aiSummaryApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const targetTypeOptions = ['article', 'case', 'product', 'faq', 'tutorial', 'compliance']
const targetType = ref('')
const targetIdFilter = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (targetType.value) params['filters[targetType]'] = targetType.value
    if (targetIdFilter.value) params['filters[targetId]'] = targetIdFilter.value
    const { list, pagination: pg } = await aiSummaryApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleTypeChange(e) {
  targetType.value = targetTypeOptions[e.detail.value] || ''
  loadData(1)
}
function goDetail(id) { uni.navigateTo({ url: `/pages/website/ai-summary/edit?documentId=${id}` }) }

async function handleRegenerate(item) {
  uni.showModal({ title: '确认重新生成', content: '将调用 AI 重新生成摘要，确定吗？', success: async (res) => {
    if (res.confirm) { try { await aiSummaryApi.regenerate(item.documentId); uni.showToast({ title: '已重新生成', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '生成失败', icon: 'none' }) } }
  }})
}
async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: '确定要删除此摘要吗？', success: async (res) => {
    if (res.confirm) { try { await aiSummaryApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.filter-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.filter-input { flex: 1; height: 64rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.regen { background: #e8f5e9; color: #07c160; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 ai-summary/edit.vue**

`web/pages/website/ai-summary/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="摘要详情">
      <button class="btn-secondary" v-if="hasPermission('ai-summary.update')" @click="handleRegenerate">重新生成</button>
      <button class="btn-primary" v-if="hasPermission('ai-summary.delete')" @click="handleDelete">删除</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">摘要信息</view>
        <view class="form-item"><text class="form-label">目标类型</text><view class="form-value">{{ form.targetType || '-' }}</view></view>
        <view class="form-item"><text class="form-label">目标 ID</text><view class="form-value">{{ form.targetId || '-' }}</view></view>
        <view class="form-item"><text class="form-label">状态</text><view class="form-value">{{ form.status || '-' }}</view></view>
      </view>
      <view class="form-section">
        <view class="section-title">摘要内容</view>
        <view class="form-item"><text class="form-label">摘要</text><view class="form-value">{{ form.summary || '(空)' }}</view></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { aiSummaryApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const form = ref({ targetType: '', targetId: '', summary: '', status: '' })

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await aiSummaryApi.detail(documentId.value)
    if (item) {
      form.value = {
        targetType: item.targetType || '', targetId: item.targetId || '',
        summary: item.summary || '', status: item.status || '',
      }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleRegenerate() {
  uni.showModal({ title: '确认重新生成', content: '将调用 AI 重新生成摘要，确定吗？', success: async (res) => {
    if (res.confirm) { try { await aiSummaryApi.regenerate(documentId.value); uni.showToast({ title: '已重新生成', icon: 'success' }); loadDetail() } catch (e) { uni.showToast({ title: '生成失败', icon: 'none' }) } }
  }})
}
async function handleDelete() {
  uni.showModal({ title: '确认删除', content: '确定要删除此摘要吗？', success: async (res) => {
    if (res.confirm) { try { await aiSummaryApi.delete(documentId.value); uni.showToast({ title: '删除成功', icon: 'success' }); setTimeout(() => uni.navigateBack(), 600) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}

onLoad((options) => { if (options?.documentId) { documentId.value = options.documentId; loadDetail() } })
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; margin-left: 12rpx; }
.btn-secondary { background: #f5f5f5; color: #333; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-value { font-size: 28rpx; color: #333; padding: 16rpx; background: #f9f9f9; border-radius: 8rpx; min-height: 40rpx; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\web
git add pages/website/ai-summary/
git commit -m "feat(web): add ai-summary list+edit pages with regenerate"
```

---

## Task 8: seo-config 单例表单

**Files:**
- Create: `web/pages/website/seo-config/edit.vue`

- [ ] **Step 1: 创建 seo-config/edit.vue**

`web/pages/website/seo-config/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="SEO 配置">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission('seo-config.update')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">Meta 标签</view>
        <view class="form-item"><text class="form-label">页面标题</text><input type="text" v-model="form.title" placeholder="浏览器标签页标题" class="form-input" /></view>
        <view class="form-item"><text class="form-label">描述</text><textarea v-model="form.description" placeholder="meta description" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">关键词（逗号分隔）</text><input type="text" v-model="form.keywords" placeholder="关键词1,关键词2" class="form-input" /></view>
        <view class="form-item"><text class="form-label">Robots</text><input type="text" v-model="form.robots" placeholder="index, follow" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">Open Graph</view>
        <view class="form-item"><text class="form-label">OG 标题</text><input type="text" v-model="form.ogTitle" placeholder="分享标题" class="form-input" /></view>
        <view class="form-item"><text class="form-label">OG 描述</text><textarea v-model="form.ogDescription" placeholder="分享描述" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">OG 图片 URL</text><input type="text" v-model="form.ogImage" placeholder="https://..." class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">结构化数据</view>
        <view class="form-item"><text class="form-label">Structured Data (JSON)</text><textarea v-model="form.structuredData" placeholder='{"@context":"https://schema.org"}' class="form-textarea json-textarea" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { seoConfigApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const form = ref({
  documentId: '', title: '', description: '', keywords: '', robots: 'index, follow',
  ogTitle: '', ogDescription: '', ogImage: '', structuredData: '',
})

async function loadData() {
  try {
    const item = await seoConfigApi.get()
    if (item) {
      form.value = {
        documentId: item.documentId || '',
        title: item.title || '', description: item.description || '',
        keywords: item.keywords || '', robots: item.robots || 'index, follow',
        ogTitle: item.ogTitle || '', ogDescription: item.ogDescription || '',
        ogImage: item.ogImage || '',
        structuredData: typeof item.structuredData === 'string' ? item.structuredData : JSON.stringify(item.structuredData || '', null, 2),
      }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  try {
    await seoConfigApi.save(form.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    loadData()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onShow(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 120rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.json-textarea { min-height: 240rpx; font-family: monospace; }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd e:\code\web
git add pages/website/seo-config/
git commit -m "feat(web): add seo-config singleton edit page"
```

---

## Task 9: brand-info 单例表单

**Files:**
- Create: `web/pages/website/brand-info/edit.vue`

- [ ] **Step 1: 创建 brand-info/edit.vue**

`web/pages/website/brand-info/edit.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="品牌信息">
      <button class="btn-primary" @click="handleSubmit" v-if="hasPermission('brand-info.update')">保存</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基础品牌</view>
        <view class="form-item"><text class="form-label">品牌名称 *</text><input type="text" v-model="form.brandName" placeholder="品牌名称" class="form-input" /></view>
        <view class="form-item"><text class="form-label">Slogan</text><input type="text" v-model="form.slogan" placeholder="品牌标语" class="form-input" /></view>
        <view class="form-item"><text class="form-label">Logo URL</text><input type="text" v-model="form.logo" placeholder="https://..." class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">联系方式</view>
        <view class="form-item"><text class="form-label">联系邮箱</text><input type="text" v-model="form.contactEmail" placeholder="contact@example.com" class="form-input" /></view>
        <view class="form-item"><text class="form-label">联系电话</text><input type="text" v-model="form.contactPhone" placeholder="400-xxx-xxxx" class="form-input" /></view>
        <view class="form-item"><text class="form-label">联系地址</text><textarea v-model="form.contactAddress" placeholder="公司地址" class="form-textarea" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">资质备案</view>
        <view class="form-item"><text class="form-label">ICP 备案号</text><input type="text" v-model="form.icpRecord" placeholder="京ICP备xxxxxx号" class="form-input" /></view>
        <view class="form-item"><text class="form-label">营业执照编号</text><input type="text" v-model="form.businessLicense" placeholder="统一社会信用代码" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">社交链接</view>
        <view class="form-item"><text class="form-label">社交链接 (JSON)</text><textarea v-model="form.socialLinks" placeholder='{"wechat":"xxx","weibo":"xxx"}' class="form-textarea json-textarea" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { brandInfoApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const form = ref({
  documentId: '', brandName: '', slogan: '', logo: '',
  contactEmail: '', contactPhone: '', contactAddress: '',
  icpRecord: '', businessLicense: '', socialLinks: '',
})

async function loadData() {
  try {
    const item = await brandInfoApi.get()
    if (item) {
      form.value = {
        documentId: item.documentId || '',
        brandName: item.brandName || '', slogan: item.slogan || '', logo: item.logo || '',
        contactEmail: item.contactEmail || '', contactPhone: item.contactPhone || '',
        contactAddress: item.contactAddress || '',
        icpRecord: item.icpRecord || '', businessLicense: item.businessLicense || '',
        socialLinks: typeof item.socialLinks === 'string' ? item.socialLinks : JSON.stringify(item.socialLinks || '', null, 2),
      }
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit() {
  if (!form.value.brandName) { uni.showToast({ title: '请填写品牌名称', icon: 'none' }); return }
  try {
    await brandInfoApi.save(form.value)
    uni.showToast({ title: '保存成功', icon: 'success' })
    loadData()
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}

onShow(() => loadData())
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; display: flex; flex-direction: column; }
.form-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
.btn-primary { background: #ff0000; color: #ffffff; padding: 16rpx 32rpx; font-size: 30rpx; border-radius: 8rpx; border: none; line-height: 1.2; }
.form-section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 8rpx; border-left: 6rpx solid #ff0000; }
.form-item { margin-bottom: 24rpx; }
.form-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 120rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.json-textarea { min-height: 240rpx; font-family: monospace; }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd e:\code\web
git add pages/website/brand-info/
git commit -m "feat(web): add brand-info singleton edit page"
```

---

## Task 10: 只读日志页 3 个

**Files:**
- Create: `web/pages/website/visit-log/list.vue`
- Create: `web/pages/website/interaction/list.vue`
- Create: `web/pages/website/search-log/list.vue`

- [ ] **Step 1: 创建 visit-log/list.vue**

`web/pages/website/visit-log/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="访问日志" />

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索路径" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card">
        <view class="item-info">
          <view class="item-title">🌐 {{ item.path }}</view>
          <view class="item-meta">
            <text class="meta-item">IP: {{ item.visitorIp || '-' }}</text>
            <text class="meta-item" v-if="item.userAgent">UA: {{ item.userAgent.slice(0, 60) }}{{ item.userAgent.length > 60 ? '...' : '' }}</text>
          </view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.visitedAt || item.createdAt) }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">👁️</text>
      <text class="empty-text">暂无访问日志</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { visitLogApi } from '../../../src/api/website.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const searchKeyword = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[path][$contains]'] = searchKeyword.value
    const { list, pagination: pg } = await visitLogApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.item-info { display: flex; flex-direction: column; }
.item-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 interaction/list.vue**

`web/pages/website/interaction/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="互动记录" />

    <view class="filter-section">
      <view class="filter-row">
        <picker mode="selector" :range="typeOptions" @change="handleTypeChange">
          <view class="filter-item"><text>{{ type || '全部类型' }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card">
        <view class="item-info">
          <view class="item-title">💬 {{ item.type || '互动' }}</view>
          <view class="item-meta">
            <text class="meta-item">目标: {{ item.targetType }}#{{ item.targetId }}</text>
          </view>
          <view class="item-content" v-if="item.content">{{ item.content }}</view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.createdAt) }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无互动记录</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { interactionApi } from '../../../src/api/website.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const typeOptions = ['like', 'comment', 'share', 'favorite', 'view']
const type = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (type.value) params['filters[type]'] = type.value
    const { list, pagination: pg } = await interactionApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleTypeChange(e) { type.value = typeOptions[e.detail.value] || ''; loadData(1) }

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.filter-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.item-info { display: flex; flex-direction: column; }
.item-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-content { font-size: 26rpx; color: #666; background: #f9f9f9; padding: 12rpx; border-radius: 8rpx; margin-top: 12rpx; }
.item-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 3: 创建 search-log/list.vue**

`web/pages/website/search-log/list.vue`:

```vue
<template>
  <view class="page-container">
    <PageHeader title="搜索日志" />

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索关键词" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card">
        <view class="item-info">
          <view class="item-title">🔎 {{ item.keyword }}</view>
          <view class="item-meta">
            <text class="meta-item">结果数: {{ item.resultCount ?? 0 }}</text>
            <text class="meta-item">IP: {{ item.visitorIp || '-' }}</text>
          </view>
          <view class="item-footer">
            <view class="item-date">{{ formatDate(item.searchedAt || item.createdAt) }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">🔎</text>
      <text class="empty-text">暂无搜索日志</text>
    </view>

    <view class="pagination" v-if="pagination.total > pagination.pageSize">
      <view class="pagination-btn" @click="prevPage" :class="{ disabled: currentPage === 1 }">上一页</view>
      <text class="pagination-info">{{ currentPage }} / {{ totalPages }}</text>
      <view class="pagination-btn" @click="nextPage" :class="{ disabled: currentPage >= totalPages }">下一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { searchLogApi } from '../../../src/api/website.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const searchKeyword = ref('')
const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[keyword][$contains]'] = searchKeyword.value
    const { list, pagination: pg } = await searchLogApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function prevPage() { if (currentPage.value > 1) loadData(currentPage.value - 1) }
function nextPage() { if (currentPage.value < totalPages.value) loadData(currentPage.value + 1) }
onShow(() => loadData(1))
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.search-section { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; }
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; }
.item-info { display: flex; flex-direction: column; }
.item-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 12rpx; }
.item-date { font-size: 22rpx; color: #999; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 4: Commit**

```bash
cd e:\code\web
git add pages/website/visit-log/ pages/website/interaction/ pages/website/search-log/
git commit -m "feat(web): add 3 read-only log pages (visit-log/interaction/search-log)"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Section 2 改动范围：Task 1-3 + 18 个新文件覆盖
- ✅ Section 3 Dashboard 17 菜单：Task 3
- ✅ Section 4 API 封装：Task 1
- ✅ Section 5.1 标准 CRUD 4 个：Task 4 (article-category) + Task 5 (knowledge-entity/relation) + Task 6 (first-truth)
- ✅ Section 5.2 单例表单 2 个：Task 8 (seo-config) + Task 9 (brand-info)
- ✅ Section 5.3 AI 摘要：Task 7
- ✅ Section 5.4 只读日志 3 个：Task 10
- ✅ Section 6 路由注册 14 个：Task 2

**2. Placeholder scan:** 无 TBD/TODO，所有代码完整

**3. Type consistency:**
- API 名称一致：brandInfoApi / articleCategoryApi / aiSummaryApi / visitLogApi / interactionApi / searchLogApi / knowledgeGraphApi / firstTruthApi / seoConfigApi
- 权限 key 一致：与 spec 第 3.1 节表格一致
- 路径一致：所有 `navigateTo` 路径与 pages.json 注册路径一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-web-website-center-completion.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查

**2. Inline Execution** - 当前会话批量执行，含 checkpoint 审查

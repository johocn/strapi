# web uni-app 官网内容管理增量改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 web/ uni-app 项目中新增 6 个内容 CT（product/case/faq/tutorial/compliance/download）的 list + edit 页面，共 12 个 .vue 文件 + pages.json 路由注册。

**Architecture:** 复用现有 article/list.vue + article/edit.vue 模板模式，每个 CT 各有差异点（主字段名、特有字段、媒体字段、json 字段）。所有 CT 复用 `src/api/website.js` 的 `createContentApi(resource)` 返回的 API。不新增组件，不修改现有 article/lead 页面。

**Tech Stack:** uni-app + Vue 3 + 现有组件（PageHeader/RichEditor/TagPicker/MediaPicker）

**Spec:** `docs/superpowers/specs/2026-07-07-web-website-content-pages-design.md`

---

## 文件结构

| 文件 | 职责 | 操作 |
|---|---|---|
| `web/pages.json` | 新增 12 条路由 | 修改 |
| `web/pages/website/product/list.vue` | 产品列表 | 新建 |
| `web/pages/website/product/edit.vue` | 产品编辑 | 新建 |
| `web/pages/website/case/list.vue` | 案例列表 | 新建 |
| `web/pages/website/case/edit.vue` | 案例编辑 | 新建 |
| `web/pages/website/faq/list.vue` | FAQ 列表 | 新建 |
| `web/pages/website/faq/edit.vue` | FAQ 编辑 | 新建 |
| `web/pages/website/tutorial/list.vue` | 教程列表 | 新建 |
| `web/pages/website/tutorial/edit.vue` | 教程编辑 | 新建 |
| `web/pages/website/compliance/list.vue` | 合规列表 | 新建 |
| `web/pages/website/compliance/edit.vue` | 合规编辑 | 新建 |
| `web/pages/website/download/list.vue` | 下载列表 | 新建 |
| `web/pages/website/download/edit.vue` | 下载编辑 | 新建 |

---

### Task 1: pages.json 路由注册 + product list+edit

**Files:**
- Modify: `web/pages.json`
- Create: `web/pages/website/product/list.vue`
- Create: `web/pages/website/product/edit.vue`

- [ ] **Step 1: 修改 pages.json 新增 12 条路由**

在 `web/pages.json` 的 `pages` 数组中，在 `pages/website/lead/list` 项之后添加：

```json
    { "path": "pages/website/product/list", "style": { "navigationBarTitleText": "产品方案" } },
    { "path": "pages/website/product/edit", "style": { "navigationBarTitleText": "产品编辑" } },
    { "path": "pages/website/case/list", "style": { "navigationBarTitleText": "落地案例" } },
    { "path": "pages/website/case/edit", "style": { "navigationBarTitleText": "案例编辑" } },
    { "path": "pages/website/faq/list", "style": { "navigationBarTitleText": "常见问答" } },
    { "path": "pages/website/faq/edit", "style": { "navigationBarTitleText": "问答编辑" } },
    { "path": "pages/website/tutorial/list", "style": { "navigationBarTitleText": "教程指南" } },
    { "path": "pages/website/tutorial/edit", "style": { "navigationBarTitleText": "教程编辑" } },
    { "path": "pages/website/compliance/list", "style": { "navigationBarTitleText": "合规公示" } },
    { "path": "pages/website/compliance/edit", "style": { "navigationBarTitleText": "合规编辑" } },
    { "path": "pages/website/download/list", "style": { "navigationBarTitleText": "下载管理" } },
    { "path": "pages/website/download/edit", "style": { "navigationBarTitleText": "下载编辑" } }
```

- [ ] **Step 2: 创建 product/list.vue**

路径：`web/pages/website/product/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="产品方案">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('product.create')">+ 新增产品</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索产品名称" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item">
            <text>{{ statusOptions[statusIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.name }}</view>
          <view class="item-meta">
            <text class="meta-item" v-if="item.tagline">🏷️ {{ item.tagline }}</text>
            <text class="meta-item" v-if="item.priceRange">💰 {{ item.priceRange }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('product.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('product.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('product.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('product.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无产品</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('product.create')">立即添加</button>
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
import { productApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[name][$contains]'] = searchKeyword.value
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await productApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/product/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/product/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({
    title: '确认删除', content: `确定要删除产品「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try { await productApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) }
        catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
      }
    }
  })
}

async function handlePublish(item) {
  uni.showModal({
    title: '确认发布', content: `确定要发布产品「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try { await productApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) }
        catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) }
      }
    }
  })
}

async function handleArchive(item) {
  uni.showModal({
    title: '确认下架', content: `确定要下架产品「${item.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try { await productApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) }
        catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) }
      }
    }
  })
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; }
.item-status.published { background: #07c160; }
.item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; }
.action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; }
.action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; }
.pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 3: 创建 product/edit.vue**

路径：`web/pages/website/product/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑产品' : '新增产品'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('product.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('product.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item">
          <text class="form-label">名称 *</text>
          <input type="text" v-model="form.name" placeholder="产品名称" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">slug</text>
          <input type="text" v-model="form.slug" placeholder="URL 别名（留空自动生成）" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">标语</text>
          <input type="text" v-model="form.tagline" placeholder="产品标语" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">简介</text>
          <textarea v-model="form.description" placeholder="产品简介" class="form-textarea" />
        </view>
        <view class="form-item">
          <text class="form-label">封面图 URL</text>
          <input type="text" v-model="form.coverImage" placeholder="封面图地址" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">正文</text>
          <textarea v-model="form.content" placeholder="产品详情" class="form-textarea content-textarea" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">产品属性</view>
        <view class="form-item">
          <text class="form-label">价格区间</text>
          <input type="text" v-model="form.priceRange" placeholder="例: ¥1000-5000" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">价格单位</text>
          <input type="text" v-model="form.priceUnit" placeholder="例: 元/年" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">特性（JSON 数组）</text>
          <textarea v-model="featuresJson" placeholder='[{"name":"特性1","description":"..."}]' class="form-textarea" />
        </view>
        <view class="form-item">
          <text class="form-label">规格（JSON 对象）</text>
          <textarea v-model="specificationsJson" placeholder='{"CPU":"4核","内存":"8G"}' class="form-textarea" />
        </view>
        <view class="form-item">
          <text class="form-label">应用场景（JSON 数组）</text>
          <textarea v-model="scenariosJson" placeholder='["场景1","场景2"]' class="form-textarea" />
        </view>
        <view class="form-item form-row">
          <text class="form-label">推荐</text>
          <switch :checked="form.isFeatured" @change="form.isFeatured = !form.isFeatured" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item">
          <text class="form-label">标签（逗号分隔）</text>
          <input type="text" v-model="tagsInput" placeholder="例: SaaS,企业" class="form-input" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')
const featuresJson = ref('[]')
const specificationsJson = ref('{}')
const scenariosJson = ref('[]')

const form = ref({
  name: '', slug: '', tagline: '', description: '', content: '', coverImage: '',
  priceRange: '', priceUnit: '', features: [], specifications: {}, scenarios: [],
  isFeatured: false, tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }
function safeParse(str, fallback) { try { return JSON.parse(str) } catch { return fallback } }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await productApi.detail(documentId.value)
    if (item) {
      form.value = {
        name: item.name || '', slug: item.slug || '', tagline: item.tagline || '',
        description: item.description || '', content: item.content || '', coverImage: item.coverImage || '',
        priceRange: item.priceRange || '', priceUnit: item.priceUnit || '',
        features: item.features || [], specifications: item.specifications || {}, scenarios: item.scenarios || [],
        isFeatured: item.isFeatured || false, tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
      featuresJson.value = JSON.stringify(item.features || [], null, 2)
      specificationsJson.value = JSON.stringify(item.specifications || {}, null, 2)
      scenariosJson.value = JSON.stringify(item.scenarios || [], null, 2)
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.name) { uni.showToast({ title: '请填写名称', icon: 'none' }); return }
  const payload = {
    ...form.value,
    tags: parseTags(tagsInput.value),
    features: safeParse(featuresJson.value, []),
    specifications: safeParse(specificationsJson.value, {}),
    scenarios: safeParse(scenariosJson.value, []),
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await productApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await productApi.publish(documentId.value)
    } else {
      const created = await productApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await productApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.content-textarea { min-height: 400rpx; }
.form-row { display: flex; justify-content: space-between; align-items: center; }
</style>
```

- [ ] **Step 4: 验证 pages.json 语法**

运行：`cd e:\code\web ; node -e "JSON.parse(require('fs').readFileSync('pages.json','utf8')); console.log('OK')"`

期望：输出 `OK`

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add web/pages.json web/pages/website/product/list.vue web/pages/website/product/edit.vue
git commit -m "feat(web): product list+edit 页面 + 12 条 pages.json 路由注册"
```

---

### Task 2: case list+edit

**Files:**
- Create: `web/pages/website/case/list.vue`
- Create: `web/pages/website/case/edit.vue`

- [ ] **Step 1: 创建 case/list.vue**

路径：`web/pages/website/case/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="落地案例">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('case.create')">+ 新增案例</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索案例标题/客户" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item"><text>{{ statusOptions[statusIndex] }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.title }}</view>
          <view class="item-meta">
            <text class="meta-item" v-if="item.clientName">👤 {{ item.clientName }}</text>
            <text class="meta-item" v-if="item.clientIndustry">🏭 {{ item.clientIndustry }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('case.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('case.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('case.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('case.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📊</text>
      <text class="empty-text">暂无案例</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('case.create')">立即添加</button>
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
import { caseApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) {
      params['filters[$or][0][title][$contains]'] = searchKeyword.value
      params['filters[$or][1][clientName][$contains]'] = searchKeyword.value
    }
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await caseApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/case/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/case/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除案例「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await caseApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}
async function handlePublish(item) {
  uni.showModal({ title: '确认发布', content: `确定要发布案例「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await caseApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) } }
  }})
}
async function handleArchive(item) {
  uni.showModal({ title: '确认下架', content: `确定要下架案例「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await caseApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) } }
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; } .item-status.published { background: #07c160; } .item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; } .action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; } .action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; } .empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; } .pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 case/edit.vue**

路径：`web/pages/website/case/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑案例' : '新增案例'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('case.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('case.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">标题 *</text><input type="text" v-model="form.title" placeholder="案例标题" class="form-input" /></view>
        <view class="form-item"><text class="form-label">slug</text><input type="text" v-model="form.slug" placeholder="URL 别名" class="form-input" /></view>
        <view class="form-item"><text class="form-label">客户名称 *</text><input type="text" v-model="form.clientName" placeholder="客户公司名" class="form-input" /></view>
        <view class="form-item"><text class="form-label">客户行业</text><input type="text" v-model="form.clientIndustry" placeholder="客户所在行业" class="form-input" /></view>
        <view class="form-item"><text class="form-label">客户简介</text><textarea v-model="form.clientDescription" placeholder="客户介绍" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">封面图 URL</text><input type="text" v-model="form.coverImage" placeholder="封面图地址" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">案例详情</view>
        <view class="form-item"><text class="form-label">挑战 *</text><textarea v-model="form.challenge" placeholder="客户面临的挑战" class="form-textarea content-textarea" /></view>
        <view class="form-item"><text class="form-label">解决方案 *</text><textarea v-model="form.solution" placeholder="提供的解决方案" class="form-textarea content-textarea" /></view>
        <view class="form-item"><text class="form-label">成果（JSON 数组）*</text><textarea v-model="resultsJson" placeholder='[{"metric":"增长","value":"30%"}]' class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">客户评价</text><textarea v-model="form.testimonial" placeholder="客户证言" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">评价人姓名</text><input type="text" v-model="form.testimonialAuthor" placeholder="评价人姓名" class="form-input" /></view>
        <view class="form-item"><text class="form-label">评价人职位</text><input type="text" v-model="form.testimonialTitle" placeholder="评价人职位" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item"><text class="form-label">标签（逗号分隔）</text><input type="text" v-model="tagsInput" placeholder="例: 金融,数字化转型" class="form-input" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { caseApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')
const resultsJson = ref('[]')

const form = ref({
  title: '', slug: '', clientName: '', clientIndustry: '', clientDescription: '',
  challenge: '', solution: '', results: [], testimonial: '', testimonialAuthor: '', testimonialTitle: '',
  coverImage: '', tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }
function safeParse(str, fallback) { try { return JSON.parse(str) } catch { return fallback } }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await caseApi.detail(documentId.value)
    if (item) {
      form.value = {
        title: item.title || '', slug: item.slug || '',
        clientName: item.clientName || '', clientIndustry: item.clientIndustry || '', clientDescription: item.clientDescription || '',
        challenge: item.challenge || '', solution: item.solution || '', results: item.results || [],
        testimonial: item.testimonial || '', testimonialAuthor: item.testimonialAuthor || '', testimonialTitle: item.testimonialTitle || '',
        coverImage: item.coverImage || '', tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
      resultsJson.value = JSON.stringify(item.results || [], null, 2)
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.title) { uni.showToast({ title: '请填写标题', icon: 'none' }); return }
  if (!form.value.clientName) { uni.showToast({ title: '请填写客户名称', icon: 'none' }); return }
  if (!form.value.challenge) { uni.showToast({ title: '请填写挑战', icon: 'none' }); return }
  if (!form.value.solution) { uni.showToast({ title: '请填写解决方案', icon: 'none' }); return }
  const payload = {
    ...form.value, tags: parseTags(tagsInput.value),
    results: safeParse(resultsJson.value, []),
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await caseApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await caseApi.publish(documentId.value)
    } else {
      const created = await caseApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await caseApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.content-textarea { min-height: 300rpx; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add web/pages/website/case/list.vue web/pages/website/case/edit.vue
git commit -m "feat(web): case list+edit 页面"
```

---

### Task 3: faq list+edit

**Files:**
- Create: `web/pages/website/faq/list.vue`
- Create: `web/pages/website/faq/edit.vue`

- [ ] **Step 1: 创建 faq/list.vue**

路径：`web/pages/website/faq/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="常见问答">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('faq.create')">+ 新增问答</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索问题" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item"><text>{{ statusOptions[statusIndex] }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">Q: {{ truncate(item.question, 80) }}</view>
          <view class="item-meta">
            <text class="meta-item">A: {{ truncate(item.answer, 50) }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">排序: {{ item.order || 0 }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('faq.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('faq.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('faq.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('faq.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">❓</text>
      <text class="empty-text">暂无问答</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('faq.create')">立即添加</button>
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
import { faqApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }
function truncate(str, n) { return str ? (str.length > n ? str.slice(0, n) + '...' : str) : '' }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[question][$contains]'] = searchKeyword.value
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await faqApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/faq/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/faq/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: '确定要删除此问答吗？', success: async (res) => {
    if (res.confirm) { try { await faqApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}
async function handlePublish(item) {
  uni.showModal({ title: '确认发布', content: '确定要发布此问答吗？', success: async (res) => {
    if (res.confirm) { try { await faqApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) } }
  }})
}
async function handleArchive(item) {
  uni.showModal({ title: '确认下架', content: '确定要下架此问答吗？', success: async (res) => {
    if (res.confirm) { try { await faqApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) } }
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; } .item-status.published { background: #07c160; } .item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; } .action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; } .action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; } .empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; } .pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 faq/edit.vue**

路径：`web/pages/website/faq/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑问答' : '新增问答'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('faq.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('faq.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">问答内容</view>
        <view class="form-item">
          <text class="form-label">问题 *</text>
          <textarea v-model="form.question" placeholder="请输入问题" class="form-textarea" />
        </view>
        <view class="form-item">
          <text class="form-label">答案 *</text>
          <textarea v-model="form.answer" placeholder="请输入答案" class="form-textarea content-textarea" />
        </view>
        <view class="form-item">
          <text class="form-label">slug</text>
          <input type="text" v-model="form.slug" placeholder="URL 别名" class="form-input" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">设置</view>
        <view class="form-item">
          <text class="form-label">排序（数字越小越靠前）</text>
          <input type="number" v-model="form.order" placeholder="0" class="form-input" />
        </view>
        <view class="form-item form-row">
          <text class="form-label">推荐</text>
          <switch :checked="form.isFeatured" @change="form.isFeatured = !form.isFeatured" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item">
          <text class="form-label">标签（逗号分隔）</text>
          <input type="text" v-model="tagsInput" placeholder="例: 常见问题,使用" class="form-input" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { faqApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')

const form = ref({
  question: '', answer: '', slug: '', order: 0, isFeatured: false, tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await faqApi.detail(documentId.value)
    if (item) {
      form.value = {
        question: item.question || '', answer: item.answer || '', slug: item.slug || '',
        order: item.order || 0, isFeatured: item.isFeatured || false,
        tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.question) { uni.showToast({ title: '请填写问题', icon: 'none' }); return }
  if (!form.value.answer) { uni.showToast({ title: '请填写答案', icon: 'none' }); return }
  const payload = {
    ...form.value, tags: parseTags(tagsInput.value),
    order: Number(form.value.order) || 0,
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await faqApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await faqApi.publish(documentId.value)
    } else {
      const created = await faqApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await faqApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.content-textarea { min-height: 400rpx; }
.form-row { display: flex; justify-content: space-between; align-items: center; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add web/pages/website/faq/list.vue web/pages/website/faq/edit.vue
git commit -m "feat(web): faq list+edit 页面"
```

---

### Task 4: tutorial list+edit

**Files:**
- Create: `web/pages/website/tutorial/list.vue`
- Create: `web/pages/website/tutorial/edit.vue`

- [ ] **Step 1: 创建 tutorial/list.vue**

路径：`web/pages/website/tutorial/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="教程指南">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('tutorial.create')">+ 新增教程</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索教程标题" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item"><text>{{ statusOptions[statusIndex] }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.title }}</view>
          <view class="item-meta">
            <text class="meta-item" v-if="item.difficulty">📊 {{ getDifficultyText(item.difficulty) }}</text>
            <text class="meta-item" v-if="item.estimatedTime">⏱️ {{ item.estimatedTime }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('tutorial.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('tutorial.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('tutorial.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('tutorial.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📚</text>
      <text class="empty-text">暂无教程</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('tutorial.create')">立即添加</button>
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
import { tutorialApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }
const difficultyMap = { beginner: '入门', intermediate: '进阶', advanced: '高级' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }
function getDifficultyText(d) { return difficultyMap[d] || d }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[title][$contains]'] = searchKeyword.value
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await tutorialApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/tutorial/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/tutorial/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除教程「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await tutorialApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}
async function handlePublish(item) {
  uni.showModal({ title: '确认发布', content: `确定要发布教程「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await tutorialApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) } }
  }})
}
async function handleArchive(item) {
  uni.showModal({ title: '确认下架', content: `确定要下架教程「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await tutorialApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) } }
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; } .item-status.published { background: #07c160; } .item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; } .action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; } .action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; } .empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; } .pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 tutorial/edit.vue**

路径：`web/pages/website/tutorial/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑教程' : '新增教程'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('tutorial.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('tutorial.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">标题 *</text><input type="text" v-model="form.title" placeholder="教程标题" class="form-input" /></view>
        <view class="form-item"><text class="form-label">slug</text><input type="text" v-model="form.slug" placeholder="URL 别名" class="form-input" /></view>
        <view class="form-item"><text class="form-label">简介</text><textarea v-model="form.description" placeholder="教程简介" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">封面图 URL</text><input type="text" v-model="form.coverImage" placeholder="封面图地址" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">教程详情</view>
        <view class="form-item">
          <text class="form-label">难度</text>
          <picker mode="selector" :range="difficultyOptions" :range-key="'label'" @change="(e) => form.difficulty = difficultyOptions[e.detail.value].value">
            <view class="form-input picker-display">{{ getDifficultyText(form.difficulty) }}</view>
          </picker>
        </view>
        <view class="form-item"><text class="form-label">预计时长</text><input type="text" v-model="form.estimatedTime" placeholder="例: 30分钟" class="form-input" /></view>
        <view class="form-item"><text class="form-label">步骤（JSON 数组）*</text><textarea v-model="stepsJson" placeholder='[{"title":"步骤1","content":"..."}]' class="form-textarea content-textarea" /></view>
        <view class="form-item"><text class="form-label">材料（JSON 数组）</text><textarea v-model="materialsJson" placeholder='["材料1","材料2"]' class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">结果说明</text><textarea v-model="form.result" placeholder="教程结果" class="form-textarea" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item"><text class="form-label">标签（逗号分隔）</text><input type="text" v-model="tagsInput" placeholder="例: 入门,操作" class="form-input" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { tutorialApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')
const stepsJson = ref('[]')
const materialsJson = ref('[]')

const difficultyOptions = [
  { label: '入门', value: 'beginner' },
  { label: '进阶', value: 'intermediate' },
  { label: '高级', value: 'advanced' },
]
const difficultyMap = { beginner: '入门', intermediate: '进阶', advanced: '高级' }
function getDifficultyText(d) { return difficultyMap[d] || d }

const form = ref({
  title: '', slug: '', description: '', coverImage: '',
  steps: [], materials: [], estimatedTime: '', difficulty: 'beginner', result: '',
  tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }
function safeParse(str, fallback) { try { return JSON.parse(str) } catch { return fallback } }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await tutorialApi.detail(documentId.value)
    if (item) {
      form.value = {
        title: item.title || '', slug: item.slug || '', description: item.description || '', coverImage: item.coverImage || '',
        steps: item.steps || [], materials: item.materials || [],
        estimatedTime: item.estimatedTime || '', difficulty: item.difficulty || 'beginner', result: item.result || '',
        tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
      stepsJson.value = JSON.stringify(item.steps || [], null, 2)
      materialsJson.value = JSON.stringify(item.materials || [], null, 2)
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.title) { uni.showToast({ title: '请填写标题', icon: 'none' }); return }
  const payload = {
    ...form.value, tags: parseTags(tagsInput.value),
    steps: safeParse(stepsJson.value, []),
    materials: safeParse(materialsJson.value, []),
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await tutorialApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await tutorialApi.publish(documentId.value)
    } else {
      const created = await tutorialApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await tutorialApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-display { display: flex; align-items: center; line-height: 72rpx; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.content-textarea { min-height: 300rpx; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add web/pages/website/tutorial/list.vue web/pages/website/tutorial/edit.vue
git commit -m "feat(web): tutorial list+edit 页面"
```

---

### Task 5: compliance list+edit

**Files:**
- Create: `web/pages/website/compliance/list.vue`
- Create: `web/pages/website/compliance/edit.vue`

- [ ] **Step 1: 创建 compliance/list.vue**

路径：`web/pages/website/compliance/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="合规公示">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('compliance.create')">+ 新增合规</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索标题" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item"><text>{{ statusOptions[statusIndex] }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.title }}</view>
          <view class="item-meta">
            <text class="meta-item">📂 {{ getCategoryText(item.category) }}</text>
            <text class="meta-item" v-if="item.effectiveDate">📅 {{ item.effectiveDate }}</text>
            <text class="meta-item" v-if="item.isPinned">📌 置顶</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('compliance.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('compliance.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('compliance.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('compliance.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无合规公示</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('compliance.create')">立即添加</button>
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
import { complianceApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }
const categoryMap = { notice: '公告', policy: '政策', report: '报告', certificate: '证书', agreement: '协议' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }
function getCategoryText(c) { return categoryMap[c] || c }

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[title][$contains]'] = searchKeyword.value
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await complianceApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/compliance/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/compliance/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await complianceApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}
async function handlePublish(item) {
  uni.showModal({ title: '确认发布', content: `确定要发布「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await complianceApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) } }
  }})
}
async function handleArchive(item) {
  uni.showModal({ title: '确认下架', content: `确定要下架「${item.title}」吗？`, success: async (res) => {
    if (res.confirm) { try { await complianceApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) } }
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; } .item-status.published { background: #07c160; } .item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; } .action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; } .action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; } .empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; } .pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 compliance/edit.vue**

路径：`web/pages/website/compliance/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑合规' : '新增合规'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('compliance.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('compliance.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">标题 *</text><input type="text" v-model="form.title" placeholder="合规公示标题" class="form-input" /></view>
        <view class="form-item"><text class="form-label">slug</text><input type="text" v-model="form.slug" placeholder="URL 别名" class="form-input" /></view>
        <view class="form-item">
          <text class="form-label">类目 *</text>
          <picker mode="selector" :range="categoryOptions" :range-key="'label'" @change="(e) => form.category = categoryOptions[e.detail.value].value">
            <view class="form-input picker-display">{{ getCategoryText(form.category) }}</view>
          </picker>
        </view>
        <view class="form-item"><text class="form-label">生效日期</text><input type="date" v-model="form.effectiveDate" class="form-input" /></view>
        <view class="form-item"><text class="form-label">失效日期</text><input type="date" v-model="form.expiryDate" class="form-input" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">内容</view>
        <view class="form-item"><text class="form-label">正文 *</text><textarea v-model="form.content" placeholder="合规公示正文" class="form-textarea content-textarea" /></view>
      </view>

      <view class="form-section">
        <view class="section-title">设置</view>
        <view class="form-item form-row">
          <text class="form-label">置顶</text>
          <switch :checked="form.isPinned" @change="form.isPinned = !form.isPinned" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item"><text class="form-label">标签（逗号分隔）</text><input type="text" v-model="tagsInput" placeholder="例: 隐私,服务条款" class="form-input" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { complianceApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')

const categoryOptions = [
  { label: '公告', value: 'notice' },
  { label: '政策', value: 'policy' },
  { label: '报告', value: 'report' },
  { label: '证书', value: 'certificate' },
  { label: '协议', value: 'agreement' },
]
const categoryMap = { notice: '公告', policy: '政策', report: '报告', certificate: '证书', agreement: '协议' }
function getCategoryText(c) { return categoryMap[c] || c }

const form = ref({
  title: '', slug: '', category: 'notice', content: '',
  effectiveDate: '', expiryDate: '', isPinned: false,
  tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await complianceApi.detail(documentId.value)
    if (item) {
      form.value = {
        title: item.title || '', slug: item.slug || '', category: item.category || 'notice',
        content: item.content || '', effectiveDate: item.effectiveDate || '', expiryDate: item.expiryDate || '',
        isPinned: item.isPinned || false, tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.title) { uni.showToast({ title: '请填写标题', icon: 'none' }); return }
  if (!form.value.content) { uni.showToast({ title: '请填写正文', icon: 'none' }); return }
  const payload = {
    ...form.value, tags: parseTags(tagsInput.value),
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await complianceApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await complianceApi.publish(documentId.value)
    } else {
      const created = await complianceApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await complianceApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-display { display: flex; align-items: center; line-height: 72rpx; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.content-textarea { min-height: 400rpx; }
.form-row { display: flex; justify-content: space-between; align-items: center; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add web/pages/website/compliance/list.vue web/pages/website/compliance/edit.vue
git commit -m "feat(web): compliance list+edit 页面"
```

---

### Task 6: download list+edit

**Files:**
- Create: `web/pages/website/download/list.vue`
- Create: `web/pages/website/download/edit.vue`

- [ ] **Step 1: 创建 download/list.vue**

路径：`web/pages/website/download/list.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader title="下载管理">
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('download.create')">+ 新增下载</button>
    </PageHeader>

    <view class="search-section">
      <view class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="搜索下载名称" @confirm="loadData(1)" class="search-input" />
        <text class="search-icon">🔍</text>
      </view>
      <view class="filter-row">
        <picker mode="selector" :range="statusOptions" @change="handleStatusChange">
          <view class="filter-item"><text>{{ statusOptions[statusIndex] }}</text><text class="arrow">▼</text></view>
        </picker>
      </view>
    </view>

    <view class="item-list">
      <view v-for="item in itemList" :key="item.documentId" class="item-card" @click="goEdit(item.documentId)">
        <view class="item-info">
          <view class="item-title">{{ item.name }}</view>
          <view class="item-meta">
            <text class="meta-item">📦 {{ getFileTypeText(item.fileType) }}</text>
            <text class="meta-item" v-if="item.fileSize">💾 {{ formatFileSize(item.fileSize) }}</text>
            <text class="meta-item">⬇️ {{ item.downloadCount || 0 }}</text>
          </view>
          <view class="item-footer">
            <view class="item-status" :class="item.status">{{ getStatusText(item.status) }}</view>
            <view class="item-date">{{ formatDate(item.publishedAt || item.createdAt) }}</view>
          </view>
        </view>
        <view class="item-actions">
          <view v-if="item.status === 'draft' && hasPermission('download.publish')" class="action-btn publish" @click.stop="handlePublish(item)">发布</view>
          <view v-if="item.status === 'published' && hasPermission('download.publish')" class="action-btn unpublish" @click.stop="handleArchive(item)">下架</view>
          <view v-if="hasPermission('download.update')" class="action-btn edit" @click.stop="goEdit(item.documentId)">编辑</view>
          <view v-if="hasPermission('download.update')" class="action-btn delete" @click.stop="handleDelete(item)">删除</view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="!loading && itemList.length === 0" class="empty-state">
      <text class="empty-icon">📥</text>
      <text class="empty-text">暂无下载</text>
      <button class="btn-primary" @click="goCreate" v-if="hasPermission('download.create')">立即添加</button>
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
import { downloadApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import { formatDate } from '../../../src/utils/format.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const searchKeyword = ref('')
const statusIndex = ref(0)
const statusOptions = ['全部状态', '草稿', '已发布', '已下架']
const statusReverseMap = { 1: 'draft', 2: 'published', 3: 'archived' }
const statusMap = { draft: '草稿', published: '已发布', archived: '已下架' }
const fileTypeMap = { whitepaper: '白皮书', brochure: '宣传册', datasheet: '数据表', template: '模板', guide: '指南', certificate: '证书', other: '其他' }

const itemList = ref([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const currentPage = ref(1)
const loading = ref(false)
const totalPages = computed(() => Math.ceil(pagination.value.total / (pagination.value.pageSize || 10)) || 1)

function getStatusText(status) { return statusMap[status] || status }
function getFileTypeText(t) { return fileTypeMap[t] || t }
function formatFileSize(size) {
  const s = Number(size)
  if (!s) return '-'
  if (s < 1024) return s + 'B'
  if (s < 1024 * 1024) return (s / 1024).toFixed(1) + 'KB'
  return (s / 1024 / 1024).toFixed(1) + 'MB'
}

async function loadData(page = 1) {
  loading.value = true
  try {
    const params = { 'pagination[page]': page, 'pagination[pageSize]': 10 }
    if (searchKeyword.value) params['filters[name][$contains]'] = searchKeyword.value
    if (statusIndex.value > 0) params['filters[status]'] = statusReverseMap[statusIndex.value]
    const { list, pagination: pg } = await downloadApi.list(params)
    itemList.value = list
    pagination.value = pg
    currentPage.value = page
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
  finally { loading.value = false }
}

function handleStatusChange(e) { statusIndex.value = e.detail.value; loadData(1) }
function goCreate() { uni.navigateTo({ url: '/pages/website/download/edit' }) }
function goEdit(id) { uni.navigateTo({ url: `/pages/website/download/edit?documentId=${id}` }) }

async function handleDelete(item) {
  uni.showModal({ title: '确认删除', content: `确定要删除「${item.name}」吗？`, success: async (res) => {
    if (res.confirm) { try { await downloadApi.delete(item.documentId); uni.showToast({ title: '删除成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) } }
  }})
}
async function handlePublish(item) {
  uni.showModal({ title: '确认发布', content: `确定要发布「${item.name}」吗？`, success: async (res) => {
    if (res.confirm) { try { await downloadApi.publish(item.documentId); uni.showToast({ title: '发布成功', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '发布失败', icon: 'none' }) } }
  }})
}
async function handleArchive(item) {
  uni.showModal({ title: '确认下架', content: `确定要下架「${item.name}」吗？`, success: async (res) => {
    if (res.confirm) { try { await downloadApi.archive(item.documentId); uni.showToast({ title: '已下架', icon: 'success' }); loadData(currentPage.value) } catch (e) { uni.showToast({ title: '下架失败', icon: 'none' }) } }
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
.search-box { display: flex; align-items: center; background: #f5f5f5; border-radius: 8rpx; padding: 0 20rpx; margin-bottom: 20rpx; }
.search-input { flex: 1; height: 72rpx; font-size: 28rpx; }
.search-icon { font-size: 32rpx; }
.filter-row { display: flex; gap: 20rpx; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 26rpx; }
.arrow { font-size: 20rpx; color: #999; }
.item-list { display: flex; flex-direction: column; gap: 20rpx; }
.item-card { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; }
.item-info { flex: 1; display: flex; flex-direction: column; }
.item-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; }
.item-meta { flex: 1; }
.meta-item { font-size: 24rpx; color: #999; margin-right: 16rpx; }
.item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.item-status { padding: 4rpx 16rpx; border-radius: 4rpx; font-size: 22rpx; color: #fff; }
.item-status.draft { background: #999; } .item-status.published { background: #07c160; } .item-status.archived { background: #666; }
.item-date { font-size: 22rpx; color: #999; }
.item-actions { display: flex; flex-direction: column; gap: 12rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 24rpx; text-align: center; }
.action-btn.edit { background: #f5f5f5; color: #1989fa; } .action-btn.delete { background: #fff0f0; color: #ff4d4f; }
.action-btn.publish { background: #e8f5e9; color: #07c160; } .action-btn.unpublish { background: #fff3e0; color: #faad14; }
.loading, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; } .empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 40rpx; padding: 40rpx 0; }
.pagination-btn { padding: 16rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 28rpx; }
.pagination-btn.disabled { color: #999; background: #f5f5f5; } .pagination-info { font-size: 28rpx; color: #666; }
</style>
```

- [ ] **Step 2: 创建 download/edit.vue**

路径：`web/pages/website/download/edit.vue`

```vue
<template>
  <view class="page-container">
    <PageHeader :title="isEdit ? '编辑下载' : '新增下载'">
      <button class="btn-secondary" @click="handleSubmit('draft')" v-if="hasPermission('download.update')">存草稿</button>
      <button class="btn-primary" @click="handleSubmit('published')" v-if="hasPermission('download.publish')">发布</button>
    </PageHeader>

    <scroll-view scroll-y class="form-scroll">
      <view class="form-section">
        <view class="section-title">基本信息</view>
        <view class="form-item"><text class="form-label">名称 *</text><input type="text" v-model="form.name" placeholder="下载名称" class="form-input" /></view>
        <view class="form-item"><text class="form-label">描述</text><textarea v-model="form.description" placeholder="文件描述" class="form-textarea" /></view>
        <view class="form-item"><text class="form-label">文件 URL *</text><input type="text" v-model="form.file" placeholder="文件下载地址" class="form-input" /></view>
        <view class="form-item">
          <text class="form-label">文件类型</text>
          <picker mode="selector" :range="fileTypeOptions" :range-key="'label'" @change="(e) => form.fileType = fileTypeOptions[e.detail.value].value">
            <view class="form-input picker-display">{{ getFileTypeText(form.fileType) }}</view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">下载设置</view>
        <view class="form-item"><text class="form-label">排序（数字越小越靠前）</text><input type="number" v-model="form.order" placeholder="0" class="form-input" /></view>
        <view class="form-item form-row">
          <text class="form-label">需要线索（用户下载前需提交联系信息）</text>
          <switch :checked="form.requireLead" @change="form.requireLead = !form.requireLead" />
        </view>
        <view class="form-item form-row">
          <text class="form-label">推荐</text>
          <switch :checked="form.isFeatured" @change="form.isFeatured = !form.isFeatured" />
        </view>
      </view>

      <view class="form-section">
        <view class="section-title">标签</view>
        <view class="form-item"><text class="form-label">标签（逗号分隔）</text><input type="text" v-model="tagsInput" placeholder="例: 白皮书,产品手册" class="form-input" /></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { downloadApi } from '../../../src/api/website.js'
import { useUserStore } from '../../../src/store/user.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission

const documentId = ref('')
const isEdit = computed(() => !!documentId.value)
const tagsInput = ref('')

const fileTypeOptions = [
  { label: '白皮书', value: 'whitepaper' },
  { label: '宣传册', value: 'brochure' },
  { label: '数据表', value: 'datasheet' },
  { label: '模板', value: 'template' },
  { label: '指南', value: 'guide' },
  { label: '证书', value: 'certificate' },
  { label: '其他', value: 'other' },
]
const fileTypeMap = { whitepaper: '白皮书', brochure: '宣传册', datasheet: '数据表', template: '模板', guide: '指南', certificate: '证书', other: '其他' }
function getFileTypeText(t) { return fileTypeMap[t] || t }

const form = ref({
  name: '', description: '', file: '', fileType: 'other',
  order: 0, requireLead: true, isFeatured: false,
  tags: [], status: 'draft',
})

function parseTags(str) { return str ? String(str).split(',').map(t => t.trim()).filter(Boolean) : [] }

async function loadDetail() {
  if (!documentId.value) return
  try {
    const item = await downloadApi.detail(documentId.value)
    if (item) {
      form.value = {
        name: item.name || '', description: item.description || '', file: item.file || '', fileType: item.fileType || 'other',
        order: item.order || 0, requireLead: item.requireLead !== false, isFeatured: item.isFeatured || false,
        tags: item.tags || [], status: item.status || 'draft',
      }
      tagsInput.value = (item.tags || []).join(',')
    }
  } catch (e) { uni.showToast({ title: '加载失败', icon: 'none' }) }
}

async function handleSubmit(targetStatus) {
  if (!form.value.name) { uni.showToast({ title: '请填写名称', icon: 'none' }); return }
  if (!form.value.file) { uni.showToast({ title: '请填写文件 URL', icon: 'none' }); return }
  const payload = {
    ...form.value, tags: parseTags(tagsInput.value),
    order: Number(form.value.order) || 0,
    status: targetStatus === 'published' ? 'published' : 'draft',
  }
  try {
    if (isEdit.value) {
      await downloadApi.update(documentId.value, payload)
      if (targetStatus === 'published' && form.value.status !== 'published') await downloadApi.publish(documentId.value)
    } else {
      const created = await downloadApi.create(payload)
      if (targetStatus === 'published' && created?.documentId) await downloadApi.publish(created.documentId)
    }
    uni.showToast({ title: targetStatus === 'published' ? '发布成功' : '已保存草稿', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
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
.form-input { width: 100%; height: 72rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.picker-display { display: flex; align-items: center; line-height: 72rpx; }
.form-textarea { width: 100%; min-height: 160rpx; padding: 20rpx; background: #f5f5f5; border-radius: 8rpx; font-size: 28rpx; box-sizing: border-box; }
.form-row { display: flex; justify-content: space-between; align-items: center; }
</style>
```

- [ ] **Step 3: Commit**

```bash
cd e:\code\basic
git add web/pages/website/download/list.vue web/pages/website/download/edit.vue
git commit -m "feat(web): download list+edit 页面 + 12 页面全部完成"
```

---

## 自我审查

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task | 状态 |
|---|---|---|
| §3.1 product | Task 1 | ✅ |
| §3.2 case | Task 2 | ✅ |
| §3.3 faq | Task 3 | ✅ |
| §3.4 tutorial | Task 4 | ✅ |
| §3.5 compliance | Task 5 | ✅ |
| §3.6 download | Task 6 | ✅ |
| §5 文件结构（12 .vue + pages.json） | 全部 Task | ✅ |
| §6 pages.json 12 条路由 | Task 1 Step 1 | ✅ |
| §11 验收标准（12 页面 + pages.json 语法） | Task 1 Step 4 + Task 6 | ✅ |

### 2. 占位符扫描

- 无 "TBD"、"TODO"
- 每个步骤都包含完整 .vue 代码
- 每个 CT 的特有字段准确对应 schema

### 3. 类型一致性

| CT | list 主字段 | edit 主字段 | API 资源名 |
|---|---|---|---|
| product | name | name | products |
| case | title | title | cases |
| faq | question | question | faqs |
| tutorial | title | title | tutorials |
| compliance | title | title | compliances |
| download | name | name | downloads |

所有 API 资源名与 `src/api/website.js` 的 `createContentApi(resource)` 调用一致。

### 4. 已知风险

1. **json 字段编辑**：product 的 features/specifications/scenarios、case 的 results、tutorial 的 steps/materials 用 textarea + JSON.parse 校验，parse 失败时用 fallback 值
2. **download 的 file 必填**：edit 页面 handleSubmit 中校验 `if (!form.value.file)`
3. **compliance 的 category 枚举**：用 picker + categoryOptions，5 个固定值
4. **faq 无 coverImage**：edit 页面不显示封面图字段
5. **list 页面分页**：复用 article/list 的 prevPage/nextPage 模式

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-web-website-content-pages.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查，快速迭代

**2. Inline Execution** - 在当前会话中按序执行，批量执行 + 检查点审查

**Which approach?**

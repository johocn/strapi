# web 目录菜单路由修复 + 物流中心前端补全设计

## 目标

1. 修复 web 目录（e:\code\web）现有 3 个菜单路由问题
2. 从零补全物流中心前端（路由/页面/API/菜单/featureFlags）

## 范围

**改动目录**：仅 `e:\code\web`（uniapp 前端项目）

**不改动**：
- 后端代码（权限树 Phase 1 已完成，CT/路由已就绪）
- 其他缺失中心（理财/工作室，留待后续）

**参考模板**：website 中心（list+edit 配对模式 + createContentApi 工厂）

---

## 1. 现有问题修复

### 1.1 问题 1：`/pages/channel/permissions` 断链

**现状**：dashboard 第 418 行引用 `/pages/channel/permissions`，但 pages.json 未注册路由，且 `pages/channel/permissions.vue` 文件不存在。

**修复方向**：补全页面（后端已有 `menu.channel-permission` 权限和 user-channel CT）

**补全内容**：
- 新建 `pages/channel/permissions.vue` — 用户渠道权限管理页面
- pages.json 注册路由 `pages/channel/permissions`

### 1.2 问题 2：`third.account` 权限 key 不匹配

**现状**：dashboard 第 368 行 `hasPermission('third.account')`，但后端 PERMISSION_TREE 中 `menu.third` 下只有 `third-party-account.read/delete`，无 `third.account`。

**修复**：dashboard 中改为 `hasPermission('third-party-account.read')`

### 1.3 问题 3：`website` featureFlags 默认值缺失

**现状**：config-helper.js 的 `getDefaultConfig` featureFlags 有 `points: true` 但无 `website`。

**修复**：featureFlags 追加 `website: true`

---

## 2. 物流中心前端架构

### 2.1 API 模块（`src/api/logistics.js`）

参照 website.js 的 `createContentApi` 工厂模式，路径前缀 `/zhao-logistics/v1/admin`：

```js
import { get, post, put, del } from '../utils/request.js'
import { extractList, extractItem } from '../utils/format.js'

const ADMIN_BASE = '/zhao-logistics/v1/admin'

// 通用 CT 工厂
const createContentApi = (resource) => ({
  list: (params = {}) => get(`${ADMIN_BASE}/${resource}`, params).then(extractList),
  detail: (documentId) => get(`${ADMIN_BASE}/${resource}/${documentId}`).then(extractItem),
  create: (data) => post(`${ADMIN_BASE}/${resource}`, { data }).then(extractItem),
  update: (documentId, data) => put(`${ADMIN_BASE}/${resource}/${documentId}`, { data }).then(extractItem),
  delete: (documentId) => del(`${ADMIN_BASE}/${resource}/${documentId}`).then(extractItem),
})

// 16 个 CT 的 CRUD
export const quoteRequestApi = createContentApi('quote-requests')
export const quoteFieldRuleApi = createContentApi('quote-field-rules')
export const quotePriceRuleApi = createContentApi('quote-price-rules')
export const quotePriceFormulaApi = createContentApi('quote-price-formulas')
export const trackingShipmentApi = createContentApi('tracking-shipments')
export const trackingNodeApi = createContentApi('tracking-nodes')
export const trackingProviderApi = createContentApi('tracking-providers')
export const contactMatrixApi = createContentApi('contact-matrices')
export const reviewApi = createContentApi('reviews')
export const subscriptionApi = createContentApi('subscriptions')
export const landingPageApi = createContentApi('landing-pages')
export const conversionFunnelApi = createContentApi('conversion-funnels')
export const conversionEventApi = createContentApi('conversion-events')
export const intentOrderApi = createContentApi('intent-orders')
export const referralApi = createContentApi('referrals')
export const customerProfileApi = createContentApi('customer-profiles')

// 自定义操作端点（Plan 4 Task 4）
export const logisticsActionApi = {
  reviewApprove: (id) => post(`${ADMIN_BASE}/reviews/${id}/approve`),
  reviewReject: (id, reason) => post(`${ADMIN_BASE}/reviews/${id}/reject`, { data: { reason } }),
  reviewReply: (id, content) => post(`${ADMIN_BASE}/reviews/${id}/reply`, { data: { content } }),
  orderConvert: (id) => post(`${ADMIN_BASE}/intent-orders/${id}/convert`),
  profileMerge: (sourceId, targetId) => post(`${ADMIN_BASE}/customer-profiles/merge`, { data: { sourceId, targetId } }),
  funnelStats: (params) => get(`${ADMIN_BASE}/funnels/stats`, params),
  referralStats: (params) => get(`${ADMIN_BASE}/referrals/stats`, params),
}
```

### 2.2 页面结构（`pages/logistics/`）

参照 website 的 list + edit 配对模式，16 个 CT 各一对：

| 子目录 | CT | 页面 |
|---|---|---|
| quote-request/ | 询价单 | list.vue + edit.vue |
| quote-field-rule/ | 字段规则 | list.vue + edit.vue |
| quote-price-rule/ | 价格规则 | list.vue + edit.vue |
| quote-price-formula/ | 公式模板 | list.vue + edit.vue |
| tracking-shipment/ | 运单追踪 | list.vue + edit.vue |
| tracking-node/ | 追踪节点 | list.vue + edit.vue |
| tracking-provider/ | 服务商配置 | list.vue + edit.vue |
| contact-matrix/ | 联系矩阵 | list.vue + edit.vue |
| review/ | 客户评价 | list.vue + edit.vue |
| subscription/ | 订阅 | list.vue + edit.vue |
| landing-page/ | 落地页 | list.vue + edit.vue |
| conversion-funnel/ | 漏斗 | list.vue + edit.vue |
| conversion-event/ | 事件 | list.vue + edit.vue |
| intent-order/ | 意向订单 | list.vue + edit.vue |
| referral/ | 推荐 | list.vue + edit.vue |
| customer-profile/ | 客户档案 | list.vue + edit.vue |

共 32 个页面文件。

**页面模板**：
- list.vue：搜索栏 + 列表 + 分页 + 新建/编辑/删除按钮
- edit.vue：表单（按 schema.json 字段生成）+ 保存/取消
- 参照 `pages/website/article/list.vue` 和 `edit.vue` 的结构

### 2.3 路由注册（pages.json）

追加 32 条路由，格式参照 website：
```json
{ "path": "pages/logistics/quote-request/list", "style": { "navigationBarTitleText": "询价单管理" } },
{ "path": "pages/logistics/quote-request/edit", "style": { "navigationBarTitleText": "询价单编辑" } },
...
```

### 2.4 dashboard 菜单（module-section）

在系统设置 section 之前追加物流中心 section：

```vue
<!-- 物流中心 -->
<view class="module-section" v-if="logisticsEnabled && hasPermission('menu.logistics-center')">
  <view class="section-title">🚢 物流中心</view>
  <view class="module-grid">
    <view class="module-item" v-if="hasPermission('menu.logistics-quote')" @click="navigateTo('/pages/logistics/quote-request/list')">
      <view class="module-icon">📋</view><view class="module-name">询价单</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-quote-rule')" @click="navigateTo('/pages/logistics/quote-price-rule/list')">
      <view class="module-icon">💰</view><view class="module-name">报价规则</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-tracking')" @click="navigateTo('/pages/logistics/tracking-shipment/list')">
      <view class="module-icon">📦</view><view class="module-name">运单追踪</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-contact')" @click="navigateTo('/pages/logistics/contact-matrix/list')">
      <view class="module-icon">📞</view><view class="module-name">联系矩阵</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-review')" @click="navigateTo('/pages/logistics/review/list')">
      <view class="module-icon">⭐</view><view class="module-name">客户评价</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-subscription')" @click="navigateTo('/pages/logistics/subscription/list')">
      <view class="module-icon">🔔</view><view class="module-name">通知订阅</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-landing')" @click="navigateTo('/pages/logistics/landing-page/list')">
      <view class="module-icon">🎯</view><view class="module-name">营销落地页</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-order')" @click="navigateTo('/pages/logistics/intent-order/list')">
      <view class="module-icon">📝</view><view class="module-name">意向订单</view>
    </view>
    <view class="module-item" v-if="hasPermission('menu.logistics-customer')" @click="navigateTo('/pages/logistics/customer-profile/list')">
      <view class="module-icon">👥</view><view class="module-name">客户档案</view>
    </view>
  </view>
</view>
```

**权限 key 映射**（对齐后端 PERMISSION_TREE 的 menu.logistics-center 子菜单）：

| 菜单项 | 权限 key | navigateTo |
|---|---|---|
| 询价单 | `menu.logistics-quote` | /pages/logistics/quote-request/list |
| 报价规则 | `menu.logistics-quote-rule` | /pages/logistics/quote-price-rule/list |
| 运单追踪 | `menu.logistics-tracking` | /pages/logistics/tracking-shipment/list |
| 联系矩阵 | `menu.logistics-contact` | /pages/logistics/contact-matrix/list |
| 客户评价 | `menu.logistics-review` | /pages/logistics/review/list |
| 通知订阅 | `menu.logistics-subscription` | /pages/logistics/subscription/list |
| 营销落地页 | `menu.logistics-landing` | /pages/logistics/landing-page/list |
| 意向订单 | `menu.logistics-order` | /pages/logistics/intent-order/list |
| 客户档案 | `menu.logistics-customer` | /pages/logistics/customer-profile/list |

**注意**：实现时需读取 permissions.ts 确认 9 个子菜单 key 的准确名称，如有差异以 permissions.ts 为准。

### 2.5 featureFlags 补全

config-helper.js 的 `getDefaultConfig` featureFlags 追加：
```js
logistics: true,
website: true,  // 同时修复问题 3
```

dashboard 新增 ref：
```js
const logisticsEnabled = ref(true)
// onShow 中：
logisticsEnabled.value = config.featureFlags?.logistics !== false
```

---

## 3. 改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `src/api/logistics.js` | 新建 | API 封装（16 CT CRUD + 7 自定义端点）|
| `src/api/index.js` | 修改 | 追加 `export * from './logistics.js'` |
| `pages/logistics/*/list.vue` | 新建 | 16 个列表页 |
| `pages/logistics/*/edit.vue` | 新建 | 16 个编辑页 |
| `pages/channel/permissions.vue` | 新建 | 渠道权限管理页（修复问题 1）|
| `pages.json` | 修改 | 追加 32 物流路由 + 1 渠道权限路由 |
| `pages/dashboard/index.vue` | 修改 | 物流中心 section + 修复 third.account |
| `src/utils/config-helper.js` | 修改 | featureFlags 补 logistics + website |

共新建 35 文件，修改 4 文件。

---

## 4. 实现策略

### 4.1 页面模板复用

物流页面参照 website/article 的 list.vue + edit.vue 结构，主要差异：
- API 引用从 `articleApi` 改为 `quoteRequestApi` 等
- 字段表按各 CT 的 schema.json 生成
- 部分 CT 有特殊操作（review 的 approve/reject/reply，intent-order 的 convert）

### 4.2 实现顺序

1. 先修复 3 个现有问题（快速）
2. 创建 API 模块（logistics.js）
3. 创建页面文件（32 个，可批量生成）
4. 注册路由（pages.json）
5. 添加菜单（dashboard）
6. 补全 featureFlags（config-helper.js）
7. 验证

---

## Self-Review

### 1. Placeholder 扫描
- 权限 key 标注"实现时需读取 permissions.ts 确认" — 这是实现指引，不是 placeholder
- 页面模板"参照 website/article" — 有明确参考来源

### 2. 内部一致性
- 16 CT × 2 页面 = 32 文件，与路由数一致
- 9 个菜单项对应后端 9 个子菜单（其余 7 个 CT 通过列表页内入口访问）
- featureFlags 补全与 dashboard ref 变量对应

### 3. 范围检查
- 改动集中在 e:\code\web，适合单个实施计划
- 35 新建 + 4 修改，工作量适中

### 4. 歧义检查
- 权限 key 命名有明确规则（对齐后端 PERMISSION_TREE）
- 页面结构有明确模板（website/article）

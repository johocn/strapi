# 官网中心可见性修复 + 租户配置增强 + 统计面板扩展 Design Spec

> **Date:** 2026-07-08
> **Status:** Approved (brainstorming)
> **Related:** `docs/superpowers/plans/2026-07-08-web-dashboard-website-visibility-fix.md`（前序计划，已实施但未解决根因）

## 1. 问题背景

用户反馈三个问题：

1. **官网中心仍未显示** — 前序计划已将 `onMounted` 改为 `onShow`，但 admin 登录后 dashboard 仍看不到"🌐 官网中心"区域
2. **租户编辑报错** — `http://localhost:5174/#/pages/tenant/detail?documentId=...&mode=edit` 页面编译错误
3. **需求增强** — 租户配置需增加官网功能开关；统计面板需增加官网统计数据；菜单显示需根据租户配置 + 用户权限双重决定

## 2. 根因分析

### 2.1 官网中心不显示的根因

后端 `config.ts` 服务层返回的 `featureFlags` 只有 7 个粗粒度开关（sso/points/quiz/course/channel/thirdParty/oss），**缺少 `website` 字段**。

- `site-config/schema.json` 第 77-88 行：featureFlags 默认值无 `website`
- `services/config.ts` 第 406-414 行：`result.featureFlags` 不含 `website`
- `services/config.ts` 第 273-275 行：默认配置无 `website`

dashboard 官网中心 section 只判断 `hasPermission('menu.website-center')`，未判断配置开关。虽然权限同步正常，但由于前端 `loadSiteConfig` 返回的 featureFlags 不含 website，且 dashboard 未做配置判断，导致官网中心在租户配置缺失时无法正确控制显示。

**注意：** 前序计划已修复 `onMounted → onShow`，权限刷新机制正常。本次需补充配置层面的支持。

### 2.2 租户编辑报错的根因

`web/pages/tenant/detail.vue` 第 813 行：

```js
function toggleChannelUsage(e: any) {
```

`<script setup>` 未声明 `lang="ts"`，但使用了 TypeScript 类型注解 `e: any`，导致编译错误。

### 2.3 功能开关不完整

`tenant/detail.vue` 第 489-497 行 `featureLabels` 只有 7 项，缺少 `website`。新建/编辑租户时无法配置官网开关。

### 2.4 统计面板无官网数据

`dashboard/index.vue` `loadStats` 函数只加载 channels/courses/questions/points/students/completedCourses，无任何官网相关统计。

## 3. 设计方案

### 3.1 方案选择

**方案 A：全栈同步改造（已选定）**

覆盖后端 schema + 后端 config 服务 + 前端租户配置 + 前端 dashboard + 修复租户编辑报错，与现有 `pointsEnabled` 模式完全一致。

### 3.2 官网功能开关粒度

**单总开关**：只增加 1 个 `website` 字段，与现有 points/quiz/course 同级。官网中心整块区域按此开关 + 权限双重判断显示。子菜单（文章/产品/案例等）仍只按权限控制。

### 3.3 统计面板范围

增加 4 个官网核心统计卡：文章数 / 产品数 / 案例数 / 线索数。用现有 `articleApi/productApi/caseApi/leadApi` 的 list 接口取 total。

## 4. 改动清单

### 4.1 后端（2 个文件）

#### 文件 1：`basic/plugins/zhao-common/server/src/content-types/site-config/schema.json`

**位置：** 第 77-88 行 `featureFlags.default`

**改动：** 增加 `"website": true`

```json
"featureFlags": {
  "type": "json",
  "default": {
    "sso": false,
    "points": true,
    "quiz": true,
    "course": true,
    "channel": true,
    "thirdParty": true,
    "oss": false,
    "website": true
  }
}
```

#### 文件 2：`basic/plugins/zhao-common/server/src/services/config.ts`

**改动 1（第 273-275 行）：** 默认配置 featureFlags 增加 `website: true`

```ts
featureFlags: {
  sso: false, points: true, quiz: true, course: true,
  channel: true, thirdParty: true, oss: false, website: true,
```

**改动 2（第 414 行后）：** `result.featureFlags` 增加 website 字段

```ts
oss: siteFeatureFlags.oss ?? false,
website: siteFeatureFlags.website ?? true,
```

**说明：** 老租户 featureFlags 无 website key 时 `?? true` 兜底为 true，无需数据库迁移。

### 4.2 前端租户配置页（1 个文件）

#### 文件 3：`web/pages/tenant/detail.vue`

**改动 1（第 813 行）：** 修复 TypeScript 语法错误

```js
// 修改前
function toggleChannelUsage(e: any) {

// 修改后
function toggleChannelUsage(e) {
```

**改动 2（第 489-497 行）：** featureLabels 增加 website

```js
const featureLabels = {
  sso: 'SSO登录',
  points: '积分系统',
  quiz: '题库管理',
  course: '课程管理',
  channel: '渠道管理',
  thirdParty: '三方登录',
  oss: 'OSS存储',
  website: '企业官网'
}
```

**改动 3（第 606-614 行）：** formData.featureFlags 默认值增加 website

```js
featureFlags: {
  sso: false,
  points: true,
  quiz: true,
  course: true,
  channel: true,
  thirdParty: true,
  oss: false,
  website: true
},
```

### 4.3 前端 Dashboard（1 个文件）

#### 文件 4：`web/pages/dashboard/index.vue`

**改动 1：** 官网中心 section 增加配置开关判断

```vue
<!-- 修改前 -->
<view class="module-section" v-if="hasPermission('menu.website-center')">

<!-- 修改后 -->
<view class="module-section" v-if="websiteEnabled && hasPermission('menu.website-center')">
```

**改动 2（第 424 行后）：** 新增 websiteEnabled 状态

```js
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
```

**改动 3（第 512 行后）：** onShow 中读取 website 开关

```js
if (config) {
  pointsEnabled.value = config.featureFlags?.points !== false
  websiteEnabled.value = config.featureFlags?.website !== false
}
```

**改动 4（第 58 行后）：** 统计面板增加 4 个官网统计卡

```vue
<view class="stat-card" v-if="websiteEnabled" @click="navigateTo('/pages/website/article/list')">
  <view class="stat-icon" style="background: #ede7f6;">📄</view>
  <view class="stat-info">
    <view class="stat-value">{{ stats.articles }}</view>
    <view class="stat-label">资讯文章</view>
  </view>
</view>

<view class="stat-card" v-if="websiteEnabled" @click="navigateTo('/pages/website/product/list')">
  <view class="stat-icon" style="background: #e8eaf6;">📦</view>
  <view class="stat-info">
    <view class="stat-value">{{ stats.products }}</view>
    <view class="stat-label">产品方案</view>
  </view>
</view>

<view class="stat-card" v-if="websiteEnabled" @click="navigateTo('/pages/website/case/list')">
  <view class="stat-icon" style="background: #e0f7fa;">🏆</view>
  <view class="stat-info">
    <view class="stat-value">{{ stats.cases }}</view>
    <view class="stat-label">落地案例</view>
  </view>
</view>

<view class="stat-card" v-if="websiteEnabled" @click="navigateTo('/pages/website/lead/list')">
  <view class="stat-icon" style="background: #fce4ec;">📝</view>
  <view class="stat-info">
    <view class="stat-value">{{ stats.leads }}</view>
    <view class="stat-label">线索管理</view>
  </view>
</view>
```

**改动 5（第 421 行）：** stats 对象增加官网字段

```js
const stats = ref({ channels: 0, courses: 0, questions: 0, points: 0, students: 0, completedCourses: 0, articles: 0, products: 0, cases: 0, leads: 0 })
```

**改动 6（第 417 行后）：** import 官网 API

```js
import { loadSiteConfig } from '../../src/utils/config-helper.js'
import { articleApi, productApi, caseApi, leadApi } from '../../src/api/website.js'
```

**改动 7（第 460-467 行）：** loadStats Promise.all 增加官网 API

```js
const [channels, courses, questions, points, userCourses, courseProgress, articles, products, cases, leads] = await Promise.all([
  getAdminChannelList().catch(() => ({ pagination: { total: 0 }, list: [] })),
  getCourseList({ 'pagination[pageSize]': 100, 'fields': ['status'] }).catch(() => ({ pagination: { total: 0 }, list: [] })),
  getQuestionList().catch(() => ({ pagination: { total: 0 }, list: [] })),
  getRecordList().catch(() => ({ list: [], pagination: { total: 0 } })),
  getUserCourseList().catch(() => ({ pagination: { total: 0 }, list: [] })),
  getCourseProgressList({ 'pagination[pageSize]': 5, 'pagination[sort]': 'updatedAt:desc' }).catch(() => ({ pagination: { total: 0 }, list: [] })),
  articleApi.list({ 'pagination[pageSize]': 1 }).catch(() => ({ pagination: { total: 0 } })),
  productApi.list({ 'pagination[pageSize]': 1 }).catch(() => ({ pagination: { total: 0 } })),
  caseApi.list({ 'pagination[pageSize]': 1 }).catch(() => ({ pagination: { total: 0 } })),
  leadApi.list({ 'pagination[pageSize]': 1 }).catch(() => ({ pagination: { total: 0 } }))
])
```

**改动 8（第 488-495 行）：** stats.value 赋值增加官网字段

```js
stats.value = {
  channels: getTotal(channels),
  courses: getTotal(courses),
  questions: getTotal(questions),
  points: getTotal(points),
  students: getTotal(userCourses),
  completedCourses: completedCount,
  articles: getTotal(articles),
  products: getTotal(products),
  cases: getTotal(cases),
  leads: getTotal(leads)
}
```

## 5. 架构约束

### 5.1 双重判断模式

官网中心 section 显示条件：`websiteEnabled && hasPermission('menu.website-center')`

- `websiteEnabled`：来自 `loadSiteConfig().featureFlags.website`，租户级配置
- `hasPermission`：来自 zhao-auth 权限体系，用户角色级权限

与现有 `pointsEnabled && hasPermission('menu.point-center')` 模式完全一致（dashboard 第 228 行）。

### 5.2 配置兜底策略

- 后端 `siteFeatureFlags.website ?? true`：老租户配置无 website 字段时默认开启
- 前端 `config.featureFlags?.website !== false`：配置未加载或无字段时默认显示，仅在显式 `false` 时隐藏

### 5.3 无需数据库迁移

`featureFlags` 是 JSON 字段，老数据无 website key 时由 `?? true` 兜底，无需写迁移脚本。

## 6. 验收标准

- [ ] 租户编辑页 `http://localhost:5174/#/pages/tenant/detail?documentId=...&mode=edit` 不再报错
- [ ] 租户配置页"功能开关"区域显示"企业官网"选项
- [ ] 新建租户默认开启"企业官网"
- [ ] admin 登录后 dashboard 显示"🌐 官网中心"区域及 18 个菜单项
- [ ] 官网中心显示在课程中心之前
- [ ] dashboard 统计面板显示 4 个官网统计卡（文章/产品/案例/线索）
- [ ] 租户配置关闭"企业官网"后，dashboard 官网中心区域和 4 个统计卡均隐藏
- [ ] 从其他页面返回 dashboard，权限和配置重新刷新（onShow 触发）

## 7. 改动文件清单

| # | 文件 | 类型 | 改动数 |
|---|---|---|---|
| 1 | `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json` | 后端 | 1 处 |
| 2 | `basic/plugins/zhao-common/server/src/services/config.ts` | 后端 | 2 处 |
| 3 | `web/pages/tenant/detail.vue` | 前端 | 3 处 |
| 4 | `web/pages/dashboard/index.vue` | 前端 | 8 处 |

**总计：** 4 个文件，14 处改动

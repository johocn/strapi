# 官网中心可见性修复 + 租户配置增强 + 统计面板扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复官网中心不显示问题（后端补 website featureFlag + 前端双重判断），修复租户编辑页 TypeScript 报错，租户配置增加官网开关，dashboard 统计面板增加 4 个官网统计卡。

**Architecture:** 后端 schema.json 与 config.ts 服务层同步增加 `website` 字段（`?? true` 兜底老数据）；前端 tenant/detail.vue 补全 featureLabels 与默认值、修复 `e: any` 语法错误；前端 dashboard 引入 `websiteEnabled` 状态，官网中心 section 改为 `websiteEnabled && hasPermission` 双重判断（与现有 `pointsEnabled` 模式一致），统计面板增加 4 个官网 API 调用。

**Tech Stack:** Strapi v5 plugin (zhao-common) + uni-app + Vue 3 (`<script setup>`)

**Spec:** `docs/superpowers/specs/2026-07-08-website-center-tenant-config-stats-design.md`

---

## File Structure

**修改 4 个文件：**

| # | 文件 | 责任 | 改动数 |
|---|---|---|---|
| 1 | `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json` | CT schema 默认值 | 1 处 |
| 2 | `basic/plugins/zhao-common/server/src/services/config.ts` | 公开配置服务层 | 2 处 |
| 3 | `web/pages/tenant/detail.vue` | 租户配置页 | 3 处 |
| 4 | `web/pages/dashboard/index.vue` | Dashboard 页 | 8 处 |

**关键边界确认（修改前）：**
- `schema.json` 第 77-88 行：featureFlags default 对象
- `config.ts` 第 273-275 行：默认配置 featureFlags
- `config.ts` 第 406-414 行：result.featureFlags 赋值
- `tenant/detail.vue` 第 489-497 行：featureLabels
- `tenant/detail.vue` 第 606-614 行：formData.featureFlags
- `tenant/detail.vue` 第 813 行：toggleChannelUsage 函数签名
- `dashboard/index.vue` 第 58 行：stats-grid 第二行卡片闭合
- `dashboard/index.vue` 第 417 行：loadSiteConfig import
- `dashboard/index.vue` 第 421 行：stats ref 定义
- `dashboard/index.vue` 第 424 行：pointsEnabled ref
- `dashboard/index.vue` 第 460-467 行：Promise.all 数组
- `dashboard/index.vue` 第 488-495 行：stats.value 赋值
- `dashboard/index.vue` 第 511-513 行：pointsEnabled 赋值
- `dashboard/index.vue` 官网中心 section 起始行：`v-if="hasPermission('menu.website-center')"`

---

## Task 1: 后端 schema.json 增加 website 默认值

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json:77-88`

- [ ] **Step 1: 读取 schema.json featureFlags 当前定义**

Read `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json` 第 75-90 行，确认 featureFlags 字段位置。

Expected:
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
        "oss": false
      }
    },
```

- [ ] **Step 2: 在 default 对象末尾增加 website: true**

Edit `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`：

old_string:
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
        "oss": false
      }
    },
```

new_string:
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
    },
```

- [ ] **Step 3: 验证 JSON 合法性**

Run:
```bash
cd e:\code\basic
node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-common/server/src/content-types/site-config/schema.json', 'utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-common/server/src/content-types/site-config/schema.json
git commit -m "feat(zhao-common): add website flag to site-config featureFlags default"
```

---

## Task 2: 后端 config.ts 服务层返回 website 字段

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/config.ts:273-275,406-414`

- [ ] **Step 1: 读取 config.ts 默认配置**

Read `e:\code\basic\plugins\zhao-common\server\src\services\config.ts` 第 270-280 行，确认默认 featureFlags 位置。

Expected:
```ts
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false,
```

- [ ] **Step 2: 修改默认配置增加 website: true**

Edit `e:\code\basic\plugins\zhao-common\server\src\services\config.ts`：

old_string:
```ts
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false,
```

new_string:
```ts
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false, website: true,
```

- [ ] **Step 3: 读取 result.featureFlags 赋值**

Read `e:\code\basic\plugins\zhao-common\server\src\services\config.ts` 第 405-415 行，确认 result.featureFlags 赋值位置。

Expected:
```ts
      result.featureFlags = {
        // 粗粒度模块总开关（从 site-config.featureFlags 列读取）
        sso: siteFeatureFlags.sso ?? false,
        points: siteFeatureFlags.points ?? true,
        quiz: siteFeatureFlags.quiz ?? true,
        course: siteFeatureFlags.course ?? true,
        channel: siteFeatureFlags.channel ?? true,
        thirdParty: siteFeatureFlags.thirdParty ?? true,
        oss: siteFeatureFlags.oss ?? false,
```

- [ ] **Step 4: 在 oss 行后增加 website 字段**

Edit `e:\code\basic\plugins\zhao-common\server\src\services\config.ts`：

old_string:
```ts
        oss: siteFeatureFlags.oss ?? false,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
```

new_string:
```ts
        oss: siteFeatureFlags.oss ?? false,
        website: siteFeatureFlags.website ?? true,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
```

- [ ] **Step 5: 验证 TypeScript 语法**

Run:
```bash
cd e:\code\basic\plugins\zhao-common
npx tsc --noEmit server/src/services/config.ts 2>&1 | head -20
```

Expected: 无错误输出（或仅有与其他文件相关的错误，本文件无错）

- [ ] **Step 6: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-common/server/src/services/config.ts
git commit -m "feat(zhao-common): return website flag in public config featureFlags"
```

---

## Task 3: 修复租户编辑页 TypeScript 语法错误

**Files:**
- Modify: `web/pages/tenant/detail.vue:813`

- [ ] **Step 1: 读取 toggleChannelUsage 函数**

Read `e:\code\web\pages\tenant\detail.vue` 第 810-820 行，确认函数签名。

Expected:
```js
function toggleChannelUsage(e: any) {
  formData.channelUsage = e.detail.value ? 'site_cross_user' : 'site_only'
}
```

- [ ] **Step 2: 移除 TypeScript 类型注解**

Edit `e:\code\web\pages\tenant\detail.vue`：

old_string:
```js
function toggleChannelUsage(e: any) {
```

new_string:
```js
function toggleChannelUsage(e) {
```

- [ ] **Step 3: 验证无其他 TypeScript 注解**

Run Grep 搜索 `web/pages/tenant/detail.vue` 中其他 `: any` 或 `: string` 或 `: number` 类型注解：

```
Grep pattern: ": (any|string|number|boolean)\\b"
path: e:\code\web\pages\tenant\detail.vue
output_mode: content
-n: true
```

Expected: No matches found

- [ ] **Step 4: Commit**

```bash
cd e:\code\web
git add pages/tenant/detail.vue
git commit -m "fix(web): remove TypeScript annotation in tenant detail script setup"
```

---

## Task 4: 租户配置页增加 website 功能开关

**Files:**
- Modify: `web/pages/tenant/detail.vue:489-497,606-614`

- [ ] **Step 1: 读取 featureLabels 当前定义**

Read `e:\code\web\pages\tenant\detail.vue` 第 489-498 行，确认 featureLabels 对象。

Expected:
```js
const featureLabels = {
  sso: 'SSO登录',
  points: '积分系统',
  quiz: '题库管理',
  course: '课程管理',
  channel: '渠道管理',
  thirdParty: '三方登录',
  oss: 'OSS存储'
}
```

- [ ] **Step 2: featureLabels 增加 website 项**

Edit `e:\code\web\pages\tenant\detail.vue`：

old_string:
```js
const featureLabels = {
  sso: 'SSO登录',
  points: '积分系统',
  quiz: '题库管理',
  course: '课程管理',
  channel: '渠道管理',
  thirdParty: '三方登录',
  oss: 'OSS存储'
}
```

new_string:
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

- [ ] **Step 3: 读取 formData.featureFlags 默认值**

Read `e:\code\web\pages\tenant\detail.vue` 第 605-615 行，确认 formData.featureFlags 默认值。

Expected:
```js
  featureFlags: {
    sso: false,
    points: true,
    quiz: true,
    course: true,
    channel: true,
    thirdParty: true,
    oss: false
  },
```

- [ ] **Step 4: formData.featureFlags 默认值增加 website: true**

Edit `e:\code\web\pages\tenant\detail.vue`：

old_string:
```js
  featureFlags: {
    sso: false,
    points: true,
    quiz: true,
    course: true,
    channel: true,
    thirdParty: true,
    oss: false
  },
```

new_string:
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

- [ ] **Step 5: Commit**

```bash
cd e:\code\web
git add pages/tenant/detail.vue
git commit -m "feat(web): add website toggle to tenant config feature labels and defaults"
```

---

## Task 5: Dashboard 增加 websiteEnabled 状态与配置读取

**Files:**
- Modify: `web/pages/dashboard/index.vue:417,421,424,511-513`

- [ ] **Step 1: 读取 dashboard script 区域顶部**

Read `e:\code\web\pages\dashboard\index.vue` 第 415-426 行，确认 import 与 ref 定义。

Expected:
```js
import { loadSiteConfig } from '../../src/utils/config-helper.js'

const userStore = useUserStore()
const hasPermission = userStore.hasPermission
const stats = ref({ channels: 0, courses: 0, questions: 0, points: 0, students: 0, completedCourses: 0 })
const courseStatusMap = ref({})
const recentProgress = ref([])
const pointsEnabled = ref(true)
```

- [ ] **Step 2: import 官网 API**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
import { loadSiteConfig } from '../../src/utils/config-helper.js'
```

new_string:
```js
import { loadSiteConfig } from '../../src/utils/config-helper.js'
import { articleApi, productApi, caseApi, leadApi } from '../../src/api/website.js'
```

- [ ] **Step 3: stats 对象增加官网字段**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
const stats = ref({ channels: 0, courses: 0, questions: 0, points: 0, students: 0, completedCourses: 0 })
```

new_string:
```js
const stats = ref({ channels: 0, courses: 0, questions: 0, points: 0, students: 0, completedCourses: 0, articles: 0, products: 0, cases: 0, leads: 0 })
```

- [ ] **Step 4: 新增 websiteEnabled 状态**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
const pointsEnabled = ref(true)
```

new_string:
```js
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
```

- [ ] **Step 5: 读取 onShow 配置加载逻辑**

Read `e:\code\web\pages\dashboard\index.vue` 第 508-516 行，确认 pointsEnabled 赋值位置。

Expected:
```js
    try {
      const config = await loadSiteConfig()
      if (config) {
        pointsEnabled.value = config.featureFlags?.points !== false
      }
    } catch {}
```

- [ ] **Step 6: onShow 中增加 websiteEnabled 赋值**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
      if (config) {
        pointsEnabled.value = config.featureFlags?.points !== false
      }
```

new_string:
```js
      if (config) {
        pointsEnabled.value = config.featureFlags?.points !== false
        websiteEnabled.value = config.featureFlags?.website !== false
      }
```

- [ ] **Step 7: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): add websiteEnabled state and load from siteConfig in dashboard"
```

---

## Task 6: Dashboard 官网中心 section 双重判断

**Files:**
- Modify: `web/pages/dashboard/index.vue` (官网中心 section 起始行)

- [ ] **Step 1: 定位官网中心 section**

Grep 搜索官网中心 section 起始：

```
Grep pattern: "menu.website-center"
path: e:\code\web\pages\dashboard\index.vue
output_mode: content
-n: true
-B: 1
```

Expected: 找到 `v-if="hasPermission('menu.website-center')"` 所在行号

- [ ] **Step 2: 读取官网中心 section 起始行**

Read 上一步返回的行号附近 3 行，确认 v-if 表达式。

Expected:
```vue
    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
```

- [ ] **Step 3: 增加 websiteEnabled 双重判断**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```vue
    <!-- 官网中心 -->
    <view class="module-section" v-if="hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
```

new_string:
```vue
    <!-- 官网中心 -->
    <view class="module-section" v-if="websiteEnabled && hasPermission('menu.website-center')">
      <view class="section-title">🌐 官网中心</view>
```

- [ ] **Step 4: 验证修改**

Grep 搜索确认双重判断：

```
Grep pattern: "websiteEnabled && hasPermission"
path: e:\code\web\pages\dashboard\index.vue
output_mode: content
-n: true
```

Expected: 至少 1 处匹配

- [ ] **Step 5: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): apply websiteEnabled gate to website-center section in dashboard"
```

---

## Task 7: Dashboard 统计面板增加官网统计卡

**Files:**
- Modify: `web/pages/dashboard/index.vue:11-59`

- [ ] **Step 1: 读取 stats-grid 末尾**

Read `e:\code\web\pages\dashboard\index.vue` 第 50-60 行，确认最后一个 stat-card 闭合位置。

Expected:
```vue
      <view class="stat-card" @click="navigateTo('/pages/study/progress')">
        <view class="stat-icon" style="background: #e8eaf6;">✅</view>
        <view class="stat-info">
          <view class="stat-value">{{ stats.completedCourses }}</view>
          <view class="stat-label">课程完成数</view>
        </view>
      </view>
    </view>
```

- [ ] **Step 2: 在课程完成数卡片后插入 4 个官网统计卡**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```vue
      <view class="stat-card" @click="navigateTo('/pages/study/progress')">
        <view class="stat-icon" style="background: #e8eaf6;">✅</view>
        <view class="stat-info">
          <view class="stat-value">{{ stats.completedCourses }}</view>
          <view class="stat-label">课程完成数</view>
        </view>
      </view>
    </view>
```

new_string:
```vue
      <view class="stat-card" @click="navigateTo('/pages/study/progress')">
        <view class="stat-icon" style="background: #e8eaf6;">✅</view>
        <view class="stat-info">
          <view class="stat-value">{{ stats.completedCourses }}</view>
          <view class="stat-label">课程完成数</view>
        </view>
      </view>

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
    </view>
```

- [ ] **Step 3: 验证统计卡数量**

Grep 搜索 stat-card 总数：

```
Grep pattern: "stat-card"
path: e:\code\web\pages\dashboard\index.vue
output_mode: count
```

Expected: 至少 10 处（原 6 个 + 4 个官网）

- [ ] **Step 4: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): add 4 website stat cards to dashboard stats grid"
```

---

## Task 8: Dashboard loadStats 增加官网 API 调用

**Files:**
- Modify: `web/pages/dashboard/index.vue:460-467,488-495`

- [ ] **Step 1: 读取 loadStats Promise.all 数组**

Read `e:\code\web\pages\dashboard\index.vue` 第 458-470 行，确认 Promise.all 数组。

Expected:
```js
    const [channels, courses, questions, points, userCourses, courseProgress] = await Promise.all([
      getAdminChannelList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getCourseList({ 'pagination[pageSize]': 100, 'fields': ['status'] }).catch(() => ({ pagination: { total: 0 }, list: [] })),
      getQuestionList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getRecordList().catch(() => ({ list: [], pagination: { total: 0 } })),
      getUserCourseList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getCourseProgressList({ 'pagination[pageSize]': 5, 'pagination[sort]': 'updatedAt:desc' }).catch(() => ({ pagination: { total: 0 }, list: [] }))
    ])
```

- [ ] **Step 2: Promise.all 增加 4 个官网 API 调用**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
    const [channels, courses, questions, points, userCourses, courseProgress] = await Promise.all([
      getAdminChannelList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getCourseList({ 'pagination[pageSize]': 100, 'fields': ['status'] }).catch(() => ({ pagination: { total: 0 }, list: [] })),
      getQuestionList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getRecordList().catch(() => ({ list: [], pagination: { total: 0 } })),
      getUserCourseList().catch(() => ({ pagination: { total: 0 }, list: [] })),
      getCourseProgressList({ 'pagination[pageSize]': 5, 'pagination[sort]': 'updatedAt:desc' }).catch(() => ({ pagination: { total: 0 }, list: [] }))
    ])
```

new_string:
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

- [ ] **Step 3: 读取 stats.value 赋值**

Read `e:\code\web\pages\dashboard\index.vue` 第 486-498 行，确认 stats.value 赋值。

Expected:
```js
    stats.value = {
      channels: getTotal(channels),
      courses: getTotal(courses),
      questions: getTotal(questions),
      points: getTotal(points),
      students: getTotal(userCourses),
      completedCourses: completedCount
    }
```

- [ ] **Step 4: stats.value 赋值增加官网字段**

Edit `e:\code\web\pages\dashboard\index.vue`：

old_string:
```js
    stats.value = {
      channels: getTotal(channels),
      courses: getTotal(courses),
      questions: getTotal(questions),
      points: getTotal(points),
      students: getTotal(userCourses),
      completedCourses: completedCount
    }
```

new_string:
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

- [ ] **Step 5: Commit**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "feat(web): fetch website article/product/case/lead totals in dashboard loadStats"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Spec 4.1 文件 1（schema.json website 默认值）：Task 1
- ✅ Spec 4.1 文件 2（config.ts 默认配置 + result.featureFlags）：Task 2
- ✅ Spec 4.2 文件 3 改动 1（修复 TypeScript 语法错误）：Task 3
- ✅ Spec 4.2 文件 3 改动 2-3（featureLabels + formData 默认值）：Task 4
- ✅ Spec 4.3 文件 4 改动 1-3（官网中心双重判断 + websiteEnabled + onShow 读取）：Task 5 + Task 6
- ✅ Spec 4.3 文件 4 改动 4（4 个官网统计卡）：Task 7
- ✅ Spec 4.3 文件 4 改动 5-8（stats 字段 + import + Promise.all + stats.value）：Task 5 Step 2-3 + Task 8
- ✅ Spec 6 验收标准"租户编辑不报错"：Task 3
- ✅ Spec 6 验收标准"功能开关显示企业官网"：Task 4
- ✅ Spec 6 验收标准"dashboard 显示官网中心"：Task 5 + Task 6
- ✅ Spec 6 验收标准"统计面板显示 4 个官网卡"：Task 7 + Task 8
- ✅ Spec 6 验收标准"关闭官网后隐藏"：Task 6 (section) + Task 7 (stat-card v-if)

**2. Placeholder scan:** 无 TBD/TODO，所有代码完整

**3. Type consistency:**
- `websiteEnabled` ref：Task 5 Step 4 定义，Task 5 Step 6 赋值，Task 6 Step 3 使用 — 一致
- `stats` 对象字段：Task 5 Step 3 增加 articles/products/cases/leads，Task 7 模板引用 stats.articles 等，Task 8 Step 4 赋值 — 一致
- Promise.all 解构变量名：Task 8 Step 2 解构为 articles/products/cases/leads，Step 4 使用 getTotal(articles) 等 — 一致
- import 语句：Task 5 Step 2 引入 articleApi/productApi/caseApi/leadApi，Task 8 Step 2 使用 — 一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-website-center-tenant-config-stats.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查

**2. Inline Execution** - 当前会话批量执行，含 checkpoint 审查

# 多租户粗粒度设置与跨渠道发布控制 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复访问策略详情层 bug、补全 featureFlags、修复 dashboard ref bug、新增 allowCrossChannelPublish 发布侧开关并联动课程表单。

**Architecture:** 后端改 2 个插件（zhao-course 控制器 + zhao-common schema/service），前端改 5 个文件（dashboard ref、config-helper 默认值、设置页面开关、课程表单 × 2）。无单元测试框架，采用「改代码→构建 dist→手动验证」流程。

**Tech Stack:** Strapi v5 插件（TypeScript）、UniApp Vue3 H5、zhao-common config service

**Spec:** [docs/superpowers/specs/2026-07-10-cross-channel-publish-design.md](file:///e:/code/basic/docs/superpowers/specs/2026-07-10-cross-channel-publish-design.md)

---

## 文件结构

| 文件 | 操作 | 责任 |
|---|---|---|
| `plugins/zhao-course/server/src/controllers/course.ts` | 修改第 82 行 | `checkCourseAccess` 加 `crossChannelEnabled` 条件 |
| `plugins/zhao-common/server/src/content-types/site-config/schema.json` | 修改第 85-88 行 | featureFlags default 补 logistics/studio |
| `plugins/zhao-common/server/src/services/config.ts` | 修改第 274-275 行 + 第 415 行 + 第 422 行后 | 兜底补 logistics/studio + 输出补 logistics/studio + 读取 allowCrossChannelPublish |
| `web/pages/dashboard/index.vue` | 修改第 618-620 行 | 补 studioEnabled/ssoEnabled ref 声明 |
| `web/src/utils/config-helper.js` | 修改第 79 行后 + 第 122 行前 | featureFlags 补 allowCrossChannelPublish + FEATURE_TO_MODULE 映射 |
| `web/pages/settings/site-config.vue` | 修改第 209 行后 + 第 503 行后 | 渠道配置区增加开关 + form 默认值 |
| `web/pages/course/form.vue` | 修改第 226 行 + 第 252 行 + 第 467 行 + 第 475 行后 | 联动 allowCrossChannelPublish |
| `web/pages/course/category/form.vue` | 修改第 46 行 + 第 64 行 + 第 106 行 + 第 117 行 + 第 126 行 | 补 feature flag 集成 + 联动 |
| `plugins/zhao-course/dist/` | 构建 | `npx strapi-plugin build` |
| `plugins/zhao-common/dist/` | 构建 | `npx strapi-plugin build` |

---

## Task 1: 后端访问策略修复

**Files:**
- Modify: `plugins/zhao-course/server/src/controllers/course.ts:82`

- [ ] **Step 1: 修复 checkCourseAccess 第 82 行**

用 Edit 工具，将：

```ts
      // 允许跨渠道访问的课程无需权限检查
      if (ch.channelScope === "specific" && ch.allowCrossChannel === true) {
        return true;
      }
```

替换为：

```ts
      // 允许跨渠道访问的课程无需权限检查（需跨渠道功能开启时才生效，与列表层逻辑对齐）
      const crossChannelEnabled = ctx.state.crossChannelEnabled !== false;
      if (crossChannelEnabled && ch.channelScope === "specific" && ch.allowCrossChannel === true) {
        return true;
      }
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-course/server/src/controllers/course.ts
git commit -m "fix(zhao-course): checkCourseAccess 补 crossChannelEnabled 条件，修复 site_only 模式详情层放行 bug"
```

---

## Task 2: 后端 featureFlags 补全

**Files:**
- Modify: `plugins/zhao-common/server/src/content-types/site-config/schema.json:85-88`
- Modify: `plugins/zhao-common/server/src/services/config.ts:274-275` + `415` + `422`

- [ ] **Step 1: schema.json featureFlags default 补 logistics/studio**

用 Edit 工具，将：

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

替换为：

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
        "website": true,
        "logistics": true,
        "studio": true
      }
    }
```

- [ ] **Step 2: config.ts 兜底 featureFlags 补 logistics/studio（第 274-275 行）**

用 Edit 工具，将：

```ts
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false, website: true,
```

替换为：

```ts
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false, website: true,
            logistics: true, studio: true,
```

- [ ] **Step 3: config.ts getPublicConfig 粗粒度开关输出补 logistics/studio（第 415 行后）**

用 Edit 工具，将：

```ts
        oss: siteFeatureFlags.oss ?? false,
        website: siteFeatureFlags.website ?? true,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
```

替换为：

```ts
        oss: siteFeatureFlags.oss ?? false,
        website: siteFeatureFlags.website ?? true,
        logistics: siteFeatureFlags.logistics ?? true,
        studio: siteFeatureFlags.studio ?? true,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
```

- [ ] **Step 4: config.ts getPublicConfig 细粒度开关补 allowCrossChannelPublish（第 422 行后）**

用 Edit 工具，将：

```ts
        allowCrossChannel: ec.allowCrossChannel ?? false,
        redemptionEnabled: ec.redemptionEnabled ?? true,
```

替换为：

```ts
        allowCrossChannel: ec.allowCrossChannel ?? false,
        allowCrossChannelPublish: ec.allowCrossChannelPublish ?? false,
        redemptionEnabled: ec.redemptionEnabled ?? true,
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-common/server/src/content-types/site-config/schema.json plugins/zhao-common/server/src/services/config.ts
git commit -m "feat(zhao-common): featureFlags 补 logistics/studio，新增 allowCrossChannelPublish 读取"
```

---

## Task 3: 前端 dashboard ref bug 修复

**Files:**
- Modify: `web/pages/dashboard/index.vue:618-620`

- [ ] **Step 1: 补 studioEnabled 和 ssoEnabled ref 声明**

用 Edit 工具，将：

```js
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
const logisticsEnabled = ref(true)
```

替换为：

```js
const pointsEnabled = ref(true)
const websiteEnabled = ref(true)
const logisticsEnabled = ref(true)
const studioEnabled = ref(true)
const ssoEnabled = ref(true)
```

- [ ] **Step 2: 提交**

```bash
cd e:\code\web
git add pages/dashboard/index.vue
git commit -m "fix(web): 补 studioEnabled/ssoEnabled ref 声明，修复媒体发布中心与 SSO 区块不显示"
```

---

## Task 4: 前端 config-helper.js 补 allowCrossChannelPublish

**Files:**
- Modify: `web/src/utils/config-helper.js:79` + `122`

- [ ] **Step 1: featureFlags 默认值补 allowCrossChannelPublish（第 79 行后）**

用 Edit 工具，将：

```js
      allowCrossChannel: false,
      redemptionEnabled: true,
```

替换为：

```js
      allowCrossChannel: false,
      allowCrossChannelPublish: false,
      redemptionEnabled: true,
```

- [ ] **Step 2: FEATURE_TO_MODULE 映射补 allowCrossChannelPublish（第 122 行前）**

用 Edit 工具，将：

```js
  paymentEnabled: 'points',
}
```

替换为：

```js
  paymentEnabled: 'points',
  allowCrossChannelPublish: 'channel',
}
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add src/utils/config-helper.js
git commit -m "feat(web): config-helper 补 allowCrossChannelPublish 默认值与模块映射"
```

---

## Task 5: 前端设置页面增加开关

**Files:**
- Modify: `web/pages/settings/site-config.vue:209` + `503`

- [ ] **Step 1: 渠道配置区增加"允许发布跨渠道课程"开关（第 209 行后）**

用 Edit 工具，将：

```html
        <view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannel')">
          <text class="form-label">跨渠道访问</text>
          <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" :disabled="!isFieldEditable('allowCrossChannel') || form.channelUsage === 'site_only'" color="#07c160" />
        </view>
```

替换为：

```html
        <view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannel')">
          <text class="form-label">跨渠道访问</text>
          <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" :disabled="!isFieldEditable('allowCrossChannel') || form.channelUsage === 'site_only'" color="#07c160" />
        </view>
        <view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannelPublish')">
          <view>
            <text class="form-label">允许发布跨渠道课程</text>
            <text class="form-hint">关闭后，课程发布时只能选择指定渠道，无法标记为全部渠道</text>
          </view>
          <switch :checked="form.allowCrossChannelPublish" @change="form.allowCrossChannelPublish = $event.detail.value" :disabled="!isFieldEditable('allowCrossChannelPublish') || form.channelUsage === 'site_only'" color="#07c160" />
        </view>
```

- [ ] **Step 2: form 默认值补 allowCrossChannelPublish（第 503 行后）**

用 Edit 工具，将：

```js
  allowCrossChannel: false,
  channelUsage: 'site_cross_user',
```

替换为：

```js
  allowCrossChannel: false,
  allowCrossChannelPublish: false,
  channelUsage: 'site_cross_user',
```

- [ ] **Step 3: 提交**

```bash
cd e:\code\web
git add pages/settings/site-config.vue
git commit -m "feat(web): 设置页面渠道配置区增加'允许发布跨渠道课程'开关"
```

---

## Task 6: 前端课程表单联动 — course/form.vue

**Files:**
- Modify: `web/pages/course/form.vue:226` + `252` + `467` + `475`

- [ ] **Step 1: 新增 allowCrossChannelPublish ref（第 467 行后）**

用 Edit 工具，将：

```js
const showPointsSection = ref(true)
const showCrossChannelSection = ref(false)
```

替换为：

```js
const showPointsSection = ref(true)
const showCrossChannelSection = ref(false)
const allowCrossChannelPublish = ref(false)
```

- [ ] **Step 2: watch 中读取开关并强制 specific（第 475 行后）**

用 Edit 工具，将：

```js
  showPointsSection.value = isFeatureEnabled('pointsEnabled')
  showCrossChannelSection.value = isFeatureEnabled('allowCrossChannel')
})
```

替换为：

```js
  showPointsSection.value = isFeatureEnabled('pointsEnabled')
  showCrossChannelSection.value = isFeatureEnabled('allowCrossChannel')
  allowCrossChannelPublish.value = isFeatureEnabled('allowCrossChannelPublish')
  if (!allowCrossChannelPublish.value) {
    form.channelScope = 'specific'
  }
})
```

- [ ] **Step 3: "全部渠道"选项加 v-if（第 226 行）**

用 Edit 工具，将：

```html
            <label class="radio-item" @click="setChannelScope('all')">
              <view class="radio-circle" :class="{ active: form.channelScope === 'all' }"></view>
              <text>全部渠道（跨渠道公开）</text>
            </label>
```

替换为：

```html
            <label class="radio-item" v-if="allowCrossChannelPublish" @click="setChannelScope('all')">
              <view class="radio-circle" :class="{ active: form.channelScope === 'all' }"></view>
              <text>全部渠道（跨渠道公开）</text>
            </label>
```

- [ ] **Step 4: "允许跨渠道访问"开关加 allowCrossChannelPublish 条件（第 252 行）**

用 Edit 工具，将：

```html
        <view class="form-item" v-if="showCrossChannelSection">
          <text class="form-label">允许跨渠道访问</text>
```

替换为：

```html
        <view class="form-item" v-if="showCrossChannelSection && allowCrossChannelPublish">
          <text class="form-label">允许跨渠道访问</text>
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\web
git add pages/course/form.vue
git commit -m "feat(web): 课程表单联动 allowCrossChannelPublish，关闭时隐藏全部渠道选项"
```

---

## Task 7: 前端课程分类表单联动 — category/form.vue

**Files:**
- Modify: `web/pages/course/category/form.vue:46` + `64` + `106` + `117` + `126`

> 注意：category/form.vue 当前无 feature flag 集成（不导入 isFeatureEnabled/loadSiteConfig），需补全。

- [ ] **Step 1: 补导入与 ref（第 106 行 + 第 117 行）**

用 Edit 工具，将：

```js
import { ref, reactive, onMounted } from 'vue'
import { getCourseCategoryDetail, createCourseCategory, updateCourseCategory } from '../../../src/api/course.js'
import { getChannelList } from '../../../src/api/channel.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)
const showChannelPicker = ref(false)
const channelList = ref([])

const form = reactive({
  name: '',
  description: '',
  sort: 0,
  channelScope: 'all',
  channelIds: [],
  allowCrossChannel: true,
})

onMounted(() => {
  loadChannels()
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.id
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})
```

替换为：

```js
import { ref, reactive, onMounted } from 'vue'
import { getCourseCategoryDetail, createCourseCategory, updateCourseCategory } from '../../../src/api/course.js'
import { getChannelList } from '../../../src/api/channel.js'
import { loadSiteConfig, isFeatureEnabled } from '../../../src/utils/config-helper.js'
import PageHeader from '../../../src/components/PageHeader.vue'

const isEdit = ref(false)
const documentId = ref('')
const submitting = ref(false)
const showChannelPicker = ref(false)
const channelList = ref([])
const allowCrossChannelPublish = ref(false)

const form = reactive({
  name: '',
  description: '',
  sort: 0,
  channelScope: 'all',
  channelIds: [],
  allowCrossChannel: true,
})

onMounted(async () => {
  await loadSiteConfig()
  allowCrossChannelPublish.value = isFeatureEnabled('allowCrossChannelPublish')
  if (!allowCrossChannelPublish.value) {
    form.channelScope = 'specific'
  }
  loadChannels()
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const id = page.options?.id
  if (id) {
    isEdit.value = true
    documentId.value = id
    loadDetail(id)
  }
})
```

- [ ] **Step 2: "全部渠道"选项加 v-if（第 46 行）**

用 Edit 工具，将：

```html
            <label class="radio-item" @click="setChannelScope('all')">
              <view class="radio-circle" :class="{ active: form.channelScope === 'all' }"></view>
              <text>全部渠道（跨渠道公开）</text>
            </label>
```

替换为：

```html
            <label class="radio-item" v-if="allowCrossChannelPublish" @click="setChannelScope('all')">
              <view class="radio-circle" :class="{ active: form.channelScope === 'all' }"></view>
              <text>全部渠道（跨渠道公开）</text>
            </label>
```

- [ ] **Step 3: "允许跨渠道访问"开关加 v-if（第 64 行）**

用 Edit 工具，将：

```html
        <view class="form-item">
          <text class="form-label">允许跨渠道访问</text>
```

替换为：

```html
        <view class="form-item" v-if="allowCrossChannelPublish">
          <text class="form-label">允许跨渠道访问</text>
```

- [ ] **Step 4: 提交**

```bash
cd e:\code\web
git add pages/course/category/form.vue
git commit -m "feat(web): 课程分类表单联动 allowCrossChannelPublish，补 feature flag 集成"
```

---

## Task 8: 后端构建 dist

**Files:**
- Build: `plugins/zhao-course/dist/`
- Build: `plugins/zhao-common/dist/`

- [ ] **Step 1: 构建 zhao-course dist**

```bash
cd e:\code\basic\plugins\zhao-course
npx strapi-plugin build
```

预期：成功提示，无错误。

- [ ] **Step 2: 构建 zhao-common dist**

```bash
cd e:\code\basic\plugins\zhao-common
npx strapi-plugin build
```

预期：成功提示，无错误。

- [ ] **Step 3: 检查 dist 是否被 .gitignore 忽略并提交**

```bash
cd e:\code\basic
git check-ignore plugins/zhao-course/dist/server/index.js
git check-ignore plugins/zhao-common/dist/server/index.js
```

若未被忽略（check-ignore 无输出），则提交：

```bash
git add plugins/zhao-course/dist/ plugins/zhao-common/dist/
git commit -m "build(zhao-course,zhao-common): 编译 dist 同步访问策略修复与 featureFlags 补全"
```

若被忽略则跳过提交。

---

## 验证清单

构建完成后，重启 Strapi，按以下清单手动验证：

### A. 访问策略修复验证
- [ ] 租户 channelUsage 设为 site_only
- [ ] 该租户下有 specific + allowCrossChannel=true 的课程
- [ ] 非渠道成员用户访问该课程详情 → 403（修复前 200）

### B. featureFlags 补全验证
- [ ] 新建 site-config 记录 → feature_flags 字段含 logistics: true 与 studio: true
- [ ] dashboard 显示"物流中心"与"媒体发布中心"区块（需对应权限）

### C. dashboard ref bug 验证
- [ ] dashboard 显示"🎬 媒体发布中心"区块（需 menu.studio-center 权限）
- [ ] dashboard 显示"🔐 SSO 单点登录"区块（需 menu.sso 权限）

### D. allowCrossChannelPublish 开关验证
- [ ] 设置页面渠道配置区显示"允许发布跨渠道课程"开关
- [ ] 开关关闭时 → 课程表单只显示"指定渠道"
- [ ] 开关关闭时 → 编辑历史 all 课程 → channelScope 强制为 specific
- [ ] 开关关闭时 → "允许跨渠道访问"开关隐藏
- [ ] 开关开启时 → 表单行为与现状一致
- [ ] channelUsage=site_only 时 → "允许发布跨渠道课程"开关禁用
- [ ] 课程分类表单同样联动

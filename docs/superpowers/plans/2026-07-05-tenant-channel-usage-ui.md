# 租户渠道使用范围开关 UI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在租户详情页增加 channelUsage 开关，在站点配置页只读显示并联动禁用 allowCrossChannel 子开关。

**Architecture:** 仅前端改动 2 个 vue 文件。租户详情页用 switch 绑定 channelUsage（二态：site_only/site_cross_user），保存时随 SCHEMA_FIELDS 提交。站点配置页只读展示 channelUsage 状态，allowCrossChannel 开关在 site_only 模式下追加 disabled 条件。

**Tech Stack:** Vue 3 uni-app（switch 组件 + reactive form）、Strapi v5 site-config schema

---

## File Structure

| 文件 | 责任 | 改动 |
|---|---|---|
| `e:\code\web\pages\tenant\detail.vue` | 租户详情页（可编辑 channelUsage） | 5 处 |
| `e:\code\web\pages\settings\site-config.vue` | 站点配置页（只读 + 联动禁用） | 5 处 |

---

### Task 1: 租户详情页 - formData 初始化 + SCHEMA_FIELDS 注册

**Files:**
- Modify: `e:\code\web\pages\tenant\detail.vue:452-460` (SCHEMA_FIELDS)
- Modify: `e:\code\web\pages\tenant\detail.vue:577-616` (formData)

- [ ] **Step 1: SCHEMA_FIELDS 追加 'channelUsage'**

[detail.vue:452-460](file:///e:/code/web/pages/tenant/detail.vue#L452-L460) 替换为：

```ts
const SCHEMA_FIELDS = new Set([
  'siteName', 'siteDescription', 'logo', 'favicon', 'icpNumber',
  'seoKeywords', 'seoDescription', 'tencentMapKey', 'shareTitle',
  'shareDescription', 'shareImage', 'customerServiceUrl',
  'featureFlags', 'domain', 'template', 'themeConfig', 'channelUsage',
  'channels', 'extraConfig',
  'documentId', 'id', 'createdAt', 'updatedAt', 'publishedAt',
  'createdBy', 'updatedBy', 'locale', '_meta',
])
```

- [ ] **Step 2: formData 初始化追加 channelUsage**

[detail.vue:577-616](file:///e:/code/web/pages/tenant/detail.vue#L577-L616) 的 `formData = reactive({...})` 对象内，在 `channels: []` 字段后追加 `channelUsage`：

```ts
const formData = reactive({
  siteName: '',
  domain: '',
  // ... 其他字段保持不变 ...
  channels: [],
  channelUsage: 'site_cross_user',
  featureFlags: { ... },
  authConfig: { ... }
})
```

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add web/pages/tenant/detail.vue && git commit -m "feat(tenant-detail): init channelUsage in formData and SCHEMA_FIELDS"
```

---

### Task 2: 租户详情页 - loadTenantDetail 回填 channelUsage

**Files:**
- Modify: `e:\code\web\pages\tenant\detail.vue:680-692`

- [ ] **Step 1: 在 Object.assign 中追加 channelUsage 回填**

[detail.vue:680-692](file:///e:/code/web/pages/tenant/detail.vue#L680-L692) 当前：

```ts
Object.assign(formData, {
  siteName: data.siteName || '',
  // ...
  sharePath: data.sharePath || '/pages/index/index',
  featureFlags: data.featureFlags ?? formData.featureFlags
})
```

替换为（在 featureFlags 后追加 channelUsage）：

```ts
Object.assign(formData, {
  siteName: data.siteName || '',
  // ...
  sharePath: data.sharePath || '/pages/index/index',
  featureFlags: data.featureFlags ?? formData.featureFlags,
  channelUsage: data.channelUsage || 'site_cross_user'
})
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/tenant/detail.vue && git commit -m "feat(tenant-detail): backfill channelUsage in loadTenantDetail"
```

---

### Task 3: 租户详情页 - saveTenant 提交 channelUsage

**Files:**
- Modify: `e:\code\web\pages\tenant\detail.vue:976-996`

- [ ] **Step 1: data 对象追加 channelUsage**

[detail.vue:976-996](file:///e:/code/web/pages/tenant/detail.vue#L976-L996) 的 `const data = { ... }` 在 `featureFlags` 字段后追加：

```ts
const data = {
  siteName: formData.siteName,
  // ... 其他字段保持不变 ...
  featureFlags: formData.featureFlags,
  channelUsage: formData.channelUsage,
  ...mergedExtraConfig,
  template: currentTemplate.value?.documentId ?? null,
  themeConfig: JSON.stringify(themeConfig.value)
}
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/tenant/detail.vue && git commit -m "feat(tenant-detail): submit channelUsage in saveTenant"
```

---

### Task 4: 租户详情页 - template 加开关 + toggle 方法

**Files:**
- Modify: `e:\code\web\pages\tenant\detail.vue:171-198`

- [ ] **Step 1: 在渠道配置区块插入开关**

[detail.vue:171-198](file:///e:/code/web/pages/tenant/detail.vue#L171-L198) 当前：

```vue
<view class="form-section">
  <view class="section-header">
    <text class="section-title">渠道配置</text>
    <text class="section-hint">必选（只能选择你有权限的渠道）</text>
  </view>
  
  <view class="channel-list">
```

替换为（在 section-header 后、channel-list 前插入开关 form-item）：

```vue
<view class="form-section">
  <view class="section-header">
    <text class="section-title">渠道配置</text>
    <text class="section-hint">必选（只能选择你有权限的渠道）</text>
  </view>

  <view class="form-item switch-item">
    <view>
      <text class="form-label">是否允许跨渠道</text>
      <text class="form-hint" v-if="formData.channelUsage !== 'site_only'">开启后，用户可见跨渠道课程/分类，且可使用个人渠道数据</text>
      <text class="form-hint" v-else>关闭后，仅展示站点渠道数据，跨渠道内容全部屏蔽</text>
    </view>
    <switch :checked="formData.channelUsage !== 'site_only'" @change="toggleChannelUsage" color="#07c160" />
  </view>

  <view class="channel-list">
```

- [ ] **Step 2: 在 script 中添加 toggleChannelUsage 方法**

在 [detail.vue](file:///e:/code/web/pages/tenant/detail.vue) 的 script 部分，找到 `removeChannel` 函数附近，添加：

```ts
function toggleChannelUsage(e: any) {
  formData.channelUsage = e.detail.value ? 'site_cross_user' : 'site_only'
}
```

放置位置建议：在 `function removeChannel(id: number)` 之前。

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add web/pages/tenant/detail.vue && git commit -m "feat(tenant-detail): add channelUsage switch in channel config section"
```

---

### Task 5: 站点配置页 - form 初始化 + loadConfig 回填 channelUsage

**Files:**
- Modify: `e:\code\web\pages\settings\site-config.vue:474-505` (form)
- Modify: `e:\code\web\pages\settings\site-config.vue:586` (loadConfig)

- [ ] **Step 1: form 初始化追加 channelUsage**

[site-config.vue:474-505](file:///e:/code/web/pages/settings/site-config.vue#L474-L505) 的 `const form = ref({ ... })` 中，在 `allowCrossChannel: false,` 后追加：

```ts
const form = ref({
  // ... 其他字段保持不变 ...
  allowCrossChannel: false,
  channelUsage: 'site_cross_user',
  channelInviteEnabled: true,
  // ...
})
```

- [ ] **Step 2: loadConfig 回填 channelUsage**

[site-config.vue:586](file:///e:/code/web/pages/settings/site-config.vue#L586) 当前：

```ts
allowCrossChannel: data.allowCrossChannel ?? false,
```

在其后追加一行：

```ts
allowCrossChannel: data.allowCrossChannel ?? false,
channelUsage: data.channelUsage ?? 'site_cross_user',
channelInviteEnabled: data.channelInviteEnabled ?? true,
```

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add web/pages/settings/site-config.vue && git commit -m "feat(site-config): init and backfill channelUsage in form"
```

---

### Task 6: 站点配置页 - template 加只读展示项 + 联动禁用

**Files:**
- Modify: `e:\code\web\pages\settings\site-config.vue:194-212`

- [ ] **Step 1: 在 allowCrossChannel 开关上方插入 channelUsage 只读项**

[site-config.vue:194-200](file:///e:/code/web/pages/settings/site-config.vue#L194-L200) 当前：

```vue
<!-- 渠道配置 -->
<view class="form-section-title">渠道配置</view>
<view class="form-card">
  <view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannel')">
    <text class="form-label">跨渠道访问</text>
    <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" :disabled="!isFieldEditable('allowCrossChannel')" color="#07c160" />
  </view>
```

替换为（在 form-card 开头插入 channelUsage 只读项，并修改 allowCrossChannel 的 disabled 条件）：

```vue
<!-- 渠道配置 -->
<view class="form-section-title">渠道配置</view>
<view class="form-card">
  <view class="form-item switch-item">
    <view>
      <text class="form-label">跨渠道总开关</text>
      <text class="form-hint">由租户管理员配置，此处不可修改</text>
    </view>
    <view :class="['readonly-badge', form.channelUsage !== 'site_only' ? 'enabled' : 'disabled']">
      {{ form.channelUsage !== 'site_only' ? '已开启' : '已关闭' }}
    </view>
  </view>
  <view class="form-item switch-item" v-if="isFieldVisible('allowCrossChannel')">
    <text class="form-label">跨渠道访问</text>
    <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" :disabled="!isFieldEditable('allowCrossChannel') || form.channelUsage === 'site_only'" color="#07c160" />
  </view>
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/settings/site-config.vue && git commit -m "feat(site-config): add channelUsage readonly badge and disable allowCrossChannel when site_only"
```

---

### Task 7: 站点配置页 - 添加 readonly-badge 样式

**Files:**
- Modify: `e:\code\web\pages\settings\site-config.vue` (style 部分)

- [ ] **Step 1: 在 style 部分追加 readonly-badge 样式**

在 [site-config.vue](file:///e:/code/web/pages/settings/site-config.vue) 的 `<style>` 块中（建议在 `.form-card` 样式后），追加：

```scss
.readonly-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  &.enabled {
    background: #f0f9eb;
    color: #67c23a;
  }
  &.disabled {
    background: #fef0f0;
    color: #f56c6c;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/settings/site-config.vue && git commit -m "style(site-config): add readonly-badge style for channelUsage display"
```

---

### Task 8: 浏览器验证

**Files:** 无文件改动，仅人工验证

- [ ] **Step 1: 重启 web 前端 dev server（如需）**

确认 web 目录 HMR 已加载最新改动。

- [ ] **Step 2: 验证租户详情页**

访问 http://localhost:5174/#/pages/tenant/detail?documentId=tyesszwdlu5got3pe1x8xpn7&mode=edit

预期：
1. 渠道配置区块显示"是否允许跨渠道"开关
2. 开关状态与后端数据一致（默认 ON）
3. 切换 ON → 显示"开启后..."提示
4. 切换 OFF → 显示"关闭后..."提示
5. 点击保存 → 重新打开 → 状态保持

- [ ] **Step 3: 验证站点配置页**

访问 http://localhost:5175/#/pages/settings/site-config

预期：
1. 渠道配置区块顶部显示"跨渠道总开关"只读徽章（已开启/已关闭）
2. 徽章下方显示"由租户管理员配置，此处不可修改"
3. channelUsage=site_only 时，"跨渠道访问"开关灰色禁用，无法点击
4. channelUsage≠site_only 时，"跨渠道访问"开关正常可编辑

- [ ] **Step 4: 联动验证**

1. 租户详情页切到 site_only → 保存 → 站点配置页刷新 → allowCrossChannel 禁用
2. 租户详情页切回 site_cross_user → 保存 → 站点配置页刷新 → allowCrossChannel 可编辑

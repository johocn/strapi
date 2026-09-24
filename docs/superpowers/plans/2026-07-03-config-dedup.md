# 粗细粒度配置去重 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 site-config.vue 中与 featureFlags 重复的 3 个开关（ssoEnabled/pointsEnabled/thirdPartyEnabled），后端改为从 featureFlags 读取，修复 dashboard 和 shao 端的 key 读取 bug。

**Architecture:** 前端删除重复 UI + form 字段，后端 getPublicConfig 中 3 个字段改为从 siteFeatureFlags 读取而非 ec，tenant/detail.vue 中 SSO 开关改绑 featureFlags.sso。模板 404 无需改动（dist 重建已修复）。

**Tech Stack:** Vue 3 (uni-app) / TypeScript (Strapi v5) / 无测试框架（手动验证）

---

## File Structure

| 文件 | 职责 | 改动类型 |
|---|---|---|
| `web/pages/settings/site-config.vue` | 删除 3 个重复开关的 UI/form/读取/提交 | Modify |
| `web/pages/tenant/detail.vue` | SSO 开关改绑 featureFlags.sso | Modify |
| `web/pages/dashboard/index.vue` | 修复 pointsEnabled key 读取 bug | Modify |
| `shao/services/auth-config.ts` | 修复 pointsEnabled key 读取 bug | Modify |
| `basic/plugins/zhao-common/server/src/services/config.ts` | getPublicConfig 3 字段改从 featureFlags 读取 | Modify |

---

### Task 1: 后端 getPublicConfig — 3 字段改从 featureFlags 读取

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/config.ts:372-433`

- [ ] **Step 1: 修改 thirdPartyEnabled 推导逻辑**

文件 `e:\code\basic\plugins\zhao-common\server\src\services\config.ts`

找到 L372-377：
```typescript
      const thirdPartyEnabled =
        wechatOfficialAccountEnabled ||
        wechatMiniProgramEnabled ||
        wechatOpenPlatformEnabled ||
        alipayEnabled ||
        douyinEnabled;
```

替换为：
```typescript
      const thirdPartyEnabled = siteFeatureFlags.thirdParty ?? false;
```

- [ ] **Step 2: 修改 SSO methods 判断**

找到 L383：
```typescript
      if (authMode === "sso" || ec.ssoEnabled) {
```

替换为：
```typescript
      if (authMode === "sso" || siteFeatureFlags.sso) {
```

- [ ] **Step 3: 修改 auth 返回的 ssoEnabled**

找到 L395：
```typescript
        ssoEnabled: ec.ssoEnabled ?? false,
```

替换为：
```typescript
        ssoEnabled: siteFeatureFlags.sso ?? false,
```

- [ ] **Step 4: 修改 featureFlags.pointsEnabled**

找到 L413：
```typescript
        pointsEnabled: ec.pointsEnabled ?? true,
```

替换为：
```typescript
        pointsEnabled: siteFeatureFlags.points ?? true,
```

- [ ] **Step 5: 修改 points.moduleEnabled**

找到 L433：
```typescript
        moduleEnabled: ec.pointsEnabled ?? true,
```

替换为：
```typescript
        moduleEnabled: siteFeatureFlags.points ?? true,
```

- [ ] **Step 6: 重建 dist 并验证**

Run: `cd e:\code\basic && npm run develop`
等待启动完成后用 curl 验证 API 返回：
```
curl.exe -s "http://localhost:1337/api/zhao-common/v1/public/config?domain=localhost" | findstr "pointsEnabled ssoEnabled thirdPartyEnabled"
```
Expected: 3 个字段均出现在输出中

- [ ] **Step 7: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-common/server/src/services/config.ts
git commit -m "fix(config): getPublicConfig 3字段改从featureFlags读取消除粗细粒度重复"
```

---

### Task 2: 前端 site-config.vue — 删除 3 个重复开关

**Files:**
- Modify: `web/pages/settings/site-config.vue:124-130,141,217-219,496-497,503,590-591,597,691-692,698`

- [ ] **Step 1: 删除 thirdPartyEnabled 和 ssoEnabled 的 UI**

文件 `e:\code\web\pages\settings\site-config.vue`

找到 L124-131（thirdPartyEnabled + ssoEnabled 两个 switch-item），删除这 8 行：
```html
        <view class="form-item switch-item" v-if="isFieldVisible('thirdPartyEnabled')">
          <text class="form-label">三方登录</text>
          <switch :checked="form.thirdPartyEnabled" @change="form.thirdPartyEnabled = $event.detail.value" :disabled="!isFieldEditable('thirdPartyEnabled')" color="#07c160" />
        </view>
        <view class="form-item switch-item" v-if="isFieldVisible('ssoEnabled')">
          <text class="form-label">SSO登录</text>
          <switch :checked="form.ssoEnabled" @change="form.ssoEnabled = $event.detail.value" :disabled="!isFieldEditable('ssoEnabled')" color="#07c160" />
        </view>
```

- [ ] **Step 2: 修改 ssoLoginUrl 显示条件**

找到 L141：
```html
        <view class="form-item" v-if="form.ssoEnabled && isFieldVisible('ssoLoginUrl')">
```

替换为：
```html
        <view class="form-item" v-if="isFieldVisible('ssoLoginUrl')">
```

- [ ] **Step 3: 删除 pointsEnabled 的 UI**

找到 L217-220（pointsEnabled switch-item），删除这 3 行：
```html
        <view class="form-item switch-item" v-if="isFieldVisible('pointsEnabled')">
          <text class="form-label">启用积分</text>
          <switch :checked="form.pointsEnabled" @change="form.pointsEnabled = $event.detail.value" :disabled="!isFieldEditable('pointsEnabled')" color="#07c160" />
        </view>
```

- [ ] **Step 4: 删除 form 默认值中的 3 个字段**

找到 L496-497：
```javascript
  thirdPartyEnabled: false,
  ssoEnabled: false,
```
删除这 2 行。

找到 L503：
```javascript
  pointsEnabled: true,
```
删除这 1 行。

- [ ] **Step 5: 删除 loadData 中的 3 个字段读取**

找到 L590-591：
```javascript
        thirdPartyEnabled: data.thirdPartyEnabled ?? false,
        ssoEnabled: data.ssoEnabled ?? false,
```
删除这 2 行。

找到 L597：
```javascript
        pointsEnabled: data.pointsEnabled ?? true,
```
删除这 1 行。

- [ ] **Step 6: 删除 handleSave 中的 3 个字段提交**

找到 L691-692：
```javascript
      thirdPartyEnabled: form.value.thirdPartyEnabled,
      ssoEnabled: form.value.ssoEnabled,
```
删除这 2 行。

找到 L698：
```javascript
      pointsEnabled: form.value.pointsEnabled,
```
删除这 1 行。

- [ ] **Step 7: Commit**

web 目录无 git 仓库，跳过 commit。

---

### Task 3: 前端 tenant/detail.vue — SSO 开关改绑 featureFlags.sso

**Files:**
- Modify: `web/pages/tenant/detail.vue:152,154,600,684,938`

- [ ] **Step 1: 修改 SSO switch 绑定**

文件 `e:\code\web\pages\tenant\detail.vue`

找到 L152：
```html
            <switch :checked="formData.authConfig.ssoEnabled" @change="formData.authConfig.ssoEnabled = !formData.authConfig.ssoEnabled" />
```

替换为：
```html
            <switch :checked="formData.featureFlags.sso" @change="formData.featureFlags.sso = !formData.featureFlags.sso" />
```

- [ ] **Step 2: 修改 SSO 登录地址 v-if 条件**

找到 L154：
```html
          <view v-if="formData.authConfig.ssoEnabled" class="form-item">
```

替换为：
```html
          <view v-if="formData.featureFlags.sso" class="form-item">
```

- [ ] **Step 3: 删除 authConfig 默认值中的 ssoEnabled**

找到 L600：
```javascript
    ssoEnabled: false,
```
删除这 1 行。

- [ ] **Step 4: 删除 loadData 中的 ssoEnabled 读取**

找到 L684：
```javascript
      ssoEnabled: ec.ssoEnabled ?? false,
```
删除这 1 行。

- [ ] **Step 5: 修改 SSO 校验条件**

找到 L938：
```javascript
  if (formData.authConfig.authMode === 'sso' && formData.authConfig.ssoEnabled && !formData.authConfig.ssoLoginUrl.trim()) {
```

替换为：
```javascript
  if (formData.authConfig.authMode === 'sso' && formData.featureFlags.sso && !formData.authConfig.ssoLoginUrl.trim()) {
```

- [ ] **Step 6: Commit**

web 目录无 git 仓库，跳过 commit。

---

### Task 4: 修复 dashboard/index.vue pointsEnabled key bug

**Files:**
- Modify: `web/pages/dashboard/index.vue:426`

- [ ] **Step 1: 修复 key 读取**

文件 `e:\code\web\pages\dashboard\index.vue`

找到 L426：
```javascript
        pointsEnabled.value = config.featureFlags?.pointsEnabled ?? true
```

替换为：
```javascript
        pointsEnabled.value = config.featureFlags?.points !== false
```

- [ ] **Step 2: Commit**

web 目录无 git 仓库，跳过 commit。

---

### Task 5: 修复 shao/auth-config.ts pointsEnabled key bug

**Files:**
- Modify: `shao/services/auth-config.ts:141`

- [ ] **Step 1: 修复 key 读取**

文件 `e:\code\shao\services\auth-config.ts`

找到 L141：
```typescript
      pointsEnabled: data.featureFlags?.pointsEnabled ?? DEFAULT_CONFIG.pointsEnabled,
```

替换为：
```typescript
      pointsEnabled: data.featureFlags?.points !== false,
```

- [ ] **Step 2: Commit**

shao 目录无 git 仓库，跳过 commit。

---

### Task 6: 最终验证

- [ ] **Step 1: 后端 API 验证**

确保 Strapi 运行中，执行：
```
curl.exe -s "http://localhost:1337/api/zhao-common/v1/public/config?domain=localhost"
```
验证返回 JSON 中：
- `featureFlags.sso` / `featureFlags.points` / `featureFlags.thirdParty` 存在且值正确
- `featureFlags.pointsEnabled` 值等于 `featureFlags.points`
- `auth.ssoEnabled` 值等于 `featureFlags.sso`
- `auth.thirdPartyEnabled` 值等于 `featureFlags.thirdParty`

- [ ] **Step 2: 前端代码验证**

用 Grep 搜索确认以下字段在 site-config.vue 中已删除：
```
pattern: "thirdPartyEnabled|ssoEnabled|pointsEnabled"
path: e:\code\web\pages\settings\site-config.vue
```
Expected: 0 matches

- [ ] **Step 3: tenant/detail.vue 验证**

用 Grep 搜索确认 authConfig.ssoEnabled 已改为 featureFlags.sso：
```
pattern: "authConfig.ssoEnabled"
path: e:\code\web\pages\tenant\detail.vue
```
Expected: 0 matches

```
pattern: "featureFlags.sso"
path: e:\code\web\pages\tenant\detail.vue
```
Expected: >= 2 matches（switch 绑定 + v-if + 校验）

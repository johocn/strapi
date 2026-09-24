# 配置页面重构实施计划（第二部分：前端页面重构）

## 任务清单

### Task 1: 创建统一配置API文件
**文件**: `E:\code\web\src\api\config.js`

**内容**:
```javascript
import { get, post, put, del } from '../utils/request.js'
import { extractItem, extractList } from '../utils/format.js'

const CONFIG = '/zhao-common/v1/config'

// 站点配置
export function getSiteConfig() {
  return get(`${CONFIG}/site`).then(extractItem)
}
export function updateSiteConfig(data) {
  return put(`${CONFIG}/site`, { data }).then(extractItem)
}

// 三方配置
export function getThirdPartyConfigs() {
  return get(`${CONFIG}/third`).then(extractList)
}
export function getThirdPartyConfig(id) {
  return get(`${CONFIG}/third/${id}`).then(extractItem)
}
export function createThirdPartyConfig(data) {
  return post(`${CONFIG}/third`, { data }).then(extractItem)
}
export function updateThirdPartyConfig(id, data) {
  return put(`${CONFIG}/third/${id}`, { data }).then(extractItem)
}
export function deleteThirdPartyConfig(id) {
  return del(`${CONFIG}/third/${id}`)
}

// 积分配置
export function getPointsConfig() {
  return get(`${CONFIG}/points`).then(extractItem)
}
export function updatePointsConfig(data) {
  return put(`${CONFIG}/points`, { data }).then(extractItem)
}

// OSS配置
export function getOssConfig() {
  return get(`${CONFIG}/oss`).then(extractItem)
}
export function updateOssConfig(data) {
  return put(`${CONFIG}/oss`, { data }).then(extractItem)
}

// SSO应用
export function getSsoApps() {
  return get(`${CONFIG}/sso`).then(extractList)
}
export function getSsoApp(id) {
  return get(`${CONFIG}/sso/${id}`).then(extractItem)
}
export function createSsoApp(data) {
  return post(`${CONFIG}/sso`, { data }).then(extractItem)
}
export function updateSsoApp(id, data) {
  return put(`${CONFIG}/sso/${id}`, { data }).then(extractItem)
}
export function deleteSsoApp(id) {
  return del(`${CONFIG}/sso/${id}`)
}

// 功能开关
export function getFeatureFlags() {
  return get(`${CONFIG}/flags`).then(extractList)
}
export function getFeatureFlag(id) {
  return get(`${CONFIG}/flags/${id}`).then(extractItem)
}
export function createFeatureFlag(data) {
  return post(`${CONFIG}/flags`, { data }).then(extractItem)
}
export function updateFeatureFlag(id, data) {
  return put(`${CONFIG}/flags/${id}`, { data }).then(extractItem)
}
export function deleteFeatureFlag(id) {
  return del(`${CONFIG}/flags/${id}`)
}

// 公开配置（无需认证）
export function getPublicConfig() {
  return get('/zhao-common/v1/public/config').then(extractItem)
}
```

---

### Task 2: 重构站点配置页面
**文件**: `E:\code\web\pages\settings\site-config.vue`

**修改要点**:
1. 更新API导入：使用新的统一配置API
2. 增加认证配置分组：authMode、thirdPartyEnabled、ssoEnabled、registerEnabled、inviteCodeRequired
3. 增加渠道配置分组：allowCrossChannel、channelInviteEnabled、defaultChannelScope
4. 增加积分配置分组：pointsEnabled、signInPoints、maxPointsPerDay、redemptionEnabled
5. 增加课程配置分组：coursePreviewEnabled、lessonProgressEnabled、courseEnrollEnabled
6. 增加微信分享默认配置：shareTitle、shareDescription、shareImage、sharePath
7. 增加Logo和图标配置：logo、favicon、darkLogo、appIcon、splashImage
8. 保持MediaPicker组件集成

**关键代码片段**:
```vue
<script setup>
import { getSiteConfig, updateSiteConfig } from '../../src/api/config.js'
// ... 其他导入

const form = ref({
  // 基本信息
  siteName: '',
  siteDescription: '',
  logoId: null,
  logoUrl: '',
  faviconId: null,
  faviconUrl: '',
  icpNumber: '',
  customerServiceUrl: '',
  seoKeywords: '',
  seoDescription: '',
  tencentMapKey: '',
  
  // 微信分享
  shareTitle: '',
  shareDescription: '',
  shareImageId: null,
  shareImageUrl: '',
  sharePath: '/pages/index/index',
  
  // 认证配置
  authMode: 'local',
  thirdPartyEnabled: false,
  ssoEnabled: false,
  registerEnabled: true,
  inviteCodeRequired: false,
  
  // 渠道配置
  allowCrossChannel: false,
  channelInviteEnabled: true,
  defaultChannelScope: 'all',
  
  // 积分配置
  pointsEnabled: true,
  signInPoints: 10,
  maxPointsPerDay: 100,
  redemptionEnabled: true,
  
  // 课程配置
  coursePreviewEnabled: true,
  lessonProgressEnabled: true,
  courseEnrollEnabled: true,
})
```

---

### Task 3: 重构三方配置页面
**文件**: `E:\code\web\pages\third-party\config.vue`

**修改要点**:
1. 更新API导入：使用新的统一配置API
2. 保持现有功能：平台选择、应用类型选择、AppID/AppSecret输入、启用/停用、授权设置
3. 保持新增/编辑弹窗功能
4. 保持删除确认功能

**关键代码片段**:
```vue
<script setup>
import { getThirdPartyConfigs, createThirdPartyConfig, updateThirdPartyConfig, deleteThirdPartyConfig } from '../../src/api/config.js'
// ... 其他导入保持不变
```

---

### Task 4: 重构积分配置页面
**文件**: `E:\code\web\pages\points\config.vue`

**修改要点**:
1. 更新API导入：使用新的统一配置API
2. 保持现有功能：基础设置、过期设置、签到设置、答题设置、地图设置
3. 保持权限检查：`hasPermission('menu.point-config')`

**关键代码片段**:
```vue
<script setup>
import { getPointsConfig, updatePointsConfig } from '../../src/api/config.js'
// ... 其他导入保持不变
```

---

### Task 5: 新建系统工具页面
**文件**: `E:\code\web\pages\system\tools.vue`

**功能**:
- OSS存储配置（启用/停用、存储提供商、Bucket、Region、Access Key、Secret Key、回退本地、测试连接、修复目录）
- SSO应用管理（应用列表、新增/编辑/删除应用、应用名称、应用编码、应用密钥、回调地址、授权方式、启用/停用）
- 功能开关管理（开关列表、新增/编辑/删除开关、flagKey、flagValue、description、启用/停用）

**关键代码片段**:
```vue
<template>
  <view class="page-container">
    <PageHeader title="系统工具" />

    <!-- OSS存储配置 -->
    <view class="form-section">
      <view class="form-card">
        <view class="section-title">OSS存储配置</view>
        <!-- OSS配置表单 -->
      </view>
    </view>

    <!-- SSO应用管理 -->
    <view class="form-section">
      <view class="form-card">
        <view class="section-title">SSO应用管理</view>
        <!-- SSO应用列表 -->
      </view>
    </view>

    <!-- 功能开关管理 -->
    <view class="form-section">
      <view class="form-card">
        <view class="section-title">功能开关管理</view>
        <!-- 功能开关列表 -->
      </view>
    </view>
  </view>
</template>

<script setup>
import { getOssConfig, updateOssConfig, getSsoApps, createSsoApp, updateSsoApp, deleteSsoApp, getFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag } from '../../src/api/config.js'
// ... 其他实现
</script>
```

---

### Task 6: 删除system/config.vue
**文件**: `E:\code\web\pages\system\config.vue`

**操作**: 删除该文件，功能已拆分到独立页面。

---

### Task 7: 更新pages.json路由配置
**文件**: `E:\code\web\pages.json`

**修改要点**:
1. 删除system/config路由
2. 新增system/tools路由

**关键代码片段**:
```json
{
  "pages": [
    // ... 其他页面
    {
      "path": "pages/system/tools",
      "style": {
        "navigationBarTitleText": "系统工具"
      }
    }
    // 删除 pages/system/config 路由
  ]
}
```

---

### Task 8: 更新配置工具文件
**文件**: `E:\code\web\src\utils\config-helper.js`

**修改要点**:
1. 更新公开配置获取路由：使用 `/zhao-common/v1/public/config`
2. 保持功能开关检查逻辑
3. 保持配置缓存逻辑

**关键代码片段**:
```javascript
import { getPublicConfig } from '../api/config.js'

// 获取公开配置
export async function fetchPublicConfig() {
  return await getPublicConfig()
}

// 检查功能开关
export function checkFeatureFlag(flagKey, config) {
  return config?.featureFlags?.[flagKey] === true
}
```

---

## 测试计划

### 前端测试
1. 访问站点配置页面，测试各配置项保存
2. 访问三方配置页面，测试三方平台配置
3. 访问积分配置页面，测试积分设置
4. 访问系统工具页面，测试OSS、SSO、功能开关
5. 测试图片选择功能（MediaPicker集成）
6. 测试功能开关控制页面元素显示/隐藏

---

## 执行方式
Subagent-Driven（子代理执行）

---

计划完成，待用户审查。
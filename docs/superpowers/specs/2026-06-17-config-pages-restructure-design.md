# 配置页面重构设计文档

## 1. 问题诊断

### 1.1 当前配置页面混乱

| 页面 | 路径 | 功能 | 问题 |
|------|------|------|------|
| system/config.vue | pages/system/config.vue | 5个Tab：站点配置、三方平台、OSS、SSO、功能开关 | 功能最全，但与其他页面重复 |
| settings/site-config.vue | pages/settings/site-config.vue | 站点配置 | 与system/config.vue的站点配置Tab重复 |
| third-party/config.vue | pages/third-party/config.vue | 三方配置 | 与system/config.vue的三方平台Tab重复 |
| points/config.vue | pages/points/config.vue | 积分配置 | 独立页面，但应整合到站点配置 |

### 1.2 路由命名不统一

| 配置类型 | 当前路由 | 问题 |
|---------|---------|------|
| 站点配置 | `/zhao-common/v1/admin/site-config` | 路径不统一 |
| 三方配置 | `/zhao-third/v1/admin/third-party-configs` | 路径不统一 |
| 积分配置 | `/zhao-points/v1/admin/config` | 路径不统一 |
| OSS配置 | `/zhao-oss/v1/admin/config` | 路径不统一 |
| SSO配置 | `/zhao-sso/v1/admin/apps` | 路径不统一 |
| 功能开关 | `/zhao-common/v1/admin/feature-flags` | 路径不统一 |

---

## 2. 设计方案

采用方案A：统一路由命名规范，拆分为独立页面。

---

## 3. 后端路由统一

### 3.1 路由命名规范

**统一前缀**：`/zhao-common/v1/config/`

**路由映射**：

| 配置类型 | 新路由 | 旧路由 | 插件归属 |
|---------|--------|--------|---------|
| 站点配置 | `/zhao-common/v1/config/site` | `/zhao-common/v1/admin/site-config` | zhao-common |
| 三方配置 | `/zhao-common/v1/config/third` | `/zhao-third/v1/admin/third-party-configs` | zhao-third → zhao-common |
| 积分配置 | `/zhao-common/v1/config/points` | `/zhao-points/v1/admin/config` | zhao-points → zhao-common |
| OSS配置 | `/zhao-common/v1/config/oss` | `/zhao-oss/v1/admin/config` | zhao-oss → zhao-common |
| SSO配置 | `/zhao-common/v1/config/sso` | `/zhao-sso/v1/admin/apps` | zhao-sso → zhao-common |
| 功能开关 | `/zhao-common/v1/config/flags` | `/zhao-common/v1/admin/feature-flags` | zhao-common |

### 3.2 公开接口

**C端访问**：`/zhao-common/v1/public/config`（无需认证）

### 3.3 路由结构

```
/zhao-common/v1/
├── config/
│   ├── site          # 站点配置（GET/PUT）
│   ├── third         # 三方配置列表（GET/POST/PUT/DELETE）
│   ├── points        # 积分配置（GET/PUT）
│   ├── oss           # OSS配置（GET/PUT）
│   ├── sso           # SSO应用列表（GET/POST/PUT/DELETE）
│   └── flags         # 功能开关列表（GET/POST/PUT/DELETE）
└── public/
    └── config        # 公开配置（GET，无需认证）
```

---

## 4. 前端页面拆分

### 4.1 页面结构

**保留的独立页面**：

| 页面 | 路径 | 功能 |
|------|------|------|
| 站点配置 | `pages/settings/site-config.vue` | 站点信息、认证配置、渠道配置、安全配置、维护配置 |
| 三方配置 | `pages/third-party/config.vue` | 微信/支付宝/抖音等三方平台配置 |
| 积分配置 | `pages/points/config.vue` | 积分系统配置、兑换设置、过期设置 |
| 系统工具 | `pages/system/tools.vue`（新建） | OSS存储配置、SSO应用管理、功能开关管理 |

**删除的页面**：
- `pages/system/config.vue` - 功能已拆分到独立页面

### 4.2 站点配置页面内容

| 分组 | 配置项 | 说明 |
|------|--------|------|
| **基本信息** | siteName、siteDescription、logo、favicon、icpNumber | 站点基本信息 |
| **SEO配置** | seoKeywords、seoDescription、seoTitle | 搜索引擎优化 |
| **微信分享** | shareTitle、shareDescription、shareImage、sharePath | 默认微信转发配置 |
| **认证配置** | authMode、thirdPartyEnabled、ssoEnabled、registerEnabled、inviteCodeRequired | 登录认证设置 |
| **渠道配置** | allowCrossChannel、channelInviteEnabled、defaultChannelScope | 渠道管理设置 |
| **积分配置** | pointsEnabled、signInPoints、maxPointsPerDay、redemptionEnabled | 积分系统设置 |
| **课程配置** | coursePreviewEnabled、lessonProgressEnabled、courseEnrollEnabled | 课程功能设置 |
| **安全配置** | captchaEnabled、rateLimitEnabled、loginAttemptLimit、sessionTimeout | 安全防护设置 |
| **通知配置** | smsEnabled、emailEnabled、smsTemplateId、emailTemplateId | 消息通知设置 |
| **维护配置** | maintenanceMode、debugMode、maintenanceMessage | 系统维护设置 |

### 4.3 微信分享默认配置

```javascript
shareConfig: {
  shareTitle: '圣麟教育',           // 分享标题
  shareDescription: '让学习更有价值', // 分享描述
  shareImage: '/static/share.png',  // 分享图片（默认路径）
  sharePath: '/pages/index/index',  // 分享路径（默认首页）
}
```

### 4.4 Logo和图标配置

```javascript
visualConfig: {
  logo: '/static/logo.png',         // 站点Logo
  favicon: '/static/favicon.ico',   // 网站图标
  darkLogo: '/static/logo-dark.png', // 深色模式Logo
  appIcon: '/static/app-icon.png',  // App图标
  splashImage: '/static/splash.png', // 启动页图片
}
```

### 4.5 全局功能开关

```javascript
featureFlags: {
  // 认证功能
  thirdPartyEnabled: false,         // 三方登录总开关
  ssoEnabled: false,                // SSO登录开关
  registerEnabled: true,            // 注册功能开关
  inviteCodeRequired: false,        // 注册需邀请码
  
  // 渠道功能
  allowCrossChannel: false,         // 允许跨渠道
  channelInviteEnabled: true,       // 渠道邀请功能
  
  // 积分功能
  pointsEnabled: true,              // 积分系统开关
  redemptionEnabled: true,          // 积分兑换开关
  signInEnabled: true,              // 签到功能开关
  
  // 课程功能
  coursePreviewEnabled: true,       // 课程预览开关
  lessonProgressEnabled: true,      // 进度记录开关
  courseCommentEnabled: true,       // 课程评论开关
  courseRatingEnabled: true,        // 课程评分开关
  
  // 安全功能
  captchaEnabled: false,            // 验证码开关
  rateLimitEnabled: true,           // 频率限制开关
  
  // 维护功能
  maintenanceMode: false,           // 维护模式
  debugMode: false,                 // 调试模式
}
```

---

## 5. 图片选择组件集成

### 5.1 需要图片选择的配置项

| 配置项 | 用途 | accept类型 |
|--------|------|-----------|
| logo | 站点Logo | image/* |
| favicon | 网站图标 | image/* |
| shareImage | 微信分享图片 | image/* |
| appIcon | App图标 | image/* |
| splashImage | 启动页图片 | image/* |
| darkLogo | 深色模式Logo | image/* |

### 5.2 MediaPicker组件使用

```vue
<template>
  <!-- Logo选择 -->
  <view class="form-item">
    <text class="form-label">站点Logo</text>
    <view class="image-picker" @click="showLogoPicker = true">
      <image v-if="form.logo" :src="form.logo" class="preview-image" />
      <view v-else class="picker-placeholder">
        <text class="picker-icon">📷</text>
        <text class="picker-text">点击选择Logo</text>
      </view>
    </view>
  </view>

  <!-- MediaPicker弹窗 -->
  <MediaPicker
    v-model:visible="showLogoPicker"
    accept="image/*"
    folder="/config/site"
    @select="onLogoSelect"
  />
</template>

<script setup>
import MediaPicker from '../../src/components/MediaPicker.vue'

const showLogoPicker = ref(false)

function onLogoSelect(file) {
  form.value.logo = file.url
  form.value.logoId = file.id
}
</script>
```

### 5.3 图片存储路径规范

| 配置类型 | OSS路径 | 说明 |
|---------|---------|------|
| 站点配置图片 | `/config/site/` | Logo、favicon等 |
| 微信分享图片 | `/config/share/` | 分享图片 |
| 课程封面 | `/course/cover/` | 课程封面图 |
| 课程缩略图 | `/course/thumbnail/` | 课程缩略图 |

---

## 6. C端配置路由统一

### 6.1 公开配置接口

**接口**：`/zhao-common/v1/public/config`

**返回内容**：
```typescript
interface PublicConfig {
  // 站点信息
  siteName: string
  siteDescription: string
  logo: string
  favicon: string
  
  // 微信分享
  shareTitle: string
  shareDescription: string
  shareImage: string
  sharePath: string
  
  // 认证配置
  authMode: 'local' | 'third' | 'sso'
  thirdPartyEnabled: boolean
  ssoEnabled: boolean
  ssoLoginUrl: string | null
  registerEnabled: boolean
  
  // 功能开关（公开）
  pointsEnabled: boolean
  signInPoints: number
  coursePreviewEnabled: boolean
}
```

### 6.2 C端配置获取

```typescript
// E:\code\shao\services\auth-config.ts
export async function fetchAuthConfig(): Promise<AuthConfig> {
  const config = await request('/zhao-common/v1/public/config') as AuthConfig
  return config
}
```

---

## 7. 文件清单

### 后端修改
- `E:\code\basic\plugins\zhao-common\server\src\routes\admin.ts` - 统一配置路由
- `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts` - 公开配置路由
- `E:\code\basic\plugins\zhao-common\server\src\controllers\config.ts`（新建） - 统一配置控制器
- `E:\code\basic\plugins\zhao-common\server\src\services\config.ts`（新建） - 统一配置服务

### 前端修改
- `E:\code\web\pages\settings\site-config.vue` - 重构站点配置页面
- `E:\code\web\pages\third-party\config.vue` - 重构三方配置页面
- `E:\code\web\pages\points\config.vue` - 重构积分配置页面
- `E:\code\web\pages\system\tools.vue`（新建） - 系统工具页面
- `E:\code\web\pages\system\config.vue` - 删除
- `E:\code\web\src\api\config.js`（新建） - 统一配置API
- `E:\code\web\src\utils\config-helper.js` - 更新配置工具

### C端修改
- `E:\code\shao\services\auth-config.ts` - 更新配置获取路由

---

## 8. 测试计划

### 8.1 后端测试
1. 测试 `/zhao-common/v1/config/site` 获取和更新站点配置
2. 测试 `/zhao-common/v1/config/third` 三方配置CRUD
3. 测试 `/zhao-common/v1/config/points` 积分配置
4. 测试 `/zhao-common/v1/config/oss` OSS配置
5. 测试 `/zhao-common/v1/config/sso` SSO应用管理
6. 测试 `/zhao-common/v1/config/flags` 功能开关
7. 测试 `/zhao-common/v1/public/config` 公开配置

### 8.2 前端测试
1. 访问站点配置页面，测试各配置项保存
2. 访问三方配置页面，测试三方平台配置
3. 访问积分配置页面，测试积分设置
4. 访问系统工具页面，测试OSS、SSO、功能开关
5. 测试图片选择功能（MediaPicker集成）
6. 测试功能开关控制页面元素显示/隐藏

### 8.3 C端测试
1. 测试公开配置获取
2. 测试配置缓存和更新
3. 测试功能开关控制C端功能

---

设计完成，待用户审查。
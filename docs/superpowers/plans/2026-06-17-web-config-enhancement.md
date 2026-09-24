# Web后台配置完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善Web后台配置功能，修复路由不匹配问题，添加站点配置页面，实现全局开关控制页面功能展示。

**Architecture:** 扩展zhao-common的site-config，利用extraConfig存储业务参数；修复zhao-third路由路径；前端新增站点配置Tab和配置读取工具。

**Tech Stack:** Strapi 5 + TypeScript后端，Vue 3 + uni-app前端

---

## 文件结构

### 后端修改
- `E:\code\plugins\zhao-third\server\src\routes\admin.ts` - 路由修复
- `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts` - 新建公开路由
- `E:\code\basic\plugins\zhao-common\server\src\routes\index.ts` - 注册content-api路由
- `E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts` - 默认数据填充

### 前端修改
- `E:\code\web\src\api\site-config.js` - 新建API文件
- `E:\code\web\src\api\index.js` - 导出site-config
- `E:\code\web\src\utils\config-helper.js` - 新建配置工具
- `E:\code\web\pages\system\config.vue` - 新增站点配置Tab
- `E:\code\web\pages\course\form.vue` - 集成开关控制
- `E:\code\web\pages\login\index.vue` - 集成渠道邀请开关

---

### Task 1: zhao-third路由修复

**Files:**
- Modify: `E:\code\plugins\zhao-third\server\src\routes\admin.ts`

- [ ] **Step 1: 读取当前路由文件**

Read: `E:\code\plugins\zhao-third\server\src\routes\admin.ts`

- [ ] **Step 2: 修改路由路径**

将路由路径从 `/configs` 改为 `/v1/admin/third-party-configs`，并添加认证策略：

```typescript
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin/third-party-configs${path}`,
  handler: `third-party-config.${handler}`,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    adminRoute("GET", "", "find", "third-party-config.read"),
    adminRoute("GET", "/:documentId", "findOne", "third-party-config.read"),
    adminRoute("POST", "", "create", "third-party-config.create"),
    adminRoute("PUT", "/:documentId", "update", "third-party-config.update"),
    adminRoute("DELETE", "/:documentId", "delete", "third-party-config.delete"),
  ],
});
```

- [ ] **Step 3: 提交修改**

```bash
git add E:\code\plugins\zhao-third\server\src\routes\admin.ts
git commit -m "fix(zhao-third): 修复路由路径不匹配问题"
```

---

### Task 2: zhao-common content-api路由新建

**Files:**
- Create: `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\routes\index.ts`

- [ ] **Step 1: 创建content-api.ts文件**

```typescript
export default () => ({
  type: "content-api" as const,
  routes: [
    {
      method: "GET",
      path: "/v1/site-config/public",
      handler: "site-config.getPublic",
      config: { auth: false },
    },
  ],
});
```

- [ ] **Step 2: 读取routes/index.ts**

Read: `E:\code\basic\plugins\zhao-common\server\src\routes\index.ts`

- [ ] **Step 3: 注册content-api路由**

在index.ts中添加content-api导出：

```typescript
import admin from "./admin";
import contentApi from "./content-api";

export default {
  admin: admin(),
  "content-api": contentApi(),
};
```

- [ ] **Step 4: 提交修改**

```bash
git add E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts
git add E:\code\basic\plugins\zhao-common\server\src\routes\index.ts
git commit -m "feat(zhao-common): 添加公开配置接口"
```

---

### Task 3: 默认数据填充

**Files:**
- Modify: `E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts`

- [ ] **Step 1: 读取当前bootstrap.ts**

Read: `E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts`

- [ ] **Step 2: 添加默认配置初始化**

```typescript
import type { Core } from "@strapi/strapi";

const DEFAULT_SITE_CONFIG = {
  siteName: "圣麟教育",
  siteDescription: "让学习更有价值",
  seoKeywords: "教育,学习,课程",
  seoDescription: "圣麟教育平台",
  icpNumber: "",
  tencentMapKey: "",
  shareTitle: "圣麟教育",
  shareDescription: "让学习更有价值",
  customerServiceUrl: "",
  extraConfig: {
    // 认证
    authMode: "local",
    thirdPartyEnabled: false,
    ssoEnabled: false,
    ssoLoginUrl: "",
    registerEnabled: true,
    inviteCodeRequired: false,
    wechatMiniProgramEnabled: false,
    wechatOfficialAccountEnabled: false,
    alipayEnabled: false,
    douyinEnabled: false,
    passwordMinLength: 6,
    passwordRequireComplexity: false,

    // 渠道
    allowCrossChannel: false,
    channelInviteEnabled: true,
    defaultChannelScope: "all",

    // 积分
    pointsEnabled: true,
    signInPoints: 10,
    maxPointsPerDay: 100,
    redemptionEnabled: true,
    pointsExpireDays: 0,
    pointsMinRedemption: 100,
    pointsRuleEnabled: true,

    // 课程
    coursePreviewEnabled: true,
    lessonProgressEnabled: true,
    courseEnrollEnabled: true,
    courseCommentEnabled: true,
    courseRatingEnabled: true,

    // 用户
    userAvatarRequired: false,
    userPhoneRequired: true,
    userEmailRequired: false,

    // 支付
    paymentEnabled: false,

    // 通知
    smsEnabled: false,
    emailEnabled: false,

    // 安全
    captchaEnabled: false,
    rateLimitEnabled: true,
    loginAttemptLimit: 5,
    loginLockDuration: 30,
    sessionTimeout: 120,

    // 维护
    maintenanceMode: false,
    debugMode: false,
  },
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const UID = "plugin::zhao-common.site-config";

  try {
    const existing = await strapi.documents(UID).findFirst();
    if (!existing) {
      await strapi.documents(UID).create({ data: DEFAULT_SITE_CONFIG });
      strapi.log.info("[zhao-common] Default site-config created");
    }
  } catch (e: any) {
    strapi.log.warn("[zhao-common] Bootstrap failed:", e.message);
  }
};
```

- [ ] **Step 3: 提交修改**

```bash
git add E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts
git commit -m "feat(zhao-common): 添加默认配置初始化"
```

---

### Task 4: 前端site-config API新建

**Files:**
- Create: `E:\code\web\src\api\site-config.js`
- Modify: `E:\code\web\src\api\index.js`

- [ ] **Step 1: 创建site-config.js文件**

```javascript
import { get, put } from '../utils/request.js'
import { extractItem } from '../utils/format.js'

const ADMIN = '/zhao-common/v1/admin'

export function getSiteConfig() {
  return get(`${ADMIN}/site-config`).then(extractItem)
}

export function updateSiteConfig(data) {
  return put(`${ADMIN}/site-config`, { data }).then(extractItem)
}

export function getPublicSiteConfig() {
  return get('/zhao-common/v1/site-config/public').then(extractItem)
}
```

- [ ] **Step 2: 读取api/index.js**

Read: `E:\code\web\src\api\index.js`

- [ ] **Step 3: 导出site-config**

在index.js中添加导出：

```javascript
export * from './site-config.js'
```

- [ ] **Step 4: 提交修改**

```bash
git add E:\code\web\src\api\site-config.js
git add E:\code\web\src\api\index.js
git commit -m "feat(web): 添加site-config API"
```

---

### Task 5: 配置读取工具新建

**Files:**
- Create: `E:\code\web\src\utils\config-helper.js`

- [ ] **Step 1: 创建config-helper.js文件**

```javascript
import { get } from './request.js'

let cachedConfig = null

export async function loadSiteConfig() {
  if (cachedConfig) return cachedConfig

  try {
    const res = await get('/zhao-common/v1/admin/site-config')
    cachedConfig = res?.data?.extraConfig || getDefaultConfig()
    return cachedConfig
  } catch (e) {
    console.warn('[config-helper] Failed to load config:', e)
    return getDefaultConfig()
  }
}

export function getDefaultConfig() {
  return {
    authMode: 'local',
    thirdPartyEnabled: false,
    ssoEnabled: false,
    allowCrossChannel: false,
    channelInviteEnabled: true,
    pointsEnabled: true,
    signInPoints: 10,
    redemptionEnabled: true,
    coursePreviewEnabled: true,
    lessonProgressEnabled: true,
    paymentEnabled: false,
    smsEnabled: false,
    emailEnabled: false,
    captchaEnabled: false,
    rateLimitEnabled: true,
    maintenanceMode: false,
    debugMode: false,
  }
}

export function isFeatureEnabled(key) {
  return cachedConfig?.[key] === true
}

export function clearConfigCache() {
  cachedConfig = null
}

export function getConfigValue(key, defaultValue = null) {
  return cachedConfig?.[key] ?? defaultValue
}
```

- [ ] **Step 2: 提交修改**

```bash
git add E:\code\web\src\utils\config-helper.js
git commit -m "feat(web): 添加配置读取工具"
```

---

### Task 6: system/config.vue新增站点配置Tab

**Files:**
- Modify: `E:\code\web\pages\system\config.vue`

- [ ] **Step 1: 读取当前config.vue**

Read: `E:\code\web\pages\system\config.vue`

- [ ] **Step 2: 添加站点配置Tab**

在tabs数组中添加站点配置：

```javascript
const tabs = [
  { key: 'site', label: '站点配置' },
  { key: 'third', label: '三方平台' },
  { key: 'oss', label: '对象存储' },
  { key: 'sso', label: 'SSO 应用' },
  { key: 'flags', label: '功能开关' },
]
```

- [ ] **Step 3: 添加站点配置数据和方法**

```javascript
// 站点配置
import { getSiteConfig, updateSiteConfig } from '../../src/api/site-config.js'

const siteForm = ref({
  siteName: '',
  siteDescription: '',
  extraConfig: getDefaultConfig(),
})
const siteSaving = ref(false)

async function loadSiteConfig() {
  try {
    const res = await getSiteConfig()
    siteForm.value = {
      siteName: res.siteName || '',
      siteDescription: res.siteDescription || '',
      extraConfig: res.extraConfig || getDefaultConfig(),
    }
  } catch (e) {
    console.warn('加载站点配置失败:', e)
  }
}

async function saveSiteConfig() {
  siteSaving.value = true
  try {
    await updateSiteConfig({
      siteName: siteForm.value.siteName,
      siteDescription: siteForm.value.siteDescription,
      extraConfig: siteForm.value.extraConfig,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    siteSaving.value = false
  }
}

function onExtraSwitch(key, e) {
  siteForm.value.extraConfig[key] = e.detail.value
}
```

- [ ] **Step 4: 添加站点配置模板**

在template中添加站点配置内容（按类别分组展示）：

```vue
<!-- 站点配置 -->
<scroll-view scroll-y class="tab-content" v-if="activeTab === 'site'">
  <!-- 站点信息 -->
  <view class="config-card">
    <view class="card-header">
      <text class="card-icon">🏠</text>
      <text class="card-title">站点信息</text>
    </view>
    <view class="card-body">
      <view class="field-row">
        <text class="field-label">站点名称</text>
        <input class="field-input" v-model="siteForm.siteName" placeholder="圣麟教育" />
      </view>
      <view class="field-row">
        <text class="field-label">站点描述</text>
        <textarea class="field-textarea" v-model="siteForm.siteDescription" placeholder="让学习更有价值" />
      </view>
    </view>
  </view>

  <!-- 认证配置 -->
  <view class="config-card">
    <view class="card-header">
      <text class="card-icon">🔐</text>
      <text class="card-title">认证配置</text>
    </view>
    <view class="card-body">
      <view class="switch-row">
        <text class="field-label">三方登录</text>
        <switch :checked="siteForm.extraConfig.thirdPartyEnabled" @change="onExtraSwitch('thirdPartyEnabled', $event)" color="#07c160" />
      </view>
      <view class="switch-row">
        <text class="field-label">SSO登录</text>
        <switch :checked="siteForm.extraConfig.ssoEnabled" @change="onExtraSwitch('ssoEnabled', $event)" color="#07c160" />
      </view>
      <view class="switch-row">
        <text class="field-label">注册开关</text>
        <switch :checked="siteForm.extraConfig.registerEnabled" @change="onExtraSwitch('registerEnabled', $event)" color="#07c160" />
      </view>
    </view>
  </view>

  <!-- 渠道配置 -->
  <view class="config-card">
    <view class="card-header">
      <text class="card-icon">📡</text>
      <text class="card-title">渠道配置</text>
    </view>
    <view class="card-body">
      <view class="switch-row">
        <text class="field-label">允许跨渠道</text>
        <switch :checked="siteForm.extraConfig.allowCrossChannel" @change="onExtraSwitch('allowCrossChannel', $event)" color="#07c160" />
      </view>
      <view class="switch-row">
        <text class="field-label">渠道邀请</text>
        <switch :checked="siteForm.extraConfig.channelInviteEnabled" @change="onExtraSwitch('channelInviteEnabled', $event)" color="#07c160" />
      </view>
    </view>
  </view>

  <!-- 积分配置 -->
  <view class="config-card">
    <view class="card-header">
      <text class="card-icon">💰</text>
      <text class="card-title">积分配置</text>
    </view>
    <view class="card-body">
      <view class="switch-row">
        <text class="field-label">积分系统</text>
        <switch :checked="siteForm.extraConfig.pointsEnabled" @change="onExtraSwitch('pointsEnabled', $event)" color="#07c160" />
      </view>
      <view class="field-row">
        <text class="field-label">签到积分</text>
        <input class="field-input" v-model="siteForm.extraConfig.signInPoints" type="number" />
      </view>
      <view class="switch-row">
        <text class="field-label">积分兑换</text>
        <switch :checked="siteForm.extraConfig.redemptionEnabled" @change="onExtraSwitch('redemptionEnabled', $event)" color="#07c160" />
      </view>
    </view>
  </view>

  <!-- 课程配置 -->
  <view class="config-card">
    <view class="card-header">
      <text class="card-icon">📚</text>
      <text class="card-title">课程配置</text>
    </view>
    <view class="card-body">
      <view class="switch-row">
        <text class="field-label">课程预览</text>
        <switch :checked="siteForm.extraConfig.coursePreviewEnabled" @change="onExtraSwitch('coursePreviewEnabled', $event)" color="#07c160" />
      </view>
      <view class="switch-row">
        <text class="field-label">进度记录</text>
        <switch :checked="siteForm.extraConfig.lessonProgressEnabled" @change="onExtraSwitch('lessonProgressEnabled', $event)" color="#07c160" />
      </view>
    </view>
  </view>

  <button class="btn-save" @click="saveSiteConfig" :loading="siteSaving">保存站点配置</button>
</scroll-view>
```

- [ ] **Step 5: 在onMounted中加载站点配置**

```javascript
onMounted(async () => {
  loading.value = true
  await Promise.all([loadSiteConfig(), loadThirdList(), loadOssSettings(), loadSsoList(), loadFlagList(), loadChannelAlert()])
  loading.value = false
})
```

- [ ] **Step 6: 提交修改**

```bash
git add E:\code\web\pages\system\config.vue
git commit -m "feat(web): 添加站点配置Tab"
```

---

### Task 7: course/form.vue集成开关控制

**Files:**
- Modify: `E:\code\web\pages\course\form.vue`

- [ ] **Step 1: 读取当前form.vue**

Read: `E:\code\web\pages\course\form.vue`（重点关注积分设置和跨渠道设置区域）

- [ ] **Step 2: 导入配置工具**

```javascript
import { loadSiteConfig, isFeatureEnabled } from '../../src/utils/config-helper.js'
```

- [ ] **Step 3: 添加开关控制变量**

```javascript
const showPointsSection = ref(true)
const showCrossChannelSection = ref(false)
```

- [ ] **Step 4: 在onMounted中加载配置**

```javascript
onMounted(async () => {
  // ... 其他初始化代码
  
  // 加载站点配置
  await loadSiteConfig()
  showPointsSection.value = isFeatureEnabled('pointsEnabled')
  showCrossChannelSection.value = isFeatureEnabled('allowCrossChannel')
})
```

- [ ] **Step 5: 用v-if控制积分设置区域显示**

找到积分设置区域的template部分，添加v-if：

```vue
<!-- 积分设置 -->
<view v-if="showPointsSection" class="form-section">
  <view class="section-title">积分设置</view>
  <view class="switch-row">
    <text class="field-label">启用积分</text>
    <switch :checked="form.enablePoints" @change="form.enablePoints = $event.detail.value" color="#07c160" />
  </view>
  <view v-if="form.enablePoints" class="field-row">
    <text class="field-label">积分值</text>
    <input class="field-input" v-model="form.points" type="number" placeholder="完成课程获得的积分" />
  </view>
  <view v-if="form.enablePoints" class="field-row">
    <text class="field-label">积分类型</text>
    <picker mode="selector" :range="['固定', '百分比']" @change="onPointsTypeChange">
      <view class="picker-input">{{ form.pointsType === 'fixed' ? '固定' : '百分比' }}</view>
    </picker>
  </view>
</view>
```

- [ ] **Step 6: 用v-if控制跨渠道设置区域显示**

找到跨渠道设置区域的template部分，添加v-if：

```vue
<!-- 跨渠道设置 -->
<view v-if="showCrossChannelSection" class="form-section">
  <view class="section-title">跨渠道设置</view>
  <view class="switch-row">
    <text class="field-label">允许跨渠道</text>
    <switch :checked="form.allowCrossChannel" @change="form.allowCrossChannel = $event.detail.value" color="#07c160" />
  </view>
  <view v-if="form.allowCrossChannel" class="field-hint">
    <text class="hint-text">开启后，非所属渠道的用户也可以学习此课程</text>
  </view>
</view>
```

- [ ] **Step 7: 提交修改**

```bash
git add E:\code\web\pages\course\form.vue
git commit -m "feat(web): 课程表单集成全局开关控制"
```

---

### Task 8: login/index.vue集成渠道邀请开关

**Files:**
- Modify: `E:\code\web\pages\login\index.vue`

- [ ] **Step 1: 读取当前login/index.vue**

Read: `E:\code\web\pages\login\index.vue`

- [ ] **Step 2: 导入配置工具**

```javascript
import { loadSiteConfig, isFeatureEnabled } from '../../src/utils/config-helper.js'
```

- [ ] **Step 3: 添加开关控制变量**

```javascript
const showChannelInviteInput = ref(true)
```

- [ ] **Step 4: 在onMounted中加载配置**

```javascript
onMounted(async () => {
  // ... 其他初始化代码
  
  // 加载站点配置
  await loadSiteConfig()
  showChannelInviteInput.value = isFeatureEnabled('channelInviteEnabled')
})
```

- [ ] **Step 5: 用v-if控制渠道邀请码输入框显示**

找到渠道邀请码输入区域的template部分，添加v-if：

```vue
<!-- 渠道邀请码输入 -->
<view v-if="showChannelInviteInput && channelInviteCode" class="channel-invite-tip">
  <view class="tip-icon">🏢</view>
  <view class="tip-content">
    <text class="tip-title">渠道邀请</text>
    <text class="tip-text">登录后将自动加入渠道</text>
  </view>
</view>
```

- [ ] **Step 6: 提交修改**

```bash
git add E:\code\web\pages\login\index.vue
git commit -m "feat(web): 登录页集成渠道邀请开关"
```

---

### Task 9: SSO应用默认参数填充

**Files:**
- Modify: `E:\code\web\pages\system\config.vue`

- [ ] **Step 1: 修改addSsoApp函数**

找到addSsoApp函数，修改为：

```javascript
async function addSsoApp() {
  // 从站点配置读取默认SSO登录地址
  const ssoLoginUrl = siteForm.value.extraConfig?.ssoLoginUrl || ''
  
  uni.showModal({
    title: '新增 SSO 应用',
    editable: true,
    placeholderText: '请输入应用名称',
    success: async (res) => {
      if (res.confirm && res.content) {
        try {
          const appCode = 'app_' + Date.now()
          const defaultRedirectUris = [
            'http://localhost:3000',
            'http://localhost:1337',
          ]
          
          // 如果有SSO登录地址，添加到回调列表
          if (ssoLoginUrl) {
            try {
              const origin = new URL(ssoLoginUrl).origin
              defaultRedirectUris.push(origin)
            } catch {
              // URL解析失败，忽略
            }
          }
          
          await createSsoApp({
            app_name: res.content,
            app_code: appCode,
            is_active: true,
            redirect_uris: defaultRedirectUris,
            allowed_grant_types: ['authorization_code', 'refresh_token'],
          })
          uni.showToast({ title: '创建成功', icon: 'success' })
          loadSsoList()
        } catch {
          uni.showToast({ title: '创建失败', icon: 'none' })
        }
      }
    }
  })
}
```

- [ ] **Step 2: 提交修改**

```bash
git add E:\code\web\pages\system\config.vue
git commit -m "feat(web): SSO应用创建填充默认参数"
```

---

### Task 10: 三方配置默认参数填充

**Files:**
- Modify: `E:\code\web\pages\system\config.vue`

- [ ] **Step 1: 添加getDefaultExtraConfig函数**

```javascript
function getDefaultExtraConfig(platform, appType) {
  const defaults = {
    wechat: {
      official_account: {
        token_hint: '请输入Token',
        encodingAesKey_hint: '请输入EncodingAESKey',
        oauthScope: 'snsapi_base',
      },
      mini_program: {
        oauthScope: 'snsapi_base',
      },
      open_platform: {
        componentAccessToken_hint: '请输入ComponentToken',
        preAuthCode_hint: '请输入预授权码',
      },
    },
    alipay: {
      default: {
        alipayPublicKey_hint: '请输入支付宝公钥',
        signType: 'RSA2',
      },
    },
    douyin: {
      default: {
        paymentMerchantId_hint: '请输入商户号',
        paymentSalt_hint: '请输入Salt',
        paymentToken_hint: '请输入Token',
      },
    },
  }
  
  return defaults[platform]?.[appType] || defaults[platform]?.default || {}
}
```

- [ ] **Step 2: 修改saveThird函数**

找到saveThird函数，修改为：

```javascript
async function saveThird(item) {
  item._saving = true
  try {
    // 获取平台默认配置
    const defaultExtraConfig = getDefaultExtraConfig(item.platform, item.appType)
    
    const data = {
      platform: item.platform,
      appType: item.appType,
      appId: item.appId || '',
      appSecret: item.appSecret || '',
      enabled: item.enabled,
      requireAuth: item.requireAuth,
      // 合并默认配置和用户输入
      extraConfig: {
        ...defaultExtraConfig,
        ...item.extraConfig,
      },
    }
    await updateThirdPartyConfig(item.documentId || item.id, data)
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadThirdList()
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    item._saving = false
  }
}
```

- [ ] **Step 3: 提交修改**

```bash
git add E:\code\web\pages\system\config.vue
git commit -m "feat(web): 三方配置保存填充默认参数"
```

---

### Task 11: 集成测试

- [ ] **Step 1: 启动后端服务**

```bash
cd E:\code\basic
npm run develop
```

等待服务启动完成，检查日志中是否有 `[zhao-common] Default site-config created`

- [ ] **Step 2: 测试zhao-third路由**

使用curl或浏览器测试：

```bash
curl -X GET http://localhost:1337/zhao-third/v1/admin/third-party-configs -H "Authorization: Bearer <token>"
```

预期：返回三方配置列表（空列表或已有配置）

- [ ] **Step 3: 测试zhao-common站点配置**

```bash
curl -X GET http://localhost:1337/zhao-common/v1/admin/site-config -H "Authorization: Bearer <token>"
```

预期：返回默认配置，包含extraConfig中的所有参数

- [ ] **Step 4: 测试公开接口**

```bash
curl -X GET http://localhost:1337/zhao-common/v1/site-config/public
```

预期：返回公开配置（不含敏感信息）

- [ ] **Step 5: 启动前端服务**

```bash
cd E:\code\web
npm run dev:h5
```

- [ ] **Step 6: 测试前端站点配置页面**

访问 http://localhost:3000/pages/system/config，检查：
- 站点配置Tab是否显示
- 各配置项是否正确显示
- 保存是否成功

- [ ] **Step 7: 测试开关控制功能**

1. 关闭积分系统开关
2. 访问课程表单页面，检查积分设置区域是否隐藏
3. 开启积分系统开关
4. 再次访问课程表单页面，检查积分设置区域是否显示

- [ ] **Step 8: 测试SSO应用创建**

1. 在站点配置中设置ssoLoginUrl（如 http://example.com）
2. 创建新的SSO应用
3. 检查redirect_uris是否包含 http://example.com 的origin

- [ ] **Step 9: 提交测试记录**

```bash
git add -A
git commit -m "test: 完成集成测试"
```

---

## 自审检查

**1. Spec覆盖：**
- ✓ 路由修复：Task 1
- ✓ 默认数据填充：Task 3
- ✓ 前端API：Task 4
- ✓ 配置工具：Task 5
- ✓ 站点配置Tab：Task 6
- ✓ 开关控制：Task 7, Task 8
- ✓ SSO默认参数：Task 9
- ✓ 三方默认参数：Task 10
- ✓ 测试：Task 11

**2. Placeholder扫描：**
- 无TBD、TODO等占位符
- 所有代码步骤都有完整代码

**3. 类型一致性：**
- extraConfig字段在所有任务中保持一致
- API路径在前后端保持一致

---

Plan complete and saved to `docs/superpowers/plans/2026-06-17-web-config-enhancement.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
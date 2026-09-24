# Web后台配置完善设计文档

## 1. 问题诊断

### 1.1 路由不匹配问题

| 插件 | 后端路由 | 前端API调用 | 问题 |
|------|---------|------------|------|
| zhao-third | `/configs` | `/zhao-third/v1/admin/third-party-configs` | 路径不匹配，保存失败 |
| zhao-sso | `/v1/admin/apps` | `/zhao-sso/v1/admin/apps` | 匹配正确 |
| zhao-common | `/v1/admin/site-config` | 无前端API | 缺失前端页面和API |

### 1.2 缺失功能

- zhao-common参数设置：后端已有site-config，但前端没有对应页面和API
- 跨渠道全局开关：课程级别已有，缺少全局开关
- SSO默认参数：创建SSO应用时缺少默认redirect_uris等参数
- 三方登录默认参数：创建三方配置时缺少默认extraConfig

---

## 2. 设计方案

采用方案A：扩展现有site-config，利用extraConfig存储业务参数。

---

## 3. 后端修改

### 3.1 zhao-third路由修复

**文件**：`E:\code\plugins\zhao-third\server\src\routes\admin.ts`

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

### 3.2 zhao-common content-api路由补充

**文件**：`E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts`

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

### 3.3 默认数据填充

**文件**：`E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts`

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

---

## 4. 前端修改

### 4.1 新增site-config API

**文件**：`E:\code\web\src\api\site-config.js`

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

### 4.2 配置读取工具

**文件**：`E:\code\web\src\utils\config-helper.js`

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

### 4.3 system/config.vue改造

**新增Tab**：
```javascript
const tabs = [
  { key: 'site', label: '站点配置' },
  { key: 'third', label: '三方平台' },
  { key: 'oss', label: '对象存储' },
  { key: 'sso', label: 'SSO 应用' },
  { key: 'flags', label: '功能开关' },
]
```

**站点配置内容**：按类别分组展示（站点信息、认证配置、渠道配置、积分配置、课程配置、安全配置），每个类别一个config-card。

---

## 5. 开关影响范围

### 5.1 渠道配置开关

| 开关 | 影响页面 | 影响功能 |
|-----|---------|---------|
| allowCrossChannel | course/form.vue | 跨渠道设置区域显示/隐藏 |
| channelInviteEnabled | login/index.vue | 渠道邀请码输入框显示/隐藏 |
| defaultChannelScope | course/form.vue | 创建课程时默认渠道范围 |

### 5.2 积分配置开关

| 开关 | 影响页面 | 影响功能 |
|-----|---------|---------|
| pointsEnabled | course/form.vue, dashboard/index.vue | 积分设置区域、积分统计卡片 |
| signInPoints | shao/pages/index.vue | 签到积分提示 |
| redemptionEnabled | points/redemption.vue | 积分兑换页面 |

### 5.3 课程配置开关

| 开关 | 影响页面 | 影响功能 |
|-----|---------|---------|
| coursePreviewEnabled | course/form.vue | 预览设置区域 |
| lessonProgressEnabled | course/form.vue | 进度设置区域 |

---

## 6. SSO和三方登录默认参数

### 6.1 SSO应用默认参数

创建SSO应用时自动填充：
- redirect_uris：从站点配置的ssoLoginUrl读取，加上localhost默认地址
- allowed_grant_types：['authorization_code', 'refresh_token']
- app_secret：自动生成

### 6.2 三方配置默认参数

根据平台类型填充默认extraConfig：
- wechat/official_account：token_hint、encodingAesKey_hint、oauthScope
- wechat/mini_program：oauthScope
- alipay：alipayPublicKey_hint、signType
- douyin：paymentMerchantId_hint、paymentSalt_hint

---

## 7. 测试计划

### 7.1 后端测试

1. 启动后端服务，检查bootstrap是否创建默认配置
2. 测试 `/zhao-third/v1/admin/third-party-configs` 路由是否正常
3. 测试 `/zhao-common/v1/admin/site-config` 获取和更新
4. 测试 `/zhao-common/v1/site-config/public` 公开接口

### 7.2 前端测试

1. 访问系统配置页面，检查站点配置Tab是否显示
2. 测试各配置项保存是否成功
3. 测试开关控制功能区域显示/隐藏
4. 测试SSO应用创建是否填充默认参数
5. 测试三方配置保存是否填充默认参数

---

## 8. 文件清单

### 后端修改
- `E:\code\plugins\zhao-third\server\src\routes\admin.ts` - 路由修复
- `E:\code\basic\plugins\zhao-common\server\src\routes\content-api.ts` - 新增公开路由
- `E:\code\basic\plugins\zhao-common\server\src\routes\index.ts` - 注册content-api路由
- `E:\code\basic\plugins\zhao-common\server\src\bootstrap.ts` - 默认数据填充

### 前端修改
- `E:\code\web\src\api\site-config.js` - 新建API文件
- `E:\code\web\src\api\index.js` - 导出site-config
- `E:\code\web\src\utils\config-helper.js` - 新建配置工具
- `E:\code\web\pages\system\config.vue` - 新增站点配置Tab
- `E:\code\web\pages\course\form.vue` - 集成开关控制
- `E:\code\web\pages\login\index.vue` - 集成渠道邀请开关
- `E:\code\web\pages\dashboard\index.vue` - 集成积分开关

---

设计完成，待用户审查。
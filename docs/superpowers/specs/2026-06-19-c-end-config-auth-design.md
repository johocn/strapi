# C端配置聚合与微信自动登录设计

## 问题

`shao/services/auth-config.ts` 调用 `/zhao-common/v1/public/config`，但该接口只返回 `{ site, featureFlags, points }`，不包含认证配置（mode/methods/wechatEnabled）。导致微信环境 `mode` 始终为 `undefined`，降级为 `local`，微信小程序不会触发静默登录。

## 方案

### 后端：getPublicConfig 增加 auth 字段

在 `zhao-common` 插件的 `getPublicConfig()` 中，通过 `strapi.plugin('zhao-auth')` 读取认证配置，合并到返回数据中。

**修改文件**: `E:\code\basic\plugins\zhao-common\server\src\services\config.ts`

在 `getPublicConfig()` 方法末尾增加：

```typescript
// 认证配置公开字段
try {
  const authService = strapi.plugin("zhao-auth")?.service("auth");
  if (authService && typeof authService.config === "function") {
    const authConfig = await authService.config();
    result.auth = {
      mode: authConfig.mode,
      methods: authConfig.methods,
      wechatEnabled: authConfig.wechatEnabled,
      thirdPartyEnabled: authConfig.thirdPartyEnabled ?? authConfig.wechatEnabled,
      ssoEnabled: authConfig.ssoEnabled ?? false,
      registerEnabled: authConfig.registerEnabled ?? true,
      ssoLoginUrl: authConfig.ssoLoginUrl ?? null,
      inviteCodeRequired: authConfig.inviteCodeRequired ?? false,
    };
  }
} catch (error) {
  strapi.log.warn("[config] getPublicConfig auth failed:", (error as Error).message);
}
```

**返回数据结构**:

```json
{
  "data": {
    "site": { "siteName": "...", "logo": "...", ... },
    "auth": {
      "mode": "third",
      "methods": ["password", "sms", "wechat"],
      "wechatEnabled": true,
      "thirdPartyEnabled": true,
      "ssoEnabled": false,
      "registerEnabled": true,
      "ssoLoginUrl": null,
      "inviteCodeRequired": false
    },
    "featureFlags": { ... },
    "points": { ... }
  }
}
```

### C端：auth-config.ts 适配新结构

**修改文件**: `E:\code\shao\services\auth-config.ts`

`fetchAuthConfig()` 从返回数据中同时提取 `site` 和 `auth` 字段，映射到 `AuthConfig` 接口：

```typescript
export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig) return cachedConfig

  try {
    const res = await request('/zhao-common/v1/public/config') as any
    const data = res?.data || res

    const config: AuthConfig = {
      // 站点信息
      siteName: data.site?.siteName || DEFAULT_CONFIG.siteName,
      siteDescription: data.site?.siteDescription || DEFAULT_CONFIG.siteDescription,
      logo: data.site?.logo || DEFAULT_CONFIG.logo,
      favicon: data.site?.favicon || DEFAULT_CONFIG.favicon,
      shareTitle: data.site?.shareTitle || DEFAULT_CONFIG.shareTitle,
      shareDescription: data.site?.shareDescription || DEFAULT_CONFIG.shareDescription,
      shareImage: data.site?.shareImage || DEFAULT_CONFIG.shareImage,
      sharePath: DEFAULT_CONFIG.sharePath,

      // 认证配置
      mode: data.auth?.mode || DEFAULT_CONFIG.mode,
      authMode: data.auth?.mode || DEFAULT_CONFIG.authMode,
      methods: data.auth?.methods || DEFAULT_CONFIG.methods,
      ssoLoginUrl: data.auth?.ssoLoginUrl ?? DEFAULT_CONFIG.ssoLoginUrl,
      wechatEnabled: data.auth?.wechatEnabled ?? DEFAULT_CONFIG.wechatEnabled,
      thirdPartyEnabled: data.auth?.thirdPartyEnabled ?? DEFAULT_CONFIG.thirdPartyEnabled,
      ssoEnabled: data.auth?.ssoEnabled ?? DEFAULT_CONFIG.ssoEnabled,
      registerEnabled: data.auth?.registerEnabled ?? DEFAULT_CONFIG.registerEnabled,
      inviteCodeRequired: data.auth?.inviteCodeRequired ?? DEFAULT_CONFIG.inviteCodeRequired,

      // 功能开关
      pointsEnabled: data.featureFlags?.pointsEnabled ?? DEFAULT_CONFIG.pointsEnabled,
      signInPoints: data.featureFlags?.signInPoints ?? DEFAULT_CONFIG.signInPoints,
      coursePreviewEnabled: data.featureFlags?.coursePreviewEnabled ?? DEFAULT_CONFIG.coursePreviewEnabled,
      lessonProgressEnabled: data.featureFlags?.lessonProgressEnabled ?? DEFAULT_CONFIG.lessonProgressEnabled,
      channelInviteEnabled: data.featureFlags?.channelInviteEnabled ?? DEFAULT_CONFIG.channelInviteEnabled,
      allowCrossChannel: data.featureFlags?.allowCrossChannel ?? DEFAULT_CONFIG.allowCrossChannel,
    }

    cachedConfig = config
    return config
  } catch (e) {
    console.warn('[auth-config] 获取认证配置失败，使用默认配置:', e)
    return DEFAULT_CONFIG
  }
}
```

### 不需要改动的部分

- **App.vue**: 已正确判断 `authConfig.mode === 'third' && authConfig.wechatEnabled`，无需修改
- **login.vue**: 已根据 `authMode` 显示不同登录界面，无需修改
- **wx-login.ts**: 静默登录逻辑已完善，无需修改
- **zhao-auth 插件**: 不需要新增路由，通过插件间通信获取配置

### 微信自动登录流程

```
App.vue onLaunch
  → fetchAuthConfig() 请求 /zhao-common/v1/public/config
  → 返回 { site, auth: { mode: "third", wechatEnabled: true }, ... }
  → 检测 mode === 'third' && wechatEnabled === true
  → #ifdef MP-WEIXIN
  → silentLogin() 调用 wx.login 获取 code
  → 发送 code 到后端 /v1/third/callback
  → 获取 token，存储到 storage
  → 用户无感知完成登录
```

### 约束

- 后端只返回非敏感认证字段，不暴露密钥/secret
- 遵循 Strapi 插件间通信规范：`strapi.plugin('zhao-auth').service('auth').config()`
- C端单次请求获取所有配置，减少网络开销

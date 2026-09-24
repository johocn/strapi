# 站点配置管理页面补全 & 删除 Feature Flag

## 背景

当前 `extraConfig` 统一存储了 30+ 配置参数，但前端 `site-config.vue` 只展示了约 20 个，缺少安全、支付/通知、三方登录子项、SSO URL、用户必填项等。同时 `feature-flag` content-type 已无业务调用方，与 extraConfig 数据源重复，导致数据不一致。

## 决策

1. **删除 feature-flag** — content-type、service、路由、前端页面和API全部移除
2. **补全 site-config.vue** — 将 extraConfig 所有参数补齐到页面，每个字段加 hint 提示

## 一、site-config.vue 补全

### 分组与字段（12组）

| # | 分组 | 已有字段 | 需补齐字段 |
|---|------|----------|------------|
| 1 | 基本设置 | siteName, siteDescription, logo, favicon, icpNumber, customerServiceUrl | - |
| 2 | SEO设置 | seoKeywords, seoDescription | - |
| 3 | 地图服务 | tencentMapKey | - |
| 4 | 分享设置 | shareTitle, shareDescription, shareImage, sharePath | - |
| 5 | 认证配置 | authMode, thirdPartyEnabled, ssoEnabled, registerEnabled, inviteCodeRequired | ssoLoginUrl, wechatMiniProgramEnabled, wechatOfficialAccountEnabled, alipayEnabled, douyinEnabled, passwordMinLength, passwordRequireComplexity |
| 6 | 渠道配置 | allowCrossChannel, channelInviteEnabled, defaultChannelScope | - |
| 7 | 积分配置 | pointsEnabled, signInPoints, maxPointsPerDay, redemptionEnabled | pointsExpireDays, pointsMinRedemption, pointsRuleEnabled |
| 8 | 课程配置 | coursePreviewEnabled, lessonProgressEnabled, courseEnrollEnabled | courseCommentEnabled, courseRatingEnabled |
| 9 | 用户设置 | - | userAvatarRequired, userPhoneRequired, userEmailRequired |
| 10 | 支付/通知 | - | paymentEnabled, smsEnabled, emailEnabled |
| 11 | 安全设置 | - | captchaEnabled, rateLimitEnabled, loginAttemptLimit, loginLockDuration, sessionTimeout |
| 12 | 维护模式 | - | maintenanceMode, debugMode |

### Hint 提示规则

每个字段在 label 下方显示灰色小字提示，说明参数含义和推荐值：

- `authMode` → "登录方式：local(账号密码) / third(三方登录) / sso(单点登录)"
- `ssoLoginUrl` → "SSO登录页面URL，如 https://sso.example.com/login"
- `wechatMiniProgramEnabled` → "启用微信小程序登录，需先在第三方配置中设置AppID"
- `wechatOfficialAccountEnabled` → "启用微信公众号登录，需先在第三方配置中设置AppID"
- `alipayEnabled` → "启用支付宝登录，需先在第三方配置中设置AppID"
- `douyinEnabled` → "启用抖音登录，需先在第三方配置中设置AppID"
- `passwordMinLength` → "密码最小长度，建议6-12"
- `passwordRequireComplexity` → "要求密码包含大小写+数字+特殊字符"
- `pointsExpireDays` → "积分过期天数，0=永不过期"
- `pointsMinRedemption` → "最低兑换积分门槛"
- `pointsRuleEnabled` → "是否启用积分规则引擎"
- `courseCommentEnabled` → "是否开放课程评论"
- `courseRatingEnabled` → "是否开放课程评分"
- `userAvatarRequired` → "注册时头像是否必填"
- `userPhoneRequired` → "注册时手机号是否必填"
- `userEmailRequired` → "注册时邮箱是否必填"
- `paymentEnabled` → "是否启用在线支付"
- `smsEnabled` → "是否启用短信通知"
- `emailEnabled` → "是否启用邮件通知"
- `captchaEnabled` → "是否启用验证码"
- `rateLimitEnabled` → "是否启用接口限流"
- `loginAttemptLimit` → "登录失败锁定阈值，建议5次"
- `loginLockDuration` → "登录锁定时长(分钟)，建议30"
- `sessionTimeout` → "会话超时时间(分钟)，建议120"
- `maintenanceMode` → "维护模式，开启后C端显示维护页面"
- `debugMode` → "调试模式，开启后输出详细日志"

### 前端 form 数据结构

补齐后 form ref 包含所有 extraConfig 字段，loadConfig 和 handleSave 同步更新。

### 交互约定

- 布尔开关用 `<switch>` 组件
- 数字输入用 `<input type="number">`
- 文本输入用 `<input>`
- 长文本用 `<textarea>`
- 选择器用 `<picker>`
- hint 用 `<text class="form-hint">` 显示在 label 下方

## 二、删除 Feature Flag

### 前端删除清单

| 文件 | 操作 |
|------|------|
| `pages/featureFlag/list.vue` | 删除 |
| `src/api/featureFlag.js` | 删除 |
| `src/api/config.js` 中 flags 相关函数 | 删除 getFeatureFlags/getFeatureFlag/createFeatureFlag/updateFeatureFlag/deleteFeatureFlag |
| `pages.json` 中 featureFlag 路由 | 删除 |

### 后端删除清单

| 文件 | 操作 |
|------|------|
| `content-types/feature-flag/schema.json` | 删除目录 |
| `services/feature-flag.ts` | 删除 |
| `services/index.ts` | 移除 feature-flag 导出 |
| `controllers/config.ts` 中 flags 相关方法 | 删除 |
| `routes/admin.ts` 中 flags 相关路由 | 删除 |

### 数据迁移

无需迁移。feature-flag 表中的数据已不再被任何业务代码引用，删除 content-type 后 Strapi 不会自动删除数据库表，但不再有代码访问它。如需清理数据库可手动执行 `DROP TABLE zhao_feature_flags`。

## 三、影响范围

- **C端(shao)**: 不受影响，`getPublicConfig()` 已从 extraConfig 读取
- **后端API**: `getSite()` / `updateSite()` 已从 extraConfig 读写，无变更
- **前端web**: site-config.vue 补全字段，featureFlag 页面删除
- **Strapi后台**: feature-flag content-type 消失，Content Manager 不再展示该模型

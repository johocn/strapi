# 站点配置管理页面补全 & 删除 Feature Flag 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 site-config.vue 所有 extraConfig 字段（含 hint 提示），删除废弃的 feature-flag 模块

**Architecture:** 前端 site-config.vue 增量补齐 12 个分组 30+ 字段，后端删除 feature-flag content-type/service/controller/路由，前端删除 featureFlag 页面和 API

**Tech Stack:** Strapi 5 插件, Vue 3 (uni-app), TypeScript

---

### Task 1: 后端删除 feature-flag content-type

**Files:**
- Delete: `E:\code\basic\plugins\zhao-common\server\src\content-types\feature-flag\schema.json`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\content-types\index.ts`

- [ ] **Step 1: 删除 feature-flag schema 目录**

删除 `E:\code\basic\plugins\zhao-common\server\src\content-types\feature-flag\` 整个目录（含 schema.json）

- [ ] **Step 2: 更新 content-types/index.ts，移除 feature-flag 导出**

```typescript
import siteConfig from "./site-config/schema.json";

export default {
  "site-config": { schema: siteConfig },
};
```

- [ ] **Step 3: 编译验证**

Run: `cd E:\code\basic\plugins\zhao-common && npx strapi-plugin build`
Expected: 编译成功，无 feature-flag 相关错误

---

### Task 2: 后端删除 feature-flag service

**Files:**
- Delete: `E:\code\basic\plugins\zhao-common\server\src\services\feature-flag.ts`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\services\index.ts`

- [ ] **Step 1: 删除 feature-flag.ts**

删除 `E:\code\basic\plugins\zhao-common\server\src\services\feature-flag.ts`

- [ ] **Step 2: 更新 services/index.ts，移除 feature-flag 导出**

```typescript
import logger from "./logger";
import errorHandler from "./error-handler";
import configManager from "./config-manager";
import i18n from "./i18n";
import softDelete from "./soft-delete";
import siteConfig from "./site-config";
import config from "./config";

export default {
  logger,
  "error-handler": errorHandler,
  "config-manager": configManager,
  i18n,
  "soft-delete": softDelete,
  "site-config": siteConfig,
  config,
};
```

---

### Task 3: 后端删除 feature-flag controller

**Files:**
- Delete: `E:\code\basic\plugins\zhao-common\server\src\controllers\feature-flag.ts`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\controllers\index.ts`

- [ ] **Step 1: 删除 feature-flag controller**

删除 `E:\code\basic\plugins\zhao-common\server\src\controllers\feature-flag.ts`

- [ ] **Step 2: 更新 controllers/index.ts，移除 feature-flag 导出**

```typescript
import config from "./config";
import softDelete from "./soft-delete";
import siteConfig from "./site-config";

export default {
  config,
  "soft-delete": softDelete,
  "site-config": siteConfig,
};
```

---

### Task 4: 后端删除 feature-flag 路由和 config service 中的 flags 方法

**Files:**
- Modify: `E:\code\basic\plugins\zhao-common\server\src\routes\admin.ts`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\controllers\config.ts`
- Modify: `E:\code\basic\plugins\zhao-common\server\src\services\config.ts`

- [ ] **Step 1: 从 admin.ts 删除 feature-flag 路由（5条）和 config/flags 路由（5条）**

删除以下路由行：
```
adminRoute("GET", "/feature-flags", "feature-flag.find", "feature-flag.read"),
adminRoute("GET", "/feature-flags/:flagKey", "feature-flag.findOne", "feature-flag.read"),
adminRoute("POST", "/feature-flags", "feature-flag.create", "feature-flag.create"),
adminRoute("PUT", "/feature-flags/:flagKey", "feature-flag.update", "feature-flag.update"),
adminRoute("DELETE", "/feature-flags/:flagKey", "feature-flag.delete", "feature-flag.delete"),
adminRoute("GET", "/config/flags", "config.getFlags", "config.read"),
adminRoute("GET", "/config/flags/:documentId", "config.getFlagOne", "config.read"),
adminRoute("POST", "/config/flags", "config.createFlag", "config.create"),
adminRoute("PUT", "/config/flags/:documentId", "config.updateFlag", "config.update"),
adminRoute("DELETE", "/config/flags/:documentId", "config.deleteFlag", "config.delete"),
```

- [ ] **Step 2: 从 controllers/config.ts 删除 flags 相关方法**

删除 `getFlags`, `getFlagOne`, `createFlag`, `updateFlag`, `deleteFlag` 五个方法

- [ ] **Step 3: 从 services/config.ts 删除 flags 相关方法**

删除 `getFeatureFlags`, `getFeatureFlag`, `createFeatureFlag`, `updateFeatureFlag`, `deleteFeatureFlag` 五个方法

- [ ] **Step 4: 从 bootstrap.ts 删除 FEATURE_FLAG_UID 常量**

删除 `const FEATURE_FLAG_UID = "plugin::zhao-common.feature-flag";` 这行

- [ ] **Step 5: 编译验证**

Run: `cd E:\code\basic\plugins\zhao-common && npx strapi-plugin build`
Expected: 编译成功

---

### Task 5: 前端删除 featureFlag 页面和 API

**Files:**
- Delete: `E:\code\web\pages\featureFlag\list.vue`
- Delete: `E:\code\web\src\api\featureFlag.js`
- Modify: `E:\code\web\pages.json`
- Modify: `E:\code\web\src\api\config.js`

- [ ] **Step 1: 删除 featureFlag 页面和 API 文件**

删除 `E:\code\web\pages\featureFlag\list.vue`
删除 `E:\code\web\src\api\featureFlag.js`

- [ ] **Step 2: 从 pages.json 删除 featureFlag 路由**

删除：
```json
{
  "path": "pages/featureFlag/list",
  "style": {
    "navigationBarTitleText": "功能开关"
  }
},
```

- [ ] **Step 3: 从 src/api/config.js 删除 flags 相关函数**

删除 `getFeatureFlags`, `getFeatureFlag`, `createFeatureFlag`, `updateFeatureFlag`, `deleteFeatureFlag` 五个函数

---

### Task 6: 补全 site-config.vue — 认证配置分组

**Files:**
- Modify: `E:\code\web\pages\settings\site-config.vue`

- [ ] **Step 1: 在认证配置分组中补齐字段**

在现有 `ssoEnabled` switch 后面追加以下字段：

```vue
<!-- SSO登录地址 -->
<view class="form-item" v-if="form.ssoEnabled">
  <text class="form-label">SSO登录地址</text>
  <input v-model="form.ssoLoginUrl" class="form-input" placeholder="如 https://sso.example.com/login" />
  <text class="form-hint">SSO登录页面URL，启用SSO后必填</text>
</view>
<!-- 微信小程序登录 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">微信小程序登录</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.wechatMiniProgramEnabled" @change="form.wechatMiniProgramEnabled = $event.detail.value" color="#07c160" />
</view>
<!-- 微信公众号登录 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">微信公众号登录</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.wechatOfficialAccountEnabled" @change="form.wechatOfficialAccountEnabled = $event.detail.value" color="#07c160" />
</view>
<!-- 支付宝登录 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">支付宝登录</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.alipayEnabled" @change="form.alipayEnabled = $event.detail.value" color="#07c160" />
</view>
<!-- 抖音登录 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">抖音登录</text>
    <text class="form-hint">需先在第三方配置中设置AppID</text>
  </view>
  <switch :checked="form.douyinEnabled" @change="form.douyinEnabled = $event.detail.value" color="#07c160" />
</view>
<!-- 密码最小长度 -->
<view class="form-item">
  <text class="form-label">密码最小长度</text>
  <input type="number" v-model="form.passwordMinLength" class="form-input" placeholder="建议6-12" />
  <text class="form-hint">密码最小长度，建议6-12</text>
</view>
<!-- 密码复杂度要求 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">密码复杂度要求</text>
    <text class="form-hint">要求密码包含大小写+数字+特殊字符</text>
  </view>
  <switch :checked="form.passwordRequireComplexity" @change="form.passwordRequireComplexity = $event.detail.value" color="#07c160" />
</view>
```

- [ ] **Step 2: 在 form ref 中补齐对应字段**

在 form ref 中追加：
```javascript
ssoLoginUrl: '',
wechatMiniProgramEnabled: false,
wechatOfficialAccountEnabled: false,
alipayEnabled: false,
douyinEnabled: false,
passwordMinLength: 6,
passwordRequireComplexity: false,
```

- [ ] **Step 3: 在 loadConfig 中补齐字段映射**

在 loadConfig 的 form.value 赋值中追加：
```javascript
ssoLoginUrl: data.ssoLoginUrl || '',
wechatMiniProgramEnabled: data.wechatMiniProgramEnabled ?? false,
wechatOfficialAccountEnabled: data.wechatOfficialAccountEnabled ?? false,
alipayEnabled: data.alipayEnabled ?? false,
douyinEnabled: data.douyinEnabled ?? false,
passwordMinLength: data.passwordMinLength ?? 6,
passwordRequireComplexity: data.passwordRequireComplexity ?? false,
```

- [ ] **Step 4: 在 handleSave 中补齐字段提交**

在 handleSave 的 data 对象中追加：
```javascript
ssoLoginUrl: form.value.ssoLoginUrl || undefined,
wechatMiniProgramEnabled: form.value.wechatMiniProgramEnabled,
wechatOfficialAccountEnabled: form.value.wechatOfficialAccountEnabled,
alipayEnabled: form.value.alipayEnabled,
douyinEnabled: form.value.douyinEnabled,
passwordMinLength: Number(form.value.passwordMinLength) || 6,
passwordRequireComplexity: form.value.passwordRequireComplexity,
```

---

### Task 7: 补全 site-config.vue — 积分/课程/用户/支付/安全/维护分组

**Files:**
- Modify: `E:\code\web\pages\settings\site-config.vue`

- [ ] **Step 1: 在积分配置分组中补齐字段**

在 `redemptionEnabled` switch 后追加：

```vue
<!-- 积分过期天数 -->
<view class="form-item">
  <text class="form-label">积分过期天数</text>
  <input type="number" v-model="form.pointsExpireDays" class="form-input" placeholder="0=永不过期" />
  <text class="form-hint">积分过期天数，0=永不过期</text>
</view>
<!-- 最低兑换门槛 -->
<view class="form-item">
  <text class="form-label">最低兑换门槛</text>
  <input type="number" v-model="form.pointsMinRedemption" class="form-input" placeholder="最低兑换积分" />
  <text class="form-hint">最低兑换积分门槛</text>
</view>
<!-- 积分规则引擎 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">积分规则引擎</text>
    <text class="form-hint">是否启用积分规则引擎</text>
  </view>
  <switch :checked="form.pointsRuleEnabled" @change="form.pointsRuleEnabled = $event.detail.value" color="#07c160" />
</view>
```

- [ ] **Step 2: 在课程配置分组中补齐字段**

在 `courseEnrollEnabled` switch 后追加：

```vue
<!-- 课程评论 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">课程评论</text>
    <text class="form-hint">是否开放课程评论</text>
  </view>
  <switch :checked="form.courseCommentEnabled" @change="form.courseCommentEnabled = $event.detail.value" color="#07c160" />
</view>
<!-- 课程评分 -->
<view class="form-item switch-item">
  <view>
    <text class="form-label">课程评分</text>
    <text class="form-hint">是否开放课程评分</text>
  </view>
  <switch :checked="form.courseRatingEnabled" @change="form.courseRatingEnabled = $event.detail.value" color="#07c160" />
</view>
```

- [ ] **Step 3: 在课程配置分组后追加用户设置分组**

```vue
<!-- 用户设置 -->
<view class="form-section-title">用户设置</view>
<view class="form-card">
  <view class="form-item switch-item">
    <view>
      <text class="form-label">头像必填</text>
      <text class="form-hint">注册时头像是否必填</text>
    </view>
    <switch :checked="form.userAvatarRequired" @change="form.userAvatarRequired = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">手机号必填</text>
      <text class="form-hint">注册时手机号是否必填</text>
    </view>
    <switch :checked="form.userPhoneRequired" @change="form.userPhoneRequired = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">邮箱必填</text>
      <text class="form-hint">注册时邮箱是否必填</text>
    </view>
    <switch :checked="form.userEmailRequired" @change="form.userEmailRequired = $event.detail.value" color="#07c160" />
  </view>
</view>
```

- [ ] **Step 4: 追加支付/通知分组**

```vue
<!-- 支付与通知 -->
<view class="form-section-title">支付与通知</view>
<view class="form-card">
  <view class="form-item switch-item">
    <view>
      <text class="form-label">在线支付</text>
      <text class="form-hint">是否启用在线支付</text>
    </view>
    <switch :checked="form.paymentEnabled" @change="form.paymentEnabled = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">短信通知</text>
      <text class="form-hint">是否启用短信通知</text>
    </view>
    <switch :checked="form.smsEnabled" @change="form.smsEnabled = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">邮件通知</text>
      <text class="form-hint">是否启用邮件通知</text>
    </view>
    <switch :checked="form.emailEnabled" @change="form.emailEnabled = $event.detail.value" color="#07c160" />
  </view>
</view>
```

- [ ] **Step 5: 追加安全设置分组**

```vue
<!-- 安全设置 -->
<view class="form-section-title">安全设置</view>
<view class="form-card">
  <view class="form-item switch-item">
    <view>
      <text class="form-label">验证码</text>
      <text class="form-hint">是否启用验证码</text>
    </view>
    <switch :checked="form.captchaEnabled" @change="form.captchaEnabled = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">接口限流</text>
      <text class="form-hint">是否启用接口限流</text>
    </view>
    <switch :checked="form.rateLimitEnabled" @change="form.rateLimitEnabled = $event.detail.value" color="#07c160" />
  </view>
  <view class="form-item">
    <text class="form-label">登录失败锁定阈值</text>
    <input type="number" v-model="form.loginAttemptLimit" class="form-input" placeholder="建议5次" />
    <text class="form-hint">连续登录失败多少次后锁定，建议5次</text>
  </view>
  <view class="form-item">
    <text class="form-label">登录锁定时长(分钟)</text>
    <input type="number" v-model="form.loginLockDuration" class="form-input" placeholder="建议30" />
    <text class="form-hint">登录锁定时长(分钟)，建议30</text>
  </view>
  <view class="form-item">
    <text class="form-label">会话超时(分钟)</text>
    <input type="number" v-model="form.sessionTimeout" class="form-input" placeholder="建议120" />
    <text class="form-hint">会话超时时间(分钟)，建议120</text>
  </view>
</view>
```

- [ ] **Step 6: 追加维护模式分组**

```vue
<!-- 维护模式 -->
<view class="form-section-title">维护模式</view>
<view class="form-card">
  <view class="form-item switch-item">
    <view>
      <text class="form-label">维护模式</text>
      <text class="form-hint">开启后C端显示维护页面</text>
    </view>
    <switch :checked="form.maintenanceMode" @change="form.maintenanceMode = $event.detail.value" color="#ff4d4f" />
  </view>
  <view class="form-item switch-item">
    <view>
      <text class="form-label">调试模式</text>
      <text class="form-hint">开启后输出详细日志</text>
    </view>
    <switch :checked="form.debugMode" @change="form.debugMode = $event.detail.value" color="#ff9800" />
  </view>
</view>
```

- [ ] **Step 7: 在 form ref 中补齐所有新字段**

追加到 form ref：
```javascript
pointsExpireDays: 0,
pointsMinRedemption: 100,
pointsRuleEnabled: true,
courseCommentEnabled: false,
courseRatingEnabled: false,
userAvatarRequired: false,
userPhoneRequired: true,
userEmailRequired: false,
paymentEnabled: false,
smsEnabled: false,
emailEnabled: false,
captchaEnabled: false,
rateLimitEnabled: true,
loginAttemptLimit: 5,
loginLockDuration: 30,
sessionTimeout: 120,
maintenanceMode: false,
debugMode: false,
```

- [ ] **Step 8: 在 loadConfig 中补齐字段映射**

追加到 loadConfig：
```javascript
pointsExpireDays: data.pointsExpireDays ?? 0,
pointsMinRedemption: data.pointsMinRedemption ?? 100,
pointsRuleEnabled: data.pointsRuleEnabled ?? true,
courseCommentEnabled: data.courseCommentEnabled ?? false,
courseRatingEnabled: data.courseRatingEnabled ?? false,
userAvatarRequired: data.userAvatarRequired ?? false,
userPhoneRequired: data.userPhoneRequired ?? true,
userEmailRequired: data.userEmailRequired ?? false,
paymentEnabled: data.paymentEnabled ?? false,
smsEnabled: data.smsEnabled ?? false,
emailEnabled: data.emailEnabled ?? false,
captchaEnabled: data.captchaEnabled ?? false,
rateLimitEnabled: data.rateLimitEnabled ?? true,
loginAttemptLimit: data.loginAttemptLimit ?? 5,
loginLockDuration: data.loginLockDuration ?? 30,
sessionTimeout: data.sessionTimeout ?? 120,
maintenanceMode: data.maintenanceMode ?? false,
debugMode: data.debugMode ?? false,
```

- [ ] **Step 9: 在 handleSave 中补齐字段提交**

追加到 handleSave 的 data 对象：
```javascript
pointsExpireDays: Number(form.value.pointsExpireDays) || 0,
pointsMinRedemption: Number(form.value.pointsMinRedemption) || 100,
pointsRuleEnabled: form.value.pointsRuleEnabled,
courseCommentEnabled: form.value.courseCommentEnabled,
courseRatingEnabled: form.value.courseRatingEnabled,
userAvatarRequired: form.value.userAvatarRequired,
userPhoneRequired: form.value.userPhoneRequired,
userEmailRequired: form.value.userEmailRequired,
paymentEnabled: form.value.paymentEnabled,
smsEnabled: form.value.smsEnabled,
emailEnabled: form.value.emailEnabled,
captchaEnabled: form.value.captchaEnabled,
rateLimitEnabled: form.value.rateLimitEnabled,
loginAttemptLimit: Number(form.value.loginAttemptLimit) || 5,
loginLockDuration: Number(form.value.loginLockDuration) || 30,
sessionTimeout: Number(form.value.sessionTimeout) || 120,
maintenanceMode: form.value.maintenanceMode,
debugMode: form.value.debugMode,
```

---

### Task 8: 添加 form-hint 样式

**Files:**
- Modify: `E:\code\web\pages\settings\site-config.vue`

- [ ] **Step 1: 在 `<style scoped>` 中添加 hint 样式**

```css
.form-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}
```

---

### Task 9: 编译后端并验证

**Files:** 无新文件

- [ ] **Step 1: 编译 zhao-common 插件**

Run: `cd E:\code\basic\plugins\zhao-common && npx strapi-plugin build`
Expected: 编译成功，无 feature-flag 相关错误

- [ ] **Step 2: 重启 Strapi 验证**

Run: `cd E:\code\basic && npm run develop`
Expected: 启动成功，无 feature-flag UID 报错

- [ ] **Step 3: 验证 admin 接口**

Run:
```powershell
$r = Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-auth/v1/login" -Method POST -ContentType "application/json" -Body '{"identifier":"1117","password":"a123456"}'; $t = $r.jwt; $h = @{Authorization="Bearer $t"}; Invoke-RestMethod -Uri "http://localhost:1337/zhao-common/v1/admin/config/site" -Headers $h
```
Expected: 返回包含所有 extraConfig 字段的 data 对象

- [ ] **Step 4: 验证 feature-flag 路由已删除**

Run:
```powershell
Invoke-RestMethod -Uri "http://localhost:1337/zhao-common/v1/admin/feature-flags" -Headers $h
```
Expected: 404

- [ ] **Step 5: 验证公开配置接口**

Run:
```powershell
Invoke-RestMethod -Uri "http://localhost:1337/api/zhao-common/v1/public/config"
```
Expected: 返回 site + auth + featureFlags + points 结构

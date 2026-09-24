# 粗细粒度配置去重设计

## 背景

当前系统中租户管理（tenant/detail.vue）的粗粒度功能开关与站点配置（site-config.vue）的细粒度开关存在 3 处语义重复，导致用户在两个页面修改同一功能，后端读取优先级不明确。

## 问题清单

### 问题 1：3 处字段重复

| 粗粒度（tenant/detail.vue featureFlags） | 细粒度（site-config.vue extraConfig） | 重复语义 |
|---|---|---|
| `sso` | `ssoEnabled` | SSO 登录开关 |
| `points` | `pointsEnabled` | 积分模块开关 |
| `thirdParty` | `thirdPartyEnabled` | 三方登录开关 |

### 问题 2：前端读取 key 错误

- `dashboard/index.vue:426` 读取 `config.featureFlags?.pointsEnabled`，但 featureFlags 中的 key 是 `points` 不是 `pointsEnabled`，导致永远返回 true
- `shao/auth-config.ts:141` 同样读取 `data.featureFlags?.pointsEnabled`，存在相同 bug

### 问题 3：模板加载 404

实测确认：Strapi 重建后 API 路由 `GET /api/zhao-common/v1/admin/templates` 存在（返回 403 需认证）。404 是之前 dist 未重建导致，无需代码改动。

## 设计方案

### 去重原则

- featureFlags 粗粒度 = 模块总开关（开/关）
- extraConfig 细粒度 = 模块内参数值（如 signInPoints、ssoLoginUrl、各平台开关）

### 字段处理

| 字段 | 处理方式 | 说明 |
|---|---|---|
| `ssoEnabled` | 细粒度删除，从 `featureFlags.sso` 读取 | 与粗粒度 sso 语义相同 |
| `pointsEnabled` | 细粒度删除，从 `featureFlags.points` 读取 | 与粗粒度 points 语义相同 |
| `thirdPartyEnabled` | 细粒度删除，从 `featureFlags.thirdParty` 读取 | 与粗粒度 thirdParty 语义相同 |
| `ssoLoginUrl` | 保留 | SSO 登录地址是参数 |
| `signInPoints` | 保留 | 每日积分是参数 |
| 各平台开关 | 保留 | 控制具体启用哪些平台 |

## 改动范围

### 前端 web（4 个文件）

#### 1. site-config.vue — 删除 3 个重复开关

- 删除 `thirdPartyEnabled` UI（L124-126）+ form 默认值（L496）+ 读取（L590）+ 提交（L691）
- 删除 `ssoEnabled` UI（L128-130）+ form 默认值（L497）+ 读取（L591）+ 提交（L692）
- 删除 `pointsEnabled` UI（L217-219）+ form 默认值（L503）+ 读取（L597）+ 提交（L698）
- `ssoLoginUrl` 显示条件：`v-if="form.ssoEnabled"` → `v-if="isFieldVisible('ssoLoginUrl')"`

#### 2. tenant/detail.vue — authConfig.ssoEnabled 改读 featureFlags

- L152 switch 绑定：`formData.authConfig.ssoEnabled` → `formData.featureFlags.sso`
- L154 v-if 条件：`formData.authConfig.ssoEnabled` → `formData.featureFlags.sso`
- L600 默认值：`ssoEnabled: false` → 删除（featureFlags.sso 已有默认值）
- L684 读取：`ssoEnabled: ec.ssoEnabled ?? false` → 删除
- L938 校验：`formData.authConfig.ssoEnabled` → `formData.featureFlags.sso`

#### 3. config-helper.js — 保留 FEATURE_TO_MODULE 映射

- `pointsEnabled: 'points'` 保留不变（isFeatureEnabled 仍先查 featureFlags.points 短路）
- 第 128 行回退检查 `cachedConfig?.featureFlags?.[key]` 对 pointsEnabled 会查不到（因后端不再返回 pointsEnabled 在 featureFlags 中），但 `cachedConfig?.points?.moduleEnabled` 仍可回退

#### 4. dashboard/index.vue:426 — 修复 key 错误

- `config.featureFlags?.pointsEnabled ?? true` → `config.featureFlags?.points !== false`

### 前端 shao（1 个文件）

#### shao/auth-config.ts:141 — 修复 key 错误

- `data.featureFlags?.pointsEnabled` → `data.featureFlags?.points`

### 后端 zhao-common（1 个文件）

#### config.ts getPublicConfig — 3 个字段改为从 featureFlags 读取

| 行号 | 当前代码 | 改为 |
|---|---|---|
| L372-377 | 从各平台开关推导 thirdPartyEnabled | `const thirdPartyEnabled = siteFeatureFlags.thirdParty ?? false` |
| L383 | `authMode === "sso" \|\| ec.ssoEnabled` | `authMode === "sso" \|\| siteFeatureFlags.sso` |
| L394 | `thirdPartyEnabled`（推导值） | `thirdPartyEnabled`（= featureFlags.thirdParty） |
| L395 | `ec.ssoEnabled ?? false` | `siteFeatureFlags.sso ?? false` |
| L413 | `ec.pointsEnabled ?? true` | `siteFeatureFlags.points ?? true` |
| L433 | `ec.pointsEnabled ?? true` | `siteFeatureFlags.points ?? true` |

## 不改动的部分

- featureFlags 的 7 个粗粒度开关 UI（tenant/detail.vue）保留不变
- site-config.vue 中其他细粒度字段（signInPoints、各平台开关、courseCommentEnabled 等）保留不变
- API 返回的 featureFlags.pointsEnabled/ssoEnabled/thirdPartyEnabled 字段保留，但值改为从 featureFlags.points/sso/thirdParty 读取（向后兼容，前端旧代码仍可读取）

## 模板 404 问题

无需代码改动。Strapi 重建后路由存在，404 是 dist 未重建导致。

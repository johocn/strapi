# 多租户权限与功能开关架构设计

**日期**: 2026-07-02
**状态**: 设计完成待审查
**作者**: 架构设计（brainstorming）

---

## 一、背景与目标

### 1.1 业务背景

系统存在两类用户：

| 用户类型 | 登录入口 | 跨租户行为 | 权限来源 |
|---|---|---|---|
| C 端消费级用户 | shao 目录 | 可跨租户访问内容 | 仅按渠道看课程 |
| Web 渠道注册用户 | web 目录 | 必须属于租户的渠道 | zhao-auth 系统角色 + 渠道范围 |

核心约束：**渠道用户必须属于租户的渠道**。用户与租户无直接关联，通过渠道间接归属租户（用户 → 渠道 → 渠道-租户关联表 `zhao_channels_sites_lnk`）。

### 1.2 现状问题

1. **两套 featureFlags 断裂**：粗粒度（`featureFlags` 列）与细粒度（`extraConfig` JSON）无联动
2. **config-helper.js 取值 bug**：`isFeatureEnabled(key)` 从顶层取值，应从 `featureFlags` 嵌套对象取值，导致积分等开关恒返回 false
3. **课时表单无开关控制**：`lesson/form.vue` 积分区块始终显示，不受 `pointsEnabled` 控制
4. **channel-admin 无法分配权限**：默认无 `role.assign`/`role.revoke`，渠道管理员无法管理渠道成员权限
5. **自定义角色无层级**：可任意创建，但无层级约束，存在同级互相提权风险
6. **租户访问无校验**：`has-channel-scope` 仅注入 channelScope，未校验"渠道必须与当前租户关联"
7. **细粒度配置无渠道维度**：所有渠道共享同一套细粒度配置，无法按渠道差异化

### 1.3 设计目标

- 支持租户功能差异化（场景 B）
- 支持渠道管理员按渠道分配权限（场景 D）
- 支持自定义角色与层级管控（场景 A）
- 支持品牌定制（场景 E，已基本实现）
- 细粒度配置支持渠道维度覆盖

---

## 二、架构总览

### 2.1 角色层级模型

| 角色 | level | 来源 | 职责 |
|---|---|---|---|
| admin | 100 | 系统预设 | 全部权限 + 系统配置 |
| channel-admin | 80 | 系统预设 | 新建租户、粗粒度开关、角色授权、渠道管理 |
| plugin-manager | 60 | 系统预设 | 细粒度 featureFlags 配置（含渠道维度） |
| instructor | 40 | 系统预设 | 课程/课时业务操作 |
| user | 20 | 系统预设 | 无管理权限 |
| 自定义角色 | 1-99 | 创建时指定 | 必须 < 创建者 level |

**层级规则**：
- 创建角色：操作者只能创建 `level < 自己 level` 的角色
- 分配角色：操作者只能分配 `level ≤ 自己 level` 的角色给其他用户
- admin（100）可创建/分配任意层级角色

### 2.2 权限分配矩阵

**完整权限矩阵（含菜单 + 功能）**：

| 权限 key | admin | channel-admin | plugin-manager | instructor | user |
|---|---|---|---|---|---|
| `tenant.create/read/update/delete` | ✅ | ✅（补全） | ❌ | ❌ | ❌ |
| `menu.tenant` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `menu.site-config` + `site-config.update` | ✅ | ✅（补全） | ✅（补全） | ❌ | ❌ |
| `menu.feature-flag` + `feature-flag.update` | ✅ | ✅（补全） | ❌ | ❌ | ❌ |
| `config.feature.update`（细粒度，新增） | ✅ | ✅ | ✅ | ❌ | ❌ |
| `channel.config.update`（渠道配置，新增） | ✅ | ✅ | ✅ | ❌ | ❌ |
| `menu.user-roles` | ✅ | ✅（补全） | ❌ | ❌ | ❌ |
| `role.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `role.assign/revoke/create` | ✅ | ✅（补全） | ❌ | ❌ | ❌ |
| `menu.course` + `course.read/create/update` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.lesson` + `lesson.read/create/update` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.category` + `course-category.read/create/update` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.tag` + `tag.read/create/update` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.knowledge` + `knowledge-point.read/create/update` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.progress` + `course-progress.read` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |
| `menu.lesson-progress` + `lesson-progress.read` | ✅ | ✅ | ✅ | ✅（补全 button） | ❌ |

**PERMISSION_TREE 新增权限 key**：

| 新增 key | 挂载位置 | 说明 |
|---|---|---|
| `config.feature.update` | `menu.feature-flag` 下 | 细粒度功能配置（与 `feature-flag.update` 粗粒度总开关并列） |
| `channel.config.update` | `menu.channel` 下 | 渠道级配置开关 |

**权限清理**：

| 清理项 | 处理 |
|---|---|
| 旧 `PERMISSIONS` 常量（permissions.ts 第 396-407 行） | 删除，统一用 `DEFAULT_ROLE_PERMISSIONS` |
| `menu.sso-center`/`menu.sso-dashboard`/`menu.sso-user`/`menu.sso-channel`/`menu.sso-log` | 删除冗余菜单，保留 `menu.sso` |

### 2.3 featureFlags 分层架构

保持两套分开，但明确分工与层级关系：

| 层级 | 位置 | 管理者 | 内容 | 作用域 |
|---|---|---|---|---|
| **粗粒度** | `tenant/detail.vue` | channel-admin 以上 | 模块总开关（sso/points/quiz/course/channel/thirdParty/oss） | 租户级 |
| **细粒度** | `settings/site-config.vue` | channel-admin 以上（含 plugin-manager） | 模块内配置（pointsEnabled/signInPoints/redemptionEnabled...） | 租户级 + 渠道级 |

**粗粒度控制细粒度可见性**：粗粒度 `points: false` 时，细粒度积分配置在表单中隐藏，运行时 `isFeatureEnabled('pointsEnabled')` 返回 false。

### 2.4 细粒度配置的渠道维度

**存储方案**：channel 表增加 `extraConfig` JSON 字段（方案 A）

**解析优先级**（高 → 低）：
1. 渠道级配置（`channel.extraConfig`）
2. 租户级配置（`site-config.extraConfig`）
3. 默认配置（`DEFAULT_CONFIG`）

**合并规则**：浅合并（渠道级覆盖租户级的同名字段，未覆盖的字段保留租户级值）

**示例**：
- 租户配置：`{ pointsEnabled: true, signInPoints: 10, redemptionEnabled: true }`
- 渠道A配置：`{ signInPoints: 20 }` → 解析为 `{ pointsEnabled: true, signInPoints: 20, redemptionEnabled: true }`
- 渠道B配置：`{ pointsEnabled: false }` → 解析为 `{ pointsEnabled: false }`（整个渠道关闭积分）

---

## 三、组件设计

### 3.1 角色层级管理

**后端改动**：

1. `permission.service.ts` 的 `createRole` 增加 `level` 参数：
   - 可选，默认 `user` 层级（20）
   - 校验 `level < 操作者 level`（非 admin）
   - 存储到 `zhao_permissions` 表新增 `level` 字段

2. `zhao_permissions` schema 增加 `level` 字段（integer，默认 20）

3. `role-management.service.ts` 的 `assignRole` 增加层级校验：
   - 查询被分配角色的 level
   - 校验 `被分配角色 level ≤ 操作者 level`（非 admin）
   - 失败抛 403

4. `ROLE_HIERARCHY` 扩展支持自定义角色：
   - 查询 `zhao_permissions` 表的 `level` 字段
   - 系统角色仍用硬编码层级

### 3.2 渠道管理员权限分配（方案 C）

**配置层**：
- `DEFAULT_ROLE_PERMISSIONS` 给 `channel-admin` 增加 `role.assign` / `role.revoke` / `role.create` / `tenant.*`

**服务层改进**（`role-management.service.ts` 的 `assignRole`）：

```
assignRole(userId, role, operatorId, reason):
  1. 校验操作者权限（has-permission policy 已做）
  2. 若操作者非 admin:
     a. 查询操作者归属渠道（channel-member where isCurrent=true）
     b. 校验被分配用户是操作者渠道成员（channel-member）
        - 失败抛 403 "只能分配自己渠道内成员"
     c. 查询被分配角色 level
     d. 校验 被分配角色 level ≤ 操作者 level
        - 失败抛 403 "不能分配同级或更高层级角色"
  3. 更新 user.zhaoRoles
  4. 若操作者非 admin:
     a. 自动创建 role-channel 记录（role + 操作者当前渠道）
     b. 确保 role-channel 不重复（幂等）
  5. 失效缓存 + 写日志
```

### 3.3 featureFlags 统一下发

**后端 `getPublicConfig` 改造**：

```
getPublicConfig(ctx):
  1. siteId = ctx.state.siteId（site-resolver 中间件已解析）
  2. siteConfig = site-config.getConfig(siteId)
  3. channelId = ctx.query.channel || ctx.state.channelId（可选）
  4. featureFlags = siteConfig.featureFlags（粗粒度）
  5. extraConfig = parseExtraConfig(siteConfig.extraConfig)
  6. 若 channelId:
     a. channel = channel.getById(channelId)
     b. channelExtra = parseExtraConfig(channel.extraConfig)
     c. extraConfig = { ...extraConfig, ...channelExtra }（浅合并）
  7. 返回 { site, auth, featureFlags, points: extraConfig, channel }
```

**前端 `config-helper.js` 修复**：

```js
// 修复前（bug）
export function isFeatureEnabled(key) {
  return cachedConfig?.[key] === true
}

// 修复后
// 细粒度 key → 粗粒度模块 key 映射
const FEATURE_TO_MODULE = {
  pointsEnabled: 'points',
  coursePreviewEnabled: 'course',
  lessonProgressEnabled: 'course',
  courseEnrollEnabled: 'course',
  channelInviteEnabled: 'channel',
  // ... 其他细粒度 key 按需补充
}

export function isFeatureEnabled(key) {
  // 1. 检查粗粒度模块总开关
  const moduleKey = FEATURE_TO_MODULE[key]
  if (moduleKey && cachedConfig?.featureFlags?.[moduleKey] === false) {
    return false
  }
  // 2. 检查细粒度开关（兼容 featureFlags 嵌套和 points 顶层两种结构）
  return cachedConfig?.featureFlags?.[key] === true ||
         cachedConfig?.points?.[key] === true
}
```

**`getDefaultConfig()` 结构对齐**：

```js
function getDefaultConfig() {
  return {
    site: { name: '', logo: '', domain: '' },
    auth: { mode: 'local', ssoLoginUrl: '' },
    featureFlags: {
      sso: false, points: true, quiz: true, course: true,
      channel: true, thirdParty: true, oss: false,
      // 细粒度默认值
      pointsEnabled: true, coursePreviewEnabled: true, ...
    },
    points: { signInPoints: 0, maxPointsPerDay: 0, ... },
    channel: null
  }
}
```

### 3.4 渠道维度细粒度配置

**channel schema 改动**（`zhao-channel` 插件）：

`server/src/content-types/channel/schema.json` 增加：
```json
{
  "extraConfig": {
    "type": "json",
    "default": "{}"
  }
}
```

**前端 `settings/site-config.vue` 增强**：

- 增加"配置作用域"选择器：租户级 / 渠道级
- 选渠道级时，增加渠道选择下拉
- 保存时根据作用域调用不同 API：
  - 租户级：`PUT /zhao-common/v1/admin/site-config`（现有）
  - 渠道级：`PUT /zhao-channel/v1/admin/channels/:id/config`（新增）

**新增 API**：
- `PUT /zhao-channel/v1/admin/channels/:id/config`：更新渠道 extraConfig（需 `channel.config.update` 权限）

### 3.5 租户访问校验

**新增 `has-tenant-access` policy**（`zhao-auth` 插件）：

```
has-tenant-access(policyContext, config, { strapi }):
  1. user = policyContext.state.user
  2. if !user → return false
  3. if user.roles.includes('admin') → return true
  4. siteId = policyContext.state.siteId（site-resolver 已解析）
  5. if !siteId → return true（未识别租户，放行由其他策略处理）
  6. userChannelIds = channel-scope.resolve(user).channelIds
  7. siteChannelIds = 查询 zhao_channels_sites_lnk where site_id = siteId
  8. if userChannelIds ∩ siteChannelIds ≠ ∅ → return true
  9. return false
```

**挂载位置**：租户管理类路由（`/admin/tenants/*`、`/admin/site-config/*`）

### 3.6 Web 端租户切换器

**背景**：Web 端是统一管理入口（localhost:5174），不靠域名识别租户。渠道用户归属多个租户时，需显式选择"当前管理的租户"。

**新增 API**：`GET /zhao-auth/v1/my/tenants`
- 返回当前用户可管理的租户列表
- 逻辑：查 channel-scope → 查 `zhao_channels_sites_lnk` → 返回关联租户列表
- admin 返回全部租户

**新增中间件**：`tenant-context-resolver`（`zhao-common` 插件）
- 优先级：`x-site-id` header > `?siteId` query > domain（host header，fallback 到 site-resolver）
- 写入 `ctx.state.siteId`
- 与现有 `site-resolver` 共存：`tenant-context-resolver` 先执行，未命中再走 `site-resolver`

**前端改动**：

1. **store 增加 tenantList + currentTenantId**：
   - 登录后调用 `GET /my/tenants` 加载可管理租户列表
   - 默认选第一个，存入 `currentTenantId`

2. **顶部增加租户切换下拉**：
   - 显示可管理租户列表
   - 切换时更新 `currentTenantId` + 重新加载配置

3. **request.js 增加 header 注入**：
   - 所有管理 API 请求自动带 `x-site-id: ${currentTenantId}`

4. **切换租户时重新加载**：
   - `GET /zhao-common/v1/public/config?siteId=xxx` 重新加载 featureFlags + extraConfig
   - 清空业务数据缓存（课程列表等）
   - 刷新 config-helper.js 缓存（详见 3.8）

5. **config-helper.js 支持租户上下文**：
   - `loadSiteConfig(siteId?)` 增加可选 siteId 参数
   - 传 siteId 时调用 `GET /public/config?siteId=xxx`
   - 未传时 fallback 到域名识别（C 端场景）
   - 切换租户时调用 `loadSiteConfig(currentTenantId)` 刷新缓存
   - 课程/课时表单的 `isFeatureEnabled(key)` 自动读取新租户配置

**细粒度配置归属**：配置已按 siteId 存储在 `zhao_site_configs` 表，每条记录的 `id` 即 siteId。管理者带不同 `x-site-id` 即加载不同租户的配置，无需额外归属字段。

### 3.7 C 端模板样式配置

**后端 `site-config` schema 增加 `themeConfig` 字段**：

```json
{
  "themeConfig": {
    "type": "json",
    "default": "{}"
  }
}
```

**themeConfig 结构**（基础视觉样式，5-8 个字段）：

```js
{
  primaryColor: "#667eea",       // 主题色（导航栏/按钮）
  secondaryColor: "#f0f2f5",     // 辅助色（背景）
  navStyle: "default",           // 导航样式（default/gradient/custom）
  cardStyle: "default",          // 卡片样式（default/rounded/shadow）
  tabBarColor: "#667eea",        // tabBar 颜色
  tabBarActiveColor: "#ffffff"   // tabBar 激活色
}
```

**五套预设模板（模仿知名教育网站配色）**：

新建租户时，后端 `site-template` 表默认生成五套预设模板，租户可在 `tenant/detail.vue` 选择其一或自定义：

| 模板 ID | 名称 | 风格参考 | primaryColor | secondaryColor | tabBarColor | tabBarActiveColor | navStyle | cardStyle |
|---|---|---|---|---|---|---|---|---|
| `coursera-blue` | Coursera 学术蓝 | Coursera | `#0056D2` | `#F4F7F6` | `#0056D2` | `#FFFFFF` | default | shadow |
| `khan-green` | Khan 学院绿 | Khan Academy | `#14BF95` | `#F5F9F8` | `#14BF95` | `#FFFFFF` | default | rounded |
| `udemy-violet` | Udemy 鲜艳紫 | Udemy | `#A435F0` | `#FAF7FF` | `#1C1D1F` | `#A435F0` | gradient | shadow |
| `edx-deep` | edX 深蓝学术 | edX | `#02262B` | `#E8ECEF` | `#02262B` | `#FFFFFF` | default | default |
| `netease-red` | 网易课堂红 | 网易云课堂 | `#D8232A` | `#FFF5F5` | `#D8232A` | `#FFFFFF` | default | shadow |

**预设模板生成逻辑**（`zhao-common` 插件 bootstrap）：

```js
// 启动时检查 site-template 表，若无预设模板则自动生成
async function initDefaultTemplates() {
  const existing = await strapi.db.query(TEMPLATE_UID).count()
  if (existing > 0) return

  const presets = [
    { name: 'coursera-blue', displayName: 'Coursera 学术蓝', themeConfig: {...}, isDefault: true },
    { name: 'khan-green', displayName: 'Khan 学院绿', themeConfig: {...} },
    { name: 'udemy-violet', displayName: 'Udemy 鲜艳紫', themeConfig: {...} },
    { name: 'edx-deep', displayName: 'edX 深蓝学术', themeConfig: {...} },
    { name: 'netease-red', displayName: '网易课堂红', themeConfig: {...} },
  ]

  for (const preset of presets) {
    await strapi.db.query(TEMPLATE_UID).create({ data: preset })
  }
}
```

**site-template schema 调整**：
- 增加 `themeConfig` JSON 字段（视觉样式配置）
- `presetConfig` 保留（运行时配置预设，与 themeConfig 解耦）

**新建租户默认模板**：
- `tenant/detail.vue` 新建时，`themeConfig` 默认应用 `coursera-blue` 模板
- 用户可在"模板样式"区块切换模板或自定义

**`getPublicConfig` 返回增加 themeConfig**：

```js
return { site, auth, featureFlags, points, theme: themeConfig }
```

**shao 端应用主题（需重新编码）**：

shao 目录当前无任何主题样式逻辑，需新增以下代码：

| 文件 | 改动类型 | 内容 |
|---|---|---|
| `services/theme.ts` | 新建 | 主题服务：拉取/缓存/解析 themeConfig |
| `App.vue` | 修改 | onLaunch 调用 theme 服务，应用主题 |
| `utils/theme.ts` | 新建 | 主题工具：`applyTheme(config)` / `getPrimaryColor()` |
| `pages.json` | 修改 | 移除硬编码 `navigationBarBackgroundColor`，改运行时设置 |
| 全局 CSS | 修改 | 引入 CSS 变量 `--primary-color` 等，替代硬编码色值 |
| 各页面样式 | 修改 | 扫描所有 `.vue` 文件，替换硬编码 `#667eea` 为 `var(--primary-color)` |

**主题应用 API**：

```js
// shao/utils/theme.ts
export function applyTheme(themeConfig) {
  if (!themeConfig) return
  // 1. 设置 CSS 变量
  const root = document.documentElement
  root.style.setProperty('--primary-color', themeConfig.primaryColor)
  root.style.setProperty('--secondary-color', themeConfig.secondaryColor)

  // 2. 设置 tabBar 样式
  uni.setTabBarStyle({
    backgroundColor: themeConfig.tabBarColor,
    selectedColor: themeConfig.tabBarActiveColor,
  })

  // 3. 设置导航栏样式
  uni.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: themeConfig.primaryColor,
  })

  // 4. 缓存主题
  uni.setStorageSync('themeConfig', themeConfig)
}
```

**Web 端管理界面**：
- `pages/tenant/detail.vue` 增加"模板样式"区块
- 字段：模板选择（下拉选 5 套预设）、主题色（colorPicker）、导航样式、tabBar 颜色等
- 选择预设模板时自动填充 themeConfig 字段，仍可二次自定义
- 需 `config.update` 权限（粗粒度，channel-admin 已有）

**菜单可见性调整**：
- `menu.site-config` 从 `menu.system-center` 子树处理方式调整：channel-admin 的 `DEFAULT_ROLE_PERMISSIONS` 显式追加 `menu.site-config`（与 `menu.tenant` 处理方式一致）

### 3.8 业务表单的功能开关联动

**背景**：新增课程/课时等功能开关（如 `pointsEnabled`/`coursePreviewEnabled`/`lessonProgressEnabled`）需按当前选中租户的配置显隐。

**联动机制**：

```
切换租户 → currentTenantId 变更
  ↓
config-helper.js 刷新缓存（loadSiteConfig(currentTenantId)）
  ↓
课程/课时表单的 isFeatureEnabled(key) 读取新配置
  ↓
表单区块显隐刷新（积分设置/预览设置/进度设置等）
```

**受影响的表单**：

| 表单 | 开关字段 | 控制区块 |
|---|---|---|
| `pages/course/form.vue` | `pointsEnabled` | 积分设置区块 |
| `pages/course/form.vue` | `coursePreviewEnabled` | 预览设置区块 |
| `pages/course/form.vue` | `courseEnrollEnabled` | 报名设置区块 |
| `pages/course/lesson/form.vue` | `pointsEnabled` | 课时积分区块（修复后） |
| `pages/course/lesson/form.vue` | `lessonProgressEnabled` | 进度设置区块 |

**实现要点**：
1. 表单 onMounted 时调用 `loadSiteConfig(currentTenantId)` 确保配置最新
2. 监听 currentTenantId 变化（watch），自动刷新配置 + 重新计算 `showPointsSection` 等响应式变量
3. 未选中租户时（currentTenantId 为空），使用默认配置（所有开关默认开启）

---

## 四、数据流

### 4.1 用户登录与权限加载

```
用户登录（web）
  ↓
POST /admin/auth/local → 返回 JWT（含 zhaoRoles）
  ↓
GET /zhao-auth/v1/my/permission-keys → 返回权限集合
  ↓
GET /zhao-auth/v1/my/channel-scope → 返回渠道范围
  ↓
GET /zhao-auth/v1/my/tenants → 返回可管理租户列表
  ↓
前端 store 存储 token + roles + permissions + channelScope + tenantList + currentTenantId
  ↓
菜单/按钮根据 hasPermission(key) 显隐
```

### 4.2 租户切换与配置加载

**C 端用户（shao，靠域名识别）**：

```
用户访问域名（如 5.joho.cn）
  ↓
site-resolver 中间件 → 按 domain 查 zhao_site_configs → ctx.state.siteId
  ↓
GET /zhao-common/v1/public/config?domain=5.joho.cn
  ↓
getPublicConfig → 返回 { site, auth, featureFlags, points, theme }
  ↓
前端 config-helper.js 缓存配置
  ↓
isFeatureEnabled(key) 控制功能显隐 + themeConfig 应用主题样式
```

**Web 管理者（靠 x-site-id 识别）**：

```
用户登录 → 加载 tenantList → 默认选 T1
  ↓
所有 API 请求带 header: x-site-id: T1
  ↓
tenant-context-resolver 中间件 → 读 x-site-id → ctx.state.siteId = T1
  ↓
加载 T1 的 featureFlags + extraConfig + themeConfig
  ↓
用户切换到 T2
  ↓
更新 currentTenantId = T2 + 重新加载配置
  ↓
后续请求带 header: x-site-id: T2
```

### 4.3 渠道管理员分配权限

```
channel-admin 登录
  ↓
进入"用户角色"页面
  ↓
前端调用 GET /admin/users（需 role.read，channel-admin 已有）
  ↓
选择用户 → 选择角色（前端过滤 level ≤ 自己 level 的角色）
  ↓
POST /admin/roles/assign { userId, role }
  ↓
assignRole 服务：
  1. 校验被分配用户是操作者渠道成员
  2. 校验角色 level ≤ 操作者 level
  3. 更新 user.zhaoRoles
  4. 自动创建 role-channel 记录
  ↓
返回成功 → 前端刷新用户列表
```

### 4.4 plugin-manager 配置细粒度功能

```
plugin-manager 登录
  ↓
进入"站点配置"页面（settings/site-config.vue）
  ↓
选择"配置作用域"：租户级 / 渠道级
  ↓
若选渠道级 → 选择渠道
  ↓
编辑细粒度配置（pointsEnabled/signInPoints 等）
  ↓
保存：
  - 租户级 → PUT /zhao-common/v1/admin/site-config
  - 渠道级 → PUT /zhao-channel/v1/admin/channels/:id/config
  ↓
返回成功
```

---

## 五、错误处理

### 5.1 权限校验失败

| 场景 | HTTP 状态码 | 错误信息 |
|---|---|---|
| 非 admin 分配比自己高层级的角色 | 403 | 不能分配同级或更高层级角色 |
| 非 admin 分配非自己渠道成员 | 403 | 只能分配自己渠道内成员 |
| channel-admin 创建 level ≥ 80 的角色 | 403 | 不能创建同级或更高层级角色 |
| 无 `config.feature.update` 权限配置细粒度 | 403 | 无权访问该资源 |
| 用户访问非授权租户 | 403 | 无权访问该租户 |

### 5.2 配置解析失败

| 场景 | 处理方式 |
|---|---|
| `extraConfig` JSON 解析失败 | `parseExtraConfig` 已有 try/catch，返回默认配置 |
| 渠道 extraConfig 解析失败 | 跳过渠道配置，使用租户级配置 |
| siteId 为 null（域名未匹配） | 返回 `DEFAULT_CONFIG`（含 featureFlags 默认值） |

### 5.3 缓存失效

- 用户角色变更：`invalidateUserCache(userId)` 清除 `getUserEffectivePermissions` 缓存
- 租户配置变更：清除 `getPublicConfig` 的内存缓存（如有）
- 渠道配置变更：清除该渠道的 extraConfig 缓存

---

## 六、测试策略

### 6.1 角色层级测试

| 用例 | 预期结果 |
|---|---|
| admin 创建 level=90 的角色 | 成功 |
| channel-admin 创建 level=70 的角色 | 成功 |
| channel-admin 创建 level=80 的角色 | 403 |
| channel-admin 创建 level=90 的角色 | 403 |
| channel-admin 分配 instructor 给渠道成员 | 成功 |
| channel-admin 分配 channel-admin 给渠道成员 | 成功（同级可分配） |
| channel-admin 分配 admin 给渠道成员 | 403 |
| channel-admin 分配角色给非渠道成员 | 403 |

### 6.2 featureFlags 联动测试

| 用例 | 预期结果 |
|---|---|
| 粗粒度 `points: false` + 细粒度 `pointsEnabled: true` | `isFeatureEnabled('pointsEnabled')` 返回 false |
| 粗粒度 `points: true` + 细粒度 `pointsEnabled: false` | `isFeatureEnabled('pointsEnabled')` 返回 false |
| 粗粒度 `points: true` + 细粒度 `pointsEnabled: true` | `isFeatureEnabled('pointsEnabled')` 返回 true |
| 课程表单积分区块显隐 | 随 `pointsEnabled` 变化 |
| 课时表单积分区块显隐 | 随 `pointsEnabled` 变化（修复后） |

### 6.3 渠道维度配置测试

| 用例 | 预期结果 |
|---|---|
| 租户 `signInPoints: 10`，渠道A `signInPoints: 20` | 渠道A用户签到得 20 分 |
| 租户 `pointsEnabled: true`，渠道B `pointsEnabled: false` | 渠道B用户看不到积分功能 |
| 渠道C无 extraConfig | 使用租户级配置 |
| 渠道 extraConfig JSON 损坏 | 跳过渠道配置，使用租户级 |

---

## 七、实施顺序

### 阶段 1：立即修复（本次）

1. **修复 `config-helper.js` 取值 bug**：`isFeatureEnabled` 从 `featureFlags` 嵌套对象取值
2. **修复 `lesson/form.vue` 缺失开关控制**：增加 `v-if="showPointsSection"`
3. **后端 `DEFAULT_CONFIG` 补充 `featureFlags` 默认值**

### 阶段 2：权限配置与清理

4. **PERMISSION_TREE 新增权限 key**：`config.feature.update`（挂 `menu.feature-flag` 下）、`channel.config.update`（挂 `menu.channel` 下）
5. **channel-admin 权限补全**：追加 `menu.site-config`/`site-config.update`/`menu.feature-flag`/`feature-flag.update`/`config.feature.update`/`channel.config.update`/`menu.user-roles`/`role.assign`/`role.revoke`/`role.create`
6. **plugin-manager 权限补全**：追加 `menu.site-config`/`site-config.update`/`config.feature.update`/`channel.config.update`
7. **instructor 权限补全**：追加所有课程/课时/分类/标签/知识点/学习数据的 button 权限（read/create/update）
8. **删除旧 `PERMISSIONS` 常量**（permissions.ts 第 396-407 行），`role-management.service.ts` 的 `getMyPermissions` 改用新权限系统
9. **清理 SSO 冗余菜单**：删除 `menu.sso-center`/`menu.sso-dashboard`/`menu.sso-user`/`menu.sso-channel`/`menu.sso-log`，保留 `menu.sso`

### 阶段 3：角色层级

10. **`zhao_permissions` schema 增加 `level` 字段**
11. **`createRole` 支持 `level` 参数 + 层级校验**
12. **`assignRole` 增加层级校验**
13. **`ROLE_HIERARCHY` 扩展支持自定义角色**

### 阶段 4：渠道管理员权限分配

14. **`assignRole` 增加渠道成员校验**
15. **`assignRole` 自动创建 role-channel 记录**

### 阶段 5：细粒度配置渠道维度

16. **channel schema 增加 `extraConfig` 字段**
17. **新增 `PUT /zhao-channel/v1/admin/channels/:id/config` API**
18. **`getPublicConfig` 支持渠道维度合并**
19. **`settings/site-config.vue` 增加作用域选择器**

### 阶段 6：租户访问校验

20. **新增 `has-tenant-access` policy**
21. **挂载到租户管理类路由**

### 阶段 7：Web 端租户切换器

22. **新增 `GET /zhao-auth/v1/my/tenants` API**：返回当前用户可管理租户列表
23. **新增 `tenant-context-resolver` 中间件**：读 `x-site-id` header 写入 `ctx.state.siteId`
24. **前端 store 增加 tenantList + currentTenantId**
25. **顶部增加租户切换下拉**
26. **request.js 自动注入 `x-site-id` header**
27. **切换租户时重新加载配置**
28. **config-helper.js 的 `loadSiteConfig` 支持 siteId 参数**
29. **课程/课时表单监听 currentTenantId 变化，自动刷新功能开关显隐**

### 阶段 8：C 端模板样式配置

30. **`site-config` schema 增加 `themeConfig` 字段**
31. **`site-template` schema 增加 `themeConfig` 字段**
32. **zhao-common bootstrap 新增 `initDefaultTemplates`**：启动时检查并生成 5 套预设模板（coursera-blue / khan-green / udemy-violet / edx-deep / netease-red）
33. **`getPublicConfig` 返回增加 `theme`**
34. **`pages/tenant/detail.vue` 增加"模板样式"区块**：模板选择下拉 + 自定义 colorPicker

### 阶段 9：shao 端主题样式改造（重新编码）

35. **新建 `services/theme.ts`**：主题服务，拉取/缓存/解析 themeConfig
36. **新建 `utils/theme.ts`**：`applyTheme(config)` / `getPrimaryColor()` 工具函数
37. **修改 `App.vue`**：onLaunch 调用主题服务应用主题
38. **修改 `pages.json`**：移除硬编码 `navigationBarBackgroundColor: #667eea`
39. **修改全局 CSS**：引入 CSS 变量 `--primary-color` / `--secondary-color` 等
40. **扫描所有 `.vue` 文件**：替换硬编码 `#667eea` 等色值为 `var(--primary-color)` 等 CSS 变量
41. **测试 5 套预设模板切换**：每套模板配色正确应用，tabBar/导航栏/CSS 变量均生效

---

## 八、风险与缓解

### 8.1 系统角色启动覆盖

**风险**：bootstrap 的 `initDefaultRoles` 每次启动覆盖系统角色权限，channel-admin 新增的 `role.assign` 必须写入 `DEFAULT_ROLE_PERMISSIONS` 才持久。

**缓解**：所有系统角色权限调整都在 `permissions.ts` 的 `DEFAULT_ROLE_PERMISSIONS` 中修改，不依赖运行时手动配置。

### 8.2 自定义角色无继承

**风险**：自定义角色不参与 `ROLE_INHERITANCE`，权限合并时只返回 direct 权限。

**缓解**：自定义角色设计为"叶子角色"（不作为其他角色的父角色），权限独立配置。若需继承，手动在 `ROLE_INHERITANCE` 中添加。

### 8.3 旧权限系统迁移

**风险**：删除旧 `PERMISSIONS` 常量后，引用它的代码会编译失败。`role-management.service.ts` 的 `getMyPermissions` 当前混用两套机制。

**缓解**：阶段 2 第 8 项需先全局搜索 `PERMISSIONS` 的所有引用，逐一迁移到 `DEFAULT_ROLE_PERMISSIONS`，再删除常量。迁移顺序：
1. 搜索所有 `from "../permissions"` 导入 `PERMISSIONS` 的位置
2. 改用 `DEFAULT_ROLE_PERMISSIONS` 或 `getUserPermissions(role)` 函数
3. 删除旧常量
4. 运行 `npm run build` 验证无编译错误

### 8.4 权限清理的向后兼容

**风险**：删除 `menu.sso-center` 等冗余菜单后，已分配这些权限的 role 记录会变成"悬空权限"。

**缓解**：删除前先清理 `zhao_permissions` 表中这些 key 的记录，bootstrap 的 `syncSystemRolePermissions` 会自动同步。

## 九、权限核查清单

本节是对当前权限系统核查的结果，作为阶段 2 的实施依据。

### 9.1 当前 PERMISSION_TREE 结构问题

| 问题 | 位置 | 修复 |
|---|---|---|
| `config.feature.update` 未定义 | `menu.feature-flag` 下 | 新增 |
| `channel.config.update` 未定义 | `menu.channel` 下 | 新增 |
| `menu.sso-center` 等冗余 | `menu.system-center` 下 | 删除 5 个冗余菜单 |

### 9.2 当前 DEFAULT_ROLE_PERMISSIONS 问题

| 角色 | 缺失权限 | 修复 |
|---|---|---|
| channel-admin | `menu.site-config`/`site-config.update` | 追加（细粒度配置） |
| channel-admin | `menu.feature-flag`/`feature-flag.update` | 追加（粗粒度开关） |
| channel-admin | `config.feature.update`/`channel.config.update` | 追加（新增权限） |
| channel-admin | `menu.user-roles`/`role.assign`/`role.revoke`/`role.create` | 追加（角色分配） |
| plugin-manager | `menu.site-config`/`site-config.update` | 追加（细粒度配置） |
| plugin-manager | `config.feature.update`/`channel.config.update` | 追加（新增权限） |
| instructor | 所有 button 权限（course/lesson/category/tag/knowledge/progress） | 追加 read/create/update |

### 9.3 旧权限系统问题

| 问题 | 位置 | 修复 |
|---|---|---|
| 旧 `PERMISSIONS` 常量与新 `DEFAULT_ROLE_PERMISSIONS` 双轨制 | permissions.ts 第 396-407 行 | 删除旧常量，统一用新系统 |
| `role-management.service.ts` 的 `getMyPermissions` 混用两套 | role-management.service.ts | 改用 `getUserPermissions(role)` |

### 9.4 菜单可见性 vs 功能权限一致性

| 角色 | 修复前问题 | 修复后 |
|---|---|---|
| channel-admin | 有 `role.read` 但无 `menu.user-roles` 菜单 | 补全 `menu.user-roles` + `role.assign`/`revoke`/`create` |
| channel-admin | 无 `menu.site-config` 但设计要求配置细粒度 | 补全 `menu.site-config` + `site-config.update` |
| instructor | 有 `menu.course` 但无 `course.read` 等按钮权限 | 补全所有 button 权限 |

### 8.5 role-channel 自动绑定的渠道选择

**风险**：channel-admin 可能归属多个渠道，自动绑定哪个渠道？

**缓解**：使用 `channel-member.isCurrent=true` 的渠道作为"当前渠道"。若无 isCurrent，使用第一个归属渠道。

### 8.6 兼容性

**风险**：现有自定义角色（如有）无 level 字段。

**缓解**：`zhao_permissions` schema 增加 `level` 字段时设默认值 20（user 层级），现有记录自动补全。

---

## 十、不改动项

- **C 端用户系统**：保持域名识别架构，C 端用户不参与 web 管理权限
- **用户表不加 siteId**：通过渠道间接推导租户归属
- **zhao-auth 整体架构**：权限三层模型（用户 → zhaoRoles → 角色权限）不变
- **site-resolver 中间件**：域名识别租户逻辑不变
- **has-channel-scope policy**：channelScope 注入逻辑不变
- **现有课程可见性过滤逻辑**：admin/游客/登录用户分支已修复完成

## 十一、跨插件冲突清单与补充

本节是本次调整对其他插件的全面影响核查，作为实施前的兼容性参考。

### 11.1 后端编译级冲突（必须先迁移）

| 文件 | 问题 | 修复 |
|---|---|---|
| `zhao-auth/server/src/services/role-management.service.ts:3,459` | 直接 import `PERMISSIONS as PERMISSIONS_MAP`，删除旧常量会编译失败 | `computePermissions()` 改用 `DEFAULT_ROLE_PERMISSIONS` 实现，影响 `/my/permissions` 接口 |

**迁移顺序**：先迁移 `computePermissions()` → 验证 `/my/permissions` 接口正常 → 再删除旧 `PERMISSIONS` 常量。

### 11.2 权限 key 大面积缺失（非本次调整引入，但应一并补齐）

调研发现多个插件的 has-permission policy 使用的权限 key **不在 PERMISSION_TREE 中定义**，导致非 admin 用户访问这些路由全部 403。本次调整应一并补齐：

| 插件 | 缺失的权限 key | 应挂载位置 |
|---|---|---|
| **zhao-point** | `point.grant` / `point-type.*` / `point-rule.*` / `point-template.*` / `point-record.*` / `point-product.*` / `point-exchange.*` / `point-verification.read` / `point-dashboard.read` / `point-config.*` / `pickup-location.*` | `menu.point-center` 各子菜单下补 button 权限 |
| **zhao-quiz** | `quiz.read` / `quiz.update` / `exam.read` / `exam.update` / `quiz-record.read` | `menu.quiz-center` 各子菜单下补 button 权限 |
| **zhao-common** | `soft-delete.manage` / `soft-delete.read` / `config.read/create/update/delete` / `template.read/create/update/delete` | `menu.system-center` 下 `menu.soft-delete` / 补 `config.*` 到 `menu.site-config` / `template.*` 到新菜单 |
| **zhao-studio** | `zhao-studio.read/create/update/delete` | 新增 `menu.studio-center` 顶级菜单（或挂到现有菜单下） |
| **zhao-oss** | `oss.read` / `oss.upload` / `oss.delete` | `menu.oss` 下补 button 权限（与现有 `oss.dashboard/record/settings` 并列或合并） |

**影响**：不补齐的话，channel-admin / plugin-manager / instructor 即使有菜单权限，调用这些路由仍会被 403 拒绝。

### 11.3 has-tenant-access policy 挂载点

新增的 `has-tenant-access` policy 需挂载到以下 admin 路由（与 `has-channel-scope` 配合）：

| 插件 | 路由文件 | 路由类型 |
|---|---|---|
| zhao-channel | `server/src/routes/content-api.ts` | channelScopeRoute 全部 admin 路由 |
| zhao-common | `server/src/routes/content-api.ts` | adminRoute 全部 admin 路由 |
| zhao-course | `server/src/routes/content-api.ts` | channelScopeRoute admin 路由（public 路由无需） |
| zhao-point | `server/src/routes/content-api.ts` | channelScopeRoute 全部 admin 路由 |
| zhao-quiz | `server/src/routes/content-api.ts` | channelScopeRoute admin 路由（public 路由无需） |
| zhao-studio | `server/src/routes/content-api.ts` | adminRoute 全部 admin 路由 |
| zhao-wealth | `server/src/routes/content-api.ts` | 5 处 `has-channel-access` 路由（评估是否替换为 `has-tenant-access`） |

### 11.4 site-config / getPublicConfig 调用方

| 调用方 | 位置 | themeConfig 影响 |
|---|---|---|
| `zhao-common/server/src/services/config.ts:245` | 新版 `getPublicConfig` | 通过 `??` 兼容，无需改 |
| `zhao-common/server/src/services/site-config.ts:98` | 旧版 `getPublicConfig`（已 deprecated） | 只读 PUBLIC_FIELDS，无关 |
| `zhao-third/server/src/services/third-party-auth.ts:348` | 同名不同语义（三方平台 appId） | 无关 |
| `zhao-common/server/src/controllers/config.ts` | 写入逻辑（多处） | 需确认 themeConfig 子字段是否要写入 extraConfig |

### 11.5 channel schema 新增 extraConfig 影响

**无强制同步需求**：所有 `findMany/findOne` 均未用 `select` 显式过滤字段，新增字段会被自动包含。

**建议改造**：`zhao-channel/server/src/services/channel.ts` 的 create/update 显式 allow `extraConfig` 字段，否则会被 Strapi 默默丢弃。

### 11.6 前端冲突清单

#### Web 端（因后端权限 key 变更）

| 后端变更 | 影响文件 | 改造 |
|---|---|---|
| 删除 `menu.sso-center` 等 5 个 SSO 菜单 | `web/pages/dashboard/index.vue`（264-284 行） | 删除整段 SSO module-section |
| 同上 | `web/pages.json`（313-342 行） | 删除 5 个 SSO 路由注册 |
| 同上 | `web/pages/sso/*.vue`（5 文件） | 评估删除或保留为孤儿 |
| 同上 | `web/src/pages/sso/*.vue`（4 文件，副本） | 同步清理 |
| 新增 `config.feature.update` | `web/pages/tenant/detail.vue` / `site-config.vue` | 保存按钮加 `hasPermission` 控制（可选） |
| 新增 `channel.config.update` | `web/pages/channel/detail.vue`（如有） | channel 配置保存按钮加 `hasPermission`（可选） |
| 新增 `GET /my/tenants` API | `web/src/api/auth.js` / `web/src/store/user.js` | 新增 `getMyTenants` + `fetchTenants` + state |
| 新增 `tenant-context-resolver` 中间件 | 无直接冲突 | - |
| request.js 注入 `x-site-id` | `web/src/utils/request.js`（37-43, 126-131 行） | 两处 header 构造同步注入 |
| site-config 新增 `themeConfig` | `web/pages/tenant/detail.vue` | 新增 themeConfig 表单区块 + ColorPicker 组件 |

#### Web 端 store 改造（`web/src/store/user.js`）

- 新增 state：`tenantList` / `currentTenantId`
- 新增方法：`fetchTenants()` / `setCurrentTenant(id)`
- `loadFromStorage` 增加 `tadmin_tenant_list` / `tadmin_current_tenant_id` 读取
- `clearUser` 增加清理这两个 storage key
- `login` 的 `Promise.all` 追加 `fetchTenants()`
- `return` 块暴露新增的 state 和方法

#### Web 端 dashboard 顶部租户切换器

- 当前顶部布局（`dashboard/index.vue` 3-8 行）：`header-title` + `header-user` 两段式
- 改造为三段式：`header-title` + `tenant-switcher`（新增组件） + `header-user`
- 需新建 `web/src/components/TenantSwitcher.vue` 组件（点击展开下拉，单选，z-index > 100）
- 现有 `tag-picker-modal` 是底部弹出多选，不适合复用

#### Web 端 ColorPicker 组件

- 当前**无独立 ColorPicker 组件**
- 需新建 `web/src/components/ColorPicker.vue`
- H5 端可用 `<input type="color">`
- 小程序端需自定义颜色网格（参考 tag-picker-modal 模式）

### 11.7 shao 端主题改造工作量评估

**硬编码色值分布**：
- `#667eea` 出现 **100 处**
- `#764ba2` 出现约 **60 处**（与 `#667eea` 配对用于渐变）
- 分布在 **20 个文件**（17 个 .vue + pages.json + 2 处 .json）

**高密度文件 Top 5**：
| 文件 | 出现次数 |
|---|---|
| `pages/profile/profile.vue` | 11 |
| `pages/exchange/exchange.vue` | 11 |
| `pages/video-player/video-player.vue` | 11 |
| `pages/quiz/quiz.vue` | 9 |
| `pages/login/login.vue` | 7 |

**色值使用类型**：
- 渐变背景（`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`）：约 60 处
- 文字颜色：约 25 处
- 边框颜色：约 8 处
- 纯色背景：约 7 处

**改造难点**：
- 小程序端不支持 page 级 CSS 变量，需在 20 个页面 + 3 个组件内用内联 style 或动态 class 绑定
- `pages.json` 是构建时静态配置，必须通过运行时 API 修改

**建议分两阶段实施**：

| 阶段 | 范围 | 工作量 |
|---|---|---|
| **阶段 9a（MVP）** | 仅动态切换 `navigationBarBackgroundColor` + `tabBar selectedColor`（运行时 API），不改 CSS 硬编码 | 低 |
| **阶段 9b（完整）** | 引入 CSS 变量（H5 直接用，小程序用内联 style 绑定），逐步替换 100 处硬编码 | 高 |

## 十二、实施顺序（最终版）

### 阶段 1：立即修复（本次）
1. 修复 `config-helper.js` 取值 bug
2. 修复 `lesson/form.vue` 缺失开关控制
3. 后端 `DEFAULT_CONFIG` 补充 `featureFlags` 默认值

### 阶段 2：权限配置与清理
4. PERMISSION_TREE 新增 `config.feature.update` / `channel.config.update`
5. **补齐缺失权限 key**：zhao-point / zhao-quiz / zhao-common / zhao-studio / zhao-oss 的路由权限 key
6. channel-admin 权限补全
7. plugin-manager 权限补全
8. instructor 权限补全
9. 迁移 `role-management.service.ts` 的 `computePermissions()` 到新权限系统
10. 删除旧 `PERMISSIONS` 常量
11. 清理 SSO 冗余菜单（`menu.sso-center` 等 5 个）
12. 清理 web 端 SSO 菜单和路由（dashboard/index.vue + pages.json + pages/sso/*.vue）

### 阶段 3：角色层级
13. `zhao_permissions` schema 增加 `level` 字段
14. `createRole` 支持 `level` 参数 + 层级校验
15. `assignRole` 增加层级校验
16. `ROLE_HIERARCHY` 扩展支持自定义角色

### 阶段 4：渠道管理员权限分配
17. `assignRole` 增加渠道成员校验
18. `assignRole` 自动创建 role-channel 记录

### 阶段 5：细粒度配置渠道维度
19. channel schema 增加 `extraConfig` 字段
20. `zhao-channel/server/src/services/channel.ts` 的 create/update 显式 allow `extraConfig`
21. 新增 `PUT /zhao-channel/v1/admin/channels/:id/config` API
22. `getPublicConfig` 支持渠道维度合并
23. `settings/site-config.vue` 增加作用域选择器

### 阶段 6：租户访问校验
24. 新增 `has-tenant-access` policy
25. 挂载到所有 admin 路由（zhao-channel / zhao-common / zhao-course / zhao-point / zhao-quiz / zhao-studio / zhao-wealth）

### 阶段 7：Web 端租户切换器
26. 新增 `GET /zhao-auth/v1/my/tenants` API
27. 新增 `tenant-context-resolver` 中间件
28. `web/src/api/auth.js` 新增 `getMyTenants`
29. `web/src/store/user.js` 新增 tenantList / currentTenantId / fetchTenants / setCurrentTenant
30. 新建 `web/src/components/TenantSwitcher.vue` 组件
31. `dashboard/index.vue` 顶部改造为三段式 + 挂载 TenantSwitcher
32. `request.js` 两处 header 注入 `x-site-id`
33. `config-helper.js` 的 `loadSiteConfig` 支持 siteId 参数
34. 课程/课时表单监听 currentTenantId 变化

### 阶段 8：C 端模板样式配置（后端）
35. `site-config` schema 增加 `themeConfig` 字段
36. `site-template` schema 增加 `themeConfig` 字段
37. zhao-common bootstrap 新增 `initDefaultTemplates`（5 套预设模板）
38. `getPublicConfig` 返回增加 `theme`
39. `pages/tenant/detail.vue` 增加"模板样式"区块 + 新建 ColorPicker 组件

### 阶段 9a：shao 端主题改造 MVP
40. 新建 `shao/utils/theme.ts`（applyTheme 函数）
41. `shao/services/auth-config.ts` 接入 themeConfig 字段
42. `shao/App.vue` onLaunch 调用 applyTheme
43. 动态切换 `navigationBarBackgroundColor` + `tabBar selectedColor`（运行时 API）

### 阶段 9b：shao 端主题改造完整（后续）
44. H5 端 CSS 变量注入（`--brand-primary` / `--brand-secondary`）
45. 扫描 20 个 .vue 文件，替换 100 处硬编码色值为 CSS 变量
46. 小程序端内联 style 绑定（逐页面改造）
47. 测试 5 套预设模板切换

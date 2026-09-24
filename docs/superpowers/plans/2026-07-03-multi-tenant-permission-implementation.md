# 多租户权限与功能开关架构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将多租户权限架构设计文档（`docs/superpowers/specs/2026-07-02-multi-tenant-permission-design.md`）落地为可运行代码，覆盖权限清理、角色层级、渠道维度配置、租户访问校验、Web 端租户切换器、C 端模板样式、shao 端主题改造 9 个阶段共 47 项任务。

**Architecture:** 基于 Strapi v5 插件化架构。zhao-auth 提供权限三层模型（用户 → zhaoRoles → 角色权限），zhao-common 提供 site-config / getPublicConfig，zhao-channel 维护渠道-租户关联表 `zhao_channels_sites_lnk`。Web 端通过 x-site-id header 切换租户，C 端（shao）通过域名识别租户。

**Tech Stack:** Strapi v5 / TypeScript / Koa / Knex / Vue 3 (uni-app) / Pinia

**关键约定**:
- 所有插件改动后必须 `cd basic/plugins/<plugin-name> && npm run build` 重新编译到 dist
- Strapi develop 模式不自动构建 dist，必须手动 build
- 数据库 schema 改动需删除 `strapi_database_schema` 表中对应记录强制迁移（详见 project_memory）
- 所有验证用 `curl` 调用真实 API，无单元测试套件

---

## 文件结构总览

### 后端（basic/plugins/）

| 文件 | 责任 | 操作 |
|---|---|---|
| `zhao-auth/server/src/permissions.ts` | PERMISSION_TREE / DEFAULT_ROLE_PERMISSIONS / 旧 PERMISSIONS 常量 | 修改 |
| `zhao-auth/server/src/services/role-management.service.ts` | computePermissions / createRole / assignRole | 修改 |
| `zhao-auth/server/src/services/permission.service.ts` | createRole 服务实现 | 修改 |
| `zhao-auth/server/src/content-types/permission/schema.json` | zhao_permissions 表结构 | 修改 |
| `zhao-auth/server/src/policies/has-tenant-access.ts` | 租户访问校验 | 新建 |
| `zhao-auth/server/src/policies/index.ts` | policy 导出 | 修改 |
| `zhao-auth/server/src/services/tenant.service.ts` | 租户列表查询 | 新建 |
| `zhao-auth/server/src/controllers/tenant.ts` | my/tenants 控制器 | 新建 |
| `zhao-auth/server/src/routes/tenant.ts` | my/tenants 路由 | 新建 |
| `zhao-auth/server/src/routes/index.ts` | 路由汇总 | 修改 |
| `zhao-channel/server/src/content-types/channel/schema.json` | channel 表结构 | 修改 |
| `zhao-channel/server/src/services/channel.ts` | channel create/update | 修改 |
| `zhao-channel/server/src/controllers/channel.ts` | channel config 控制器 | 修改 |
| `zhao-channel/server/src/routes/content-api.ts` | channel config 路由 | 修改 |
| `zhao-common/server/src/content-types/site-config/schema.json` | 增加 themeConfig | 修改 |
| `zhao-common/server/src/content-types/site-template/schema.json` | 增加 themeConfig | 修改 |
| `zhao-common/server/src/services/config.ts` | getPublicConfig 返回 theme | 修改 |
| `zhao-common/server/src/services/tenant-context.ts` | tenant-context-resolver 中间件 | 新建 |
| `zhao-common/server/src/middlewares/index.ts` | 中间件注册 | 修改 |
| `zhao-common/server/src/bootstrap/index.ts` | initDefaultTemplates | 修改 |
| `zhao-course/server/src/routes/content-api.ts` | has-tenant-access 挂载 | 修改 |
| `zhao-point/server/src/routes/content-api.ts` | has-tenant-access 挂载 | 修改 |
| `zhao-quiz/server/src/routes/content-api.ts` | has-tenant-access 挂载 | 修改 |
| `zhao-studio/server/src/routes/content-api.ts` | has-tenant-access 挂载 | 修改 |
| `zhao-wealth/server/src/routes/content-api.ts` | has-tenant-access 替换 | 修改 |

### Web 前端

| 文件 | 责任 | 操作 |
|---|---|---|
| `web/src/utils/config-helper.js` | isFeatureEnabled / loadSiteConfig 修复 | 修改 |
| `web/src/utils/request.js` | x-site-id header 注入 | 修改 |
| `web/src/store/user.js` | tenantList / currentTenantId state | 修改 |
| `web/src/api/auth.js` | getMyTenants API | 修改 |
| `web/src/components/TenantSwitcher.vue` | 租户切换器组件 | 新建 |
| `web/src/components/ColorPicker.vue` | 颜色选择器组件 | 新建 |
| `web/pages/dashboard/index.vue` | 顶部三段式 + SSO 菜单清理 | 修改 |
| `web/pages.json` | SSO 路由清理 | 修改 |
| `web/pages/tenant/detail.vue` | themeConfig 区块 | 修改 |
| `web/pages/settings/site-config.vue` | 配置作用域选择器 | 修改 |
| `web/pages/course/form.vue` | 监听 currentTenantId | 修改 |
| `web/pages/course/lesson/form.vue` | 修复 pointsEnabled 开关 + 监听 currentTenantId | 修改 |

### shao 前端

| 文件 | 责任 | 操作 |
|---|---|---|
| `shao/utils/theme.ts` | applyTheme 工具 | 新建 |
| `shao/services/theme.ts` | 主题服务 | 新建 |
| `shao/services/auth-config.ts` | 接入 themeConfig | 修改 |
| `shao/App.vue` | onLaunch 调用 applyTheme | 修改 |
| `shao/pages.json` | 移除硬编码 navigationBarBackgroundColor | 修改 |
| `shao/**/*.vue` (20 个文件) | 替换 #667eea / #764ba2 为 CSS 变量 | 修改 |

---

## 阶段 1：立即修复

### Task 1: 修复 config-helper.js isFeatureEnabled 取值 bug

**Files:**
- Modify: `web/src/utils/config-helper.js:71-73`

**问题**：当前 `isFeatureEnabled(key)` 从顶层取值 `cachedConfig?.[key]`，但 `getPublicConfig` 返回的细粒度开关在 `featureFlags` 嵌套对象下，导致积分等开关恒返回 false。

- [ ] **Step 1: 修改 isFeatureEnabled 函数**

替换 `web/src/utils/config-helper.js:71-73`：

```js
// 细粒度 key → 粗粒度模块 key 映射
const FEATURE_TO_MODULE = {
  pointsEnabled: 'points',
  coursePreviewEnabled: 'course',
  lessonProgressEnabled: 'course',
  courseEnrollEnabled: 'course',
  channelInviteEnabled: 'channel',
  redemptionEnabled: 'points',
  courseCommentEnabled: 'course',
  courseRatingEnabled: 'course',
  paymentEnabled: 'points',
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

- [ ] **Step 2: 同步 getDefaultConfig 结构**

替换 `web/src/utils/config-helper.js:38-69`，让默认配置与 getPublicConfig 返回结构对齐：

```js
export function getDefaultConfig() {
  return {
    site: {
      siteName: '',
      siteDescription: '',
      logo: '',
      favicon: '',
      shareTitle: '',
      shareDescription: '',
      shareImage: '',
      sharePath: '/pages/index/index',
      domain: '',
    },
    auth: {
      mode: 'local',
      methods: ['password', 'sms'],
      thirdPartyEnabled: false,
      ssoEnabled: false,
      ssoLoginUrl: null,
      registerEnabled: true,
      inviteCodeRequired: false,
    },
    featureFlags: {
      // 粗粒度模块总开关
      sso: false,
      points: true,
      quiz: true,
      course: true,
      channel: true,
      thirdParty: true,
      oss: false,
      // 细粒度默认值
      pointsEnabled: true,
      coursePreviewEnabled: true,
      lessonProgressEnabled: true,
      courseEnrollEnabled: true,
      channelInviteEnabled: true,
      allowCrossChannel: false,
      redemptionEnabled: true,
      courseCommentEnabled: false,
      courseRatingEnabled: false,
      paymentEnabled: false,
      smsEnabled: false,
      emailEnabled: false,
      captchaEnabled: false,
      rateLimitEnabled: true,
      maintenanceMode: false,
      debugMode: false,
    },
    points: {
      moduleEnabled: true,
      earnEnabled: true,
      redeemEnabled: true,
      signInEnabled: true,
      tasksEnabled: true,
      signInPoints: 10,
      maxPointsPerDay: 0,
    },
    theme: {
      primaryColor: '#667eea',
      secondaryColor: '#f0f2f5',
      navStyle: 'default',
      cardStyle: 'default',
      tabBarColor: '#667eea',
      tabBarActiveColor: '#ffffff',
    },
  }
}
```

- [ ] **Step 3: loadSiteConfig 兼容新旧结构**

替换 `web/src/utils/config-helper.js:24-36`：

```js
export async function loadSiteConfig(siteId) {
  if (cachedConfig && !siteId) return cachedConfig

  try {
    const params = siteId ? { siteId } : {}
    const res = await getPublicConfig(params)
    cachedConfig = res ?? getDefaultConfig()
    return cachedConfig
  } catch (e) {
    console.warn('[config-helper] Failed to load config:', e)
    notifyServiceUnavailable()
    return getDefaultConfig()
  }
}
```

注意：`getPublicConfig` 已在 `web/src/api/config.js` 支持 params 透传，若不支持需补 `params` 形参。

- [ ] **Step 4: 验证**

启动 web dev server，打开 dashboard，控制台执行：

```js
const { loadSiteConfig, isFeatureEnabled } = require('./utils/config-helper')
await loadSiteConfig()
console.log(isFeatureEnabled('pointsEnabled'))  // 应返回 true（后端默认）
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/web
git add src/utils/config-helper.js
git commit -m "fix(config-helper): isFeatureEnabled 从 featureFlags 嵌套对象取值，对齐 getPublicConfig 返回结构"
```

---

### Task 2: 修复 lesson/form.vue 缺失 pointsEnabled 开关控制

**Files:**
- Modify: `web/pages/course/lesson/form.vue`

**问题**：课时表单积分区块始终显示，不受 `pointsEnabled` 控制。

- [ ] **Step 1: 定位积分区块**

```bash
cd e:/code/web
grep -n "积分" pages/course/lesson/form.vue | head -20
```

- [ ] **Step 2: 添加 showPointsSection 计算属性**

在 `lesson/form.vue` 的 `<script setup>` 中导入并添加：

```js
import { isFeatureEnabled } from '@/utils/config-helper'
const showPointsSection = computed(() => isFeatureEnabled('pointsEnabled'))
```

- [ ] **Step 3: 用 v-if 包裹积分区块**

在积分区块外层加 `v-if="showPointsSection"`：

```html
<view v-if="showPointsSection" class="points-section">
  <!-- 原积分区块内容 -->
</view>
```

- [ ] **Step 4: 验证**

启动 web dev，编辑课时，确认积分区块在 `pointsEnabled: false` 时隐藏（可临时改 config-helper.js 默认值为 false 验证，验证后改回）。

- [ ] **Step 5: Commit**

```bash
cd e:/code/web
git add pages/course/lesson/form.vue
git commit -m "feat(lesson-form): 积分区块受 pointsEnabled 开关控制"
```

---

### Task 3: 后端 DEFAULT_CONFIG 补充 featureFlags 粗粒度默认值

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/config.ts:262-266`

**问题**：`getPublicConfig` 的 `DEFAULT_CONFIG` 只有 PUBLIC_FIELDS 字符串字段，缺少 featureFlags 粗粒度模块默认值，siteId 为 null 时返回的配置缺失模块总开关。

- [ ] **Step 1: 在 getPublicConfig 早期返回处补充默认配置**

替换 `basic/plugins/zhao-common/server/src/services/config.ts:245-275`，在 siteConfig 为 null 时返回完整默认配置：

```ts
async getPublicConfig(siteId?: string) {
  const result: Record<string, any> = {};

  try {
    const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
    const templateService = strapi.plugin("zhao-common")?.service("site-template");
    if (!siteConfigService) return result;

    const fullConfig: any = await siteConfigService.getConfig(siteId);

    // siteId 为 null（域名未匹配）时返回完整默认配置
    if (!fullConfig) {
      return {
        site: {
          siteName: "", siteDescription: "", logo: "", favicon: "",
          shareTitle: "", shareDescription: "", shareImage: "",
          sharePath: "/pages/index/index", domain: "",
        },
        auth: {
          mode: "local",
          methods: ["password", "sms"],
          thirdPartyEnabled: false,
          ssoEnabled: false,
          ssoLoginUrl: null,
          registerEnabled: true,
          inviteCodeRequired: false,
        },
        featureFlags: {
          sso: false, points: true, quiz: true, course: true,
          channel: true, thirdParty: true, oss: false,
          pointsEnabled: true, coursePreviewEnabled: true,
          lessonProgressEnabled: true, courseEnrollEnabled: true,
          channelInviteEnabled: true, allowCrossChannel: false,
          redemptionEnabled: true, courseCommentEnabled: false,
          courseRatingEnabled: false, paymentEnabled: false,
        },
        points: {
          moduleEnabled: true, earnEnabled: true, redeemEnabled: true,
          signInEnabled: true, tasksEnabled: true,
          signInPoints: 10, maxPointsPerDay: 0,
        },
        theme: {
          primaryColor: "#667eea", secondaryColor: "#f0f2f5",
          navStyle: "default", cardStyle: "default",
          tabBarColor: "#667eea", tabBarActiveColor: "#ffffff",
        },
      };
    }

    // 站点公开字段（原逻辑继续）
    const PUBLIC_FIELDS = [
      "siteName", "siteDescription", "seoKeywords", "seoDescription",
      "tencentMapKey", "shareTitle", "shareDescription", "icpNumber",
      "customerServiceUrl", "domain",
    ];
    // ... 原后续逻辑保持不变
```

- [ ] **Step 2: 在 featureFlags 返回处补充粗粒度模块默认值**

替换 `basic/plugins/zhao-common/server/src/services/config.ts:341-358`：

```ts
// 功能开关（粗粒度模块总开关 + 细粒度）
const siteFeatureFlags = fullConfig?.featureFlags || {};
result.featureFlags = {
  // 粗粒度模块总开关（从 site-config.featureFlags 列读取）
  sso: siteFeatureFlags.sso ?? false,
  points: siteFeatureFlags.points ?? true,
  quiz: siteFeatureFlags.quiz ?? true,
  course: siteFeatureFlags.course ?? true,
  channel: siteFeatureFlags.channel ?? true,
  thirdParty: siteFeatureFlags.thirdParty ?? true,
  oss: siteFeatureFlags.oss ?? false,
  // 细粒度开关（从 extraConfig 合并后的 ec 读取）
  pointsEnabled: ec.pointsEnabled ?? true,
  coursePreviewEnabled: ec.coursePreviewEnabled ?? true,
  lessonProgressEnabled: ec.lessonProgressEnabled ?? true,
  courseEnrollEnabled: ec.courseEnrollEnabled ?? true,
  channelInviteEnabled: ec.channelInviteEnabled ?? true,
  allowCrossChannel: ec.allowCrossChannel ?? false,
  redemptionEnabled: ec.redemptionEnabled ?? true,
  courseCommentEnabled: ec.courseCommentEnabled ?? false,
  courseRatingEnabled: ec.courseRatingEnabled ?? false,
  paymentEnabled: ec.paymentEnabled ?? false,
  smsEnabled: ec.smsEnabled ?? false,
  emailEnabled: ec.emailEnabled ?? false,
  captchaEnabled: ec.captchaEnabled ?? false,
  rateLimitEnabled: ec.rateLimitEnabled ?? true,
  maintenanceMode: ec.maintenanceMode ?? false,
  debugMode: ec.debugMode ?? false,
};
```

- [ ] **Step 3: 构建并验证**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
cd e:/code/basic
npm run develop
```

新开终端验证：

```bash
curl "http://localhost:1337/api/zhao-common/v1/public/config?domain=nonexistent.example.com"
```

预期返回包含 `featureFlags.points: true` 等粗粒度字段。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/services/config.ts
git commit -m "feat(config): getPublicConfig 补充 featureFlags 粗粒度默认值，siteId 为 null 时返回完整默认配置"
```

---

## 阶段 2：权限配置与清理

### Task 4: PERMISSION_TREE 新增 config.feature.update / channel.config.update

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:198-211, 169-175`

- [ ] **Step 1: 在 menu.feature-flag 下新增 config.feature.update**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:198-204`：

```ts
"menu.feature-flag": {
  label: "功能开关",
  type: "menu",
  children: {
    "feature-flag.update": { label: "修改粗粒度开关", type: "button" },
    "config.feature.update": { label: "修改细粒度配置", type: "button" },
  },
},
```

- [ ] **Step 2: 在 menu.channel 下新增 channel.config.update**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:135-144`：

```ts
"menu.channel": {
  label: "渠道管理",
  type: "menu",
  children: {
    "channel.read": { label: "查看渠道", type: "button" },
    "channel.create": { label: "新增渠道", type: "button" },
    "channel.update": { label: "编辑渠道", type: "button" },
    "channel.delete": { label: "删除渠道", type: "button" },
    "channel.config.update": { label: "修改渠道配置", type: "button" },
  },
},
```

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

预期：编译无错误。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(permissions): PERMISSION_TREE 新增 config.feature.update 和 channel.config.update"
```

---

### Task 5: 补齐缺失权限 key（zhao-point / zhao-quiz / zhao-common / zhao-studio / zhao-oss）

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts`

**问题**：多个插件的 has-permission policy 使用的权限 key 不在 PERMISSION_TREE 中定义，非 admin 用户访问这些路由全部 403。

- [ ] **Step 1: 在 menu.point-center 下补齐 point-* button 权限**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:118-130`：

```ts
"menu.point-center": {
  label: "积分体系",
  type: "menu",
  children: {
    "menu.point-type": {
      label: "积分类型",
      type: "menu",
      children: {
        "point-type.read": { label: "查看积分类型", type: "button" },
        "point-type.create": { label: "新增积分类型", type: "button" },
        "point-type.update": { label: "编辑积分类型", type: "button" },
        "point-type.delete": { label: "删除积分类型", type: "button" },
      },
    },
    "menu.point-rule": {
      label: "积分规则",
      type: "menu",
      children: {
        "point-rule.read": { label: "查看规则", type: "button" },
        "point-rule.create": { label: "新增规则", type: "button" },
        "point-rule.update": { label: "编辑规则", type: "button" },
        "point-rule.delete": { label: "删除规则", type: "button" },
      },
    },
    "menu.point-record": {
      label: "积分记录",
      type: "menu",
      children: {
        "point-record.read": { label: "查看记录", type: "button" },
      },
    },
    "menu.product": {
      label: "积分产品",
      type: "menu",
      children: {
        "point-product.read": { label: "查看产品", type: "button" },
        "point-product.create": { label: "新增产品", type: "button" },
        "point-product.update": { label: "编辑产品", type: "button" },
        "point-product.delete": { label: "删除产品", type: "button" },
      },
    },
    "menu.exchange": {
      label: "兑换记录",
      type: "menu",
      children: {
        "point-exchange.read": { label: "查看兑换", type: "button" },
      },
    },
    "menu.point-stat": {
      label: "积分统计",
      type: "menu",
      children: {
        "point-dashboard.read": { label: "查看统计", type: "button" },
      },
    },
    "menu.point-config": {
      label: "积分配置",
      type: "menu",
      children: {
        "point-config.read": { label: "查看配置", type: "button" },
        "point-config.update": { label: "修改配置", type: "button" },
      },
    },
    "menu.pickup-location": {
      label: "自提点",
      type: "menu",
      children: {
        "pickup-location.read": { label: "查看自提点", type: "button" },
        "pickup-location.create": { label: "新增自提点", type: "button" },
        "pickup-location.update": { label: "编辑自提点", type: "button" },
        "pickup-location.delete": { label: "删除自提点", type: "button" },
      },
    },
    "menu.point-verification": {
      label: "积分核销",
      type: "menu",
      children: {
        "point-verification.read": { label: "查看核销记录", type: "button" },
      },
    },
  },
},
```

- [ ] **Step 2: 在 menu.quiz-center 下补齐 quiz/exam button 权限**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:95-117`：

```ts
"menu.quiz-center": {
  label: "题库系统",
  type: "menu",
  children: {
    "menu.quiz": {
      label: "题库管理",
      type: "menu",
      children: {
        "quiz.read": { label: "查看题目", type: "button" },
        "quiz.create": { label: "新增题目", type: "button" },
        "quiz.update": { label: "编辑题目", type: "button" },
        "quiz.delete": { label: "删除题目", type: "button" },
      },
    },
    "menu.exam": {
      label: "考试管理",
      type: "menu",
      children: {
        "exam.read": { label: "查看考试", type: "button" },
        "exam.create": { label: "新增考试", type: "button" },
        "exam.update": { label: "编辑考试", type: "button" },
        "exam.delete": { label: "删除考试", type: "button" },
      },
    },
    "menu.quiz-record": {
      label: "答题记录",
      type: "menu",
      children: {
        "quiz-record.read": { label: "查看答题记录", type: "button" },
      },
    },
  },
},
```

- [ ] **Step 3: 在 menu.system-center 下新增 soft-delete 菜单 + 补 config/template button 权限**

在 `basic/plugins/zhao-auth/server/src/permissions.ts` 的 `menu.system-center.children` 中（紧邻 `menu.media` 之后）插入：

```ts
"menu.soft-delete": {
  label: "回收站",
  type: "menu",
  children: {
    "soft-delete.read": { label: "查看回收站", type: "button" },
    "soft-delete.manage": { label: "管理回收站", type: "button" },
  },
},
```

修改 `menu.site-config` 子节点（替换 205-211 行）：

```ts
"menu.site-config": {
  label: "站点配置",
  type: "menu",
  children: {
    "config.read": { label: "查看配置", type: "button" },
    "config.create": { label: "新增配置", type: "button" },
    "config.update": { label: "修改配置", type: "button" },
    "config.delete": { label: "删除配置", type: "button" },
    "site-config.update": { label: "修改站点配置", type: "button" },
  },
},
```

在 `menu.tenant` 之后追加 `menu.template`：

```ts
"menu.template": {
  label: "模板管理",
  type: "menu",
  children: {
    "template.read": { label: "查看模板", type: "button" },
    "template.create": { label: "新增模板", type: "button" },
    "template.update": { label: "编辑模板", type: "button" },
    "template.delete": { label: "删除模板", type: "button" },
  },
},
```

- [ ] **Step 4: 在 menu.oss 下补齐 oss.* button 权限**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:233-241`：

```ts
"menu.oss": {
  label: "OSS 管理",
  type: "menu",
  children: {
    "oss.read": { label: "查看 OSS", type: "button" },
    "oss.upload": { label: "上传文件", type: "button" },
    "oss.delete": { label: "删除文件", type: "button" },
    "oss.dashboard": { label: "查看仪表盘", type: "button" },
    "oss.record": { label: "查看同步记录", type: "button" },
    "oss.settings": { label: "修改存储设置", type: "button" },
  },
},
```

- [ ] **Step 5: 新增 menu.studio-center 顶级菜单**

在 `PERMISSION_TREE` 末尾（`menu.tag-center` 之后）追加：

```ts
"menu.studio-center": {
  label: "直播工作室",
  type: "menu",
  children: {
    "menu.studio": {
      label: "工作室管理",
      type: "menu",
      children: {
        "zhao-studio.read": { label: "查看工作室", type: "button" },
        "zhao-studio.create": { label: "新增工作室", type: "button" },
        "zhao-studio.update": { label: "编辑工作室", type: "button" },
        "zhao-studio.delete": { label: "删除工作室", type: "button" },
      },
    },
  },
},
```

- [ ] **Step 6: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 7: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(permissions): 补齐 zhao-point/zhao-quiz/zhao-common/zhao-studio/zhao-oss 路由权限 key"
```

---

### Task 6: channel-admin 权限补全

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:413-423`

- [ ] **Step 1: 修改 channel-admin 的 DEFAULT_ROLE_PERMISSIONS**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:413-423`：

```ts
[ROLES.CHANNEL_ADMIN]: [
  ...flattenPermissions(PERMISSION_TREE).filter(
    (k) => !k.startsWith("menu.system-center")
  ),
  "menu.tenant",
  "tenant.read",
  "tenant.create",
  "tenant.update",
  "tenant.delete",
  "menu.site-config",
  "site-config.update",
  "config.read",
  "config.update",
  "menu.feature-flag",
  "feature-flag.update",
  "config.feature.update",
  "channel.config.update",
  "menu.user-roles",
  "role.read",
  "role.assign",
  "role.revoke",
  "role.create",
  "role.read-logs",
],
```

- [ ] **Step 2: 构建 + 重启 Strapi 验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
cd e:/code/basic
npm run develop
```

新终端验证 channel-admin 用户 1117 的权限：

```bash
curl -H "Authorization: Bearer <channel-admin-token>" http://localhost:1337/api/zhao-auth/v1/my/permissions
```

预期返回包含 `menu.site-config` / `role.assign` / `config.feature.update` 等。

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(permissions): channel-admin 补全 site-config / role.assign / config.feature.update 等权限"
```

---

### Task 7: plugin-manager 权限补全

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:424-437`

- [ ] **Step 1: 修改 plugin-manager 的 DEFAULT_ROLE_PERMISSIONS**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:424-437`：

```ts
[ROLES.PLUGIN_MANAGER]: flattenPermissions(
  ((t: Record<string, PermissionItem>) => {
    const result: Record<string, PermissionItem> = {};
    for (const key of [
      "menu.course-center",
      "menu.quiz-center",
      "menu.point-center",
      "menu.tag-center",
      "menu.studio-center",
    ]) {
      if (t[key]) result[key] = t[key];
    }
    return result;
  })(PERMISSION_TREE)
).concat([
  "menu.site-config",
  "site-config.update",
  "config.read",
  "config.update",
  "config.feature.update",
  "channel.config.update",
]),
```

- [ ] **Step 2: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(permissions): plugin-manager 补全 site-config / config.feature.update / studio-center 权限"
```

---

### Task 8: instructor 权限补全（button 权限）

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:438-449`

- [ ] **Step 1: 修改 instructor 的 DEFAULT_ROLE_PERMISSIONS**

替换 `basic/plugins/zhao-auth/server/src/permissions.ts:438-449`：

```ts
[ROLES.INSTRUCTOR]: [
  // 课程中心
  "menu.course-center",
  "menu.course",
  "course.read",
  "course.create",
  "course.update",
  "course.publish",
  "menu.lesson",
  "lesson.read",
  "lesson.create",
  "lesson.update",
  "lesson.delete",
  "menu.category",
  "course-category.read",
  "course-category.create",
  "course-category.update",
  "menu.auth",
  "user-course.read",
  "user-course.grant",
  // 学习数据
  "menu.study-center",
  "menu.progress",
  "course-progress.read",
  "course-progress.update",
  "menu.lesson-progress",
  "lesson-progress.read",
  "lesson-progress.update",
  // 标签体系
  "menu.tag-center",
  "menu.tag",
  "tag.read",
  "tag.create",
  "tag.update",
  "menu.knowledge",
  "knowledge-point.read",
  "knowledge-point.create",
  "knowledge-point.update",
],
```

- [ ] **Step 2: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "feat(permissions): instructor 补全所有 button 权限（course/lesson/category/tag/knowledge/progress）"
```

---

### Task 9: 迁移 role-management.service.ts 的 computePermissions 到新权限系统

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/role-management.service.ts:3, 457-463`

- [ ] **Step 1: 修改 computePermissions 实现**

替换 `basic/plugins/zhao-auth/server/src/services/role-management.service.ts:457-463`：

```ts
computePermissions(roles: string[]) {
  const permissions: Record<string, boolean> = {};
  // 用 DEFAULT_ROLE_PERMISSIONS 计算权限
  for (const role of roles) {
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
    for (const action of rolePerms) {
      permissions[action] = true;
    }
  }
  return { roles, permissions };
},
```

- [ ] **Step 2: 修改 import**

替换 `basic/plugins/zhao-auth/server/src/services/role-management.service.ts:3`：

```ts
import { DEFAULT_ROLE_PERMISSIONS, ROLE_INHERITANCE } from "../permissions";
```

- [ ] **Step 3: 全局搜索其他 PERMISSIONS 引用**

```bash
cd e:/code/basic/plugins/zhao-auth
grep -rn "from.*permissions.*PERMISSIONS" server/src/ --include="*.ts"
```

预期：除 `role-management.service.ts` 外不应有其他引用旧 `PERMISSIONS` 常量的位置。若有，逐一迁移到 `DEFAULT_ROLE_PERMISSIONS`。

- [ ] **Step 4: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 5: 重启 Strapi 验证 /my/permissions 接口**

```bash
cd e:/code/basic
npm run develop
```

```bash
curl -H "Authorization: Bearer <admin-token>" http://localhost:1337/api/zhao-auth/v1/my/permissions
```

预期返回 `{ roles: ["admin"], permissions: { "menu.course-center": true, ... } }`。

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/role-management.service.ts
git commit -m "refactor(role-management): computePermissions 改用 DEFAULT_ROLE_PERMISSIONS 实现"
```

---

### Task 10: 删除旧 PERMISSIONS 常量

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:390-407, 453`

- [ ] **Step 1: 删除 PERMISSIONS 常量和 PermissionEntry 接口**

删除 `basic/plugins/zhao-auth/server/src/permissions.ts:390-407`：

```ts
// 删除以下内容：
// ===== 向后兼容：保留旧 PERMISSIONS 常量 =====
// export interface PermissionEntry { ... }
// export const PERMISSIONS: Record<string, PermissionEntry> = { ... };
```

- [ ] **Step 2: 删除文件末尾的默认导出**

删除 `basic/plugins/zhao-auth/server/src/permissions.ts:453`：

```ts
// 删除：export default PERMISSIONS;
```

替换为：

```ts
export { DEFAULT_ROLE_PERMISSIONS as default } from "./permissions";
```

或直接删除 default export（若无外部 import default）。

- [ ] **Step 3: 全局搜索 default import**

```bash
cd e:/code/basic
grep -rn 'import.*from.*permissions' plugins/ --include="*.ts" | grep -v 'DEFAULT_ROLE_PERMISSIONS\|PERMISSION_TREE\|ROLES\|PermissionItem\|flattenPermissions\|expandPermissionKeys\|getPermissionLabel\|ROLE_\|type '
```

预期：无匹配（所有引用都已迁移）。

- [ ] **Step 4: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "refactor(permissions): 删除旧 PERMISSIONS 常量，统一用 DEFAULT_ROLE_PERMISSIONS"
```

---

### Task 11: 清理 SSO 冗余菜单

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/permissions.ts:270-274`

- [ ] **Step 1: 删除 5 个冗余 SSO 菜单 key**

删除 `basic/plugins/zhao-auth/server/src/permissions.ts:270-274`：

```ts
// 删除以下 5 行：
"menu.sso-center": { label: "SSO 中心", type: "menu" },
"menu.sso-dashboard": { label: "SSO 仪表盘", type: "menu" },
"menu.sso-user": { label: "SSO 用户", type: "menu" },
"menu.sso-channel": { label: "SSO 渠道", type: "menu" },
"menu.sso-log": { label: "SSO 日志", type: "menu" },
```

保留 `menu.sso`（带 children 的完整 SSO 菜单）。

- [ ] **Step 2: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/permissions.ts
git commit -m "refactor(permissions): 删除 5 个冗余 SSO 菜单 key，保留 menu.sso"
```

---

### Task 12: 清理 web 端 SSO 菜单和路由

**Files:**
- Modify: `web/pages/dashboard/index.vue:264-284`
- Modify: `web/pages.json:313-342`（行号需现场确认）
- Delete: `web/pages/sso/*.vue`（5 文件）和 `web/src/pages/sso/*.vue`（4 文件，如有）

- [ ] **Step 1: 定位 dashboard/index.vue SSO module-section**

```bash
cd e:/code/web
grep -n "menu.sso-center\|menu.sso-dashboard\|menu.sso-user\|menu.sso-channel\|menu.sso-log" pages/dashboard/index.vue
```

- [ ] **Step 2: 删除 SSO module-section 区块**

删除 `web/pages/dashboard/index.vue` 中所有 `hasPermission('menu.sso-center')` / `menu.sso-dashboard` / `menu.sso-user` / `menu.sso-channel` / `menu.sso-log` 相关的 module-section 区块（约 264-284 行）。

- [ ] **Step 3: 定位 pages.json 中 SSO 路由**

```bash
cd e:/code/web
grep -n "sso" pages.json
```

- [ ] **Step 4: 删除 pages.json 中 5 个 SSO 路由注册**

删除 `pages/sso/dashboard`、`pages/sso/user`、`pages/sso/channel`、`pages/sso/log`、`pages/sso/center` 等路由配置。

- [ ] **Step 5: 评估并删除孤儿页面**

```bash
ls e:/code/web/pages/sso/
ls e:/code/web/src/pages/sso/ 2>/dev/null
```

若这些页面未被其他菜单引用，删除整个目录：

```bash
rm -rf e:/code/web/pages/sso/
rm -rf e:/code/web/src/pages/sso/
```

- [ ] **Step 6: 启动 web dev 验证**

```bash
cd e:/code/web
npm run dev
```

打开 dashboard，确认 SSO 菜单不再显示，无 404 报错。

- [ ] **Step 7: Commit**

```bash
cd e:/code/web
git add pages/dashboard/index.vue pages.json
git rm -r pages/sso/ src/pages/sso/ 2>/dev/null
git commit -m "refactor(web): 清理 5 个冗余 SSO 菜单和路由，删除孤儿页面"
```

---

## 阶段 3：角色层级

### Task 13: zhao_permissions schema 增加 level 字段

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/content-types/permission/schema.json`

- [ ] **Step 1: 查看当前 permission schema**

```bash
cat e:/code/basic/plugins/zhao-auth/server/src/content-types/permission/schema.json
```

- [ ] **Step 2: 在 attributes 中增加 level 字段**

在 `schema.json` 的 `attributes` 对象中追加：

```json
"level": {
  "type": "integer",
  "default": 20,
  "min": 1,
  "max": 100
}
```

- [ ] **Step 3: 同步修改 content-types/index.ts**

```bash
cat e:/code/basic/plugins/zhao-auth/server/src/content-types/permission/index.ts
```

若 index.ts 内联了 schema 对象，同步追加 level 字段；若 `import schema from "./schema.json"`，则跳过。

- [ ] **Step 4: 强制迁移**

删除 `strapi_database_schema` 表中 `plugin::zhao-auth.permission` 的元数据记录：

```bash
psql -U postgres -d strapi -c "DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-auth.permission';"
```

- [ ] **Step 5: 重启 Strapi 触发表重建**

```bash
cd e:/code/basic
npm run develop
```

预期日志：表 `zhao_permissions` 重建，新增 `level` 列。

- [ ] **Step 6: 验证**

```bash
psql -U postgres -d strapi -c "\d zhao_permissions"
```

预期看到 `level | integer | default 20`。

- [ ] **Step 7: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/content-types/permission/
git commit -m "feat(permission-schema): 增加 level 字段（角色层级）"
```

---

### Task 14: createRole 支持 level 参数 + 层级校验

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/permission.service.ts`

- [ ] **Step 1: 查找 createRole 服务**

```bash
grep -n "createRole" e:/code/basic/plugins/zhao-auth/server/src/services/permission.service.ts
```

- [ ] **Step 2: 修改 createRole 实现**

在 `permission.service.ts` 中找到 `createRole` 函数，改为：

```ts
async createRole(data: { name: string; permissions?: string[]; level?: number }, operatorId: number, operatorLevel: number) {
  // 1. 校验层级
  const targetLevel = data.level ?? 20;
  if (operatorLevel < 100 && targetLevel >= operatorLevel) {
    throwErr("ROLE_003", 403, "不能创建同级或更高层级角色");
  }

  // 2. 创建角色记录
  const role = await strapi.db.query("plugin::zhao-auth.permission").create({
    data: {
      name: data.name,
      level: targetLevel,
      permissions: JSON.stringify(data.permissions || []),
      isSystem: false,
    },
  });

  return role;
},
```

注意：`throwErr` 函数已存在文件顶部，复用即可。

- [ ] **Step 3: 修改 createRole controller 传 operatorLevel**

查找 `permission` controller（`controllers/permission.ts`），在 createRole handler 中获取操作者 level：

```ts
async createRole(ctx: any) {
  try {
    const data = ctx.request.body?.data || ctx.request.body;
    const operatorId = ctx.state.user?.id;
    const operatorRoles = ctx.state.user?.zhaoRoles || [];
    // 从 ROLE_HIERARCHY 计算操作者 level
    const { ROLE_HIERARCHY } = require("../services/role-management.service");
    const operatorLevel = Math.max(...operatorRoles.map((r: string) => ROLE_HIERARCHY[r] ?? 20));
    const result = await strapi.plugin("zhao-auth").service("permission").createRole(data, operatorId, operatorLevel);
    ctx.status = 201;
    ctx.body = result;
  } catch (err) {
    ctx.status = (err as any).status || 400;
    ctx.body = { error: (err as Error).message };
  }
},
```

- [ ] **Step 4: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/permission.service.ts plugins/zhao-auth/server/src/controllers/permission.ts
git commit -m "feat(role): createRole 支持 level 参数 + 层级校验"
```

---

### Task 15: assignRole 增加层级校验

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/role-management.service.ts`

- [ ] **Step 1: 查找 assignRole 函数**

```bash
grep -n "assignRole" e:/code/basic/plugins/zhao-auth/server/src/services/role-management.service.ts
```

- [ ] **Step 2: 在 assignRole 中增加层级校验**

定位 `assignRole` 函数，在权限校验之后增加：

```ts
async assignRole(userId: number, role: string, operatorId: number, reason?: string) {
  // ... 原权限校验逻辑保持 ...

  // 层级校验（非 admin）
  const operatorRoles = await getUserRoles(operatorId);
  const operatorLevel = Math.max(...operatorRoles.map((r: string) => ROLE_HIERARCHY[r] ?? 20));
  if (operatorLevel < 100) {
    const targetLevel = ROLE_HIERARCHY[role];
    if (targetLevel == null) {
      // 自定义角色，查 zhao_permissions 表
      const roleRecord = await strapi.db.query("plugin::zhao-auth.permission").findOne({
        where: { name: role },
        select: ["level"],
      });
      const customLevel = roleRecord?.level ?? 20;
      if (customLevel > operatorLevel) {
        throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
      }
    } else if (targetLevel > operatorLevel) {
      throwErr("ROLE_004", 403, "不能分配同级或更高层级角色");
    }
  }

  // ... 原 user.zhaoRoles 更新逻辑保持 ...
},
```

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/role-management.service.ts
git commit -m "feat(role): assignRole 增加层级校验（非 admin 不能分配比自己高层级的角色）"
```

---

### Task 16: ROLE_HIERARCHY 扩展支持自定义角色

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/role-management.service.ts`

- [ ] **Step 1: 新增 getRoleLevel 工具函数**

在 `role-management.service.ts` 顶部（ROLE_HIERARCHY 定义之后）增加：

```ts
async function getRoleLevel(role: string): Promise<number> {
  // 系统角色用硬编码层级
  if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
  // 自定义角色查数据库
  const roleRecord = await strapi.db.query("plugin::zhao-auth.permission").findOne({
    where: { name: role },
    select: ["level"],
  });
  return roleRecord?.level ?? 20;
}

async function getUserLevel(userId: number): Promise<number> {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
    select: ["zhaoRoles"],
  });
  const roles = extractRoleNames(user);
  if (roles.length === 0) return 20;
  const levels = await Promise.all(roles.map(getRoleLevel));
  return Math.max(...levels);
}
```

- [ ] **Step 2: 修改 assignRole 和 createRole 复用 getRoleLevel**

将 Task 14 和 Task 15 中的 `Math.max(...operatorRoles.map(...))` 改为 `await getUserLevel(operatorId)`。

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/role-management.service.ts
git commit -m "refactor(role): ROLE_HIERARCHY 扩展支持自定义角色，新增 getRoleLevel/getUserLevel 工具函数"
```

---

## 阶段 4：渠道管理员权限分配

### Task 17: assignRole 增加渠道成员校验

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/role-management.service.ts`

- [ ] **Step 1: 在 assignRole 中增加渠道成员校验**

定位 `assignRole` 函数，在层级校验之后追加：

```ts
// 渠道成员校验（非 admin）
if (operatorLevel < 100) {
  // 1. 查询操作者归属渠道（isCurrent=true 的渠道）
  const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
    where: { user: operatorId, isCurrent: true },
    populate: { channel: { select: ["id"] } },
  });
  const operatorChannelIds = operatorChannels.map((cm: any) => cm.channel?.id).filter(Boolean);
  if (operatorChannelIds.length === 0) {
    throwErr("ROLE_005", 403, "操作者未归属任何渠道");
  }

  // 2. 校验被分配用户是操作者渠道成员
  const targetUserChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
    where: { user: userId, channel: { id: { $in: operatorChannelIds } } },
  });
  if (targetUserChannels.length === 0) {
    throwErr("ROLE_005", 403, "只能分配自己渠道内成员");
  }
}
```

- [ ] **Step 2: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/role-management.service.ts
git commit -m "feat(role): assignRole 增加渠道成员校验（非 admin 只能分配自己渠道成员）"
```

---

### Task 18: assignRole 自动创建 role-channel 记录

**Files:**
- Modify: `basic/plugins/zhao-auth/server/src/services/role-management.service.ts`

- [ ] **Step 1: 在 assignRole 末尾追加 role-channel 记录**

在 `assignRole` 函数末尾（user.zhaoRoles 更新成功之后）追加：

```ts
// 非 admin 自动创建 role-channel 记录
if (operatorLevel < 100) {
  const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
    where: { user: operatorId, isCurrent: true },
    populate: { channel: { select: ["id"] } },
  });
  const currentChannelId = operatorChannels[0]?.channel?.id;
  if (currentChannelId != null) {
    // 检查是否已存在记录（幂等）
    const existing = await strapi.db.query("plugin::zhao-auth.role-channel").findOne({
      where: { role, channel: currentChannelId },
    });
    if (!existing) {
      await strapi.db.query("plugin::zhao-auth.role-channel").create({
        data: { role, channel: currentChannelId, assignedBy: operatorId },
      });
    }
  }
}

// 失效缓存
invalidateUserCache(userId);
```

- [ ] **Step 2: 创建 role-channel content-type（如不存在）**

检查 `basic/plugins/zhao-auth/server/src/content-types/role-channel/schema.json` 是否存在。若不存在，创建：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_role_channels",
  "info": {
    "singularName": "role-channel",
    "pluralName": "role-channels",
    "displayName": "Role Channel",
    "description": "角色与渠道的绑定关系"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "role": {
      "type": "string",
      "required": true
    },
    "channel": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-channel.channel",
      "inversedBy": "roleChannels"
    },
    "assignedBy": {
      "type": "integer"
    }
  }
}
```

并在 `content-types/index.ts` 中注册。

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
cd e:/code/basic
npm run develop
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/role-management.service.ts plugins/zhao-auth/server/src/content-types/role-channel/
git commit -m "feat(role): assignRole 自动创建 role-channel 记录（渠道绑定）"
```

---

## 阶段 5：细粒度配置渠道维度

### Task 19: channel schema 增加 extraConfig 字段

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/content-types/channel/schema.json`

- [ ] **Step 1: 在 channel schema.json 的 attributes 中追加 extraConfig**

在 `basic/plugins/zhao-channel/server/src/content-types/channel/schema.json` 的 `attributes` 对象末尾（`deletedAt` 之后）追加：

```json
"extraConfig": {
  "type": "json",
  "default": "{}"
}
```

- [ ] **Step 2: 检查 content-types/index.ts 是否内联 schema**

```bash
cat e:/code/basic/plugins/zhao-channel/server/src/content-types/channel/index.ts
```

若内联了 schema 对象，同步追加 extraConfig 字段；若 `import schema from "./schema.json"`，则跳过。

- [ ] **Step 3: 强制迁移**

```bash
psql -U postgres -d strapi -c "DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-channel.channel';"
cd e:/code/basic
npm run develop
```

- [ ] **Step 4: 验证**

```bash
psql -U postgres -d strapi -c "\d zhao_channels"
```

预期看到 `extra_config | json`。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-channel/server/src/content-types/channel/
git commit -m "feat(channel-schema): 增加 extraConfig 字段（渠道级细粒度配置）"
```

---

### Task 20: zhao-channel channel.ts create/update 显式 allow extraConfig

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/services/channel.ts`

- [ ] **Step 1: 查找 create/update 函数**

```bash
grep -n "create\|update" e:/code/basic/plugins/zhao-channel/server/src/services/channel.ts | head -20
```

- [ ] **Step 2: 在 create/update 中允许 extraConfig 字段透传**

定位 `create` 和 `update` 函数，确保 `data` 对象不被过滤掉 `extraConfig`。若服务层使用了显式字段白名单，追加 `extraConfig`：

```ts
async create(data: any) {
  const allowedFields = ["name", "code", "channelTier", "parentChannel", "status", "description", "path", "depth", "extraConfig"];
  const cleaned = allowedFields.reduce((acc, key) => {
    if (data[key] !== undefined) acc[key] = data[key];
    return acc;
  }, {} as any);
  return strapi.documents("plugin::zhao-channel.channel").create({ data: cleaned });
},
```

`update` 函数同理。

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-channel
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-channel/server/src/services/channel.ts
git commit -m "feat(channel-service): create/update 显式 allow extraConfig 字段"
```

---

### Task 21: 新增 PUT /zhao-channel/v1/admin/channels/:id/config API

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/controllers/channel.ts`
- Modify: `basic/plugins/zhao-channel/server/src/routes/content-api.ts`

- [ ] **Step 1: 在 channel controller 新增 updateConfig handler**

在 `basic/plugins/zhao-channel/server/src/controllers/channel.ts` 中追加：

```ts
async updateConfig(ctx: any) {
  try {
    const { id } = ctx.params;
    if (!id) {
      ctx.status = 400;
      ctx.body = { error: "缺少渠道 ID" };
      return;
    }
    const data = ctx.request.body?.data || ctx.request.body;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch {
        ctx.status = 400;
        ctx.body = { error: "无效的 JSON 数据" };
        return;
      }
    }
    // 仅允许 extraConfig 字段
    const cleaned = { extraConfig: data.extraConfig || {} };
    const result = await strapi.plugin("zhao-channel").service("channel").update(id, cleaned);
    ctx.body = { data: result };
  } catch (err) {
    ctx.status = (err as any).status || 400;
    ctx.body = { error: (err as Error).message };
  }
},
```

- [ ] **Step 2: 在 routes/content-api.ts 注册路由**

在 `routes` 数组中追加：

```ts
channelScopeRoute("PUT", "/channels/:id/config", "channel.updateConfig", "channel.config.update"),
```

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-channel
npm run build
cd e:/code/basic
npm run develop
```

```bash
curl -X PUT -H "Authorization: Bearer <channel-admin-token>" -H "Content-Type: application/json" \
  -d '{"data":{"extraConfig":{"signInPoints":20}}}' \
  http://localhost:1337/api/zhao-channel/v1/admin/channels/1/config
```

预期返回 200 + 更新后的 channel。

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-channel/server/src/controllers/channel.ts plugins/zhao-channel/server/src/routes/content-api.ts
git commit -m "feat(channel): 新增 PUT /admin/channels/:id/config API（渠道级配置）"
```

---

### Task 22: getPublicConfig 支持渠道维度合并

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/config.ts:245-371`

- [ ] **Step 1: 修改 getPublicConfig 接收 channelId 参数**

替换 `basic/plugins/zhao-common/server/src/services/config.ts:245`：

```ts
async getPublicConfig(siteId?: string, channelId?: string | number) {
```

- [ ] **Step 2: 在 ec 合并之后追加渠道级覆盖**

在 `basic/plugins/zhao-common/server/src/services/config.ts` 的 `ec = config ?? {};` 之后（约 298 行后）追加：

```ts
// 渠道级 extraConfig 覆盖（浅合并）
if (channelId != null) {
  try {
    const channel = await strapi.db.query("plugin::zhao-channel.channel").findOne({
      where: typeof channelId === "number" ? { id: channelId } : { documentId: channelId },
      select: ["extraConfig"],
    });
    if (channel?.extraConfig) {
      let channelEc: Record<string, any> = {};
      if (typeof channel.extraConfig === "string") {
        try { channelEc = JSON.parse(channel.extraConfig); } catch { /* ignore */ }
      } else if (typeof channel.extraConfig === "object") {
        channelEc = channel.extraConfig;
      }
      ec = { ...ec, ...channelEc };  // 浅合并：渠道级覆盖租户级
    }
  } catch (e) {
    strapi.log.warn("[config] channel extraConfig merge failed:", (e as Error).message);
  }
}
```

- [ ] **Step 3: 修改 config controller 传 channelId**

查找 `basic/plugins/zhao-common/server/src/controllers/config.ts` 的 `getPublicConfig` handler：

```ts
async getPublicConfig(ctx: any) {
  const siteId = ctx.state.siteId;
  const channelId = ctx.query.channel || ctx.state.channelId;
  const result = await strapi.plugin("zhao-common").service("config").getPublicConfig(siteId, channelId);
  ctx.body = result;
},
```

- [ ] **Step 4: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
cd e:/code/basic
npm run develop
```

```bash
curl "http://localhost:1337/api/zhao-common/v1/public/config?domain=5.joho.cn&channel=1"
```

预期：返回的 `featureFlags.signInPoints`（实际在 `points.signInPoints`）应为渠道 1 的 extraConfig 中的值。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/services/config.ts plugins/zhao-common/server/src/controllers/config.ts
git commit -m "feat(config): getPublicConfig 支持渠道维度 extraConfig 浅合并"
```

---

### Task 23: settings/site-config.vue 增加作用域选择器

**Files:**
- Modify: `web/pages/settings/site-config.vue`

- [ ] **Step 1: 查看当前 site-config.vue 结构**

```bash
grep -n "<template>\|<script\|<form\|save\|submit" e:/code/web/pages/settings/site-config.vue | head -20
```

- [ ] **Step 2: 在表单顶部增加作用域选择器**

在 `<template>` 的表单最顶部插入：

```html
<view class="scope-selector">
  <view class="label">配置作用域：</view>
  <radio-group @change="onScopeChange">
    <label><radio value="tenant" :checked="scope === 'tenant'" /> 租户级</label>
    <label><radio value="channel" :checked="scope === 'channel'" /> 渠道级</label>
  </radio-group>
  <view v-if="scope === 'channel'" class="channel-picker">
    <picker mode="selector" :range="channelList" range-key="name" @change="onChannelChange">
      <view class="picker-value">{{ currentChannel?.name || '请选择渠道' }}</view>
    </picker>
  </view>
</view>
```

- [ ] **Step 3: 在 script 中新增 state + 加载渠道列表**

在 `<script setup>` 中追加：

```js
import { adminGet, adminPut } from '@/utils/request'

const scope = ref('tenant')
const channelList = ref([])
const currentChannel = ref(null)

async function loadChannels() {
  const res = await adminGet('/zhao-channel/v1/admin/channels')
  channelList.value = res?.data || []
}

function onScopeChange(e) {
  scope.value = e.detail.value
  if (scope.value === 'channel' && channelList.value.length === 0) {
    loadChannels()
  }
}

function onChannelChange(e) {
  currentChannel.value = channelList.value[e.detail.value]
}

onMounted(() => {
  loadChannels()
})

async function onSave() {
  if (scope.value === 'tenant') {
    // 原 tenant 级保存逻辑保持
    await adminPut('/zhao-common/v1/admin/site-config', formData.value)
  } else {
    if (!currentChannel.value?.id) {
      uni.showToast({ title: '请选择渠道', icon: 'none' })
      return
    }
    await adminPut(`/zhao-channel/v1/admin/channels/${currentChannel.value.id}/config`, {
      data: { extraConfig: extraConfig.value }
    })
  }
  uni.showToast({ title: '保存成功', icon: 'success' })
}
```

- [ ] **Step 4: 验证**

启动 web dev，进入"站点配置"页面，确认作用域选择器可切换，选渠道级时显示渠道下拉。

- [ ] **Step 5: Commit**

```bash
cd e:/code/web
git add pages/settings/site-config.vue
git commit -m "feat(site-config): 增加配置作用域选择器（租户级 / 渠道级）"
```

---

## 阶段 6：租户访问校验

### Task 24: 新增 has-tenant-access policy

**Files:**
- Create: `basic/plugins/zhao-auth/server/src/policies/has-tenant-access.ts`
- Modify: `basic/plugins/zhao-auth/server/src/policies/index.ts`

- [ ] **Step 1: 创建 has-tenant-access.ts**

新建 `basic/plugins/zhao-auth/server/src/policies/has-tenant-access.ts`：

```ts
import type { Core } from "@strapi/strapi";

export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const user = ctx.state.user;
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: "未登录" };
      return;
    }

    // admin 直接放行
    const roles = user.zhaoRoles || [];
    if (Array.isArray(roles) && roles.includes("admin")) {
      return await next();
    }

    const siteId = ctx.state.siteId;
    if (!siteId) {
      // 未识别租户，放行由其他策略处理
      return await next();
    }

    // 查询用户归属渠道
    const userChannelIds: number[] = [];
    try {
      const channelMembers = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: user.id },
        populate: { channel: { select: ["id"] } },
      });
      for (const cm of channelMembers) {
        if (cm.channel?.id) userChannelIds.push(cm.channel.id);
      }
    } catch (e) {
      strapi.log.warn("[has-tenant-access] failed to query user channels:", (e as Error).message);
    }

    if (userChannelIds.length === 0) {
      ctx.status = 403;
      ctx.body = { error: "无权访问该租户" };
      return;
    }

    // 查询租户关联的渠道
    let siteChannelIds: number[] = [];
    try {
      const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
        where: { id: siteId },
        populate: { channels: { select: ["id"] } },
      });
      siteChannelIds = (siteConfig?.channels || []).map((c: any) => c.id);
    } catch (e) {
      strapi.log.warn("[has-tenant-access] failed to query site channels:", (e as Error).message);
    }

    const hasAccess = userChannelIds.some((uc) => siteChannelIds.includes(uc));
    if (!hasAccess) {
      ctx.status = 403;
      ctx.body = { error: "无权访问该租户" };
      return;
    }

    return await next();
  };
};
```

- [ ] **Step 2: 在 policies/index.ts 注册**

修改 `basic/plugins/zhao-auth/server/src/policies/index.ts`：

```ts
import hasTenantAccess from "./has-tenant-access";

export default {
  // ... 原 policy 导出保持
  "has-tenant-access": hasTenantAccess,
};
```

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/policies/has-tenant-access.ts plugins/zhao-auth/server/src/policies/index.ts
git commit -m "feat(policy): 新增 has-tenant-access policy（租户访问校验）"
```

---

### Task 25: 挂载 has-tenant-access 到所有 admin 路由

**Files:**
- Modify: 7 个插件的 `routes/content-api.ts`

- [ ] **Step 1: 修改 channelScopeRoute 工厂函数（统一加挂载）**

在每个插件的 `server/src/routes/content-api.ts` 中，修改 `channelScopeRoute` 工厂函数，追加 has-tenant-access policy：

```ts
const channelScopeRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access",  // 新增
    ],
  },
});
```

涉及插件：zhao-channel / zhao-course / zhao-point / zhao-quiz / zhao-wealth

- [ ] **Step 2: 修改 adminRoute 工厂函数（统一加挂载）**

对于 zhao-common / zhao-studio 的 `adminRoute`（不带 channelScope 的 admin 路由），同样追加：

```ts
const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-tenant-access",  // 新增
    ],
  },
});
```

- [ ] **Step 3: 评估 zhao-wealth 的 has-channel-access 替换**

```bash
grep -n "has-channel-access" e:/code/basic/plugins/zhao-wealth/server/src/routes/content-api.ts
```

若有 5 处 `has-channel-access`，评估是否替换为 `has-tenant-access`：

- 若 `has-channel-access` 已实现渠道-租户校验，保留并追加 `has-tenant-access` 双重保险
- 若 `has-channel-access` 仅校验渠道范围，替换为 `has-tenant-access`

- [ ] **Step 4: 构建所有插件**

```bash
cd e:/code/basic/plugins/zhao-channel && npm run build
cd e:/code/basic/plugins/zhao-course && npm run build
cd e:/code/basic/plugins/zhao-point && npm run build
cd e:/code/basic/plugins/zhao-quiz && npm run build
cd e:/code/basic/plugins/zhao-studio && npm run build
cd e:/code/basic/plugins/zhao-wealth && npm run build
cd e:/code/basic/plugins/zhao-common && npm run build
```

- [ ] **Step 5: 重启验证**

```bash
cd e:/code/basic
npm run develop
```

用 channel-admin token 访问自己租户的 admin 路由：应 200。访问非授权租户：应 403。

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-channel/server/src/routes/content-api.ts \
  plugins/zhao-course/server/src/routes/content-api.ts \
  plugins/zhao-point/server/src/routes/content-api.ts \
  plugins/zhao-quiz/server/src/routes/content-api.ts \
  plugins/zhao-studio/server/src/routes/content-api.ts \
  plugins/zhao-wealth/server/src/routes/content-api.ts \
  plugins/zhao-common/server/src/routes/content-api.ts
git commit -m "feat(routes): 7 个插件 admin 路由挂载 has-tenant-access policy"
```

---

## 阶段 7：Web 端租户切换器

### Task 26: 新增 GET /zhao-auth/v1/my/tenants API

**Files:**
- Create: `basic/plugins/zhao-auth/server/src/services/tenant.service.ts`
- Create: `basic/plugins/zhao-auth/server/src/controllers/tenant.ts`
- Create: `basic/plugins/zhao-auth/server/src/routes/tenant.ts`
- Modify: `basic/plugins/zhao-auth/server/src/routes/index.ts`

- [ ] **Step 1: 创建 tenant.service.ts**

新建 `basic/plugins/zhao-auth/server/src/services/tenant.service.ts`：

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getMyTenants(userId: number, roles: string[]) {
    // admin 返回全部租户
    if (roles.includes("admin")) {
      const all = await strapi.db.query("plugin::zhao-common.site-config").findMany({
        select: ["id", "siteName", "domain"],
        limit: 1000,
      });
      return all.map((s: any) => ({ id: s.id, name: s.siteName, domain: s.domain }));
    }

    // 非 admin：查用户归属渠道 → 查 zhao_channels_sites_lnk → 返回关联租户
    const channelMembers = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
      where: { user: userId },
      populate: { channel: { select: ["id"] } },
    });
    const channelIds = channelMembers
      .map((cm: any) => cm.channel?.id)
      .filter(Boolean);

    if (channelIds.length === 0) return [];

    // 查 zhao_channels_sites_lnk 关联表
    const links = await strapi.db.connection("zhao_channels_sites_lnk")
      .whereIn("channel_id", channelIds)
      .select("site_config_id");

    const siteIds = [...new Set(links.map((l: any) => l.site_config_id))];
    if (siteIds.length === 0) return [];

    const sites = await strapi.db.query("plugin::zhao-common.site-config").findMany({
      where: { id: { $in: siteIds } },
      select: ["id", "siteName", "domain"],
    });

    return sites.map((s: any) => ({ id: s.id, name: s.siteName, domain: s.domain }));
  },
});
```

- [ ] **Step 2: 创建 tenant controller**

新建 `basic/plugins/zhao-auth/server/src/controllers/tenant.ts`：

```ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getMyTenants(ctx: any) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "未登录" };
        return;
      }
      const roles = user.zhaoRoles || [];
      const tenants = await strapi.plugin("zhao-auth").service("tenant").getMyTenants(user.id, roles);
      ctx.body = { data: tenants };
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});
```

- [ ] **Step 3: 创建 tenant routes**

新建 `basic/plugins/zhao-auth/server/src/routes/tenant.ts`：

```ts
export default () => ({
  type: "content-api" as const,
  routes: [
    {
      method: "GET",
      path: "/v1/my/tenants",
      handler: "tenant.getMyTenants",
      config: {
        auth: false,
        policies: ["plugin::zhao-auth.is-authenticated"],
      },
    },
  ],
});
```

- [ ] **Step 4: 在 routes/index.ts 注册**

修改 `basic/plugins/zhao-auth/server/src/routes/index.ts`：

```ts
import tenant from "./tenant";

export default [
  // ... 原路由导入保持
  tenant,
];
```

- [ ] **Step 5: 在 services/index.ts 注册 tenant 服务**

修改 `basic/plugins/zhao-auth/server/src/services/index.ts`：

```ts
import tenant from "./tenant.service";

export default {
  // ... 原服务导出保持
  tenant,
};
```

- [ ] **Step 6: 在 controllers/index.ts 注册 tenant 控制器**

修改 `basic/plugins/zhao-auth/server/src/controllers/index.ts`：

```ts
import tenant from "./tenant";

export default {
  // ... 原控制器导出保持
  tenant,
};
```

- [ ] **Step 7: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-auth
npm run build
cd e:/code/basic
npm run develop
```

```bash
curl -H "Authorization: Bearer <channel-admin-token>" http://localhost:1337/api/zhao-auth/v1/my/tenants
```

预期返回 `{ data: [{ id, name, domain }, ...] }`。

- [ ] **Step 8: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-auth/server/src/services/tenant.service.ts \
  plugins/zhao-auth/server/src/controllers/tenant.ts \
  plugins/zhao-auth/server/src/routes/tenant.ts \
  plugins/zhao-auth/server/src/services/index.ts \
  plugins/zhao-auth/server/src/controllers/index.ts \
  plugins/zhao-auth/server/src/routes/index.ts
git commit -m "feat(tenant): 新增 GET /my/tenants API（用户可管理租户列表）"
```

---

### Task 27: 新增 tenant-context-resolver 中间件

**Files:**
- Create: `basic/plugins/zhao-common/server/src/middlewares/tenant-context-resolver.ts`
- Modify: `basic/plugins/zhao-common/server/src/middlewares/index.ts`

- [ ] **Step 1: 创建 tenant-context-resolver.ts**

新建 `basic/plugins/zhao-common/server/src/middlewares/tenant-context-resolver.ts`：

```ts
import type { Core } from "@strapi/strapi";

export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    // 优先级：x-site-id header > ?siteId query > 不处理（fallback 到 site-resolver）
    const siteIdFromHeader = ctx.request.headers["x-site-id"];
    const siteIdFromQuery = ctx.query.siteId;

    if (siteIdFromHeader) {
      ctx.state.siteId = String(siteIdFromHeader);
    } else if (siteIdFromQuery) {
      ctx.state.siteId = String(siteIdFromQuery);
    }

    // 若两种来源都未命中，保持 ctx.state.siteId 为 undefined，由下游 site-resolver 处理
    return await next();
  };
};
```

- [ ] **Step 2: 在 middlewares/index.ts 注册**

修改 `basic/plugins/zhao-common/server/src/middlewares/index.ts`：

```ts
import tenantContextResolver from "./tenant-context-resolver";

export default {
  // ... 原中间件导出保持
  "tenant-context-resolver": tenantContextResolver,
};
```

- [ ] **Step 3: 在 Strapi 全局 middlewares 配置中注册**

修改 `basic/config/middlewares.ts`（或在 plugin 的 bootstrap 中通过 `strapi.server.use` 挂载），在 site-resolver 之前挂载 tenant-context-resolver。

具体方式：在 `basic/plugins/zhao-common/server/src/bootstrap/index.ts` 中：

```ts
strapi.server.use(async (ctx: any, next: any) => {
  const siteIdFromHeader = ctx.request.headers["x-site-id"];
  const siteIdFromQuery = ctx.query.siteId;
  if (siteIdFromHeader) ctx.state.siteId = String(siteIdFromHeader);
  else if (siteIdFromQuery) ctx.state.siteId = String(siteIdFromQuery);
  await next();
});
```

- [ ] **Step 4: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
cd e:/code/basic
npm run develop
```

```bash
curl -H "Authorization: Bearer <token>" -H "x-site-id: 1" http://localhost:1337/api/zhao-common/v1/public/config
```

预期：返回 siteId=1 的配置。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/middlewares/tenant-context-resolver.ts \
  plugins/zhao-common/server/src/middlewares/index.ts \
  plugins/zhao-common/server/src/bootstrap/index.ts
git commit -m "feat(middleware): 新增 tenant-context-resolver 中间件（x-site-id header 识别租户）"
```

---

### Task 28: web/src/api/auth.js 新增 getMyTenants

**Files:**
- Modify: `web/src/api/auth.js`

- [ ] **Step 1: 在 auth.js 中追加 getMyTenants**

在 `web/src/api/auth.js` 末尾追加：

```js
export function getMyTenants() {
  return adminGet('/zhao-auth/v1/my/tenants')
}
```

确保已 import `adminGet`：

```js
import { adminGet, adminPost } from '@/utils/request'
```

- [ ] **Step 2: 验证**

```bash
cd e:/code/web
npm run dev
```

控制台测试：

```js
import { getMyTenants } from '@/api/auth'
const res = await getMyTenants()
console.log(res)
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/web
git add src/api/auth.js
git commit -m "feat(api): 新增 getMyTenants API"
```

---

### Task 29: web/src/store/user.js 新增 tenantList / currentTenantId state

**Files:**
- Modify: `web/src/store/user.js`

- [ ] **Step 1: 新增 state**

在 `web/src/store/user.js` 的 state 区追加：

```js
const tenantList = ref([])
const currentTenantId = ref(null)
```

- [ ] **Step 2: 新增 fetchTenants / setCurrentTenant 方法**

```js
import { getMyRoles, getMyTenants } from '../api/auth.js'

async function fetchTenants() {
  try {
    const res = await getMyTenants()
    tenantList.value = res?.data || []
    if (tenantList.value.length > 0 && !currentTenantId.value) {
      const saved = uni.getStorageSync('tadmin_current_tenant_id')
      currentTenantId.value = saved || tenantList.value[0].id
    }
    uni.setStorageSync('tadmin_tenant_list', JSON.stringify(tenantList.value))
    uni.setStorageSync('tadmin_current_tenant_id', currentTenantId.value)
  } catch (e) {
    console.warn('[user] fetchTenants failed:', e)
  }
}

function setCurrentTenant(id) {
  currentTenantId.value = id
  uni.setStorageSync('tadmin_current_tenant_id', id)
  // 清空 config-helper 缓存，下次 loadSiteConfig 重新拉取
  const { clearConfigCache } = require('../utils/config-helper')
  clearConfigCache()
}
```

- [ ] **Step 3: 修改 loadFromStorage 读取 tenantList / currentTenantId**

在 `loadFromStorage` 函数中追加：

```js
const storedTenants = safeJsonParse(uni.getStorageSync('tadmin_tenant_list'), [])
if (Array.isArray(storedTenants) && storedTenants.length > 0) tenantList.value = storedTenants

const savedTenantId = uni.getStorageSync('tadmin_current_tenant_id')
if (savedTenantId) currentTenantId.value = savedTenantId
```

- [ ] **Step 4: 修改 clearUser 清理 tenantList / currentTenantId**

```js
function clearUser() {
  // ... 原清理逻辑保持
  tenantList.value = []
  currentTenantId.value = null
  uni.removeStorageSync('tadmin_tenant_list')
  uni.removeStorageSync('tadmin_current_tenant_id')
}
```

- [ ] **Step 5: 修改 login 的 Promise.all 追加 fetchTenants**

```js
async function login(username, password) {
  // ... 原 login 逻辑保持
  await Promise.all([
    fetchUser(),
    fetchUserRoles(),
    fetchTenants(),  // 新增
  ])
}
```

- [ ] **Step 6: 修改 return 暴露新 state**

```js
return {
  // ... 原 return 保持
  tenantList,
  currentTenantId,
  fetchTenants,
  setCurrentTenant,
}
```

- [ ] **Step 7: 验证**

启动 web dev，登录后检查控制台：

```js
const userStore = useUserStore()
console.log(userStore.tenantList.value)
console.log(userStore.currentTenantId.value)
```

- [ ] **Step 8: Commit**

```bash
cd e:/code/web
git add src/store/user.js
git commit -m "feat(user-store): 新增 tenantList / currentTenantId state 和 fetchTenants / setCurrentTenant 方法"
```

---

### Task 30: 新建 TenantSwitcher.vue 组件

**Files:**
- Create: `web/src/components/TenantSwitcher.vue`

- [ ] **Step 1: 创建组件**

新建 `web/src/components/TenantSwitcher.vue`：

```vue
<template>
  <view class="tenant-switcher" @click="toggleDropdown">
    <view class="current-tenant">
      <text class="label">当前租户：</text>
      <text class="name">{{ currentTenant?.name || '请选择' }}</text>
      <text class="arrow" :class="{ open: showDropdown }">▼</text>
    </view>
    <view v-if="showDropdown" class="dropdown">
      <view
        v-for="tenant in tenantList"
        :key="tenant.id"
        class="dropdown-item"
        :class="{ active: tenant.id === currentTenantId }"
        @click.stop="selectTenant(tenant.id)"
      >
        <text>{{ tenant.name }}</text>
        <text class="domain">{{ tenant.domain }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const tenantList = computed(() => userStore.tenantList.value)
const currentTenantId = computed(() => userStore.currentTenantId.value)
const currentTenant = computed(() => tenantList.value.find(t => t.id === currentTenantId.value))

const showDropdown = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function selectTenant(id) {
  userStore.setCurrentTenant(id)
  showDropdown.value = false
  // 触发页面刷新
  window.location.reload()
}
</script>

<style scoped>
.tenant-switcher {
  position: relative;
  cursor: pointer;
  padding: 8px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.current-tenant {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  color: #999;
  font-size: 12px;
}
.name {
  font-weight: 600;
  color: #333;
}
.arrow {
  font-size: 10px;
  color: #999;
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(180deg);
}
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 1000;
  margin-top: 4px;
}
.dropdown-item {
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
}
.dropdown-item:last-child {
  border-bottom: none;
}
.dropdown-item:hover {
  background: #f9f9f9;
}
.dropdown-item.active {
  background: #e6f7ff;
  color: #1890ff;
}
.domain {
  color: #999;
  font-size: 12px;
}
</style>
```

- [ ] **Step 2: 验证组件能正确 import**

```bash
cd e:/code/web
npm run dev
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/web
git add src/components/TenantSwitcher.vue
git commit -m "feat(component): 新建 TenantSwitcher 租户切换器组件"
```

---

### Task 31: dashboard/index.vue 顶部三段式 + 挂载 TenantSwitcher

**Files:**
- Modify: `web/pages/dashboard/index.vue:3-8`

- [ ] **Step 1: 修改顶部布局为三段式**

替换 `web/pages/dashboard/index.vue:3-8`（header 区块）：

```html
<view class="header">
  <view class="header-title">
    <text class="title">管理后台</text>
  </view>
  <TenantSwitcher v-if="userStore.tenantList.value.length > 0" />
  <view class="header-user">
    <!-- 原用户信息区块 -->
  </view>
</view>
```

- [ ] **Step 2: 在 script 中 import TenantSwitcher**

```js
import TenantSwitcher from '@/components/TenantSwitcher.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
```

- [ ] **Step 3: 验证**

启动 web dev，登录后确认顶部显示租户切换器，可切换。

- [ ] **Step 4: Commit**

```bash
cd e:/code/web
git add pages/dashboard/index.vue
git commit -m "feat(dashboard): 顶部改造为三段式布局，挂载 TenantSwitcher"
```

---

### Task 32: request.js 两处 header 注入 x-site-id

**Files:**
- Modify: `web/src/utils/request.js:37-43, 126-131`

- [ ] **Step 1: 修改 request 函数的 header 构造**

替换 `web/src/utils/request.js:37-43`：

```js
async function request(options, isRetry = false) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }
  // 注入 x-site-id
  const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
  if (tenantId) {
    header['x-site-id'] = String(tenantId)
  }
  // ... 原 return new Promise 逻辑保持
```

- [ ] **Step 2: 修改 adminRequest 函数的 header 构造**

替换 `web/src/utils/request.js:126-131`：

```js
async function adminRequest(options) {
  const token = uni.getStorageSync('tadmin_token') ?? localStorage.getItem('tadmin_token')
  const header = {
    'Content-Type': 'application/json',
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }
  // 注入 x-site-id
  const tenantId = uni.getStorageSync('tadmin_current_tenant_id')
  if (tenantId) {
    header['x-site-id'] = String(tenantId)
  }
  // ... 原 return new Promise 逻辑保持
```

- [ ] **Step 3: 验证**

启动 web dev，登录后切换租户，浏览器 DevTools Network 面板查看任意 admin 请求，确认 header 中带 `x-site-id`。

- [ ] **Step 4: Commit**

```bash
cd e:/code/web
git add src/utils/request.js
git commit -m "feat(request): request 和 adminRequest 自动注入 x-site-id header"
```

---

### Task 33: config-helper.js 的 loadSiteConfig 支持 siteId 参数

**Files:**
- Modify: `web/src/utils/config-helper.js`

注意：Task 1 Step 3 已实现 `loadSiteConfig(siteId)` 的签名，本任务确保 getPublicConfig API 支持 siteId 透传。

- [ ] **Step 1: 检查 api/config.js 的 getPublicConfig 是否支持 params**

```bash
cat e:/code/web/src/api/config.js
```

若不支持，修改：

```js
import { adminGet } from '@/utils/request'

export function getPublicConfig(params = {}) {
  return adminGet('/zhao-common/v1/public/config', params)
}
```

- [ ] **Step 2: 验证**

```js
import { loadSiteConfig } from '@/utils/config-helper'
await loadSiteConfig(1)  // 传 siteId=1
```

预期：发起请求 `/zhao-common/v1/public/config?siteId=1`。

- [ ] **Step 3: Commit**

```bash
cd e:/code/web
git add src/api/config.js
git commit -m "feat(config-api): getPublicConfig 支持 siteId 透传"
```

---

### Task 34: 课程/课时表单监听 currentTenantId 变化

**Files:**
- Modify: `web/pages/course/form.vue`
- Modify: `web/pages/course/lesson/form.vue`

- [ ] **Step 1: 在 course/form.vue 中监听 currentTenantId**

在 `<script setup>` 中：

```js
import { watch } from 'vue'
import { useUserStore } from '@/store/user'
import { loadSiteConfig, isFeatureEnabled, clearConfigCache } from '@/utils/config-helper'

const userStore = useUserStore()

watch(() => userStore.currentTenantId.value, async (newId) => {
  if (newId) {
    clearConfigCache()
    await loadSiteConfig(newId)
    // 重新计算表单显隐
    showPointsSection.value = isFeatureEnabled('pointsEnabled')
    showCoursePreviewSection.value = isFeatureEnabled('coursePreviewEnabled')
    showCourseEnrollSection.value = isFeatureEnabled('courseEnrollEnabled')
  }
}, { immediate: true })

const showPointsSection = ref(false)
const showCoursePreviewSection = ref(false)
const showCourseEnrollSection = ref(false)

onMounted(async () => {
  if (userStore.currentTenantId.value) {
    await loadSiteConfig(userStore.currentTenantId.value)
  }
  showPointsSection.value = isFeatureEnabled('pointsEnabled')
  showCoursePreviewSection.value = isFeatureEnabled('coursePreviewEnabled')
  showCourseEnrollSection.value = isFeatureEnabled('courseEnrollEnabled')
})
```

- [ ] **Step 2: 用 v-if 包裹对应区块**

```html
<view v-if="showPointsSection" class="points-section">...</view>
<view v-if="showCoursePreviewSection" class="preview-section">...</view>
<view v-if="showCourseEnrollSection" class="enroll-section">...</view>
```

- [ ] **Step 3: lesson/form.vue 同样改造**

参考 Task 2 已有 `showPointsSection`，增加 watch：

```js
watch(() => userStore.currentTenantId.value, async (newId) => {
  if (newId) {
    clearConfigCache()
    await loadSiteConfig(newId)
    showPointsSection.value = isFeatureEnabled('pointsEnabled')
  }
}, { immediate: true })
```

- [ ] **Step 4: 验证**

启动 web dev，切换租户，进入课程表单，确认积分区块显隐根据租户配置变化。

- [ ] **Step 5: Commit**

```bash
cd e:/code/web
git add pages/course/form.vue pages/course/lesson/form.vue
git commit -m "feat(course-form): 监听 currentTenantId 变化自动刷新功能开关显隐"
```

---

## 阶段 8：C 端模板样式配置

### Task 35: site-config schema 增加 themeConfig 字段

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json`

- [ ] **Step 1: 在 site-config schema.json 的 attributes 末尾追加 themeConfig**

在 `basic/plugins/zhao-common/server/src/content-types/site-config/schema.json` 的 `attributes` 对象末尾（`extraConfig` 之后）追加：

```json
"themeConfig": {
  "type": "json",
  "default": "{}"
}
```

- [ ] **Step 2: 检查 content-types/index.ts**

```bash
cat e:/code/basic/plugins/zhao-common/server/src/content-types/site-config/index.ts
```

若内联 schema，同步追加；否则跳过。

- [ ] **Step 3: 强制迁移**

```bash
psql -U postgres -d strapi -c "DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-common.site-config';"
cd e:/code/basic
npm run develop
```

- [ ] **Step 4: 验证**

```bash
psql -U postgres -d strapi -c "\d zhao_site_configs"
```

预期看到 `theme_config | json`。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/content-types/site-config/
git commit -m "feat(site-config-schema): 增加 themeConfig 字段（C 端主题样式）"
```

---

### Task 36: site-template schema 增加 themeConfig 字段

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/content-types/site-template/schema.json`

- [ ] **Step 1: 查看 site-template schema**

```bash
cat e:/code/basic/plugins/zhao-common/server/src/content-types/site-template/schema.json
```

- [ ] **Step 2: 在 attributes 中追加 themeConfig**

在 `attributes` 对象中追加：

```json
"themeConfig": {
  "type": "json",
  "default": "{}"
}
```

- [ ] **Step 3: 强制迁移**

```bash
psql -U postgres -d strapi -c "DELETE FROM strapi_database_schema WHERE uid = 'plugin::zhao-common.site-template';"
cd e:/code/basic
npm run develop
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/content-types/site-template/
git commit -m "feat(site-template-schema): 增加 themeConfig 字段"
```

---

### Task 37: zhao-common bootstrap 新增 initDefaultTemplates（5 套预设模板）

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/bootstrap/index.ts`

- [ ] **Step 1: 在 bootstrap 中新增 initDefaultTemplates 函数**

在 `basic/plugins/zhao-common/server/src/bootstrap/index.ts` 末尾追加：

```ts
async function initDefaultTemplates() {
  const TEMPLATE_UID = "plugin::zhao-common.site-template";
  try {
    const existing = await strapi.db.query(TEMPLATE_UID).count();
    if (existing > 0) return;

    const presets = [
      {
        name: "coursera-blue",
        displayName: "Coursera 学术蓝",
        themeConfig: JSON.stringify({
          primaryColor: "#0056D2",
          secondaryColor: "#F4F7F6",
          navStyle: "default",
          cardStyle: "shadow",
          tabBarColor: "#0056D2",
          tabBarActiveColor: "#FFFFFF",
        }),
        isDefault: true,
      },
      {
        name: "khan-green",
        displayName: "Khan 学院绿",
        themeConfig: JSON.stringify({
          primaryColor: "#14BF95",
          secondaryColor: "#F5F9F8",
          navStyle: "default",
          cardStyle: "rounded",
          tabBarColor: "#14BF95",
          tabBarActiveColor: "#FFFFFF",
        }),
      },
      {
        name: "udemy-violet",
        displayName: "Udemy 鲜艳紫",
        themeConfig: JSON.stringify({
          primaryColor: "#A435F0",
          secondaryColor: "#FAF7FF",
          navStyle: "gradient",
          cardStyle: "shadow",
          tabBarColor: "#1C1D1F",
          tabBarActiveColor: "#A435F0",
        }),
      },
      {
        name: "edx-deep",
        displayName: "edX 深蓝学术",
        themeConfig: JSON.stringify({
          primaryColor: "#02262B",
          secondaryColor: "#E8ECEF",
          navStyle: "default",
          cardStyle: "default",
          tabBarColor: "#02262B",
          tabBarActiveColor: "#FFFFFF",
        }),
      },
      {
        name: "netease-red",
        displayName: "网易课堂红",
        themeConfig: JSON.stringify({
          primaryColor: "#D8232A",
          secondaryColor: "#FFF5F5",
          navStyle: "default",
          cardStyle: "shadow",
          tabBarColor: "#D8232A",
          tabBarActiveColor: "#FFFFFF",
        }),
      },
    ];

    for (const preset of presets) {
      await strapi.db.query(TEMPLATE_UID).create({ data: preset });
    }
    strapi.log.info(`[bootstrap] 已生成 ${presets.length} 套预设模板`);
  } catch (e) {
    strapi.log.warn("[bootstrap] initDefaultTemplates failed:", (e as Error).message);
  }
}
```

- [ ] **Step 2: 在 bootstrap 主函数中调用**

在 `bootstrap` 主函数末尾追加：

```ts
await initDefaultTemplates();
```

- [ ] **Step 3: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
cd e:/code/basic
npm run develop
```

预期日志：`[bootstrap] 已生成 5 套预设模板`。

- [ ] **Step 4: 验证数据库**

```bash
psql -U postgres -d strapi -c "SELECT name, display_name FROM zhao_site_templates;"
```

预期 5 条记录。

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/bootstrap/index.ts
git commit -m "feat(bootstrap): 新增 initDefaultTemplates，启动时生成 5 套预设模板"
```

---

### Task 38: getPublicConfig 返回增加 theme

**Files:**
- Modify: `basic/plugins/zhao-common/server/src/services/config.ts`

- [ ] **Step 1: 在 getPublicConfig 末尾追加 theme 返回**

在 `basic/plugins/zhao-common/server/src/services/config.ts` 的 `getPublicConfig` 函数末尾（`return result` 之前）追加：

```ts
// 主题配置
let themeConfig: Record<string, any> = {};
try {
  const rawTheme = fullConfig?.themeConfig;
  if (rawTheme && typeof rawTheme === "object" && !Array.isArray(rawTheme)) {
    themeConfig = rawTheme as Record<string, any>;
  } else if (typeof rawTheme === "string" && rawTheme.trim()) {
    themeConfig = JSON.parse(rawTheme);
  }
} catch { /* ignore */ }

// 若 themeConfig 为空，从关联的 site-template 读取
if (Object.keys(themeConfig).length === 0 && fullConfig?.template) {
  try {
    const templateId = typeof fullConfig.template === "object" ? fullConfig.template.id : fullConfig.template;
    const template = await strapi.db.query("plugin::zhao-common.site-template").findOne({
      where: { id: templateId },
      select: ["themeConfig"],
    });
    if (template?.themeConfig) {
      themeConfig = typeof template.themeConfig === "string"
        ? JSON.parse(template.themeConfig)
        : template.themeConfig;
    }
  } catch { /* ignore */ }
}

result.theme = {
  primaryColor: themeConfig.primaryColor ?? "#667eea",
  secondaryColor: themeConfig.secondaryColor ?? "#f0f2f5",
  navStyle: themeConfig.navStyle ?? "default",
  cardStyle: themeConfig.cardStyle ?? "default",
  tabBarColor: themeConfig.tabBarColor ?? "#667eea",
  tabBarActiveColor: themeConfig.tabBarActiveColor ?? "#ffffff",
};
```

- [ ] **Step 2: 构建验证**

```bash
cd e:/code/basic/plugins/zhao-common
npm run build
cd e:/code/basic
npm run develop
```

```bash
curl "http://localhost:1337/api/zhao-common/v1/public/config?domain=localhost"
```

预期返回包含 `theme: { primaryColor, secondaryColor, ... }`。

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-common/server/src/services/config.ts
git commit -m "feat(config): getPublicConfig 返回 theme 字段（含模板回退）"
```

---

### Task 39: pages/tenant/detail.vue 增加"模板样式"区块 + 新建 ColorPicker 组件

**Files:**
- Create: `web/src/components/ColorPicker.vue`
- Modify: `web/pages/tenant/detail.vue`

- [ ] **Step 1: 创建 ColorPicker 组件**

新建 `web/src/components/ColorPicker.vue`：

```vue
<template>
  <view class="color-picker">
    <view class="current-color" :style="{ backgroundColor: modelValue }" @click="showPalette = !showPalette" />
    <input type="color" :value="modelValue" @input="onInput" class="native-input" />
    <view v-if="showPalette" class="palette">
      <view
        v-for="color in presetColors"
        :key="color"
        class="palette-color"
        :style="{ backgroundColor: color }"
        @click="select(color)"
      />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#667eea' }
})
const emit = defineEmits(['update:modelValue'])

const showPalette = ref(false)
const presetColors = [
  '#667eea', '#0056D2', '#14BF95', '#A435F0', '#02262B', '#D8232A',
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2',
]

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function select(color) {
  emit('update:modelValue', color)
  showPalette.value = false
}
</script>

<style scoped>
.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.current-color {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
}
.native-input {
  width: 40px;
  height: 32px;
  border: none;
  cursor: pointer;
}
.palette {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  z-index: 1000;
}
.palette-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
}
.palette-color:hover {
  transform: scale(1.1);
}
</style>
```

- [ ] **Step 2: 在 tenant/detail.vue 中增加"模板样式"区块**

在 `<template>` 的表单中追加：

```html
<view class="form-section">
  <view class="section-title">模板样式</view>
  <view class="form-item">
    <text class="label">预设模板</text>
    <picker mode="selector" :range="templateList" range-key="displayName" @change="onTemplateChange">
      <view class="picker-value">{{ currentTemplate?.displayName || '请选择' }}</view>
    </picker>
  </view>
  <view class="form-item">
    <text class="label">主题色</text>
    <ColorPicker v-model="themeConfig.primaryColor" />
  </view>
  <view class="form-item">
    <text class="label">辅助色</text>
    <ColorPicker v-model="themeConfig.secondaryColor" />
  </view>
  <view class="form-item">
    <text class="label">导航样式</text>
    <radio-group @change="e => themeConfig.navStyle = e.detail.value">
      <label><radio value="default" :checked="themeConfig.navStyle === 'default'" /> 默认</label>
      <label><radio value="gradient" :checked="themeConfig.navStyle === 'gradient'" /> 渐变</label>
      <label><radio value="custom" :checked="themeConfig.navStyle === 'custom'" /> 自定义</label>
    </radio-group>
  </view>
  <view class="form-item">
    <text class="label">tabBar 颜色</text>
    <ColorPicker v-model="themeConfig.tabBarColor" />
  </view>
  <view class="form-item">
    <text class="label">tabBar 激活色</text>
    <ColorPicker v-model="themeConfig.tabBarActiveColor" />
  </view>
</view>
```

- [ ] **Step 3: 在 script 中加载模板列表 + 处理选择**

```js
import ColorPicker from '@/components/ColorPicker.vue'
import { adminGet } from '@/utils/request'

const templateList = ref([])
const currentTemplate = ref(null)
const themeConfig = ref({
  primaryColor: '#667eea',
  secondaryColor: '#f0f2f5',
  navStyle: 'default',
  cardStyle: 'default',
  tabBarColor: '#667eea',
  tabBarActiveColor: '#ffffff',
})

async function loadTemplates() {
  const res = await adminGet('/zhao-common/v1/admin/site-templates')
  templateList.value = res?.data || []
}

function onTemplateChange(e) {
  currentTemplate.value = templateList.value[e.detail.value]
  if (currentTemplate.value?.themeConfig) {
    const config = typeof currentTemplate.value.themeConfig === 'string'
      ? JSON.parse(currentTemplate.value.themeConfig)
      : currentTemplate.value.themeConfig
    themeConfig.value = { ...themeConfig.value, ...config }
  }
}

onMounted(() => {
  loadTemplates()
})
```

- [ ] **Step 4: 修改保存逻辑包含 themeConfig**

在原 save 函数中追加：

```js
async function onSave() {
  // ... 原保存逻辑保持
  formData.value.themeConfig = JSON.stringify(themeConfig.value)
  await adminPut('/zhao-common/v1/admin/site-config', formData.value)
}
```

- [ ] **Step 5: 验证**

启动 web dev，进入"租户管理 → 编辑"，确认模板样式区块显示，可切换模板/选色。

- [ ] **Step 6: Commit**

```bash
cd e:/code/web
git add src/components/ColorPicker.vue pages/tenant/detail.vue
git commit -m "feat(tenant-detail): 增加模板样式区块，新建 ColorPicker 组件"
```

---

## 阶段 9a：shao 端主题改造 MVP

### Task 40: 新建 shao/utils/theme.ts（applyTheme 函数）

**Files:**
- Create: `shao/utils/theme.ts`

- [ ] **Step 1: 创建 theme.ts**

新建 `shao/utils/theme.ts`：

```ts
export interface ThemeConfig {
  primaryColor?: string
  secondaryColor?: string
  navStyle?: string
  cardStyle?: string
  tabBarColor?: string
  tabBarActiveColor?: string
}

let currentTheme: ThemeConfig = {}

export function applyTheme(themeConfig: ThemeConfig | null | undefined) {
  if (!themeConfig) return
  currentTheme = themeConfig

  // 1. H5 端设置 CSS 变量
  // #ifdef H5
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (themeConfig.primaryColor) root.style.setProperty('--brand-primary', themeConfig.primaryColor)
    if (themeConfig.secondaryColor) root.style.setProperty('--brand-secondary', themeConfig.secondaryColor)
  }
  // #endif

  // 2. 设置 tabBar 样式（运行时 API）
  try {
    uni.setTabBarStyle({
      backgroundColor: themeConfig.tabBarColor || '#667eea',
      selectedColor: themeConfig.tabBarActiveColor || '#ffffff',
      borderStyle: 'black',
    })
  } catch (e) {
    console.warn('[theme] setTabBarStyle failed:', e)
  }

  // 3. 设置导航栏颜色（每个页面 onShow 时也要调用）
  try {
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: themeConfig.primaryColor || '#667eea',
    })
  } catch (e) {
    console.warn('[theme] setNavigationBarColor failed:', e)
  }
}

export function getPrimaryColor(): string {
  return currentTheme.primaryColor || '#667eea'
}

export function getCurrentTheme(): ThemeConfig {
  return currentTheme
}
```

- [ ] **Step 2: 验证编译**

```bash
cd e:/code/shao
npm run dev
```

无报错即可。

- [ ] **Step 3: Commit**

```bash
cd e:/code/shao
git add utils/theme.ts
git commit -m "feat(theme): 新建 utils/theme.ts，实现 applyTheme 函数"
```

---

### Task 41: shao/services/auth-config.ts 接入 themeConfig 字段

**Files:**
- Modify: `shao/services/auth-config.ts`

- [ ] **Step 1: 查看当前 fetchAuthConfig 返回结构**

```bash
grep -n "fetchAuthConfig\|return\|themeConfig\|theme" e:/code/shao/services/auth-config.ts | head -20
```

- [ ] **Step 2: 在返回对象中透传 theme**

定位 `fetchAuthConfig` 函数，在 return 时合并 theme：

```ts
import { applyTheme } from '@/utils/theme'

export async function fetchAuthConfig() {
  // ... 原逻辑保持
  const config = await getPublicConfig({ domain: SITE_DOMAIN })
  // 应用主题
  if (config?.theme) {
    applyTheme(config.theme)
  }
  return config
}
```

- [ ] **Step 3: 验证**

启动 shao dev，确认 applyTheme 被调用（控制台无报错）。

- [ ] **Step 4: Commit**

```bash
cd e:/code/shao
git add services/auth-config.ts
git commit -m "feat(auth-config): fetchAuthConfig 调用 applyTheme 应用主题"
```

---

### Task 42: shao/App.vue onLaunch 调用 applyTheme

**Files:**
- Modify: `shao/App.vue:56-73`

- [ ] **Step 1: 在 App.vue 中导入 applyTheme**

修改 `shao/App.vue:1-5` 追加导入：

```js
import { applyTheme } from './utils/theme'
```

- [ ] **Step 2: 在 onLaunch 应用租户品牌之后调用 applyTheme**

在 `shao/App.vue:73` 之后（应用租户品牌 if 块结束之后）追加：

```js
// 应用主题
if (authConfig.theme) {
  applyTheme(authConfig.theme)
}
```

- [ ] **Step 3: 验证**

启动 shao dev，确认导航栏/tabBar 颜色随 themeConfig 变化。

- [ ] **Step 4: Commit**

```bash
cd e:/code/shao
git add App.vue
git commit -m "feat(App): onLaunch 调用 applyTheme 应用主题"
```

---

### Task 43: shao/pages.json 移除硬编码 navigationBarBackgroundColor

**Files:**
- Modify: `shao/pages.json:115, 120`

- [ ] **Step 1: 修改 globalStyle.navigationBarBackgroundColor**

替换 `shao/pages.json:112-117`：

```json
"globalStyle": {
  "navigationBarTextStyle": "white",
  "navigationBarTitleText": "圣麟教育",
  "navigationBarBackgroundColor": "#667eea",
  "backgroundColor": "#f5f5f5"
},
```

注意：`pages.json` 是构建时静态配置，**不能完全移除**，保留 `#667eea` 作为默认值，运行时由 applyTheme 覆盖。

- [ ] **Step 2: 修改 tabBar.selectedColor**

替换 `shao/pages.json:120`：

```json
"selectedColor": "#667eea",
```

同样保留作为默认值，运行时由 `setTabBarStyle` 覆盖。

- [ ] **Step 3: 验证**

启动 shao dev，确认默认配色为 `#667eea`，切换租户后变色。

- [ ] **Step 4: Commit**

```bash
cd e:/code/shao
git add pages.json
git commit -m "chore(pages.json): 保留 #667eea 作为默认值，运行时由 applyTheme 覆盖"
```

---

## 阶段 9b：shao 端主题改造完整（后续，可独立执行）

### Task 44: H5 端 CSS 变量注入

**Files:**
- Modify: `shao/App.vue` 或新建 `shao/static/css/theme.css`

- [ ] **Step 1: 在 App.vue 全局 style 中声明 CSS 变量默认值**

修改 `shao/App.vue:186-191`：

```html
<style>
:root {
  --brand-primary: #667eea;
  --brand-secondary: #f0f2f5;
  --brand-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
page {
  background-color: var(--brand-secondary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
```

- [ ] **Step 2: applyTheme 中已通过 setProperty 写入 CSS 变量（Task 40 已实现）**

无需重复实现，验证 H5 端 `document.documentElement.style` 包含 `--brand-primary`。

- [ ] **Step 3: Commit**

```bash
cd e:/code/shao
git add App.vue
git commit -m "feat(css): H5 端声明 --brand-primary 等 CSS 变量默认值"
```

---

### Task 45: 扫描 20 个 .vue 文件，替换 100 处硬编码色值为 CSS 变量

**Files:**
- Modify: 20 个 .vue 文件（详见 11.7 节统计）

- [ ] **Step 1: 全局搜索硬编码色值**

```bash
cd e:/code/shao
grep -rln "#667eea\|#764ba2" --include="*.vue" --include="*.scss" --include="*.css"
```

- [ ] **Step 2: 逐文件替换（H5 端）**

对每个文件，将 `#667eea` 替换为 `var(--brand-primary)`，`#764ba2` 替换为 `var(--brand-secondary)`，渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` 替换为 `var(--brand-gradient)`。

示例（`pages/profile/profile.vue`）：

```css
/* 替换前 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.button {
  background: #667eea;
  color: #fff;
}

/* 替换后 */
.header {
  background: var(--brand-gradient);
}
.button {
  background: var(--brand-primary);
  color: #fff;
}
```

- [ ] **Step 3: 验证 H5 端**

启动 shao dev H5 模式，确认所有页面配色正确。

- [ ] **Step 4: Commit（分文件提交，便于回滚）**

```bash
cd e:/code/shao
git add pages/profile/profile.vue
git commit -m "refactor(profile): 替换硬编码色值为 CSS 变量"
# ... 重复其他 19 个文件
```

---

### Task 46: 小程序端内联 style 绑定

**Files:**
- Modify: 20 个 .vue 文件（同 Task 45）

- [ ] **Step 1: 在小程序端用内联 style 绑定主题色**

由于小程序端不支持 page 级 CSS 变量，对动态色值改用内联 `:style` 绑定：

```html
<!-- 替换前 -->
<view class="header" />

<!-- 替换后 -->
<view class="header" :style="{ background: brandGradient }" />
```

在 `<script setup>` 中：

```js
import { getPrimaryColor } from '@/utils/theme'
const primaryColor = getPrimaryColor()
const brandGradient = `linear-gradient(135deg, ${primaryColor} 0%, #764ba2 100%)`
```

- [ ] **Step 2: 验证小程序端**

```bash
cd e:/code/shao
npm run dev:mp-weixin
```

打开微信开发者工具，确认配色正确。

- [ ] **Step 3: Commit**

```bash
cd e:/code/shao
git add pages/profile/profile.vue
git commit -m "refactor(profile): 小程序端用内联 style 绑定主题色"
# ... 重复其他文件
```

---

### Task 47: 测试 5 套预设模板切换

**Files:**
- 无（手工验证）

- [ ] **Step 1: 在 web 端为租户切换 5 套模板**

依次在 `web/pages/tenant/detail.vue` 选择 coursera-blue / khan-green / udemy-violet / edx-deep / netease-red，保存。

- [ ] **Step 2: 在 shao 端验证每套模板生效**

每次切换后，刷新 shao 端页面（带对应 domain），确认：

| 验证项 | 预期 |
|---|---|
| 导航栏背景色 | 等于 themeConfig.primaryColor |
| tabBar 选中色 | 等于 themeConfig.tabBarActiveColor |
| tabBar 背景色 | 等于 themeConfig.tabBarColor |
| H5 端 CSS 变量 | `--brand-primary` 等于 themeConfig.primaryColor |
| 渐变背景（如有） | 使用新主色 |

- [ ] **Step 3: 记录问题并修复**

若发现某模板配色异常，检查 `initDefaultTemplates` 的 themeConfig JSON 是否正确，或 `applyTheme` 是否漏处理某个字段。

- [ ] **Step 4: 最终 Commit**

```bash
cd e:/code
git commit --allow-empty -m "test(theme): 5 套预设模板切换验证通过"
```

---

## 完成后的最终验证

### 阶段性回归测试

- [ ] **Step 1: 后端权限回归**

用 admin / channel-admin / plugin-manager / instructor 4 个角色分别登录 web，验证：
- admin：可见全部菜单，可访问全部 admin API
- channel-admin：可见 site-config / tenant / user-roles 菜单，可分配自己渠道成员角色
- plugin-manager：可见 site-config 菜单，可配置细粒度开关
- instructor：可见 course / lesson 菜单，可创建课程

- [ ] **Step 2: 租户访问校验回归**

用 channel-admin（归属渠道 C1，C1 关联租户 T1）访问：
- T1 的 admin 路由：200
- T2 的 admin 路由（C1 不关联 T2）：403

- [ ] **Step 3: C 端主题切换回归**

在 web 端为 5 个租户分别配置 5 套模板，shao 端用 5 个域名访问，确认每套配色正确。

- [ ] **Step 4: 功能开关联动回归**

在 web 端为租户 T1 关闭 `points` 粗粒度开关，shao 端访问 T1，确认积分功能隐藏；课程/课时表单的积分区块也隐藏。

---

## Self-Review 检查

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task |
|---|---|
| 阶段 1 立即修复 | Task 1-3 |
| 阶段 2 权限配置与清理 | Task 4-12 |
| 阶段 3 角色层级 | Task 13-16 |
| 阶段 4 渠道管理员权限分配 | Task 17-18 |
| 阶段 5 细粒度配置渠道维度 | Task 19-23 |
| 阶段 6 租户访问校验 | Task 24-25 |
| 阶段 7 Web 端租户切换器 | Task 26-34 |
| 阶段 8 C 端模板样式配置 | Task 35-39 |
| 阶段 9a shao 端 MVP | Task 40-43 |
| 阶段 9b shao 端完整改造 | Task 44-47 |

无遗漏。

### 2. 占位符扫描

无 TBD / TODO / "implement later" / "类似 Task N" 等占位符。

### 3. 类型一致性

- `themeConfig` 在 Task 35（schema）、Task 38（getPublicConfig）、Task 39（detail.vue）、Task 40（theme.ts）、Task 41（auth-config.ts）中字段名一致：`primaryColor` / `secondaryColor` / `navStyle` / `cardStyle` / `tabBarColor` / `tabBarActiveColor`
- `currentTenantId` 在 Task 29（store）、Task 30（TenantSwitcher）、Task 31（dashboard）、Task 32（request.js）、Task 33（config-helper）、Task 34（form.vue）中命名一致
- `extraConfig` 在 Task 19（schema）、Task 20（channel service）、Task 21（channel config API）、Task 22（getPublicConfig 合并）、Task 23（site-config.vue）中命名一致

---

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-07-03-multi-tenant-permission-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent 执行，Task 之间人工 review，迭代快

**2. Inline Execution** - 在当前会话内用 executing-plans skill 批量执行，checkpoint 处人工 review

**Which approach?**

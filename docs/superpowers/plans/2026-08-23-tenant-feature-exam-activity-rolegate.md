# 租户功能开关：考试/线下活动 + 内容角色限制(roleGate) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在租户设置中新增 考试(exam) / 线下活动(activity) 功能开关，并新增 roleGate("内容角色限制")能力——课程/活动/考试可按 zhao-auth 角色限制可见；功能开关/企业官网/媒体发布中心仅 admin 可配置。

**Architecture:** 三层：后端 featureFlags/moduleGranted 增加 exam/activity/roleGate；三个插件(course/activity/quiz-exam)在列表/详情接口按 roleGate+visibleToRoles 做后端强过滤；web 运营端与 shao C端按 featureFlags 显隐菜单、入口与配置区。tenant/detail 三区域用角色 admin 门控。

**Tech Stack:** Strapi 5(v5 documents API)、zhao-* 插件、web 运营端(uni-app H5)、shao C端(uni-app)。

**关键约定（算子必须遵守）：**
- 插件改 TS/schema 后必须重建插件 dist 才生效：`cd plugins/<name> && npm run build`；dev 只编译根 app，插件加载 `plugins/<name>/dist`。
- 插件 schema 加 json 字段后 dev 会重生成 `types/generated/contentTypes.d.ts`，需随提交。

**提交信息规范：** `feat(zhao-*): ...` / `feat(web): ...` / `feat(shao): ...`

---

### Task 0: 后端共享常量与公开配置增加 exam / activity / roleGate

**Files:**
- Modify: `e:\code\basic\plugins\zhao-auth\server\src\constants\module-visibility.ts`
- Modify: `e:\code\basic\plugins\zhao-common\server\src\services\config.ts`

- [ ] **Step 1: module-visibility.ts 增加 exam / activity**

在 `VISIBILITY_MODULES` 数组末尾 `"forum"` 后加入 `"exam", "activity"`（注意 `VISIBILITY_MODULES` 从 zhao-common config.ts 被引用，需同步）：

```ts
export const VISIBILITY_MODULES = [
  "website", "logistics", "studio", "points", "course", "quiz",
  "channel", "sso", "thirdParty", "oss", "payment", "community", "forum",
  "exam", "activity",
];
```

在 `DEFAULT_MODULE_VISIBILITY` 末尾新增两键（角色继承 quiz/points 的可见角色，与前端保持一致）：

```ts
  forum: ["channel-admin", "plugin-manager", "marketing-manager"],
  exam: ["channel-admin", "plugin-manager", "quiz-manager", "quiz-editor", "course-manager", "course-editor", "tag-manager", "tag-editor"],
  activity: ["channel-admin", "plugin-manager", "point-manager", "point-editor"],
};
```

- [ ] **Step 2: config.ts 的 featureFlags 增加 exam / activity / roleGate**

在 `getPublicConfig` 的 `result.featureFlags = { ... }` 中，粗粒度模块总开关区新增三键：

```ts
        website: siteFeatureFlags.website ?? true,
        logistics: siteFeatureFlags.logistics ?? true,
        studio: siteFeatureFlags.studio ?? true,
        // 本设计新增
        exam: siteFeatureFlags.exam ?? true,
        activity: siteFeatureFlags.activity ?? true,
        roleGate: siteFeatureFlags.roleGate ?? false,
```

同时在 system-reminder 中提到的 fallback `if (!fullConfig)` 分支里，`featureFlags: {...}` 也补上 `exam: true, activity: true, roleGate: false`，保证无站点配置时前端有默认值。

- [ ] **Step 3: 重建 zhao-auth、zhao-common 插件 dist**

```bash
cd e:\code\basic\plugins\zhao-auth && npm run build
cd e:\code\basic\plugins\zhao-common && npm run build
```

Expected: 构建无报错。生成的 `plugins/<name>/dist` 属有效产物需提交。

- [ ] **Step 4: 提交**

```bash
git add basic/plugins/zhao-auth/server/src/constants/module-visibility.ts basic/plugins/zhao-auth/dist basic/plugins/zhao-common/server/src/services/config.ts basic/plugins/zhao-common/dist
git commit -m "feat(zhao-*): 模块常量与公开配置增加 exam/activity/roleGate"
```

---

### Task 1: 三个插件 schema 增加 visibleToRoles 字段

**Files:**
- Modify: `e:\code\basic\plugins\zhao-course\server\src\content-types\course\schema.json`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz-exam\schema.json`

- [ ] **Step 1: course schema 增加字段**

`e:\code\basic\plugins\zhao-course\server\src\content-types\course\schema.json` 的 `attributes` 中，在 `channelIds` 附近新增：

```json
"visibleToRoles": {
  "type": "json",
  "default": null
}
```

- [ ] **Step 2: activity schema 增加字段**

`e:\code\basic\plugins\zhao-point\server\src\content-types\activity\schema.json` 的 `attributes` 中新增：

```json
"visibleToRoles": {
  "type": "json",
  "default": null
}
```

- [ ] **Step 3: quiz-exam schema 增加字段**

`e:\code\basic\plugins\zhao-quiz\server\src\content-types\quiz-exam\schema.json` 的 `attributes` 中，在 `channelIds` 附近新增：

```json
"visibleToRoles": {
  "type": "json",
  "default": null
}
```

- [ ] **Step 4: 重建三个插件 dist**

```bash
cd e:\code\basic\plugins\zhao-course && npm run build
cd e:\code\basic\plugins\zhao-point && npm run build
cd e:\code\basic\plugins\zhao-quiz && npm run build
```

若 dev 进程在跑，schema 变更会重生成根 app 的 `types/generated/contentTypes.d.ts`，检查并提交该文件（若插件单独构建也更新了则一并提交）。

- [ ] **Step 5: 提交**

```bash
git add basic/plugins/zhao-course/server/src/content-types/course/schema.json basic/plugins/zhao-course/dist basic/plugins/zhao-point/server/src/content-types/activity/schema.json basic/plugins/zhao-point/dist basic/plugins/zhao-quiz/server/src/content-types/quiz-exam/schema.json basic/plugins/zhao-quiz/dist
git commit -m "feat(zhao-*): course/activity/quiz-exam 增加 visibleToRoles 字段"
```

---

### Task 2: 后端角色限制过滤 helper + 课程/活动/考试接口强过滤

**Files:**
- Create: `e:\code\basic\plugins\zhao-common\server\src\utils\role-gate.ts`
- Modify: `e:\code\basic\plugins\zhao-course\server\src\services\course.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\activity.ts`、`controllers\activity.ts`
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz-exam.ts`、`controllers\quiz-exam.ts`

**设计规则（务必后端强约束）：**
- `visibleToRoles` 为角色 code 数组；null/空 = 全开放。
- 仅当「当前 tenant 的 featureFlags.roleGate === true」时该限制生效；否则忽略 `visibleToRoles`（全开放）。
- 生效且 `visibleToRoles` 非空时：游客不可见；登录用户需 `user.zhaoRoles ∩ visibleToRoles ≠ ∅`。

- [ ] **Step 1: 新建 role-gate.ts 共享工具**

```ts
// e:\code\basic\plugins\zhao-common\server\src\utils\role-gate.ts
import type { Core } from "@strapi/strapi";

type Any = Record<string, any>;

// 从当前匹配的 site-config 读取 roleGate 开关（siteDocId 为空时按默认 false）
export async function isRoleGateEnabled(strapi: Core.Strapi, siteDocId?: string): Promise<boolean> {
  try {
    const s = strapi.plugin("zhao-common")?.service("site-config");
    const full: Any = siteDocId
      ? await strapi.documents("plugin::zhao-common.site-config").findOne({ documentId: siteDocId })
      : await s?.getConfig(siteDocId);
    return full?.featureFlags?.roleGate === true;
  } catch {
    return false;
  }
}

// 判定某用户角色是否可访问带 visibleToRoles 的条目
export function mayAccessVisibleToRoles(userRoles: string[] | undefined, visibleToRoles: any): boolean {
  if (!Array.isArray(visibleToRoles) || visibleToRoles.length === 0) return true; // 全开放
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false; // 游客无角色
  return visibleToRoles.some((r) => userRoles.includes(r));
}
```

- [ ] **Step 2: 课程列表/详情接入 visibleToRoles 过滤**

在 `e:\code\basic\plugins\zhao-course\server\src\services\course.ts`：
- 文件顶部 `import { isRoleGateEnabled, mayAccessVisibleToRoles } from "../../../../zhao-common/server/src/utils/role-gate";`（按实际相对路径修正）。
- `find` 与 `findOne` 的 options 参数统一扩展一个 `siteDocId?: string` 字段，由 controller 从 `ctx.state.siteDocumentId` 传入；`resolver` 在 controller 侧已有站点解析。
- 在已有 `learnRoles` 角色过滤（约 L343-L350，`filteredList = filteredList.filter(...)`）附近，追加基于 visibleToRoles 的过滤，仅当 roleGate 开启：

```ts
// visibleToRoles 过滤：roleGate 开启才生效（learnRoles 为历史逻辑，保持并存）
const roleGateOn = options?.siteDocId ? await isRoleGateEnabled(strapi, options.siteDocId) : false;
if (roleGateOn && channelScope && !channelScope.isGuest && !channelScope.all) {
  filteredList = filteredList.filter((course: any) =>
    mayAccessVisibleToRoles(userRoles, course.visibleToRoles)
  );
}
```

- 在 `findOne` 的角色门控段（约 L402-L412，`if (result && !isAdmin)`）追加：roleGate 开启时校验 `mayAccessVisibleToRoles(userRoles, result.visibleToRoles)`，未授权抛 403。

> 注意：`find` 用 `resolveUserRoles` 已得到的 `userRoles` 复用即可，勿重复解析；`siteDocId` 走 options 传入而非在 service 内自行解析域名。

- [ ] **Step 3: 活动 / 考试列表详情接入过滤**

`zhao-point` `services/activity.ts` 与 `controllers/activity.ts`：公开列表/详情按同样规则过滤（activity `visibleToRoles`）。
`zhao-quiz` `services/quiz-exam.ts` 与 `controllers/quiz-exam.ts`：公开列表/详情按同样规则过滤（quiz-exam `visibleToRoles`）。

复用 `isRoleGateEnabled`/`mayAccessVisibleToRoles`；`siteDocId` 从 controller 的 `ctx.state.siteDocumentId` 传入。注意仅公开(public)列表/详情需要过滤，admin 接口不做可见性限制。

- [ ] **Step 4: 重建 zhao-common、zhao-course、zhao-point、zhao-quiz dist**

```bash
cd e:\code\basic\plugins\zhao-common && npm run build
cd e:\code\basic\plugins\zhao-course && npm run build
cd e:\code\basic\plugins\zhao-point && npm run build
cd e:\code\basic\plugins\zhao-quiz && npm run build
```

- [ ] **Step 5: 提交**

```bash
git add basic/plugins/zhao-common/server/src/utils/role-gate.ts basic/plugins/zhao-course/server/src basic/plugins/zhao-point/server/src basic/plugins/zhao-quiz/server/src
git add basic/plugins/zhao-common/dist basic/plugins/zhao-course/dist basic/plugins/zhao-point/dist basic/plugins/zhao-quiz/dist
git commit -m "feat(zhao-*): 课程/活动/考试按 roleGate+visibleToRoles 后端过滤"
```

---

### Task 3: web 运营端模块常量与 featureFlags

**Files:**
- Modify: `e:\code\web\src\constants\module.js`
- Modify: `e:\code\web\src\utils\config-helper.js`

- [ ] **Step 1: module.js 增加 exam/activity 模块 + 默认开关**

`MODULE_LIST` 末尾追加：

```js
  { key: 'exam', label: '考试', icon: '📝', parent: 'quiz' },
  { key: 'activity', label: '线下活动', icon: '📍', parent: 'points' },
]
```

`DEFAULT_FEATURE_FLAGS` 末尾追加：

```js
  wealth: false,
  exam: true,
  activity: true,
  roleGate: false,
}
```

- [ ] **Step 2: config-helper.js 增加 exam/activity 可见性 + 默认开关**

`VISIBILITY_MODULES` 数组追加 `'exam', 'activity'`（保持与后端一致）：

```js
const VISIBILITY_MODULES = [
  'website', 'logistics', 'studio', 'points', 'course', 'quiz',
  'channel', 'sso', 'thirdParty', 'oss', 'payment', 'community', 'forum', 'wealth',
  'exam', 'activity'
]
```

`DEFAULT_MODULE_VISIBILITY` 末尾追加：

```js
  wealth: ['channel-admin', 'plugin-manager', 'instructor', 'wealth-manager', 'wealth-editor'],
  exam: ['channel-admin', 'plugin-manager', 'instructor', 'quiz-manager', 'quiz-editor', 'course-manager', 'course-editor', 'tag-manager', 'tag-editor'],
  activity: ['channel-admin', 'plugin-manager', 'instructor', 'point-manager', 'point-editor'],
}
```

`getDefaultConfig()` 的 `featureFlags`、`moduleEnabled`、`moduleGrantedForCurrentTenant` 三处默认对象末尾追加 `exam: true, activity: true, roleGate: false`（moduleEnabled/moduleGranted 的 exam/activity 按父模块默认 true）。

- [ ] **Step 3: 提交**

```bash
git add web/src/constants/module.js web/src/utils/config-helper.js
git commit -m "feat(web): 模块常量与配置增加 exam/activity/roleGate"
```

---

### Task 4: tenant/detail.vue 增加开关 + 三区域 admin 门控

**Files:**
- Modify: `e:\code\web\src\pages\tenant\detail.vue`

- [ ] **Step 1: 渲染 exam/activity 开关**

`MODULE_LIST` 已含 exam/activity，模板中特征图标区（约 L128）已按 `formData.featureFlags?.[mod.key]` 遍历，修改默认值后即可渲染。确认保存逻辑（约 L1107 `featureFlags: formData.featureFlags`）整体上送，无需逐键处理。

- [ ] **Step 2: 对「功能开关」区域加 admin 门控**

把「功能开关」主区块的可见/可编辑用 `userStore.hasRole('admin')` 控制。定义计算属性：

```js
// script 中新增
const isAdminOnly = computed(() => userStore.hasRole('admin'))
```

模板中「功能开关」区块根节点加 `v-if="isAdminOnly"`（非 admin 完全隐藏该区块，不上送修改）。

- [ ] **Step 3: 对「企业官网」「多媒体发布中心」区域加 admin 门控**

同理，`企业官网(website)` 与 `多媒体发布中心(studio)` 对应设置区根节点加 `v-if="isAdminOnly"`。

- [ ] **Step 4: 提交**

```bash
git add web/src/pages/tenant/detail.vue
git commit -m "feat(web): 租户设置增加考试/活动/roleGate开关, 功能开关与企业官网/媒体发布中心仅admin可配置"
```

---

### Task 5: 企业全局配置授权页补齐 exam / activity

**Files:**
- Modify: `e:\code\web\src\pages\global-config\index.vue`

- [ ] **Step 1: MODULE_LIST 补齐 exam / activity**

该页 `MODULE_LIST`（当前 13 项）末尾追加：

```js
  { key: 'wealth', icon: '💰', name: '理财中心' },
  { key: 'exam', icon: '📝', name: '考试中心' },
  { key: 'activity', icon: '📍', name: '线下活动中心' },
]
```

- [ ] **Step 2: DEFAULT_MODULE_ENABLED 补齐 exam / activity / wealth**

```js
const DEFAULT_MODULE_ENABLED = {
  website: false, logistics: false, studio: false,
  points: true, course: true, quiz: true, channel: true,
  sso: false, thirdParty: false, oss: false,
  payment: false, community: false, forum: false,
  wealth: false, exam: true, activity: true,
}
```

- [ ] **Step 3: 确认入口可达**

该页已由 dashboard「多租户管理」区"租户权限"项进入（`v-if="userStore.hasRole('admin')"`），仅 admin 可见。如后台侧栏另有菜单，确认 admin 能看到该页可点入，否则补一个 admin 可见的菜单入口。

- [ ] **Step 4: 提交**

```bash
git add web/src/pages/global-config/index.vue
git commit -m "feat(web): 企业全局配置授权页补齐 exam/activity/wealth 模块"
```

---

### Task 6: web 后台 课程/活动/考试 表单「可见角色」配置区（roleGate 开启时）

**Files:**
- Modify: `e:\code\web\src\pages\course\form.vue`
- Modify: `e:\code\web\src\pages\activity\form.vue`
- Modify: `e:\code\web\src\pages\quiz\exam\form.vue`

- [ ] **Step 1: 表单增加「可见角色」多选**

三份表单中，在「渠道可见性」附近新增一组「可见角色」（角色列表从 zhao-auth 角色接口拉取；空表示全开放）。仅当前租户 `featureFlags.roleGate === true` 时显示该配置区。表单 `save`/`submit` 时把 `visibleToRoles`（数组）随 payload 上送；`roleGate=false` 时不展示也不上送。

- [ ] **Step 2: 提交**

```bash
git add web/src/pages/course/form.vue web/src/pages/activity/form.vue web/src/pages/quiz/exam/form.vue
git commit -m "feat(web): 课程/活动/考试表单支持 visibleToRoles 角色限制配置"
```

---

### Task 7: shao(C端) 按 featureFlags + moduleGranted 显隐与 roleGate 过滤

**Files:**
- Modify: `e:\code\shao\services\auth-config.ts`
- Modify: `e:\code\shao\pages\quiz\exam\index.vue`
- Modify: `e:\code\shao\pages\activity\list.vue`

- [ ] **Step 1: auth-config.ts 暴露 exam/activity/roleGate 与 moduleGranted**

在 `featureFlags` 映射处额外导出：

```ts
exam: data?.featureFlags?.exam ?? true,
activity: data?.featureFlags?.activity ?? true,
roleGate: data?.featureFlags?.roleGate ?? false,
moduleGranted: {
  exam: data?.moduleGrantedForCurrentTenant?.exam ?? true,
  activity: data?.moduleGrantedForCurrentTenant?.activity ?? true,
  course: data?.moduleGrantedForCurrentTenant?.course ?? true,
},
```

- [ ] **Step 2: 考试/活动入口显隐（featureFlags 且 moduleGranted 均通过）**

- `pages/quiz/exam/index.vue`：`onLoad`/`onShow` 中读取 `auth-config.exam && auth-config.moduleGranted.exam`，任一为 false 时隐藏入口/提示不可用（授权未开启）。
- `pages/activity/list.vue`：同理用 `auth-config.activity && auth-config.moduleGranted.activity` 显隐。

> C端对课程入口（`pages/index/index`）同样可读 `auth-config.moduleGranted.course` 联合判断；若课程列表已按 grant 过滤则前端仅兜底显隐。

- [ ] **Step 3: 列表依赖后端过滤**

课程/活动/考试列表数据由后端按 `roleGate+visibleToRoles` 过滤返回，前端侧不额外处理，仅依赖 Task 2 的后端强过滤保证。可选的：无 token 提示引导登录后刷新受限列表。

- [ ] **Step 4: 提交**

```bash
git add shao/services/auth-config.ts shao/pages/quiz/exam/index.vue shao/pages/activity/list.vue
git commit -m "feat(shao): 考试/活动入口随租户功能开关显隐"
```

---

### Task 8: 验收与收口

**Files:**
- Create: `e:\code\basic\scripts\accept-tenant-exam-activity-rolegate.cjs`

- [ ] **Step 1: 编写验收脚本**

覆盖：后端 featureFlags 返回 exam/activity/roleGate；课程/活动/考试列表在 `roleGate=true` + `visibleToRoles` 下：游客不可见、无交集角色不可见、有交集角色可见、`roleGate=false` 全可见；admin 接口不受限。命名遵循 `scripts/accept-*.cjs`。脚本运行前后清理零残留数据。

- [ ] **Step 2: 运行验收**

```bash
cd e:\code\basic && node scripts/accept-tenant-exam-activity-rolegate.cjs
```

Expected: 全部用例 PASS，无残留。

- [ ] **Step 3: 收口**

停止本地 Strapi dev；`git restore dist/`（仅还原根 app dist，`plugins/*/dist` 保留并提交）；移除临时诊断脚本。

- [ ] **Step 4: 提交验收脚本**

```bash
git add basic/scripts/accept-tenant-exam-activity-rolegate.cjs
git commit -m "test(zhao-*): 租户功能开关与 roleGate 验收脚本"
```
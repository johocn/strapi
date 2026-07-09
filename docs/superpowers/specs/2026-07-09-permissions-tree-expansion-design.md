# 权限树补全 + 角色体系扩展设计

> **Phase 1** of "全部最近新增功能归类到 web 目录面板" 任务。Phase 2 将重建 admin-manual.md 14 章文档。

## 目标

补全 `plugins/zhao-auth/server/src/permissions.ts` 中 37 个遗漏 CT 的权限项，各归合适中心；同时扩展角色体系，为 11 个中心各新增"管理员 + 编辑"角色对（共 22 个新角色），实现精细化权限管理。

## 范围

**改动文件**：仅 `plugins/zhao-auth/server/src/permissions.ts`

**不改动**：
- 各插件本地 `server/src/permissions.ts`（Strapi 原生 actions，独立系统）
- 各插件 `admin/src/`（前端入口）
- zhao-logistics admin/ 前端入口（后续单独提需求）
- admin-manual.md 14 章文档（Phase 2）

**架构事实**：
- zhao-auth `PERMISSION_TREE` 是 web 面板菜单 + 按钮权限的独立系统，用于前端侧边栏和角色配置 UI
- 各插件本地 `permissions.ts` 定义 Strapi 原生 `actions`（admin API 路由级鉴权），两者独立

---

## 1. 37 个遗漏 CT 归类方案

### 1.1 zhao-wealth（10 CT）→ 新建 `menu.wealth-center`（理财中心）

权限树当前完全无 wealth 分组。新建顶级中心，按业务域拆 4 个子菜单：

| 子菜单 | CT | 权限粒度 |
|---|---|---|
| menu.wealth-product（产品管理）| wealth-product, wealth-nav | read/create/update/delete + collect（采集）|
| menu.wealth-company（公司管理）| wealth-company | read/create/update/delete |
| menu.wealth-collect（数据采集）| wealth-collect-config, wealth-customer-product | read/create/update/delete + trigger（触发采集）|
| menu.wealth-metrics（风险指标）| wealth-risk-metric, wealth-recommend-config, wealth-annual-snapshot, wealth-yearly-return, wealth-money-income | read/create/update + aggregate/trend/peers/recalculate（统计操作）|

### 1.2 zhao-studio（10 CT）→ 扩展 `menu.studio-center`（直播工作室）

当前仅有 `zhao-studio.read/create/update/delete` 4 个粗粒度权限（保留向后兼容）。按现有前端页面结构（Collect/Publish/Stats/AIConfig）拆子菜单，新权限用 `studio.*` 前缀：

| 子菜单 | CT | 权限粒度 |
|---|---|---|
| menu.studio-collect（内容采集）| article-draft, collect-source, collect-task, knowledge-point-index | read/create/update/delete |
| menu.studio-publish（多平台发布）| publish-platform, publish-account, publish-record | read/create/update/delete |
| menu.studio-stats（数据分析）| stat-summary, browser-log | read + export |
| menu.studio-ad（广告位）| ad-slot | read/create/update/delete |

### 1.3 zhao-sso（10 CT 扩展）→ 扩展 `menu.system-center > menu.sso`

当前 menu.sso 仅 4 个核心 CT 权限。补全 10 个扩展 CT：

| 子菜单 | CT | 权限粒度 |
|---|---|---|
| menu.sso-binding（三方绑定）| sso-third-party-binding, sso-oauth-config | read/create/update/delete |
| menu.sso-token（令牌管理）| sso-token, sso-auth-code | read/delete（敏感数据，仅读删）|
| menu.sso-user-role（用户应用角色）| sso-user-app-role | read/create/update/delete |
| menu.sso-invite（邀请体系）| sso-invite-code, sso-invite-usage, sso-invite-stats, sso-referral-relation | read/create/delete + validate（核销）|
| menu.sso-sms（短信验证）| sso-sms-code | read/delete |

### 1.4 其余 7 个零散遗漏

| 插件 | CT | 归属 | 权限粒度 |
|---|---|---|---|
| zhao-point | rule-template | menu.point-center > menu.point-rule-template（新增）| read/create/update/delete |
| zhao-point | sign-in-record | menu.point-center > menu.point-sign-in（新增）| read + export |
| zhao-quiz | quiz-exam-attempt | menu.quiz-center > menu.exam（现有，补 button）| read/delete |
| zhao-quiz | quiz-batch | menu.quiz-center > menu.quiz-batch（新增）| read/create/delete |
| zhao-channel | user-channel | menu.marketing-center > menu.channel-permission（现有，补 button）| read + assign/revoke |
| zhao-tag | tag-index | menu.tag-center > menu.tag-index（新增）| read/create/update/delete |
| zhao-oss | media-meta | menu.system-center > menu.media（现有占位，补 button）| read/upload/delete |

---

## 2. 命名规范与权限 key 设计

### 2.1 命名规范

遵循现有 PERMISSION_TREE 约定：

| 层级 | 命名格式 | 示例 |
|---|---|---|
| 顶级中心 | `menu.{domain}-center` | `menu.wealth-center` |
| 二级菜单 | `menu.{domain}-{sub}` | `menu.wealth-product` |
| 按钮权限 | `{domain}.{ct-singular}.{action}` | `wealth.wealth-product.read` |

**域前缀（domain）对应插件命名空间**：
- `wealth` → zhao-wealth
- `studio` → zhao-studio（新权限用 `studio.*`，现有 `zhao-studio.*` 保留向后兼容）
- `sso` → zhao-sso（沿用现有 `sso.*`）
- `point` / `quiz` / `channel` / `tag` / `oss` → 沿用各自现有前缀

### 2.2 权限粒度规则

| 操作类型 | 权限 key | 适用角色 |
|---|---|---|
| 查看 | `*.read` | 所有角色 |
| 新增 | `*.create` | manager / editor |
| 编辑 | `*.update` | manager / editor |
| 删除 | `*.delete` | manager（editor 不含）|
| 特殊操作 | `*.collect`/`*.trigger`/`*.aggregate`/`*.export`/`*.validate`/`*.assign`/`*.revoke` | 按业务需要，manager（部分 editor）|

**敏感数据例外**（sso-token / sso-auth-code / sso-sms-code）：仅 `read` + `delete`，无 create/update（系统自动生成，不可手动改）。

### 2.3 完整权限 key 清单（新增项）

**wealth-center（全新）**：
```
menu.wealth-center
  menu.wealth-product → wealth.wealth-product.{read,create,update,delete,collect}
                      → wealth.wealth-nav.{read,create,update,delete}
  menu.wealth-company → wealth.wealth-company.{read,create,update,delete}
  menu.wealth-collect → wealth.wealth-collect-config.{read,create,update,delete,trigger}
                      → wealth.wealth-customer-product.{read,create,delete}
  menu.wealth-metrics → wealth.wealth-risk-metric.{read,update,aggregate,trend,peers,recalculate}
                      → wealth.wealth-recommend-config.{read,create,update,delete}
                      → wealth.wealth-annual-snapshot.{read,update}
                      → wealth.wealth-yearly-return.{read,update}
                      → wealth.wealth-money-income.{read,update}
```

**studio-center（扩展）**：
```
menu.studio-collect → studio.article-draft.{read,create,update,delete}
                    → studio.collect-source.{read,create,update,delete}
                    → studio.collect-task.{read,create,update,delete}
                    → studio.knowledge-point-index.{read,create,update,delete}
menu.studio-publish → studio.publish-platform.{read,create,update,delete}
                    → studio.publish-account.{read,create,update,delete}
                    → studio.publish-record.{read,delete}
menu.studio-stats   → studio.stat-summary.{read,export}
                    → studio.browser-log.{read,export}
menu.studio-ad      → studio.ad-slot.{read,create,update,delete}
```

**system-center > sso（扩展）**：
```
menu.sso-binding    → sso.third-party-binding.{read,create,update,delete}
                    → sso.oauth-config.{read,create,update,delete}
menu.sso-token      → sso.token.{read,delete}
                    → sso.auth-code.{read,delete}
menu.sso-user-role  → sso.user-app-role.{read,create,update,delete}
menu.sso-invite     → sso.invite-code.{read,create,delete,validate}
                    → sso.invite-usage.{read,delete}
                    → sso.invite-stats.{read}
                    → sso.referral-relation.{read,delete}
menu.sso-sms        → sso.sms-code.{read,delete}
```

**零散补全**：
```
point.rule-template.{read,create,update,delete}  (menu.point-rule-template 新增)
point.sign-in-record.{read,export}               (menu.point-sign-in 新增)
quiz.exam-attempt.{read,delete}                  (menu.exam 补 button)
quiz.quiz-batch.{read,create,delete}             (menu.quiz-batch 新增)
channel.user-channel.{read,assign,revoke}        (menu.channel-permission 补 button)
tag.tag-index.{read,create,update,delete}        (menu.tag-index 新增)
oss.media-meta.{read,upload,delete}              (menu.media 补 button)
```

### 2.4 新增顶级中心汇总

PERMISSION_TREE 顶级分组将从 10 个变为 11 个：
- 现有：course-center / study-center / quiz-center / point-center / marketing-center / system-center / tag-center / studio-center / website-center / logistics-center
- **新增：wealth-center（理财中心）**

---

## 3. 角色体系扩展

### 3.1 新增 22 个角色

保留现有 5 个角色（admin/channel-admin/plugin-manager/instructor/user），新增 11 个中心 × 2 = 22 个角色：

| 角色 key | 中文标签 | 权限范围 |
|---|---|---|
| website-manager | 官网管理员 | menu.website-center 全部权限 |
| website-editor | 官网编辑 | menu.website-center 的 read/create/update |
| logistics-manager | 物流管理员 | menu.logistics-center 全部 |
| logistics-editor | 物流编辑 | menu.logistics-center 的 read/create/update |
| course-manager | 课程管理员 | menu.course-center 全部 |
| course-editor | 课程编辑 | read/create/update |
| study-manager | 学习数据管理员 | menu.study-center 全部 |
| study-editor | 学习数据编辑 | read/create/update |
| quiz-manager | 题库管理员 | menu.quiz-center 全部 |
| quiz-editor | 题库编辑 | read/create/update |
| point-manager | 积分管理员 | menu.point-center 全部 |
| point-editor | 积分编辑 | read/create/update |
| marketing-manager | 营销管理员 | menu.marketing-center 全部 |
| marketing-editor | 营销编辑 | read/create/update |
| system-manager | 系统管理员(中心) | menu.system-center 全部 |
| system-editor | 系统编辑 | read/create/update |
| tag-manager | 标签管理员 | menu.tag-center 全部 |
| tag-editor | 标签编辑 | read/create/update |
| studio-manager | 工作室管理员 | menu.studio-center 全部 |
| studio-editor | 工作室编辑 | read/create/update |
| wealth-manager | 理财管理员 | menu.wealth-center 全部 |
| wealth-editor | 理财编辑 | read/create/update |

### 3.2 权限继承规则

| 角色 | 权限计算方式 |
|---|---|
| {center}-manager | `flattenPermissions(PERMISSION_TREE["menu.{center}-center"].children)` — 含全部 read/create/update/delete/特殊操作 |
| {center}-editor | 同上，但**过滤掉 `.delete` 和 `.manage`** — 保留 read/create/update 及特殊操作（collect/trigger/export/aggregate 等）|

### 3.3 实现方式：工具函数

为避免 22 个角色各写一长串显式数组，新增 helper 函数：

```typescript
/** 提取指定中心的全部权限 key（含中心 menu key 自身）*/
function centerPermissions(centerKey: string): string[] {
  const center = PERMISSION_TREE[centerKey];
  if (!center?.children) return [];
  return [centerKey, ...flattenPermissions(center.children)];
}

/** 提取指定中心的编辑权限（排除 delete/manage）*/
function centerEditorPermissions(centerKey: string): string[] {
  return centerPermissions(centerKey).filter(
    (k) => !k.endsWith(".delete") && !k.endsWith(".manage")
  );
}
```

### 3.4 ROLES 枚举扩展

```typescript
export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
  // 11 个中心 × 2 = 22 个新角色
  WEBSITE_MANAGER: "website-manager",
  WEBSITE_EDITOR: "website-editor",
  LOGISTICS_MANAGER: "logistics-manager",
  LOGISTICS_EDITOR: "logistics-editor",
  COURSE_MANAGER: "course-manager",
  COURSE_EDITOR: "course-editor",
  STUDY_MANAGER: "study-manager",
  STUDY_EDITOR: "study-editor",
  QUIZ_MANAGER: "quiz-manager",
  QUIZ_EDITOR: "quiz-editor",
  POINT_MANAGER: "point-manager",
  POINT_EDITOR: "point-editor",
  MARKETING_MANAGER: "marketing-manager",
  MARKETING_EDITOR: "marketing-editor",
  SYSTEM_MANAGER: "system-manager",
  SYSTEM_EDITOR: "system-editor",
  TAG_MANAGER: "tag-manager",
  TAG_EDITOR: "tag-editor",
  STUDIO_MANAGER: "studio-manager",
  STUDIO_EDITOR: "studio-editor",
  WEALTH_MANAGER: "wealth-manager",
  WEALTH_EDITOR: "wealth-editor",
} as const;
```

### 3.5 DEFAULT_ROLE_PERMISSIONS 扩展

```typescript
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: flattenPermissions(PERMISSION_TREE),
  [ROLES.CHANNEL_ADMIN]: [...],  // 现有，保留不动
  [ROLES.PLUGIN_MANAGER]: [...], // 现有，保留不动
  [ROLES.INSTRUCTOR]: [...],     // 现有，保留不动
  [ROLES.USER]: [],
  // 新增 22 个角色
  [ROLES.WEBSITE_MANAGER]: centerPermissions("menu.website-center"),
  [ROLES.WEBSITE_EDITOR]: centerEditorPermissions("menu.website-center"),
  [ROLES.LOGISTICS_MANAGER]: centerPermissions("menu.logistics-center"),
  [ROLES.LOGISTICS_EDITOR]: centerEditorPermissions("menu.logistics-center"),
  [ROLES.COURSE_MANAGER]: centerPermissions("menu.course-center"),
  [ROLES.COURSE_EDITOR]: centerEditorPermissions("menu.course-center"),
  [ROLES.STUDY_MANAGER]: centerPermissions("menu.study-center"),
  [ROLES.STUDY_EDITOR]: centerEditorPermissions("menu.study-center"),
  [ROLES.QUIZ_MANAGER]: centerPermissions("menu.quiz-center"),
  [ROLES.QUIZ_EDITOR]: centerEditorPermissions("menu.quiz-center"),
  [ROLES.POINT_MANAGER]: centerPermissions("menu.point-center"),
  [ROLES.POINT_EDITOR]: centerEditorPermissions("menu.point-center"),
  [ROLES.MARKETING_MANAGER]: centerPermissions("menu.marketing-center"),
  [ROLES.MARKETING_EDITOR]: centerEditorPermissions("menu.marketing-center"),
  [ROLES.SYSTEM_MANAGER]: centerPermissions("menu.system-center"),
  [ROLES.SYSTEM_EDITOR]: centerEditorPermissions("menu.system-center"),
  [ROLES.TAG_MANAGER]: centerPermissions("menu.tag-center"),
  [ROLES.TAG_EDITOR]: centerEditorPermissions("menu.tag-center"),
  [ROLES.STUDIO_MANAGER]: centerPermissions("menu.studio-center"),
  [ROLES.STUDIO_EDITOR]: centerEditorPermissions("menu.studio-center"),
  [ROLES.WEALTH_MANAGER]: centerPermissions("menu.wealth-center"),
  [ROLES.WEALTH_EDITOR]: centerEditorPermissions("menu.wealth-center"),
};
```

### 3.6 ROLE_LABELS 扩展

```typescript
export const ROLE_LABELS = {
  [ROLES.ADMIN]: "系统管理员",
  [ROLES.CHANNEL_ADMIN]: "渠道管理员",
  [ROLES.PLUGIN_MANAGER]: "插件管理员",
  [ROLES.INSTRUCTOR]: "讲师",
  [ROLES.USER]: "普通用户",
  [ROLES.WEBSITE_MANAGER]: "官网管理员",
  [ROLES.WEBSITE_EDITOR]: "官网编辑",
  [ROLES.LOGISTICS_MANAGER]: "物流管理员",
  [ROLES.LOGISTICS_EDITOR]: "物流编辑",
  [ROLES.COURSE_MANAGER]: "课程管理员",
  [ROLES.COURSE_EDITOR]: "课程编辑",
  [ROLES.STUDY_MANAGER]: "学习数据管理员",
  [ROLES.STUDY_EDITOR]: "学习数据编辑",
  [ROLES.QUIZ_MANAGER]: "题库管理员",
  [ROLES.QUIZ_EDITOR]: "题库编辑",
  [ROLES.POINT_MANAGER]: "积分管理员",
  [ROLES.POINT_EDITOR]: "积分编辑",
  [ROLES.MARKETING_MANAGER]: "营销管理员",
  [ROLES.MARKETING_EDITOR]: "营销编辑",
  [ROLES.SYSTEM_MANAGER]: "系统管理员(中心)",
  [ROLES.SYSTEM_EDITOR]: "系统编辑",
  [ROLES.TAG_MANAGER]: "标签管理员",
  [ROLES.TAG_EDITOR]: "标签编辑",
  [ROLES.STUDIO_MANAGER]: "工作室管理员",
  [ROLES.STUDIO_EDITOR]: "工作室编辑",
  [ROLES.WEALTH_MANAGER]: "理财管理员",
  [ROLES.WEALTH_EDITOR]: "理财编辑",
};
```

### 3.7 与现有角色的关系

- **plugin-manager 保留**：仍是全局跨中心角色（现有权限不变），适合需要管理多个中心的用户
- **{center}-manager 是专用角色**：只管本中心，权限范围更聚焦
- **{center}-editor 是编辑角色**：本中心内容编辑，不能删除
- **instructor 保留**：跨中心只读，适合讲师
- 实际使用时，管理员可给用户分配 `website-manager`（聚焦官网）或 `plugin-manager`（全局）或两者叠加

### 3.8 向后兼容性

- 不删除/不重命名任何现有权限 key
- 现有 `zhao-studio.read/create/update/delete` 保留（PLUGIN_MANAGER 的 `flattenPermissions` 仍包含）
- 现有 `sso.user-read/update` 等保留，新增 `sso.token.read` 等并行存在
- `initDefaultRoles` 启动时幂等同步，已有角色的新权限会自动追加

---

## 4. 实现要点

### 4.1 改动位置

| 改动 | 文件位置 | 说明 |
|---|---|---|
| ROLES 枚举 | permissions.ts 行 1-7 | 追加 22 个角色常量 |
| ROLE_LABELS | permissions.ts 行 9-15 | 追加 22 个标签 |
| PERMISSION_TREE | permissions.ts 行 27-750 | 新增 menu.wealth-center + 扩展 studio/sso/零散 |
| 工具函数 | permissions.ts 工具函数区（行 752 后）| 新增 centerPermissions/centerEditorPermissions |
| DEFAULT_ROLE_PERMISSIONS | permissions.ts 行 817-1001 | 追加 22 个角色映射 |

### 4.2 工具函数放置位置

`centerPermissions` 和 `centerEditorPermissions` 依赖 `flattenPermissions` 和 `PERMISSION_TREE`，需放在 `flattenPermissions` 定义之后（行 755 后），且在 `DEFAULT_ROLE_PERMISSIONS` 之前（行 817 前）。

### 4.3 验证检查点

- 所有权限 key 唯一，无重复
- 每个新 CT 至少有 `read` 权限
- 22 个新角色的权限通过工具函数自动计算，避免硬编码遗漏
- 不改动任何现有权限 key（向后兼容）
- `initDefaultRoles` 幂等同步

---

## 5. 已知限制（非 Phase 1 范围）

- **zhao-logistics admin/ 前端入口**：当前无 admin/ 目录，CT 通过 Strapi Content Manager 自动渲染，自定义操作端点前端页面留待后续单独提需求
- **admin-manual.md 14 章文档**：Phase 2 处理，按前台/后台 × 初级(目录快查)/中级(实际操作+步骤流程)/高级(功能理念+技术文档扩展)组织
- **插件本地 permissions.ts**：定义 Strapi 原生 actions（admin API 路由级鉴权），与本任务的 zhao-auth 权限树独立，不改动

---

## Self-Review

### 1. Placeholder 扫描
- 无 TBD/TODO/实现后补
- 所有代码块完整
- 所有 CT 归类明确

### 2. 内部一致性
- 第 1 节 CT 归类与第 2 节权限 key 清单一致
- 第 3 节角色权限通过工具函数自动计算，与第 2 节权限定义一致
- 22 个角色对应 11 个中心，无遗漏

### 3. 范围检查
- 聚焦 permissions.ts 单文件改动，适合单个实施计划
- 22 个新角色 + 37 个 CT 归类工作量适中

### 4. 歧义检查
- zhao-studio 命名明确：新权限用 `studio.*`，现有 `zhao-studio.*` 保留
- 编辑权限过滤规则明确：排除 `.delete` + `.manage`
- 敏感数据权限明确：sso-token/auth-code/sms-code 仅 read+delete

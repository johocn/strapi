# zhao-auth 管理界面 + 权限基础层 设计

> 日期：2026-07-22
> 状态：待审阅
> 范围：补齐 zhao-auth admin 界面 + 修复权限基础层卡点 + 沉淀可复用权限前端组件 + zhao-studio 11 页面接入权限

---

## 1. 背景与目标

### 1.1 业务目标

zhao-auth 目前只有 API，无 admin 界面。最近两次 plan 新增了 zhao-deal（7 内容类型）、zhao-track（3 内容类型）、zhao-studio promo（5 内容类型）共 15 个内容类型，但权限基础层存在多处卡点导致非 admin 用户无法访问这些新内容类型的 admin API。

本 spec 的目标：

- **修复权限基础层卡点**：让非 admin 用户能真正通过三插件的 has-permission policy
- **搭建 zhao-auth admin 界面**：用户管理 + 角色权限矩阵 + 操作日志
- **沉淀可复用权限前端组件**：PermissionGate / useMyPermissions 等，供三插件 admin 复用
- **zhao-studio 11 现有页面接入权限组件**：作为 Spec B 的样板

### 1.2 设计原则

- **最小侵入**：不改 `permission.service.getMyPermissions` 主体（已读 DB），不改 4 件套 policy 本身，不改 `ROLE_HIERARCHY`/`ROLE_INHERITANCE` 常量
- **复用现有数据结构**：不新建内容类型，扩展现有 `zhao_permissions` 表（加 1 个 `seedVersion` 字段）
- **YAGNI**：不做 zhao-deal/zhao-track 的租户隔离（数据全局共享，业务上合理）；不做 zhao-studio controller 的 channelScope 过滤修复（预存问题，另起 spec）
- **风险可控**：admin 角色权限矩阵固定不可改；矩阵编辑器修改系统角色权限持久化（重启不丢失）

### 1.3 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 权限矩阵存储 | 直接编辑 `zhao_permissions.permissions` JSON 数组 | 现有字段已可编辑，无需新增 overrides 字段；DEFAULT_ROLE_PERMISSIONS 作为"恢复默认"基准 |
| seedVersion 机制 | 系统角色首次创建后不再覆盖，仅代码版本升级时 re-seed | 解决"管理员调整被重启覆盖"问题，同时保留"代码默认值升级自动同步"能力 |
| 权限 action 粒度 | 按内容类型 manage + 敏感操作单独拆 | 平衡可管理性与精细度；与现有 `coupon.approve` 模式一致 |
| 组件沉淀位置 | zhao-auth admin 导出，spike 验证跨插件引用 | 集中沉淀避免 DRY 违反；spike 失败降级到 zhao-common |
| tenant 维度权限 | 不加，权限全局统一 | 业务上无"同角色不同 tenant 不同权限"需求；tenant 隔离靠 has-tenant-access policy（数据行级） |
| zhao-deal/zhao-track 租户隔离 | 不补齐 4 件套 | 数据全局共享无 site 关联，补齐是空架子；投入大产出零 |
| zhao-studio 4 件套 controller 落地 | 不修，记录为已知技术债 | 预存问题，与 Spec A 主题偏离；另起 spec 统一修复 |
| channel-admin 默认权限 | 不授予 zhao-deal/zhao-track manage 权限 | 避免非 admin 用户绕过隔离访问全局共享数据 |
| role-management.service.checkPermission | 改为委托 permission.service.getMyPermissions | 权限判定单一来源，矩阵编辑器修改立即反映到所有判定路径 |

---

## 2. 架构与依赖

### 2.1 模块结构

```
zhao-auth 插件
├── server（后端权限基础层 + admin API）
│   ├── content-types/permission/schema.json — 扩展 seedVersion 字段
│   ├── permissions.ts — PERMISSION_TREE 补全三插件 + DEFAULT_ROLE_PERMISSIONS 同步
│   ├── bootstrap.ts — initDefaultRoles 改 seedVersion 逻辑
│   ├── services/
│   │   ├── permission.service.ts — 不改主体（已读 DB）
│   │   ├── role-management.service.ts — checkPermission 委托 + 删除 computePermissions
│   │   └── permission-check.service.ts — 新增：实时权限检查工具后端
│   ├── controllers/
│   │   ├── role-management.ts — 扩展（新增 me/users/matrix/logs/check 端点）
│   │   └── permission-matrix.ts — 新增：矩阵编辑器后端
│   └── routes/admin-api.ts — 新增 14 路由 + 现有路由统一 4 件套
│
└── admin（从零搭建）
    ├── index.ts — register menuLink + registerPlugin
    ├── pages/
    │   ├── App.tsx — PluginLayout + PermissionsProvider 注入
    │   ├── UserManagementPage.tsx — tab 1: 用户列表+详情+角色分配
    │   ├── PermissionMatrixPage.tsx — tab 2: 角色×action 矩阵编辑
    │   └── AuditLogPage.tsx — tab 3: 操作日志+权限检查工具
    ├── components/
    │   ├── PermissionGate.tsx — 包裹子组件，无权限时隐藏/禁用
    │   ├── PermissionButton.tsx — 按钮，无权限时 disabled 或隐藏
    │   ├── RoleBadge.tsx — 角色标签展示
    │   ├── ChannelScopePicker.tsx — channel scope 选择器
    │   ├── PermissionMatrix.tsx — 矩阵编辑器组件
    │   └── UserPicker.tsx — 用户选择器
    ├── hooks/
    │   ├── useMyPermissions.ts — 从 Context 读 action[]
    │   ├── useChannelScope.ts — 从 Context 读 channelScope
    │   ├── useTenant.ts — 从 Context 读 tenant
    │   └── usePermissionCheck.ts — 单 action 检查 hook
    ├── context/
    │   └── PermissionsProvider.tsx — 全局 Context，调 /admin/me 后注入
    ├── api/
    │   └── index.ts — 封装所有 zhao-auth admin API
    └── utils/
        └── permission-tree.ts — PERMISSION_TREE 前端镜像（用于矩阵渲染）

zhao-studio 插件（接入改造）
├── admin/src/pages/App.tsx — PluginLayout 加 PermissionsProvider
├── admin/src/components/Layout/PluginLayout.tsx — menuItems 加 permission 字段
└── admin/src/pages/*.tsx — 11 个页面顶层加 PermissionGate + 敏感按钮加 PermissionButton

zhao-deal / zhao-track / zhao-studio（路由 action 拆细）
└── server/src/routes/*.ts — promo/coupon/click-event 等路由 action 改为细粒度
```

### 2.2 数据流

```
用户登录 → Strapi admin → 各插件 admin bundle 加载
                ↓
    zhao-auth admin PluginLayout 注入 PermissionsProvider
    调用 GET /api/zhao-auth/v1/admin/me
    返回 { user, zhaoRoles, channelScope, tenant, effectivePermissions: action[] }
                ↓
    useMyPermissions() 从 Context 读，避免重复请求
                ↓
    <PermissionGate action="zhao-deal.coupon.manage">
      <CRUDTable />
    </PermissionGate>
    <!-- 无权限时整块隐藏 -->
```

### 2.3 权限判定路径（修正后单一来源）

```
has-permission policy
    ↓
permission.service.getMyPermissions(userId, tenantDocumentId)
    ├─ 读 user.zhaoRoles
    ├─ admin 角色短路：返回 flattenPermissions(PERMISSION_TREE) 全集
    ├─ 其他角色：
    │   ├─ 查 zhao_permissions 表（按 role 字段）
    │   │   ├─ 有记录：返回 permissions JSON 数组
    │   │   └─ 无记录：fallback 到 DEFAULT_ROLE_PERMISSIONS[role]
    │   └─ channel-admin 额外叠加 moduleVisibility（保留现有逻辑）
    ├─ 60s 缓存（键 userId|tenantDocumentId）
    └─ 返回 action[]

role-management.service.checkPermission(userId, action)
    ↓（改为委托）
permission.service.getMyPermissions(userId)
    ↓
返回 permissions.includes(action)
```

### 2.4 跨插件依赖

本 spec 不新增跨插件 relation。zhao-auth admin 的 PermissionsProvider 通过 API 调用获取权限数据，不直接读其他插件 DB。

---

## 3. 数据模型变更

### 3.1 zhao-auth permission schema 扩展

```json
// d:\zhao\strapi\plugins\zhao-auth\server\src\content-types\permission\schema.json
{
  "kind": "collectionType",
  "collectionName": "zhao_permissions",
  "info": {
    "singularName": "permission",
    "pluralName": "permissions",
    "displayName": "角色权限"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "role": { "type": "string", "required": true, "unique": true, "maxLength": 50 },
    "displayName": { "type": "string", "required": true, "maxLength": 50 },
    "description": { "type": "text" },
    "permissions": { "type": "json", "required": true, "default": [] },
    "isSystem": { "type": "boolean", "required": true, "default": false },
    "level": { "type": "integer", "default": 20, "min": 1, "max": 100 },
    "seedVersion": {
      "type": "string",
      "default": ""
    }
  }
}
```

**seedVersion 用途**：
- `DEFAULT_ROLE_PERMISSIONS` 常量附加 `__version: "2026-07-22"` 标记
- bootstrap 时比较 DB 记录的 `seedVersion` 与常量版本
- 不一致才覆盖系统角色的 `permissions` 字段（强制 re-seed）
- 一致则跳过（管理员手工修改持久化）
- 自定义角色（`isSystem: false`）永不被覆盖

### 3.2 其他内容类型

无 schema 变更。

---

## 4. PERMISSION_TREE 补全

### 4.1 action 命名规范

```
zhao-{plugin}.{content-type}.{operation}
```

- **content-type**：单数短横线（promo-channel / coupon / click-event）
- **operation**：`manage`（CRUD 合一）/ `approve` / `publish` / `sync` / `start` / `stop` / `view`

### 4.2 zhao-deal 权限子树（新增 12 action）

```
zhao-deal
├─ platform.manage
├─ category.manage
├─ coupon.manage
├─ coupon.approve
├─ coupon-collection.manage
├─ coupon-collection.publish
├─ coupon-candidate.manage
├─ coupon-candidate.approve
├─ product.manage
├─ product-candidate.manage
├─ product-candidate.approve
└─ sync.trigger
```

### 4.3 zhao-track 权限子树（新增 6 action）

```
zhao-track
├─ source-tag.manage
├─ click-event.manage
├─ click-event.view
├─ order.manage
├─ order.view
└─ sync.schedule
```

### 4.4 zhao-studio 权限子树（拆细 promo，新增 7 action）

现有（保留并拆细）：
```
zhao-studio
├─ article-draft.manage
├─ collect-source.manage
├─ collect-task.manage
├─ publish-platform.manage
├─ publish-account.manage
├─ publish-record.manage
├─ publish.publish
├─ knowledge-point-index.manage
├─ ad-slot.manage
├─ browser-log.manage
├─ stat-summary.view
├─ sync-event.manage
└─ sync-event.resolve
```

新增（promo 模块）：
```
├─ promo-channel.manage
├─ promo-channel.archive
├─ promo-campaign.manage
├─ ab-experiment.manage
├─ ab-experiment.start
├─ ab-experiment.stop
└─ channel-report.view
```

### 4.5 zhao-auth 权限子树（新增 6 action）

```
zhao-auth
├─ user.manage
├─ role.assign
├─ role.batch-assign
├─ permission.matrix.edit
├─ audit-log.view
└─ permission.check
```

### 4.6 汇总

| 插件 | 新增 action | 总计 |
|---|---|---|
| zhao-deal | 12 | 12 |
| zhao-track | 6 | 6 |
| zhao-studio（含 promo 拆细） | 7 | 20 |
| zhao-auth | 6 | 6 |
| **合计** | **31 新增** | **44** |

### 4.7 DEFAULT_ROLE_PERMISSIONS 各角色默认值

| 角色 | zhao-deal | zhao-track | zhao-studio | zhao-auth |
|---|---|---|---|---|
| admin | 全部 12 | 全部 6 | 全部 20 | 全部 6 |
| channel-admin | **无**（默认不授予） | **无** | 13 现有 + 4 promo manage + channel-report.view | audit-log.view |
| plugin-manager | 矩阵勾选 | 矩阵勾选 | 矩阵勾选 | 矩阵勾选 |
| instructor | coupon.view / product.view / order.view / click-event.view / channel-report.view / stat-summary.view | 同左 | 同左 | 无 |
| user | 无 | 无 | 无 | 无 |

**设计决策**：channel-admin 默认**不**授予 zhao-deal/zhao-track manage 权限。原因：这两个插件数据全局共享无 site 关联，channel-admin 若有 manage 权限可访问所有租户数据。仅 admin 和被显式授权的 plugin-manager 可访问。

如果未来 zhao-deal/zhao-track 补齐 site 关联 + controller 过滤，再在 DEFAULT_ROLE_PERMISSIONS 中给 channel-admin 授予 manage 权限。

---

## 5. 后端权限基础修复

### 5.1 bootstrap.ts initDefaultRoles 改造（C3 修复）

**当前问题**：系统角色每次启动强制覆盖 `permissions` 字段，管理员调整不持久。

**改造逻辑**：

```typescript
// 伪代码
const DEFAULT_SEED_VERSION = "2026-07-22";

for (const [role, config] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
  const existing = await strapi.documents(PERMISSION_UID).findOne({
    filter: { role: { $eq: role } }
  });

  if (!existing) {
    // 首次创建
    await strapi.documents(PERMISSION_UID).create({
      data: {
        role,
        displayName: config.displayName,
        permissions: config.permissions,
        isSystem: config.isSystem,
        level: config.level,
        seedVersion: DEFAULT_SEED_VERSION
      }
    });
  } else if (existing.isSystem && existing.seedVersion !== DEFAULT_SEED_VERSION) {
    // 系统角色 + 版本不一致：强制 re-seed
    await strapi.documents(PERMISSION_UID).update({
      documentId: existing.documentId,
      data: {
        permissions: config.permissions,
        seedVersion: DEFAULT_SEED_VERSION
      }
    });
  }
  // else: 系统角色版本一致（管理员可能已修改）或自定义角色 → 跳过
}
```

### 5.2 PERMISSION_TREE 补全（C4 修复）

在 `d:\zhao\strapi\plugins\zhao-auth\server\src\permissions.ts` 中：

1. `PERMISSION_TREE` 新增 `zhao-deal` / `zhao-track` / `zhao-auth` 三个顶层节点
2. `zhao-studio` 节点新增 promo 子树（7 action）
3. `DEFAULT_ROLE_PERMISSIONS` 各角色数组同步更新（admin 全部、channel-admin 按 4.7 表、instructor view 权限）
4. `DEFAULT_ROLE_PERMISSIONS.__version = "2026-07-22"`

### 5.3 checkPermission 委托（C1 修复）

**改造前**：
```typescript
// role-management.service.ts
async checkPermission(userId, requiredRole) {
  const { effective } = await this.getUserEffectivePermissions(userId);
  return effective.includes(requiredRole);
}
```

**改造后**：
```typescript
async checkPermission(userId, action, tenantDocumentId?) {
  const permissions = await strapi.plugin("zhao-auth")
    .service("permission")
    .getMyPermissions(userId, tenantDocumentId);
  return permissions.includes(action);
}
```

**保留**：`getUserEffectivePermissions`（用于"展示用户有哪些角色"，不删）

**删除**：`computePermissions`（未被外部调用，且与 getMyPermissions 语义重叠）

### 5.4 zhao-studio promo 路由 action 拆细（C6 修复）

修改 `d:\zhao\strapi\plugins\zhao-studio\server\src\routes\content-api.ts`：

| 路由 | 原 action | 新 action |
|---|---|---|
| promo-channel CRUD | `zhao-studio.read/create/update/delete` | `zhao-studio.promo-channel.manage` |
| promo-campaign CRUD | 同上 | `zhao-studio.promo-campaign.manage` |
| ab-test CRUD | 同上 | `zhao-studio.ab-experiment.manage` |
| ab-test start | `zhao-studio.update` | `zhao-studio.ab-experiment.start` |
| ab-test stop | `zhao-studio.update` | `zhao-studio.ab-experiment.stop` |
| channel-report | `zhao-studio.read` | `zhao-studio.channel-report.view` |

### 5.5 zhao-studio 现有 11 controller 路由 action 拆细

修改 `d:\zhao\strapi\plugins\zhao-studio\server\src\routes\content-api.ts`，按内容类型拆细：

| Controller | 原 action | 新 action |
|---|---|---|
| article-draft | `zhao-studio.read/create/update/delete` | `zhao-studio.article-draft.manage` |
| collect-source | 同上 | `zhao-studio.collect-source.manage` |
| collect-task | 同上 | `zhao-studio.collect-task.manage` |
| publish-platform | 同上 | `zhao-studio.publish-platform.manage` |
| publish-account | 同上 | `zhao-studio.publish-account.manage` |
| publish-record | 同上 | `zhao-studio.publish-record.manage` |
| publish（发布操作） | `zhao-studio.update` | `zhao-studio.publish.publish` |
| knowledge-point-index | `zhao-studio.read/create/update/delete` | `zhao-studio.knowledge-point-index.manage` |
| ad-slot | 同上 | `zhao-studio.ad-slot.manage` |
| browser-log | 同上 | `zhao-studio.browser-log.manage` |
| sync-event | 同上 | `zhao-studio.sync-event.manage` |
| sync-event resolve | `zhao-studio.update` | `zhao-studio.sync-event.resolve` |

**兼容性**：迁移期保留旧 `zhao-studio.read/create/update/delete` 作为别名（在 DEFAULT_ROLE_PERMISSIONS 中同时授予新旧 action），下一个版本删除。确保迁移后 admin/channel-admin 仍能访问所有页面。

---

## 6. zhao-auth admin API 端点

### 6.1 新增路由

```
POST   /api/zhao-auth/v1/admin/me                       # 获取当前用户信息+权限
GET    /api/zhao-auth/v1/admin/users                    # 用户列表（分页+搜索）
GET    /api/zhao-auth/v1/admin/users/:documentId        # 用户详情
POST   /api/zhao-auth/v1/admin/users/:id/roles          # 分配角色
DELETE /api/zhao-auth/v1/admin/users/:id/roles/:role    # 撤销角色
POST   /api/zhao-auth/v1/admin/users/batch-roles        # 批量分配
PUT    /api/zhao-auth/v1/admin/users/:id/channel-scope  # 设置 channelScope
GET    /api/zhao-auth/v1/admin/roles                    # 可分配角色列表
GET    /api/zhao-auth/v1/admin/permissions/matrix       # 权限矩阵
PUT    /api/zhao-auth/v1/admin/permissions/roles/:role  # 更新角色权限
POST   /api/zhao-auth/v1/admin/permissions/roles/:role/reset  # 恢复默认
GET    /api/zhao-auth/v1/admin/permissions/actions      # 所有可用 action
GET    /api/zhao-auth/v1/admin/logs                     # 操作日志
POST   /api/zhao-auth/v1/admin/check                    # 实时权限检查
```

共 14 个端点。policies 统一 4 件套：
- `is-authenticated → has-permission → has-channel-scope → has-tenant-access`
- action 配置：`zhao-auth.user.manage` / `zhao-auth.role.assign` / `zhao-auth.permission.matrix.edit` / `zhao-auth.audit-log.view` / `zhao-auth.permission.check`

### 6.2 现有路由调整

zhao-auth 现有 admin 路由（`is-authenticated → tenant-context-injector → has-permission`）统一改为 4 件套。`tenant-context-injector` 保留为 bootstrap 全局 middleware（如果已是），路由层不再单独声明。

---

## 7. 前端权限组件设计

### 7.1 组件清单

```
zhao-auth/admin/src/
├── components/
│   ├── PermissionGate.tsx           # 包裹子组件，无权限时隐藏/占位
│   ├── PermissionButton.tsx         # 按钮，无权限时 disabled 或隐藏
│   ├── RoleBadge.tsx                # 角色标签
│   ├── ChannelScopePicker.tsx       # channel scope 选择器
│   ├── PermissionMatrix.tsx         # 矩阵编辑器
│   └── UserPicker.tsx               # 用户选择器
├── hooks/
│   ├── useMyPermissions.ts          # 从 Context 读 action[]
│   ├── useChannelScope.ts           # 从 Context 读 channelScope
│   ├── useTenant.ts                 # 从 Context 读 tenant
│   └── usePermissionCheck.ts        # 单 action 检查
├── context/
│   └── PermissionsProvider.tsx      # 全局 Context
└── api/
    └── index.ts                     # API 封装
```

### 7.2 PermissionGate 接口

```typescript
interface PermissionGateProps {
  action: string | string[];        // 单个或多个 action（OR 关系）
  fallback?: React.ReactNode;       // 无权限时展示（默认 null）
  mode?: 'hide' | 'disable';        // 隐藏或禁用（默认 hide）
  children: React.ReactNode;
}
```

### 7.3 useMyPermissions 接口

```typescript
interface PermissionsContextValue {
  permissions: string[];
  channelScope: { all: boolean; channelIds: string[] };
  tenant: { documentId: string } | null;
  user: { id: number; username: string; zhaoRoles: string[] };
  loading: boolean;
  refresh: () => void;
}

const { permissions, hasPermission } = useMyPermissions();
// hasPermission('zhao-deal.coupon.manage') → boolean
```

### 7.4 PermissionsProvider 注入

- zhao-auth 自身：在 `PluginLayout` 顶层包裹
- 其他插件（方案 B 验证通过后）：在各自 `PluginLayout` 顶层包裹，复用 zhao-auth 导出的 Provider

### 7.5 跨插件引用 spike（方案 B 验证）

Spec A 第一个 task 是技术验证：
1. zhao-auth admin `index.ts` 添加 named export：`export { PermissionGate, useMyPermissions, PermissionsProvider }`
2. zhao-studio admin `index.ts` import：`import { PermissionGate } from 'zhao-auth/admin'`
3. 构建两个插件 admin bundle，验证是否能正常解析

**验证通过**：采用方案 B，组件沉淀在 zhao-auth admin
**验证失败**：降级方案 A，组件沉淀到 zhao-common admin（需新建 zhao-common admin 入口）

### 7.6 矩阵编辑器交互

```
┌─────────────────────────────────────────────────────────┐
│ 角色 \ action │ coupon.manage │ coupon.approve │ ...    │
├───────────────┼───────────────┼────────────────┼────────┤
│ admin         │ ✓ (灰,不可改) │ ✓ (灰)         │ ...    │
│ channel-admin │ ☐             │ ☐              │ ...    │  [恢复默认]
│ plugin-manager│ ☐             │ ☐              │ ...    │
│ instructor    │ ☐             │ ☐              │ ...    │  [恢复默认]
│ (自定义角色) │ ✓             │ ✓              │ ...    │
└─────────────────────────────────────────────────────────┘
```

- admin 行固定全勾不可改
- 系统角色行可编辑，提供"恢复默认"按钮
- 自定义角色行可编辑
- 修改即调 `PUT /permissions/roles/:role`，乐观更新 + 失败回滚
- 顶部筛选：按插件分组（zhao-deal / zhao-track / zhao-studio / zhao-auth）

---

## 8. zhao-studio 11 页面接入

### 8.1 接入策略

每页改造模式：
1. 页面顶层包裹 `<PermissionGate action="zhao-studio.{content-type}.manage">`
2. 敏感按钮用 `<PermissionButton action="zhao-studio.{special-action}">`
3. 菜单项根据权限显示/隐藏（PluginLayout 的 menuItems 加 `permission` 字段）

### 8.2 11 页面 action 映射

| 页面 | 顶层 action | 敏感按钮 action |
|---|---|---|
| HomePage | 无（总览） | — |
| CollectPage | collect-source.manage | collect-task.manage |
| AIConfigPage | article-draft.manage | — |
| PublishPage | publish-record.manage | publish.publish |
| PlatformConfigPage | publish-platform.manage | — |
| AccountConfigPage | publish-account.manage | — |
| AdSlotConfigPage | ad-slot.manage | — |
| StatsBasicPage | stat-summary.view | — |
| StatsAdvancedPage | stat-summary.view | — |
| StatsProPage | stat-summary.view | — |
| SyncEventPage | sync-event.manage | sync-event.resolve |

### 8.3 菜单权限映射

PluginLayout 的 menuItems 加 `permission` 字段：

```typescript
const menuItems = [
  { key: '/', label: '概览', permission: null },  // 总览无需权限
  { key: '/collect', label: '采集', permission: 'zhao-studio.collect-source.manage' },
  { key: '/ai-config', label: 'AI配置', permission: 'zhao-studio.article-draft.manage' },
  // ...
];
```

无权限的菜单项隐藏。

---

## 9. 测试策略

### 9.1 后端测试

| 测试文件 | 覆盖内容 |
|---|---|
| `zhao-auth/tests/bootstrap/init-default-roles.test.ts`（新增） | 首次创建、版本一致跳过、版本升级覆盖、自定义角色不覆盖 |
| `zhao-auth/tests/permissions-tree.test.ts`（新增） | 三插件 action 完整性、命名规范、admin 全权、channel-admin 无 deal/track manage |
| `zhao-auth/tests/services/role-management.test.ts`（扩展） | checkPermission 委托 permission.service |
| `zhao-auth/tests/services/permission-check.test.ts`（新增） | 实时权限检查工具后端 |
| `zhao-auth/tests/controllers/permission-matrix.test.ts`（新增） | 矩阵 GET/PUT/reset 端点 |
| `zhao-studio/tests/routes/promo-action.test.ts`（新增） | promo 路由 action 拆细后独立授权 |
| `zhao-studio/tests/routes/existing-action-split.test.ts`（新增） | 11 controller 路由 action 拆细 |

### 9.2 前端测试

| 测试文件 | 覆盖内容 |
|---|---|
| `zhao-auth/tests/admin/PermissionGate.test.tsx` | 有/无权限渲染、hide/disable 模式、多 action OR |
| `zhao-auth/tests/admin/useMyPermissions.test.tsx` | Context 注入、hasPermission 判定、refresh |
| `zhao-auth/tests/admin/PermissionMatrix.test.tsx` | 矩阵渲染、勾选/取消、恢复默认、admin 行不可改 |
| `zhao-auth/tests/admin/UserManagement.test.tsx` | 用户列表、详情、角色分配、channelScope 设置 |

### 9.3 集成测试（手动）

- 矩阵编辑器修改 channel-admin 权限 → 重启 Strapi → 修改持久化
- 非 admin 用户访问 zhao-deal admin API → 默认 403（channel-admin 无 deal manage）
- admin 在矩阵编辑器给 plugin-manager 授予 `zhao-deal.coupon.manage` → plugin-manager 可访问
- zhao-studio PublishPage 在无 `publish.publish` 权限时按钮禁用
- zhao-studio 菜单在无对应权限时隐藏

---

## 10. 改动范围汇总

### 10.1 新增文件

**zhao-auth**
- `admin/src/index.ts`（从零搭建）
- `admin/src/pages/App.tsx`
- `admin/src/pages/UserManagementPage.tsx`
- `admin/src/pages/PermissionMatrixPage.tsx`
- `admin/src/pages/AuditLogPage.tsx`
- `admin/src/components/{PermissionGate,PermissionButton,RoleBadge,ChannelScopePicker,PermissionMatrix,UserPicker}.tsx`
- `admin/src/hooks/{useMyPermissions,useChannelScope,useTenant,usePermissionCheck}.ts`
- `admin/src/context/PermissionsProvider.tsx`
- `admin/src/api/index.ts`
- `admin/src/utils/permission-tree.ts`
- `server/src/services/permission-check.service.ts`
- `server/src/controllers/permission-matrix.ts`
- `tests/bootstrap/init-default-roles.test.ts`
- `tests/permissions-tree.test.ts`
- `tests/services/permission-check.test.ts`
- `tests/controllers/permission-matrix.test.ts`
- `tests/admin/PermissionGate.test.tsx` 等 4 个前端测试

**zhao-deal / zhao-track / zhao-studio**
- 各自路由 action 拆细的测试文件

### 10.2 修改文件

**zhao-auth**
- `server/src/content-types/permission/schema.json` — 新增 `seedVersion` 字段
- `server/src/permissions.ts` — PERMISSION_TREE 补全 + DEFAULT_ROLE_PERMISSIONS 同步 + `__version` 标记
- `server/src/bootstrap.ts` — initDefaultRoles 改 seedVersion 逻辑
- `server/src/services/role-management.service.ts` — checkPermission 委托 + 删除 computePermissions
- `server/src/routes/admin-api.ts` — 新增 14 路由 + 现有路由统一 4 件套（详见 §6.1）
- `server/src/controllers/role-management.ts` — 扩展（新增 me/users/matrix/logs/check 端点）

**zhao-studio**
- `server/src/routes/content-api.ts` — promo 路由 action 拆细 + 现有 11 controller 路由 action 拆细
- `admin/src/pages/App.tsx` — PluginLayout 加 PermissionsProvider
- `admin/src/components/Layout/PluginLayout.tsx` — menuItems 加 permission 字段
- 11 个页面文件 — 顶层加 PermissionGate + 敏感按钮加 PermissionButton

### 10.3 不改动部分

- `permission.service.getMyPermissions` 主体逻辑（已读 DB，无需改）
- `has-permission` / `has-channel-scope` / `has-tenant-access` policy 本身
- `tenant-context-injector` middleware
- `role-management.service` 的 findUsers/assignRole/revokeRole 等用户管理方法
- `ROLE_HIERARCHY` / `ROLE_INHERITANCE` 常量
- zhao-deal/zhao-track 的 schema 和 controller（不做租户隔离补齐）
- zhao-studio controller 的 channelScope 过滤（预存问题，另起 spec）
- 现有 zhao-studio 11 页面的业务逻辑（只加权限守卫，不改功能）

---

## 11. 已知技术债（不在本 spec 范围）

| 技术债 | 影响 | 未来修复方向 |
|---|---|---|
| zhao-studio 4 件套未在 controller 落地 | channelScope 注入但 controller 不消费，无实际 channel 隔离 | 另起 spec：zhao-studio controller 按 channelScope 过滤查询 |
| zhao-deal/zhao-track 无 site 关联字段 | 数据全局共享，无法按租户隔离 | 另起 spec：三插件 schema 加 site 关联 + controller 过滤 + 数据迁移 |
| zhao-deal/zhao-track admin API 无 channel/tenant 隔离 policy | 非授权用户访问需靠 has-permission 兜底 | 与上一条一起修复 |
| 三套权限计算路径（getMyPermissions/getUserEffectivePermissions） | 本 spec 已修 checkPermission 委托，但 getUserEffectivePermissions 仍独立 | 未来考虑统一为单一路径 |

---

## 12. 风险与回滚

| 风险 | 应对 |
|---|---|
| 矩阵编辑器修改系统角色权限导致 admin 被锁 | admin 角色矩阵行固定不可改；has-permission policy 仍有 `user.zhaoRoles.includes("admin")` 短路放行 |
| PERMISSION_TREE 补全后 DEFAULT_ROLE_PERMISSIONS 升级导致现有用户权限变化 | seedVersion 升级时强制 re-seed 系统角色；channel-admin 默认值保留全部 manage 权限（除 deal/track），确保迁移后无降级 |
| 方案 B（跨插件 admin 引用）spike 失败 | 降级方案 A：组件沉淀到 zhao-common admin |
| zhao-studio 现有路由 action 拆细后 11 页面调用 403 | 迁移期保留旧 `zhao-studio.read` 等 action 作为别名（兼容 1 个版本）；矩阵编辑器"恢复默认"确保 admin/channel-admin 默认有全部 manage 权限 |
| checkPermission 委托后接口签名变化 | checkPermission 原签名为 `(userId, requiredRole)`，新签名为 `(userId, action, tenantDocumentId?)`；调用方需同步更新；Grep 确认调用点 |

---

## 13. Spec B 蓝图（后续会话）

本 spec（Spec A）完成后，Spec B 将覆盖：

- zhao-studio promo 模块 5 内容类型的 admin CRUD 页面
- zhao-deal 7 内容类型的 admin CRUD 页面
- zhao-track 3 内容类型的 admin CRUD 页面

全部复用 Spec A 沉淀的权限组件（PermissionGate / useMyPermissions 等）。

Spec B 不再涉及权限基础层改造，纯业务页面开发。

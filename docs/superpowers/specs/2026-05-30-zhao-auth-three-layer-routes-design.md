# zhao-auth 三层路由改造设计

## 一、背景

zhao-auth 的角色系统是自定义角色，存储在 `users-permissions.user` 表的 `roles` 字段（字符串数组），与 Strapi 内置 `up_role` 表无关。

角色层级：`admin > channel-admin > plugin-manager > instructor > user`

### 当前问题

| 问题 | 现状 | 应改为 |
|------|------|--------|
| admin 路由用 JWT 认证 | `auth: false` + `auth-middleware` | `policies: []` |
| admin 路由路径冗余 | `/admin/roles/assign` | `/roles/assign` |
| content-api 无版本号 | `/login` | `/v1/login` |
| content-api 无分层 | 角色管理全在 admin 路由 | 增加 `/v1/my/...` 和 `/v1/admin/...` |
| C 端无法自查角色 | 无接口 | 新增 `/v1/my/roles`、`/v1/my/permissions` |
| 无自身权限矩阵 | 硬编码 `has-role` | 新增 `permissions.ts` + `has-auth-permission` |

## 二、改造后路由结构

### 2.1 Admin 路由（Strapi 后台管理）

前缀：`/admin/plugins/zhao-auth/...`
认证：Strapi admin session，`policies: []`

| 方法 | 路径 | Handler | 说明 |
|------|------|---------|------|
| GET | `/roles` | role-management.getUserRoles | 查询用户角色 |
| POST | `/roles/assign` | role-management.assignRole | 分配角色 |
| POST | `/roles/revoke` | role-management.revokeRole | 撤销角色 |
| POST | `/roles/batch-assign` | role-management.batchAssignRoles | 批量分配 |
| GET | `/roles/logs` | role-management.getActionLogs | 操作日志 |

### 2.2 Content-API 公开路由

前缀：`/api/zhao-auth/v1/...`
认证：无

| 方法 | 路径 | Handler | 说明 |
|------|------|---------|------|
| POST | `/v1/login` | auth.login | 用户登录 |

### 2.3 Content-API 注册用户路由

前缀：`/api/zhao-auth/v1/my/...`
认证：JWT + `is-authenticated`

| 方法 | 路径 | Handler | 说明 |
|------|------|---------|------|
| GET | `/v1/my/roles` | role-management.getMyRoles | 查看自己的角色 |
| GET | `/v1/my/permissions` | role-management.getMyPermissions | 查看自己的有效权限（含继承） |

### 2.4 Content-API 管理员路由

前缀：`/api/zhao-auth/v1/admin/...`
认证：JWT + `is-authenticated` + `has-auth-permission`

| 方法 | 路径 | 权限动作 | Handler | 说明 |
|------|------|---------|---------|------|
| POST | `/v1/admin/roles/assign` | role.assign | role-management.assignRole | 分配角色 |
| POST | `/v1/admin/roles/revoke` | role.revoke | role-management.revokeRole | 撤销角色 |
| GET | `/v1/admin/users/:id/roles` | role.read | role-management.getUserRoles | 查询用户角色 |
| POST | `/v1/admin/roles/batch-assign` | role.assign | role-management.batchAssignRoles | 批量分配 |
| GET | `/v1/admin/roles/logs` | role.read-logs | role-management.getActionLogs | 操作日志 |

## 三、权限矩阵

| 权限动作 | admin | channel-admin | plugin-manager | instructor | user |
|---------|-------|--------------|----------------|------------|------|
| role.read | ✅ | ✅ | ✅ | - | - |
| role.assign | ✅ | ✅ | ✅ | - | - |
| role.revoke | ✅ | ✅ | - | - | - |
| role.read-logs | ✅ | ✅ | ✅ | - | - |

## 四、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `routes/admin/index.ts` | 修改 | `policies: []`，路径去掉 `/admin/` 前缀 |
| `routes/content-api/index.ts` | 修改 | 重写为三层路由 + `/v1` 版本号，使用路由工厂函数 |
| `permissions.ts` | 新增 | zhao-auth 自身权限矩阵 |
| `policies/has-auth-permission.ts` | 新增 | zhao-auth 自身权限策略 |
| `policies/index.ts` | 修改 | 注册 `has-auth-permission`，移除 `has-course-permission` |
| `policies/has-course-permission.ts` | 删除 | 已统一到 zhao-course 的 `has-permission.ts` |
| `controllers/role-management.ts` | 修改 | 新增 `getMyRoles`、`getMyPermissions` |
| `register.ts` | 修改 | 注册 `has-auth-permission` 策略 |
| `docs/接口说明文档.md` | 更新 | 按三层路由重写 |
| `docs/权限分配操作指南.md` | 更新 | API 路径更新为 `/v1/admin/...` |

## 五、不动的文件

- `middlewares/authenticate.ts`、`authorize.ts`、`auth-middleware.ts` — 保留
- `services/*` — 不变
- `content-types/role-action-log/schema.json` — 不变
- `controllers/auth.ts` — 不变
- 其他插件的策略（`has-oss-permission`、`has-channel-access`）— 不动

## 六、解耦说明

- zhao-auth 自身的 `has-auth-permission` 策略定义在 zhao-auth 插件内
- 其他插件的策略继续保留在 zhao-auth 的 `policies/index.ts` 中，本次不动
- `has-course-permission` 已统一：删除 zhao-auth 中的旧版（硬编码权限映射、用 `course-manager` 角色），保留 zhao-course 中的新版（`permissions.ts` 数据源、缓存、action 别名、角色继承回退、用 `plugin-manager` 角色），通过 zhao-course bootstrap 注册为 `has-course-permission`

## 七、前端影响

- Strapi admin 前端：API 前缀从 `/admin/plugins/zhao-auth/admin/roles/...` 简化为 `/admin/plugins/zhao-auth/roles/...`
- web 前端：角色管理 API 从 `/zhao-auth/admin/roles/...` 改为 `/api/zhao-auth/v1/admin/roles/...`
- 前端权限 Hook（`usePermission`）：本次不实现，后续各插件按需接入

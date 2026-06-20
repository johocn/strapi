# zhao-auth 后台管理接口

## 路由概览

| 类型 | 前缀 | 认证 |
|------|------|------|
| Content-API 公开 | `/api/zhao-auth/v1/` | 无 |
| Content-API 用户 | `/api/zhao-auth/v1/my/` | zhao-auth JWT (is-authenticated) |
| Content-API 管理员 | `/api/zhao-auth/v1/admin/` | zhao-auth JWT + has-permission |

---

## 角色体系

角色存储在 `permission` content-type 中，每条记录 = 一个角色定义。

| 字段 | 类型 | 说明 |
|------|------|------|
| role | string, unique | 角色名（如 admin, channel-admin） |
| displayName | string | 显示名（如系统管理员、渠道管理员） |
| description | text | 描述 |
| permissions | json | 权限 key 数组（控制前端菜单和后端接口） |
| isSystem | boolean | 是否系统角色（系统角色不可删除） |

内置 5 个角色：admin、channel-admin、plugin-manager、instructor、user。
不使用角色继承，每个角色的 permissions 数组独立维护。

---

## Content-API 路由

### 公开路由

| Method | Path | Handler | 说明 |
|--------|------|---------|------|
| POST | `/v1/login` | auth.login | 登录 |
| POST | `/v1/register` | auth.register | 注册 |
| POST | `/v1/reset-password` | auth.resetPassword | 重置密码 |

### 用户路由（需 is-authenticated）

| Method | Path | Handler | 说明 |
|--------|------|---------|------|
| GET | `/v1/my/roles` | role-management.getMyRoles | 我的角色 |
| GET | `/v1/my/permissions` | role-management.getMyPermissions | 我的权限（从用户表查询） |
| GET | `/v1/my/permission-keys` | permission.getMyPermissions | 我的权限（从 permission 表查询，推荐） |
| GET | `/v1/my/channel-scope` | permission.getMyChannelScope | 我的渠道范围 |

### 管理员路由（需 is-authenticated + has-permission）

#### 角色管理

| Method | Path | Handler | Permission | 说明 |
|--------|------|---------|------------|------|
| GET | `/v1/admin/roles` | permission.listRoles | role.read | 角色列表（分页） |
| GET | `/v1/admin/roles/all` | permission.getAllRoles | role.read | 全部角色（下拉） |
| GET | `/v1/admin/roles/:role` | permission.getRole | role.read | 单个角色 |
| POST | `/v1/admin/roles` | permission.createRole | role.create | 创建角色 |
| PUT | `/v1/admin/roles/:role` | permission.updateRole | role.assign | 更新角色 |
| DELETE | `/v1/admin/roles/:role` | permission.deleteRole | role.assign | 删除角色（系统角色不可删） |

#### 用户角色分配

| Method | Path | Handler | Permission | 说明 |
|--------|------|---------|------------|------|
| GET | `/v1/admin/users` | role-management.findUsers | role.read | 用户列表 |
| GET | `/v1/admin/users/:id/roles` | role-management.getUserRoles | role.read | 查询用户角色 |
| POST | `/v1/admin/roles/assign` | role-management.assignRole | role.assign | 分配角色给用户 |
| POST | `/v1/admin/roles/revoke` | role-management.revokeRole | role.revoke | 撤销用户角色 |
| POST | `/v1/admin/roles/batch-assign` | role-management.batchAssignRoles | role.assign | 批量分配 |
| GET | `/v1/admin/roles/logs` | role-management.getActionLogs | role.read-logs | 操作日志 |

#### 权限管理

| Method | Path | Handler | Permission | 说明 |
|--------|------|---------|------------|------|
| GET | `/v1/admin/permissions/tree` | permission.getTree | role.read | 权限树定义 |
| GET | `/v1/admin/permissions/role/:role` | permission.getRolePermissions | role.read | 某角色的权限 |
| PUT | `/v1/admin/permissions/role/:role` | permission.updateRolePermissions | role.assign | 更新角色权限 |
| POST | `/v1/admin/permissions/init` | permission.initRoles | role.assign | 初始化默认角色（首次部署） |

#### 角色-渠道授权

| Method | Path | Handler | Permission | 说明 |
|--------|------|---------|------------|------|
| GET | `/v1/admin/role-channels` | role-channel.list | role.assign | 角色渠道授权列表 |
| POST | `/v1/admin/role-channels` | role-channel.grant | role.assign | 授权单条角色渠道 |
| POST | `/v1/admin/role-channels/batch` | role-channel.batchGrant | role.assign | 批量授权角色渠道 |
| DELETE | `/v1/admin/role-channels/:id` | role-channel.revoke | role.assign | 撤销单条授权 |
| DELETE | `/v1/admin/role-channels/role/:role` | role-channel.revokeByRole | role.assign | 撤销角色全部渠道授权 |

---

## 权限检查策略

### has-permission 策略

位置：`zhao-auth/policies/has-permission.ts`

检查流程：
1. 读取 `ctx.state.user.roles`（用户的角色名数组）
2. 查询每个角色的 `permission.permissions` 数组
3. 检查目标 action 是否在任意角色的 permissions 中
4. 有任一角色含该权限则通过，否则返回 403

### has-channel-scope 策略

位置：`zhao-auth/policies/has-channel-scope.ts`

渠道范围计算：
- admin 角色：全部渠道可见
- 其他角色：通过 `role-channel` 表 + `user-channel` 表聚合渠道 ID

---

## 与 zhao-channel 的配合

角色渠道授权存储在 `zhao-auth.role-channel` 表中：
- `role`（string）：角色名，如 `channel-admin`
- `channel`（relation → zhao-channel.channel）：渠道
- `grantedBy`（relation → user）：授权人

zhao-channel 在查询渠道时，通过 `has-channel-scope` 策略读取 `zhao-auth.role-channel` 服务获得当前用户的渠道范围。

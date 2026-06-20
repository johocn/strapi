# zhao-auth Content-API 手册

基础 URL: `http://localhost:1337/api/zhao-auth`

---

## 路由架构

| 层级 | URL 模式 | 认证策略 | 说明 |
|------|---------|---------|------|
| 公开 | `/v1/...` | 无 | 登录/注册/重置密码 |
| 用户 | `/v1/my/...` | is-authenticated | 已登录用户的个人操作 |
| 管理员 | `/v1/admin/...` | is-authenticated + has-permission | 角色/权限管理，需特定角色权限 |

---

## 认证方式

- 公开路由：无需认证
- 用户路由/管理员路由：请求头 `Authorization: Bearer <token>`
- has-permission 策略读取用户的 roles（角色名数组），查询每个角色的 permissions 数组中是否含目标 action

---

## 一、公开路由

| Method | Path | 说明 |
|--------|------|------|
| POST | `/v1/login` | 登录，返回 JWT |
| POST | `/v1/register` | 注册新用户 |
| POST | `/v1/reset-password` | 重置密码 |

---

## 二、用户路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated`

| Method | Path | 说明 |
|--------|------|------|
| GET | `/v1/my/roles` | 我的角色（从用户表 role 字段查询） |
| GET | `/v1/my/permissions` | 我的权限（从用户表 role 查询，兼容老接口） |
| GET | `/v1/my/permission-keys` | 我的权限（从 permission 表查询，推荐） |
| GET | `/v1/my/channel-scope` | 我的渠道范围（含可访问的渠道 ID 列表） |

---

## 三、管理员路由

**认证**: `Authorization: Bearer <token>`，策略 `is-authenticated` + `has-permission`

### 3.1 角色管理（permission content-type）

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/roles` | role.read | 角色列表（分页，支持按 role 过滤） |
| GET | `/v1/admin/roles/all` | role.read | 全部角色（下拉选择用） |
| GET | `/v1/admin/roles/:role` | role.read | 单个角色详情 |
| POST | `/v1/admin/roles` | role.create | 创建角色 |
| PUT | `/v1/admin/roles/:role` | role.assign | 更新角色（displayName/description/permissions） |
| DELETE | `/v1/admin/roles/:role` | role.assign | 删除角色（isSystem=true 不可删除） |

#### 创建角色请求体
```json
{
  "role": "custom-role",
  "displayName": "自定义角色",
  "description": "自定义角色描述",
  "permissions": ["role.read", "channel.read"]
}
```

#### 创建角色响应
```json
{
  "id": 10,
  "documentId": "xxx",
  "name": "custom-role",
  "role": "custom-role",
  "displayName": "自定义角色",
  "description": "自定义角色描述",
  "isSystem": false,
  "permissions": ["role.read", "channel.read"]
}
```

### 3.2 用户角色分配

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/users` | role.read | 用户列表（可用于角色管理页面） |
| GET | `/v1/admin/users/:id/roles` | role.read | 查询用户的角色 |
| POST | `/v1/admin/roles/assign` | role.assign | 给用户分配角色 |
| POST | `/v1/admin/roles/revoke` | role.revoke | 撤销用户角色 |
| POST | `/v1/admin/roles/batch-assign` | role.assign | 批量分配角色给多个用户 |
| GET | `/v1/admin/roles/logs` | role.read-logs | 角色操作日志 |

#### 分配角色请求体
```json
{
  "userId": 123,
  "role": "channel-admin"
}
```

### 3.3 权限管理

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/permissions/tree` | role.read | 权限树（包含所有可分配的权限 key 和层级结构） |
| GET | `/v1/admin/permissions/role/:role` | role.read | 某角色的权限 key 数组 |
| PUT | `/v1/admin/permissions/role/:role` | role.assign | 更新角色的权限 |
| POST | `/v1/admin/permissions/init` | role.assign | 初始化默认角色（首次部署，从 DEFAULT_ROLE_PERMISSIONS 写入） |

#### 权限树响应
```json
{
  "menu.system-center": {
    "label": "系统工具",
    "type": "menu",
    "children": {
      "menu.user-roles": {
        "label": "用户角色",
        "type": "menu",
        "children": {
          "role.read": { "label": "查看角色", "type": "button" },
          "role.assign": { "label": "分配角色", "type": "button" }
        }
      }
    }
  },
  "menu.marketing-center": { ... },
  "...": "..."
}
```

### 3.4 角色-渠道授权

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/role-channels` | role.assign | 角色渠道授权列表（分页，支持按 role 过滤） |
| POST | `/v1/admin/role-channels` | role.assign | 授权单条角色渠道 |
| POST | `/v1/admin/role-channels/batch` | role.assign | 批量授权（同一角色多渠道） |
| DELETE | `/v1/admin/role-channels/:id` | role.assign | 撤销单条授权 |
| DELETE | `/v1/admin/role-channels/role/:role` | role.assign | 撤销角色全部渠道授权 |

#### 授权请求体（单个）
```json
{
  "role": "channel-admin",
  "channelId": 5
}
```

#### 批量授权请求体
```json
{
  "role": "channel-admin",
  "channelIds": [1, 2, 5],
  "grantedBy": 1
}
```

#### 响应示例
```json
{
  "results": [
    { "success": true, "channelId": 1, "result": { "id": 1, "role": "channel-admin", "channel": { "id": 1, "name": "华东大区" } } },
    { "success": true, "channelId": 2, "result": { ... } }
  ]
}
```

---

## 四、权限模型详解

### 4.1 permission content-type

角色定义存储表，每条记录是一个独立的角色。

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| role | string | 是 | - | 角色名，唯一，不可变（建议小写 + 连字符） |
| displayName | string | 是 | - | 显示名，可随时修改 |
| description | text | 否 | '' | 角色描述 |
| permissions | json | 是 | [] | 权限 key 数组，如 ["role.read", "channel.create"] |
| isSystem | boolean | 是 | false | 是否系统角色，系统角色不可删除 |

### 4.2 权限 key 定义

权限 key 在 `permissions.ts` 的 PERMISSION_TREE 中定义，结构为：
- menu.*：菜单项（用于前端显隐控制，不直接作为 API 权限检查）
- *.read / *.create / *.update 等：按钮级或 API 级权限（同时用于前端按钮显隐和后端 API 鉴权）

建议的命名约定：`<module>.<action>`，如 `channel.create`, `role.read`, `point-config.update`

### 4.3 角色不使用继承

每个角色有独立的 permissions 数组。admin 角色通常包含所有权限 key，其他角色按需选择子集。无角色继承关系，避免权限计算的隐式行为。

### 4.4 默认角色权限

| 角色 | 说明 | 默认权限 |
|------|------|---------|
| admin | 系统管理员 | 全部权限 |
| channel-admin | 渠道管理员 | 除 system-center 相关的所有权限 |
| plugin-manager | 插件管理员 | course-center + quiz-center + point-center |
| instructor | 讲师 | 课程相关菜单 + 查看权限 |
| user | 普通用户 | 空（只能看公开内容） |

---

## 五、与 zhao-channel 的协作

### 5.1 渠道授权数据

角色-渠道关联表存储在 `zhao-auth.role-channel`（独立于 zhao-channel 的 user-channel），用于：
- 存储角色名（如 `channel-admin`）到渠道的映射
- 为渠道管理员等角色提供可访问的渠道范围

### 5.2 权限检查链

```
请求进入 zhao-channel 的 admin 路由
  │
  ├─ 1. is-authenticated：解析 JWT，设置 ctx.state.user
  │
  ├─ 2. has-permission：检查用户角色是否含目标 action（从 zhao-auth.permission 表查询）
  │
  └─ 3. has-channel-scope：查询用户可访问的渠道范围（role-channel + user-channel 聚合）
        结果写入 ctx.state.allowedChannelIds
```

zhao-channel 的 service 层读取 `ctx.state.allowedChannelIds` 进行过滤。

---

## 六、错误码

| HTTP | 场景 |
|------|------|
| 400 | 参数错误 / 角色名重复 / 系统角色不可删除 |
| 401 | 未认证 / token 无效 |
| 403 | 无权限（has-permission 或 has-channel-scope 拒绝） |
| 404 | 角色 / 用户 / 渠道不存在 |

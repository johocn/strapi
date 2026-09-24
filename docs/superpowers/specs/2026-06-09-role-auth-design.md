# 角色权限体系设计方案

> 日期：2026-06-09
> 状态：已实现
> 更新：2026-06-09 补充审查修复

---

## 一、设计目标

建立统一的角色权限体系，覆盖以下需求：
- 所有插件使用 zhao-auth 自建的角色系统，不依赖 Strapi 内置角色
- 通过权限 key 控制前端菜单/按钮显示和后端 API 访问
- 通过渠道授权机制控制用户能访问哪些渠道

---

## 二、核心设计原则

1. **职责分离**：zhao-auth 管角色定义和功能权限，zhao-channel 管渠道范围授权
2. **显式授权**：每个角色直接分配权限 key 数组，不使用隐式继承
3. **前后端统一**：权限 key 既控制前端菜单，也控制后端路由
4. **不使用 Strapi 内置角色**：用户角色存储在 `zhaoRoles` JSON 字段，不依赖 `plugin::users-permissions.role`

---

## 三、角色体系（zhao-auth）

### 3.1 permission 表（角色定义）

存储位置：`zhao-auth/server/src/content-types/permission/schema.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| role | string (unique) | 角色名，如 "admin"、"channel-admin" |
| displayName | string | 显示名称，如 "系统管理员" |
| description | text | 角色描述 |
| permissions | json | 权限 key 数组，如 ["channel.read", "channel.create"] |
| isSystem | boolean | 系统角色标记，系统角色不允许删除 |

### 3.2 内置角色定义

| 角色名 | 显示名 | 默认权限 |
|--------|--------|---------|
| admin | 系统管理员 | 权限树全部 key |
| channel-admin | 渠道管理员 | 除 system-center 外的所有 key |
| plugin-manager | 插件管理员 | course/quiz/point 三大模块 |
| instructor | 讲师 | 课程中心 + 学习数据 |
| user | 普通用户 | 空 |

### 3.3 用户角色存储

**关键字段**：用户表 `up_users` 的 `zhaoRoles` JSON 字段

```json
{ "zhaoRoles": ["admin"] }
{ "zhaoRoles": ["channel-admin", "user"] }
```

**读取优先级**：
1. `user.zhaoRoles`（JSON 数组，新字段）
2. `user.role.type`（Strapi 内置角色，回退兼容）

**写入**：`assignRole` / `revokeRole` 只更新 `zhaoRoles` 字段

---

## 四、权限树（zhao-auth）

定义位置：`zhao-auth/server/src/permissions.ts`

### 4.1 权限 key 与路由的对应关系

所有 `adminRoute` 和 `channelScopeRoute` 使用的权限 key 必须在 PERMISSION_TREE 中定义。

**zhao-auth 路由使用的 key**：
- `role.read` / `role.create` / `role.assign` / `role.revoke` / `role.read-logs`

**zhao-channel 路由使用的 key**：
- `channel.read` / `channel.create` / `channel.update` / `channel.delete`
- `channel-member.read` / `channel-member.add` / `channel-member.remove`
- `channel-permission.set`
- `user-invite.send` / `user-invite.validate`

### 4.2 默认角色权限映射

```typescript
DEFAULT_ROLE_PERMISSIONS = {
  admin: [全部权限 key],
  channel-admin: [全部 key - system-center 相关],
  plugin-manager: [course-center + quiz-center + point-center],
  instructor: [course-center + study-center],
  user: []
}
```

---

## 五、渠道授权体系

### 5.1 role-channel 表（zhao-auth）

存储位置：`zhao-auth/server/src/content-types/role-channel/schema.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| role | string | 角色名（如 "channel-admin"） |
| channel | relation (manyToOne) | 关联 `plugin::zhao-channel.channel` |
| grantedBy | relation (manyToOne) | 关联 `plugin::users-permissions.user` |

**注意**：zhao-channel 中旧的 `role-channel` content-type 已删除，统一使用 zhao-auth 的。

### 5.2 user-channel 表（zhao-channel，保留）

| 字段 | 类型 | 说明 |
|------|------|------|
| user | relation (manyToOne) | 关联用户 |
| channel | relation (manyToOne) | 关联渠道 |
| grantedBy | relation (manyToOne) | 授权人 |

### 5.3 渠道范围计算逻辑

```
用户可访问渠道 = 
  user-channel 直接授权 +
  role-channel 角色授权（按用户的所有角色名查询）+
  channel-member 当前渠道 +
  以上渠道的子渠道（path 扩展）
```

---

## 六、权限检查流程

### 6.1 策略执行顺序

```
请求进入
  │
  ├─ 1. plugin::zhao-auth.is-authenticated
  │     → 检查 JWT，解析用户信息（含 roles 数组）
  │
  ├─ 2. plugin::zhao-auth.has-permission
  │     → admin 角色直接放行
  │     → 其他角色：查 permission 表的 permissions 字段
  │
  └─ 3. plugin::zhao-auth.has-channel-scope
        → 非阻断策略，注入 channelScope 到 ctx.state
        → admin：{ all: true }
        → 其他：调用 zhao-channel.channel-permission.getUserAllChannels
```

### 6.2 has-channel-access 策略（渠道成员路由）

用于需要验证用户是否属于某个具体渠道的路由（如 `/channel/:id`）。

---

## 七、两套角色系统

| 概念 | 存储位置 | 用途 |
|------|---------|------|
| zhao-auth 角色 | permission 表 + 用户 zhaoRoles 字段 | 控制全局功能权限 |
| channel-member 角色 | channel-member 表的 role 字段 | 控制用户在渠道内的身份（owner/admin/member） |
| role-channel | zhao-auth.role-channel 表 | 控制角色能访问哪些渠道范围 |

---

## 八、API 路由

### 8.1 zhao-auth 角色管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /v1/admin/roles | role.read | 角色列表 |
| GET | /v1/admin/roles/all | role.read | 所有角色 |
| GET | /v1/admin/roles/:role | role.read | 单个角色 |
| POST | /v1/admin/roles | role.create | 创建角色 |
| PUT | /v1/admin/roles/:role | role.assign | 更新角色 |
| DELETE | /v1/admin/roles/:role | role.assign | 删除角色 |
| GET | /v1/admin/permissions/tree | role.read | 权限树 |
| GET | /v1/admin/permissions/role/:role | role.read | 角色权限 |
| PUT | /v1/admin/permissions/role/:role | role.assign | 更新角色权限 |
| POST | /v1/admin/permissions/init | role.assign | 初始化默认角色 |

### 8.2 zhao-auth 渠道授权

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /v1/admin/role-channels | role.assign | 角色渠道列表 |
| POST | /v1/admin/role-channels | role.assign | 授权角色渠道 |
| POST | /v1/admin/role-channels/batch | role.assign | 批量授权 |
| DELETE | /v1/admin/role-channels/:id | role.assign | 撤销授权 |
| DELETE | /v1/admin/role-channels/role/:role | role.assign | 按角色撤销 |
| GET | /v1/my/channel-scope | - | 当前用户渠道范围 |

### 8.3 zhao-channel 路由策略

```typescript
// 管理路由：认证 + 功能权限 + 渠道范围
channelScopeRoute(method, path, handler, permission)
  → policies: [is-authenticated, has-permission(action), has-channel-scope]

// 成员路由：认证 + 渠道访问权
memberRoute(method, path, handler)
  → policies: [is-authenticated, has-channel-access]
```

---

## 九、插件依赖关系

```
zhao-auth ←── zhao-channel
    │              │
    │              ├── 使用 zhao-auth 的策略（is-authenticated, has-permission, has-channel-scope, has-channel-access）
    │              └── channel-scope 服务调用 zhao-channel.channel-permission（反向依赖）
    │
    ├── role-channel 表关联 zhao-channel.channel（跨插件 relation）
    └── 用户表 zhaoRoles 字段存储角色名数组
```

**解耦现状**：
- zhao-auth → zhao-channel：channel-scope 服务调用 channel-permission.getUserAllChannels（try-catch 兜底）
- zhao-channel → zhao-auth：使用策略和 role-channel 表
- 无循环依赖风险（运行时依赖，非编译时）

---

## 十、已完成的修复

### 10.1 阻塞级修复

| 问题 | 修复 |
|------|------|
| zhao-channel 残留旧 role-channel content-type | 删除目录和注册，统一使用 zhao-auth 的 |
| zhao-channel ROLE_CHANNEL_UID 指向旧表 | 改为 `plugin::zhao-auth.role-channel` |
| 创建用户时写入 `roles` 关系字段 | 改为写入 `zhaoRoles` JSON 字段 |
| 用户表缺少 zhaoRoles 字段 | 在 schema.json 中添加 JSON 类型字段 |

### 10.2 一致性修复

| 问题 | 修复 |
|------|------|
| PERMISSION_TREE 缺少 channel.read 等权限 key | 补充完整 |
| has-permission 策略读取 user.roles 逻辑不一致 | 统一为字符串数组处理 |
| auth.service 角色解析不一致 | 统一 zhaoRoles → role.type 回退 |
| permission.service getMyPermissions 只读单角色 | 改为遍历 zhaoRoles 数组中所有角色 |
| role-management 硬编码角色白名单 | 移除，支持任意自定义角色 |
| JWT 中未携带 zhaoRoles | login/register 时写入 zhaoRoles 字段 |

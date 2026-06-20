# zhao-auth 前端 API 指南

基础 URL: `http://localhost:1337/api/zhao-auth`
前端请求头: `Authorization: Bearer <token>`

---

## 一、用户态接口（我的信息）

### 1.1 我的角色

```
GET /api/zhao-auth/v1/my/roles
```

响应示例：
```json
{
  "roles": ["admin"]
}
```

### 1.2 我的权限（推荐）

```
GET /api/zhao-auth/v1/my/permission-keys
```

响应示例：
```json
{
  "permissions": ["role.read", "role.assign", "channel.create", "..."]
}
```

用途：
- 前端通过 `permissionKeys.includes('channel.create')` 判断是否显示按钮
- 菜单级权限（`menu.*`）也会返回，用于控制左侧导航显示

### 1.3 我的渠道范围

```
GET /api/zhao-auth/v1/my/channel-scope
```

响应示例：
```json
{
  "all": true,
  "channelIds": []
}
```

或：
```json
{
  "all": false,
  "channelIds": [1, 5, 12]
}
```

---

## 二、角色管理接口（管理员）

所有接口前缀: `/api/zhao-auth/v1/admin`

### 2.1 角色列表

```
GET /api/zhao-auth/v1/admin/roles?page=1&pageSize=20&role=admin
```

Query 参数：
- page: 页码（默认 1）
- pageSize: 每页条数（默认 20）
- role: 按角色名模糊过滤

响应示例：
```json
{
  "list": [
    {
      "id": 1,
      "role": "admin",
      "displayName": "系统管理员",
      "description": "拥有全部权限",
      "isSystem": true,
      "permissions": ["role.read", "role.assign", "..."],
      "userCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "pageCount": 1
  }
}
```

### 2.2 全部角色（下拉选择）

```
GET /api/zhao-auth/v1/admin/roles/all
```

响应示例：
```json
{
  "list": [
    { "name": "admin", "role": "admin", "displayName": "系统管理员", "isSystem": true },
    { "name": "channel-admin", "role": "channel-admin", "displayName": "渠道管理员", "isSystem": true },
    { "name": "plugin-manager", "role": "plugin-manager", "displayName": "插件管理员", "isSystem": true }
  ]
}
```

### 2.3 创建角色

```
POST /api/zhao-auth/v1/admin/roles
Content-Type: application/json

{
  "role": "custom-role",
  "displayName": "自定义角色",
  "description": "自定义描述",
  "permissions": ["role.read", "channel.read"]
}
```

### 2.4 更新角色

```
PUT /api/zhao-auth/v1/admin/roles/:role

{
  "displayName": "新的显示名",
  "description": "新的描述",
  "permissions": ["role.read", "channel.read", "channel.create"]
}
```

### 2.5 删除角色

```
DELETE /api/zhao-auth/v1/admin/roles/:role
```

注意：系统角色（isSystem=true）不可删除。

---

## 三、权限管理接口

### 3.1 权限树（用于角色配置页面）

```
GET /api/zhao-auth/v1/admin/permissions/tree
```

返回完整权限树结构，包含所有菜单项和按钮权限。前端用于渲染多选权限配置器。

响应示例：
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
          "role.assign": { "label": "分配角色", "type": "button" },
          "role.create": { "label": "新增角色", "type": "button" }
        }
      }
    }
  },
  "menu.marketing-center": { ... },
  "...": "..."
}
```

### 3.2 获取某角色的权限

```
GET /api/zhao-auth/v1/admin/permissions/role/:role
```

响应示例：
```json
{
  "role": "channel-admin",
  "permissions": ["role.read", "role.assign", "channel.read", "channel.create", "..."]
}
```

### 3.3 更新角色权限

```
PUT /api/zhao-auth/v1/admin/permissions/role/:role

{
  "permissions": ["role.read", "channel.read", "channel.create"]
}
```

### 3.4 初始化默认角色（首次部署）

```
POST /api/zhao-auth/v1/admin/permissions/init
```

根据 `DEFAULT_ROLE_PERMISSIONS` 初始化 5 个内置角色记录。

---

## 四、用户角色分配接口

### 4.1 分配角色给用户

```
POST /api/zhao-auth/v1/admin/roles/assign

{
  "userId": 123,
  "role": "channel-admin"
}
```

### 4.2 撤销用户角色

```
POST /api/zhao-auth/v1/admin/roles/revoke

{
  "userId": 123,
  "role": "channel-admin"
}
```

### 4.3 批量分配

```
POST /api/zhao-auth/v1/admin/roles/batch-assign

{
  "userIds": [123, 456, 789],
  "role": "channel-admin"
}
```

### 4.4 查询用户角色

```
GET /api/zhao-auth/v1/admin/users/:id/roles
```

---

## 五、角色-渠道授权接口

### 5.1 角色渠道授权列表

```
GET /api/zhao-auth/v1/admin/role-channels?page=1&pageSize=20&role=channel-admin
```

响应示例：
```json
{
  "list": [
    {
      "id": 1,
      "role": "channel-admin",
      "channel": { "id": 1, "name": "华东大区", "code": "A1B2C3D4" },
      "grantedBy": { "id": 1, "username": "admin" },
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "pageCount": 1
  }
}
```

### 5.2 授权单条角色渠道

```
POST /api/zhao-auth/v1/admin/role-channels

{
  "role": "channel-admin",
  "channelId": 5
}
```

### 5.3 批量授权

```
POST /api/zhao-auth/v1/admin/role-channels/batch

{
  "role": "channel-admin",
  "channelIds": [1, 2, 5],
  "grantedBy": 1
}
```

### 5.4 撤销单条授权

```
DELETE /api/zhao-auth/v1/admin/role-channels/:id
```

### 5.5 撤销角色全部渠道授权

```
DELETE /api/zhao-auth/v1/admin/role-channels/role/:role
```

---

## 六、前端集成建议

### 6.1 菜单显隐控制

```typescript
// 登录成功后拉取权限列表
const resp = await fetch('/api/zhao-auth/v1/my/permission-keys', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { permissions } = await resp.json();

// 菜单控制：menu.* 权限 key
if (permissions.includes('menu.system-center')) {
  // 显示系统中心菜单
}
if (permissions.includes('menu.user-roles')) {
  // 显示用户角色子菜单
}

// 按钮控制：*.read / *.create / *.assign 等权限 key
if (permissions.includes('role.assign')) {
  // 显示分配角色按钮
}
```

### 6.2 渠道范围控制

```typescript
const resp = await fetch('/api/zhao-auth/v1/my/channel-scope', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { all, channelIds } = await resp.json();

if (all) {
  // 超级管理员，不过滤渠道
} else {
  // 渠道管理员，传入 channelIds 过滤
}
```

### 6.3 API 权限检查（后端自动）

前端无需额外处理，后端路由已经通过 `has-permission` 策略控制。如果用户无权限调用某接口，会返回 403。

---

## 七、角色名约定

| 角色名 | 显示名 | 典型用户 |
|--------|--------|---------|
| admin | 系统管理员 | 平台管理者 |
| channel-admin | 渠道管理员 | 渠道运营人员 |
| plugin-manager | 插件管理员 | 内容插件管理人员 |
| instructor | 讲师 | 课程讲师 |
| user | 普通用户 | 所有注册用户 |

自定义角色建议使用小写字母 + 连字符命名，如 `region-manager`、`content-editor`。

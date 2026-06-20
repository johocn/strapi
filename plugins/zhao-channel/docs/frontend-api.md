# zhao-channel 前端 API 指南

基础 URL: `http://localhost:1337/api/zhao-channel`
前端请求头: `Authorization: Bearer <token>`（需认证的接口）

---

## 接口分类

| 类型 | URL 前缀 | 认证 | 说明 |
|------|---------|------|------|
| 公开 | `/api/zhao-channel/v1/` | 无 | 渠道浏览、邀请码验证、注册 |
| 用户 | `/api/zhao-channel/v1/my/` | zhao-auth JWT | 个人渠道信息、邀请码、分销链 |
| 成员 | `/api/zhao-channel/v1/channel/` | zhao-auth JWT | 渠道详情、网络、统计 |
| 管理员 | `/api/zhao-channel/v1/admin/` | zhao-auth JWT | 渠道管理、成员管理、权限授权 |

---

## 一、公开接口（无需认证）

### 1.1 获取渠道公开信息

```
GET /api/zhao-channel/v1/channel/public/:id
```

响应：
```json
{
  "id": 1,
  "name": "华东大区",
  "description": "华东区域渠道",
  "channelTier": "regional",
  "path": "/1/3/5/",
  "depth": 2,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### 1.2 验证邀请码有效性

```
POST /api/zhao-channel/v1/channel/validate/public
Content-Type: application/json

{ "code": "邀请码" }
```

响应：
```json
{
  "ok": true,
  "valid": true,
  "channel": { "id": 1, "name": "华东大区", "code": "A1B2C3D4", "channelTier": "regional", "path": "/1/3/5/", "depth": 2 }
}
```

### 1.3 通过邀请码注册（含创建用户）

```
POST /api/zhao-channel/v1/channel/register/public
Content-Type: application/json

{
  "code": "邀请码",
  "name": "新渠道名称",
  "description": "渠道描述",
  "email": "新用户邮箱",
  "username": "新用户名",
  "password": "密码",
  "channelTier": "city"
}
```

响应：
```json
{
  "id": 10,
  "name": "新渠道名称",
  "code": "E5F6G7H8",
  "channelTier": "city",
  "path": "/1/5/10/",
  "depth": 3,
  "parentChannelId": 5,
  "user": { "id": 8, "email": "...", "username": "..." },
  "token": "JWT..."
}
```

---

## 二、用户接口（需认证）

### 2.1 我的渠道列表

```
GET /api/zhao-channel/v1/my/channels
```

响应：
```json
[
  { "id": 1, "name": "华东大区", "channelTier": "regional", "path": "/1/3/5/", "depth": 2 },
  { "id": 5, "name": "全国渠道", "channelTier": "national", "path": "/1/3/", "depth": 1 }
]
```

### 2.2 已登录用户注册子渠道

```
POST /api/zhao-channel/v1/my/channel/register
Content-Type: application/json

{
  "code": "邀请码",
  "name": "新渠道名称",
  "description": "渠道描述",
  "channelTier": "city"
}
```

### 2.3 已登录用户验证邀请码

```
POST /api/zhao-channel/v1/my/channel/validate
Content-Type: application/json

{ "code": "邀请码" }
```

### 2.4 我可访问的所有渠道

```
GET /api/zhao-channel/v1/my/channels/accessible
```

响应：
```json
[
  { "id": 1, "name": "渠道A" },
  { "id": 3, "name": "全国渠道" }
]
```

### 2.5 我的分销链

```
GET /api/zhao-channel/v1/my/invite/chain?userId=123
```

### 2.6 我的直接下级

```
GET /api/zhao-channel/v1/my/invite/downstream?userId=123
```

### 2.7 我的分销统计

```
GET /api/zhao-channel/v1/my/invite/stats?userId=123
```

---

## 三、渠道成员接口（需认证 + 渠道成员权限）

### 3.1 渠道详情

```
GET /api/zhao-channel/v1/channel/:id
```

### 3.2 渠道网络（父渠道 + 子渠道）

```
GET /api/zhao-channel/v1/channel/:id/network
```

### 3.3 渠道统计

```
GET /api/zhao-channel/v1/channel/:id/stats
```

响应：
```json
{
  "stats": {
    "id": 1,
    "name": "华东大区",
    "memberCount": 15,
    "subChannelCount": 8,
    "totalMembers": 57,
    "totalSubMembers": 42
  }
}
```

### 3.4 渠道成员列表

```
GET /api/zhao-channel/v1/channel-members?channel=channel-doc-id&page=1&pageSize=20
```

---

## 四、渠道管理接口（需认证 + 权限 + 渠道范围）

所有管理接口的权限由 zhao-auth 的 has-permission 策略控制（如 channel.create、channel-member.add 等），渠道范围由 has-channel-scope 控制。

### 4.1 渠道管理

#### 渠道列表

```
GET /api/zhao-channel/v1/admin/channels?page=1&pageSize=20
```

#### 创建渠道

```
POST /api/zhao-channel/v1/admin/channels
Content-Type: application/json

{
  "name": "上海分部",
  "description": "上海区域",
  "channelTier": "city",
  "parentChannel": 5,
  "status": "active"
}
```

#### 单个渠道详情

```
GET /api/zhao-channel/v1/admin/channels/:id
```

#### 更新渠道

```
PUT /api/zhao-channel/v1/admin/channels/:id
Content-Type: application/json

{
  "name": "新名称",
  "description": "新描述",
  "status": "active",
  "channelTier": "city",
  "parentChannel": 3
}
```

注意：parentChannel 变更时，系统会自动重算 path 和 depth。

#### 删除渠道（级联）

```
DELETE /api/zhao-channel/v1/admin/channels/:id
```

此操作会删除该渠道的所有子孙渠道、成员记录、user-channel、role-channel。不可逆，请确认后调用。

#### 子渠道查询

```
GET /api/zhao-channel/v1/admin/channels/:id/children      // 直属子渠道
GET /api/zhao-channel/v1/admin/channels/:id/hierarchy     // 完整层级树（含所有子孙）
GET /api/zhao-channel/v1/admin/channels/tier-tree/:parentTier  // 层级子树
```

### 4.2 成员管理

#### 成员列表

```
GET /api/zhao-channel/v1/admin/channel-members?page=1&pageSize=20
```

#### 添加成员（邀请模式）

```
POST /api/zhao-channel/v1/admin/channel-members
Content-Type: application/json

{
  "channelId": 1,
  "inviterId": 5,
  "email": "newmember@example.com",
  "role": "admin"
}
```

#### 添加成员（直接创建模式）

```
POST /api/zhao-channel/v1/admin/channel-members
Content-Type: application/json

{
  "channel": 1,
  "user": 8,
  "role": "member"
}
```

#### 更新成员角色

```
PUT /api/zhao-channel/v1/admin/channel-members/:id
Content-Type: application/json

{ "role": "admin" }
```

#### 移除成员

```
DELETE /api/zhao-channel/v1/admin/channel-members/:id
```

### 4.3 渠道权限授权

#### 检查用户是否有渠道访问权限

```
POST /api/zhao-channel/v1/admin/channel-permissions/check
Content-Type: application/json

{ "userId": 123, "channelId": 5 }
```

响应：
```json
{ "hasPermission": true }
```

#### 获取用户被直接授权的渠道

```
GET /api/zhao-channel/v1/admin/channel-permissions/user/:userId
```

#### 批量授权

```
POST /api/zhao-channel/v1/admin/channel-permissions/batch-grant
Content-Type: application/json

{
  "type": "user",
  "targetId": 123,
  "channelIds": [1, 2, 5],
  "grantedBy": 1
}
```

type 可选：
- `user`: 给用户授权（写入 user-channel）
- `role`: 给角色授权（写入 role-channel，注意：完整的角色渠道授权管理在 zhao-auth 的接口中）

---

## 五、前端集成建议

### 5.1 渠道权限检查流程

```typescript
// 1. 登录后获取 token
// 2. 调用 zhao-auth 接口获取用户权限和渠道范围
const [permissionsResp, channelScopeResp] = await Promise.all([
  fetch('/api/zhao-auth/v1/my/permission-keys', { headers: { Authorization: `Bearer ${token}` } }),
  fetch('/api/zhao-auth/v1/my/channel-scope', { headers: { Authorization: `Bearer ${token}` } })
]);

const { permissions } = await permissionsResp.json();
const channelScope = await channelScopeResp.json();

// 3. 前端控制按钮显隐
if (permissions.includes('channel.create')) {
  // 显示"创建渠道"按钮
}

// 4. 渠道范围控制（非 admin 角色过滤渠道 ID）
if (!channelScope.all) {
  // 传入 channelIds 过滤查询
}
```

### 5.2 角色-渠道授权管理

在角色管理页面，调用 zhao-auth 的 role-channel 接口：

```typescript
// 获取角色渠道授权列表
const list = await fetch('/api/zhao-auth/v1/admin/role-channels?role=channel-admin', {
  headers: { Authorization: `Bearer ${token}` }
});

// 给角色授权渠道
await fetch('/api/zhao-auth/v1/admin/role-channels', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ role: 'channel-admin', channelId: 5 })
});

// 批量授权
await fetch('/api/zhao-auth/v1/admin/role-channels/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ role: 'channel-admin', channelIds: [1, 2, 5] })
});

// 撤销授权
await fetch(`/api/zhao-auth/v1/admin/role-channels/${id}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});
```

### 5.3 两套"角色"的区别

```typescript
// zhao-auth 全局角色（控制功能权限）
// 示例：channel-admin 角色拥有 channel.read / channel.create / channel.update 等权限
// 存储位置：zhao-auth.permission 表的 permissions 字段

// channel-member.role（控制渠道内身份）
// 示例：owner / admin / member
// 存储位置：zhao-channel.channel-member 表的 role 字段

// 典型用户的权限组合：
// - zhao-auth 角色：channel-admin（全局身份，能看到渠道管理菜单）
// - role-channel 授权：渠道 ID 1、2、5（能操作哪些渠道）
// - channel-member 角色：渠道 1 的 owner（该渠道内的最高身份）
```

---

## 六、错误处理

| HTTP 状态码 | 含义 |
|------------|------|
| 400 | 参数错误 / 邀请码无效 / 渠道层级超限 / 渠道名称重复 / 邮箱已注册 |
| 401 | 未认证 / token 无效 |
| 403 | 无权限（功能权限或渠道范围权限不足） |
| 404 | 渠道 / 成员 / 邀请码不存在 |

建议前端统一处理：
- 401：清除本地 token，跳转到登录页
- 403：显示"无权限操作"提示
- 400/404：显示具体错误消息（后端返回的 message 字段）

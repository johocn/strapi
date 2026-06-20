# zhao-channel 渠道管理 — Content-API 文档

基础 URL: `http://localhost:1337/api/zhao-channel`

---

## 路由架构

| 层级 | URL 模式 | 认证策略 | 说明 |
|------|---------|---------|------|
| 公开 | `/v1/...` | 无 | 无需登录 |
| 用户 | `/v1/my/...` | is-authenticated | 当前用户个人操作 |
| 成员 | `/v1/channel/...` | is-authenticated + has-channel-access | 渠道成员操作 |
| 管理员 | `/v1/admin/...` | is-authenticated + has-permission + has-channel-scope | 渠道管理操作 |

---

## 一、公开路由

### GET /v1/channel/public/:id

获取渠道公开信息（名称、描述、层级、路径）。

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

### POST /v1/channel/validate/public

验证邀请码有效性。

请求体：
```json
{
  "code": "邀请码"
}
```

响应：
```json
{
  "ok": true,
  "valid": true,
  "channel": { "id": 1, "name": "华东大区", "code": "A1B2C3D4", "channelTier": "regional", "path": "/1/3/5/", "depth": 2 }
}
```

### POST /v1/channel/register/public

通过邀请码注册（创建用户 + 渠道 + 成员记录）。

请求体：
```json
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

## 二、用户路由（需登录）

### GET /v1/my/channels

获取当前用户所属的渠道列表。

响应：
```json
[
  { "id": 1, "name": "华东大区", "channelTier": "regional", "path": "/1/3/5/", "depth": 2 },
  { "id": 5, "name": "全国渠道", "channelTier": "national", "path": "/1/3/", "depth": 1 }
]
```

### POST /v1/my/channel/register

已登录用户通过邀请码注册子渠道。请求体同公开注册（不含用户信息）。

### POST /v1/my/channel/validate

已登录用户验证邀请码。

### GET /v1/my/channels/accessible

获取当前用户可访问的所有渠道（聚合 user-channel + role-channel + channel-member，含子孙渠道）。

响应：
```json
[
  { "id": 1, "name": "渠道A" },
  { "id": 3, "name": "全国渠道" }
]
```

### GET /v1/my/invite/chain

获取我的分销链（向上追溯）。

### GET /v1/my/invite/downstream

获取我的直接下级列表。

### GET /v1/my/invite/stats

获取我的分销统计。

---

## 三、成员路由（需渠道访问权限）

### GET /v1/channel/:id

获取渠道详情。

响应：
```json
{
  "id": 1,
  "attributes": {
    "name": "华东大区",
    "code": "A1B2C3D4",
    "description": "华东区域渠道",
    "channelTier": "regional",
    "status": "active",
    "path": "/1/3/5/",
    "depth": 2,
    "parentChannelId": 3,
    "createdAt": "..."
  }
}
```

### GET /v1/channel/:id/network

获取渠道网络信息（父渠道 + 直属子渠道）。

响应：
```json
{
  "channel": {
    "id": 1,
    "attributes": {
      "name": "华东大区",
      "parentChannelId": { "id": 3, "name": "全国渠道" }
    }
  },
  "children": [
    { "id": 10, "attributes": { "name": "上海分部", "channelTier": "city", "path": "/1/3/5/10/", "depth": 3 } }
  ]
}
```

### GET /v1/channel/:id/stats

获取渠道统计（成员数、子渠道数、总成员数）。

响应：
```json
{
  "stats": {
    "id": 1,
    "name": "华东大区",
    "depth": 2,
    "path": "/1/3/5/",
    "memberCount": 15,
    "subChannelCount": 8,
    "totalSubMembers": 42,
    "totalMembers": 57
  }
}
```

### GET /v1/channel-members

获取渠道成员列表（分页，支持按渠道过滤）。

Query 参数：
- channel: 按渠道 documentId 过滤
- page / pageSize: 分页
- populate: 关联填充

响应：
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "role": "admin",
        "status": "active",
        "user": { "id": 8, "username": "...", "email": "..." },
        "channel": { "id": 1, "name": "华东大区" }
      }
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 20, "pageCount": 1, "total": 15 } }
}
```

---

## 四、管理员路由（需权限 + 渠道范围）

### 渠道 CRUD

#### POST /v1/admin/channels（或 /v1/admin/channel）

创建渠道。

请求体：
```json
{
  "name": "上海分部",
  "description": "上海区域",
  "channelTier": "city",
  "parentChannel": 5,
  "status": "active"
}
```

响应：
```json
{
  "data": {
    "id": 12,
    "attributes": {
      "name": "上海分部",
      "code": "E5F6G7H8",
      "channelTier": "city",
      "status": "active",
      "path": "/1/3/5/12/",
      "depth": 3,
      "parentChannelId": 5,
      "createdAt": "..."
    }
  }
}
```

#### GET /v1/admin/channels

渠道列表（分页）。Query 参数支持 page / pageSize / 其他字段过滤。

受 has-channel-scope 影响：非 admin 角色只能看到自己被授权的渠道。

#### GET /v1/admin/channels/:id

单个渠道详情。

#### GET /v1/admin/channels/:id/children

某渠道的直属子渠道。

#### GET /v1/admin/channels/:id/hierarchy

某渠道的完整层级树（含所有子孙）。

#### GET /v1/admin/channels/tier-tree/:parentTier

获取指定父层级下的完整层级子树。

#### PUT /v1/admin/channels/:id（或 /v1/admin/channel/:id）

更新渠道。父渠道变更时会自动重算 path 和 depth。

#### DELETE /v1/admin/channels/:id

删除渠道（级联删除子孙渠道 + 成员 + user-channel + role-channel）。此操作不可逆。

### 渠道成员 CRUD

#### POST /v1/admin/channel-members

添加成员（支持两种模式）：

模式一：邀请模式（body 含 channelId 和 inviterId）
```json
{
  "channelId": 1,
  "inviterId": 5,
  "email": "newmember@example.com",
  "role": "admin"
}
```
若用户不存在则创建用户，创建 channel-member 记录。

模式二：直接创建（body 含 channel + user）
```json
{
  "channel": 1,
  "user": 8,
  "role": "member"
}
```

#### PUT /v1/admin/channel-members/:id

更新成员角色。

请求体：
```json
{
  "role": "admin"
}
```

#### DELETE /v1/admin/channel-members/:id

移除成员。

### 渠道权限管理

#### POST /v1/admin/channel-permissions/check

检查用户是否有指定渠道的访问权限。

请求体：
```json
{
  "userId": 123,
  "channelId": 5
}
```

响应：
```json
{
  "hasPermission": true
}
```

#### GET /v1/admin/channel-permissions/user/:userId

获取用户被直接授权的渠道列表（来自 user-channel）。

响应：
```json
[
  { "id": 1, "name": "华东大区" },
  { "id": 2, "name": "华北大区" }
]
```

#### POST /v1/admin/channel-permissions/batch-grant

批量授权。

请求体：
```json
{
  "type": "user",
  "targetId": 123,
  "channelIds": [1, 2, 5],
  "grantedBy": 1
}
```

type 可选：
- "user": 给用户授权（写入 user-channel）
- "role": 给角色授权（写入 role-channel，注意：角色渠道授权的完整管理接口在 zhao-auth 中，此处仅为底层支持）

---

## 五、渠道体系详解

### 5.1 渠道层级

最大深度：7 级。超过限制返回 400。

层级关系：
```
root (depth=0)
├── core / senior / global / authorized / official / partner / agent  (depth=1, 平级)
└── national → regional → city → county → local → store               (depth=2~7)
```

### 5.2 路径表示

每个渠道有 `path` 字段（物化路径），如 `/1/3/5/`。通过 path 前缀匹配可以快速查询某渠道的所有子孙。

删除或移动渠道时，path 和 depth 会自动重算，事务保证一致性。

### 5.3 渠道状态

- active: 启用
- disabled: 禁用

禁用的渠道子注册会被拒绝。

### 5.4 两套"角色"系统的区别

| 概念 | 存储位置 | 控制范围 |
|------|---------|---------|
| zhao-auth 角色（permission.role） | zhao-auth.permission 表 | 全局功能权限（能看到哪些菜单、能调用哪些 API） |
| channel-member.role | zhao-channel.channel-member 表 | 渠道内身份（owner/admin/member） |

例：一个用户可能同时拥有：
- zhao-auth 角色：`channel-admin`（全局身份：能管理渠道相关功能）
- role-channel 授权：能操作渠道 ID 1、2、5
- channel-member 角色：渠道 1 的 owner

---

## 六、错误码

| HTTP | 场景 |
|------|------|
| 400 | 参数错误 / 邀请码无效 / 渠道层级超限 / 渠道名称重复 / 邮箱已注册 / store 节点不能创建子渠道 |
| 401 | 未认证 / token 无效 |
| 403 | 无权限（has-permission 或 has-channel-scope 拒绝） |
| 404 | 渠道 / 成员 / 邀请码不存在 |
| 503 | 认证服务不可用 |

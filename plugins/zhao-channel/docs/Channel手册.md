# zhao-channel 渠道管理插件手册

## 概述

zhao-channel 是一个基于 Strapi v5 的渠道管理插件，提供**三级渠道层级**、成员管理、权限控制及分销链体系。

**路由前缀**: `/api/zhao-channel`

---

## 目录

- [核心概念](#核心概念)
- [数据模型](#数据模型)
- [功能清单](#功能清单)
- [API 手册](#api-手册)
- [根代理注册](#根代理注册)
- [使用场景](#使用场景)
- [错误码](#错误码)

---

## 核心概念

### 渠道层级

```
root (根)                 depth=0   根渠道，通过 createRoot 创建
├── core                  depth=1   以下 7 个为同级独立分支
├── senior                depth=1
├── global                depth=1
├── authorized            depth=1
├── official              depth=1
├── partner               depth=1
└── agent                 depth=1
    └── national          depth=2   以下为共享链条
         └── regional     depth=3
              └── city    depth=4
                   └── county       depth=5
                        └── local   depth=6
                             └── store (门店)  depth=7  叶子渠道
```

**层级校验规则**:
- root 可以创建 7 个分支（core / senior / global / authorized / official / partner / agent）中的任意一个
- 每个分支下只能创建 national
- 后续为共享线性链：national → regional → city → county → local → store
- store 为叶子节点，不可再创建子渠道
- 深度上限为 7（root 0 ~ store 7）

### 路径机制 (path)

渠道通过 `path` 字段维护树结构，格式为 `/parentId/childId/`：

```
Agent(id=1)      → path="/1/"
Regional(id=2)   → path="/1/2/"
Store(id=3)      → path="/1/2/3/"
```

**优势**: 通过 `path $startsWith` 可一次性查询整棵子树

### 邀请码体系

- **渠道邀请码 (channel.code)**: 用于注册子渠道，8位大写字母数字
- **用户邀请码 (user-invite.inviteCode)**: 用于发展分销下级用户

### 成员角色

| 角色 | 说明 |
|------|------|
| owner | 渠道所有者 |
| admin | 渠道管理员 |
| member | 普通成员 |

---

## 数据模型

### Channel (渠道)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 主键 |
| name | string | 渠道名称（必填，最大100字符） |
| code | string | 渠道编码（唯一，自动生成8位大写） |
| channelTier | enum | root/core/senior/global/authorized/official/partner/agent/national/regional/city/county/local/store |
| parentChannel | relation | 父渠道 |
| status | boolean | 启用状态，默认 true |
| description | text | 描述 |
| path | text | 树路径，如 `/1/3/` |
| depth | integer | 深度，0-7 |

### Channel Member (渠道成员)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 主键 |
| channel | relation | 所属渠道 |
| user | relation | 用户 |
| role | enum | owner/admin/member |
| invitedBy | relation | 邀请人 |
| isCurrent | boolean | 是否当前渠道 |

### User Channel (用户-渠道授权)

| 字段 | 类型 | 说明 |
|------|------|------|
| user | relation | 用户 |
| channel | relation | 授权的渠道 |
| grantedBy | relation | 授权人 |

### Role Channel (角色-渠道授权)

| 字段 | 类型 | 说明 |
|------|------|------|
| role | relation | 角色 |
| channel | relation | 授权的渠道 |
| grantedBy | relation | 授权人 |

### User Invite (用户邀请与分销)

| 字段 | 类型 | 说明 |
|------|------|------|
| user | relation | 用户（一对一） |
| inviteCode | string | 邀请码（唯一，8位大写） |
| invitedBy | relation | 邀请人 |
| inviteChannel | relation | 所属渠道 |
| inviteMethod | enum | invite_code/organic |
| distributionPath | text | 分销链路径 |
| distributionDepth | integer | 分销深度，0-2 |

---

## 功能清单

### 1. 渠道管理

| 功能 | 说明 | 备注 |
|------|------|------|
| 查询渠道列表 | 分页、过滤 | GET /channel |
| 查询单个渠道 | ID 查询 | GET /channel/:id |
| 创建渠道 | 指定父渠道 | POST /channel |
| 创建根代理 | 创建 Agent | 需通过 Service 调用 |
| 更新渠道 | 支持迁移到新父渠道 | PUT /channel/:id |
| 删除渠道 | 级联删除子孙渠道 | DELETE /channel/:id |
| 验证邀请码 | 验证渠道邀请码 | POST /channel/validate |
| 注册子渠道 | 通过邀请码注册 | POST /channel/register |
| 获取渠道网络 | 父渠道+直接子渠道 | GET /channel/network/:id |
| 获取渠道统计 | 成员数、子渠道数 | GET /channel/stats/:id |
| 获取公开信息 | 不含敏感字段 | GET /channel/public/:id |

### 2. 渠道成员管理

| 功能 | 说明 | 备注 |
|------|------|------|
| 查询成员列表 | 按渠道/用户/角色过滤 | GET /channel-members |
| 创建成员 | 添加用户到渠道 | POST /channel-members |
| 邀请成员 | 通过邮箱邀请 | 需通过 Service 调用 |
| 获取我的渠道 | 获取当前渠道 | 需通过 Service 调用 |
| 切换当前渠道 | 设置 isCurrent | 需通过 Service 调用 |
| 移除成员 | 从渠道移除 | 需通过 Service 调用 |
| 更新成员角色 | owner/admin/member | 需通过 Service 调用 |

### 3. 权限控制

| 功能 | 说明 | 备注 |
|------|------|------|
| 授权用户渠道 | 直接授权 | 需通过 Service 调用 |
| 授权角色渠道 | 批量授权 | 需通过 Service 调用 |
| 撤销用户渠道 | 移除授权 | 需通过 Service 调用 |
| 撤销角色渠道 | 移除授权 | 需通过 Service 调用 |
| 获取用户可访问渠道 | 含子孙渠道 | GET /permissions/user/:userId/accessible |
| 批量异步授权 | Bull 队列 | POST /permissions/batch-grant |

### 4. 分销体系

| 功能 | 说明 | 备注 |
|------|------|------|
| 创建用户邀请 | 自动生成邀请码 | 需通过 Service 调用 |
| 获取分销链 | 向上3级用户 | GET /user-invite/my-chain |
| 获取下级用户 | 直接下级 | GET /user-invite/my-downstream |
| 获取分销统计 | 含链、渠道、计数 | GET /user-invite/my-stats |

### 5. 缓存与队列

- **Redis 缓存**: 用户/角色的渠道列表缓存，TTL 1小时
- **Bull 队列**: 批量授权异步任务

---

## API 手册

### 渠道 Channel

#### 查询渠道列表

```
GET /api/zhao-channel/channel
```

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码，默认1 |
| pageSize | integer | 每页数量，默认20 |
| channelTier | string | root/core/senior/global/authorized/official/partner/agent/national/regional/city/county/local/store |
| status | boolean | 启用状态 |

**响应**

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "华东代理",
        "code": "A1B2C3D4",
        "channelTier": "agent",
        "status": true,
        "path": "/1/",
        "depth": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "pageCount": 1
  }
}
```

---

#### 查询单个渠道

```
GET /api/zhao-channel/channel/:id
```

**响应**

```json
{
  "data": {
    "id": 1,
    "attributes": {
      "name": "华东代理",
      "code": "A1B2C3D4",
      "channelTier": "agent",
      "status": true,
      "path": "/1/",
      "depth": 0
    }
  }
}
```

---

#### 创建渠道

```
POST /api/zhao-channel/channel
```

**请求体**

```json
{
  "name": "上海区域",
  "description": "上海区域渠道",
  "channelTier": "regional",
  "parentChannel": 1,
  "status": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 渠道名称 |
| channelTier | string | 否 | 层级，默认store |
| parentChannel | integer | 否 | 父渠道ID，不传创建根渠道 |
| description | string | 否 | 描述 |
| status | boolean | 否 | 状态，默认true |

**响应**

```json
{
  "data": {
    "id": 2,
    "attributes": {
      "name": "上海区域",
      "code": "E5F6G7H8",
      "channelTier": "regional",
      "path": "/1/2/",
      "depth": 1,
      "parentChannelId": { "id": 1, "name": "华东代理" }
    }
  }
}
```

---

#### 更新渠道

```
PUT /api/zhao-channel/channel/:id
```

**请求体**

```json
{
  "name": "新名称",
  "status": false,
  "parentChannel": 3
}
```

**说明**: 修改 `parentChannel` 会自动重新计算所有子孙渠道的 `path` 和 `depth`

---

#### 删除渠道

```
DELETE /api/zhao-channel/channel/:id
```

**响应**

```json
{
  "data": {
    "deletedChannels": 3,
    "deletedMembers": 5,
    "deletedUserChannels": 2,
    "deletedRoleChannels": 1,
    "affectedUsers": 4
  }
}
```

---

#### 注册子渠道（邀请码注册）

```
POST /api/zhao-channel/channel/register
```

**请求体**（基础版 — 仅创建渠道）

```json
{
  "code": "A1B2C3D4",
  "name": "新代理",
  "description": "新代理渠道",
  "channelTier": "agent"
}
```

**请求体**（完整版 — 同步创建登录用户）

```json
{
  "code": "A1B2C3D4",
  "name": "新代理",
  "description": "新代理渠道",
  "channelTier": "agent",
  "email": "admin@example.com",
  "username": "newadmin",
  "password": "SecurePass123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 上级渠道的邀请码 |
| name | string | 是 | 新渠道名称 |
| description | string | 否 | 描述 |
| channelTier | string | 特殊 | 新渠道层级。父渠道为 root 时**必填**（7选1）；非 root 时可自动推断 |
| email | string | 否 | 注册者邮箱（填则同步创建用户） |
| username | string | 否 | 注册者用户名 |
| password | string | 否 | 注册者密码 |

**响应**（基础版）

```json
{
  "id": 3,
  "name": "新代理",
  "code": "X9Y8Z7W6",
  "description": "新代理渠道",
  "channelTier": "agent",
  "path": "/1/2/3/",
  "depth": 1,
  "parentChannelId": 2
}
```

**响应**（完整版 — 含用户信息）

```json
{
  "id": 3,
  "name": "新代理",
  "code": "X9Y8Z7W6",
  "description": "新代理渠道",
  "channelTier": "agent",
  "path": "/1/2/3/",
  "depth": 1,
  "parentChannelId": 2,
  "user": {
    "id": 5,
    "email": "admin@example.com",
    "username": "newadmin"
  }
}
```

---

#### 验证邀请码

```
POST /api/zhao-channel/channel/validate
```

**请求体**

```json
{
  "code": "A1B2C3D4"
}
```

**响应（有效）**

```json
{
  "ok": true,
  "valid": true,
  "channel": {
    "id": 1,
    "name": "华东代理",
    "code": "A1B2C3D4",
    "channelTier": "agent"
  }
}
```

**响应（无效）**

```json
{
  "ok": true,
  "valid": false
}
```

---

#### 获取渠道网络

```
GET /api/zhao-channel/channel/network/:id
```

返回指定渠道的父渠道和直接子渠道。

**响应**

```json
{
  "channel": {
    "id": 2,
    "attributes": { "name": "上海区域", "path": "/1/2/" }
  },
  "children": [
    {
      "id": 3,
      "attributes": { "name": "浦东门店A", "path": "/1/2/3/" }
    }
  ]
}
```

---

#### 获取渠道统计

```
GET /api/zhao-channel/channel/stats/:id
```

**响应**

```json
{
  "stats": {
    "id": 1,
    "name": "华东代理",
    "depth": 0,
    "path": "/1/",
    "memberCount": 10,
    "subChannelCount": 3,
    "totalSubMembers": 25,
    "totalMembers": 35
  }
}
```

---

#### 获取公开渠道信息

```
GET /api/zhao-channel/channel/public/:id
```

返回不包含 code、status 等敏感字段的公开信息。

**响应**

```json
{
  "id": 1,
  "name": "华东代理",
  "description": "华东区域总代理",
  "channelTier": "agent",
  "path": "/1/",
  "depth": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 渠道成员 Channel Member

#### 查询成员列表

```
GET /api/zhao-channel/channel-members
```

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| channel | integer | 渠道ID |
| user | integer | 用户ID |
| role | string | owner/admin/member |

---

#### 创建成员

```
POST /api/zhao-channel/channel-members
```

**请求体**

```json
{
  "channel": 1,
  "user": 5,
  "role": "member",
  "invitedBy": 1
}
```

---

### 渠道权限 Channel Permission

#### 获取用户可访问渠道

```
GET /api/zhao-channel/permissions/user/:userId/accessible
```

返回用户可访问的所有渠道（含直接授权、角色授权、成员渠道的子孙渠道）。

**响应**

```json
[
  { "id": 1, "name": "华东代理" },
  { "id": 2, "name": "上海区域" },
  { "id": 3, "name": "浦东门店A" }
]
```

---

#### 批量授权（异步）

```
POST /api/zhao-channel/permissions/batch-grant
```

**请求体**

```json
{
  "targetId": 5,
  "channelIds": [1, 2, 3]
}
```

**响应**

```json
{
  "jobId": "123",
  "status": "queued",
  "type": "user",
  "targetId": 5,
  "channelCount": 3
}
```

---

### 用户邀请与分销 User Invite

#### 获取分销链

```
GET /api/zhao-channel/user-invite/my-chain?userId=5
```

**响应**

```json
[
  { "id": 1, "username": "root", "email": "root@example.com", "depth": 0 },
  { "id": 3, "username": "middle", "email": "middle@example.com", "depth": 1 },
  { "id": 5, "username": "current", "email": "current@example.com", "depth": 2 }
]
```

---

#### 获取下级用户

```
GET /api/zhao-channel/user-invite/my-downstream?userId=5
```

**响应**

```json
[
  {
    "userId": 6,
    "username": "user6",
    "email": "user6@example.com",
    "inviteCode": "ABCD1234",
    "distributionDepth": 1,
    "boundChannel": { "id": 2, "name": "上海区域" }
  }
]
```

---

#### 获取分销统计

```
GET /api/zhao-channel/user-invite/my-stats?userId=5
```

**响应**

```json
{
  "userId": 5,
  "inviteCode": "ABCD1234",
  "distributionDepth": 2,
  "distributionChain": [
    { "id": 1, "username": "root", "depth": 0 },
    { "id": 3, "username": "middle", "depth": 1 },
    { "id": 5, "username": "current", "depth": 2 }
  ],
  "boundChannel": { "id": 2, "name": "上海区域" },
  "stats": {
    "directCount": 3,
    "totalDownstreamCount": 8,
    "maxDepth": 2
  }
}
```

---

## 根代理注册

### 方式一：通过 Admin 管理面板（推荐）

1. 访问 Strapi Admin
2. 进入 **Channel** 管理页面
3. 点击 **创建 Channel**
4. 填写名称和描述
5. 系统自动设置 `channelTier=root`，生成邀请码

### 方式二：通过 Service 调用

在 Strapi 的 bootstrap 或其他服务中调用：

```typescript
const channelService = strapi.plugin("zhao-channel").service("channel");

// 创建根渠道
const rootAgent = await channelService.createRoot({
  name: "华东总代理",
  description: "华东区域总代理"
});

console.log("根渠道创建成功:", rootAgent);
// 返回: { id, name, code, channelTier: "root", path: "/1/", depth: 0 }
```

### 方式三：通过 API（需扩展路由）

当前 Content API 未暴露 `createRoot` 方法，可手动添加：

```typescript
// server/src/routes/content-api/index.ts 添加
{
  method: "POST",
  path: "/channel/root",
  handler: "channel.createRoot",
  config: { auth: false }
}
```

然后调用：

```
POST /api/zhao-channel/channel/root
```

```json
{
  "name": "华东总代理",
  "description": "华东区域总代理"
}
```

### 根渠道创建后的操作流程

1. **创建根渠道** → 获取 root.code（邀请码）
2. **用邀请码注册子渠道** → POST /channel/register（需指定分支层级，如 agent）
3. **给用户授权可访问渠道** → 调用 permission service
4. **用户邀请下级用户** → 创建 user-invite

---

## 使用场景

### 场景一：建立渠道体系

```
1. 创建根代理 (Agent)
   └─ 创建区域渠道 (Regional) via 邀请码
       └─ 创建门店渠道 (Store) via 邀请码
```

### 场景二：成员管理

```
1. 渠道 owner/admin 邀请成员（邮箱）
2. 系统自动创建用户（如未注册）
3. 成员被添加到 channel-member
4. 成员可切换当前渠道 (setCurrentChannel)
```

### 场景三：权限控制

```
用户可访问渠道 = 
  (直接授权的渠道) +
  (所属角色授权的渠道) +
  (当前成员渠道) +
  以上所有渠道的子孙渠道
```

### 场景四：分销体系

```
1. 用户注册时自动生成 inviteCode
2. 用户分享邀请码发展下级
3. 下级注册后自动绑定到邀请人的分销链
4. 支持查询 3 级分销链
```

---

## 错误码

| HTTP | 错误码 | 说明 |
|------|--------|------|
| 404 | 000201 | 渠道不存在 |
| 400 | 030101 | 邀请码不存在或已过期 |
| 400 | 030104 | 渠道已被禁用 |
| 400 | 030105 | 渠道层级深度超限（最大 depth=7） |
| 400 | 030106 | 注册者邮箱、用户名和密码不能为空 |
| 400 | 030107 | 该邮箱已被注册 |
| 400 | 030108 | 该用户名已被注册 |
| 400 | 030109 | root 渠道下注册必须指定 channelTier |
| 400 | 030110 | 不允许在当前层级下注册指定层级 |

---

## 注意事项

1. **所有 Content API 当前配置为 `auth: false`**，生产环境需自行添加鉴权中间件
2. **删除渠道为级联操作**，会删除所有子孙渠道及关联数据
3. **path 字段由系统自动维护**，手动修改可能导致树结构错误
4. **Redis 不可用时**，权限查询降级为数据库直接查询，不影响核心功能
5. **Bull 队列不可用时**，批量授权会同步执行

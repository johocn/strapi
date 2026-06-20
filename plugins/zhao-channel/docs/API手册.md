# zhao-channel API 手册

## 概述

本 API 手册涵盖 zhao-channel 插件对外暴露的所有 Content API 端点。所有端点前缀为 `/api/zhao-channel`（Strapi 默认插件路由前缀）。

***

## 目录

- [渠道 Channel](#渠道-channel)
- [渠道成员 Channel Member](#渠道成员-channel-member)
- [渠道权限 Channel Permission](#渠道权限-channel-permission)
- [用户邀请与分销 User Invite](#用户邀请与分销-user-invite)
- [管理面板 API (Admin API)](#管理面板-api-admin-api)

***

## 数据模型

### Channel（渠道）

| 字段            | 类型                         | 说明                  |
| ------------- | -------------------------- | ------------------- |
| id            | integer                    | 主键                  |
| name          | string                     | 渠道名称（必填，最大 100 字符）  |
| code          | string                     | 渠道编码（唯一，自动生成 8 位大写） |
| channelTier   | enum: root/core/senior/global/authorized/official/partner/agent/national/regional/city/county/local/store | 渠道层级                |
| parentChannel | relation                   | 父渠道                 |
| status        | boolean                    | 启用状态，默认 true        |
| description   | text                       | 描述                  |
| path          | text                       | 树路径，如 `/1/3/`       |
| depth         | integer                    | 深度，0-7              |

### Channel Member（渠道成员）

| 字段        | 类型                       | 说明     |
| --------- | ------------------------ | ------ |
| id        | integer                  | 主键     |
| channel   | relation                 | 所属渠道   |
| user      | relation                 | 用户     |
| role      | enum: owner/admin/member | 成员角色   |
| invitedBy | relation                 | 邀请人    |
| isCurrent | boolean                  | 是否当前渠道 |

### User Channel（用户-渠道授权）

| 字段        | 类型       | 说明    |
| --------- | -------- | ----- |
| user      | relation | 用户    |
| channel   | relation | 授权的渠道 |
| grantedBy | relation | 授权人   |
| grantedAt | datetime | 授权时间  |

### Role Channel（角色-渠道授权）

| 字段        | 类型       | 说明    |
| --------- | -------- | ----- |
| role      | relation | 角色    |
| channel   | relation | 授权的渠道 |
| grantedBy | relation | 授权人   |
| grantedAt | datetime | 授权时间  |

### User Invite（用户邀请与分销）

| 字段                | 类型                         | 说明            |
| ----------------- | -------------------------- | ------------- |
| user              | relation                   | 用户（一对一，唯一）    |
| inviteCode        | string                     | 邀请码（唯一，8 位大写） |
| invitedBy         | relation                   | 邀请人           |
| inviteChannel     | relation                   | 所属渠道          |
| inviteMethod      | enum: invite\_code/organic | 注册方式          |
| distributionPath  | text                       | 分销链路径         |
| distributionDepth | integer                    | 分销深度，0-2      |
| used              | boolean                    | 是否已使用         |
| expiresAt         | datetime                   | 过期时间          |

***

## 渠道 Channel

### 查询渠道列表

获取所有渠道列表，支持分页和过滤。

```
GET /api/zhao-channel/channel
```

**参数（Query）**

| 参数          | 类型      | 必填 | 说明                         |
| ----------- | ------- | -- | -------------------------- |
| page        | integer | 否  | 页码，默认 1                    |
| pageSize    | integer | 否  | 每页数量，默认 20                 |
| channelTier | string  | 否  | 按层级过滤：root/core/senior/global/authorized/official/partner/agent/national/regional/city/county/local/store |
| status      | boolean | 否  | 按状态过滤                      |
| name        | string  | 否  | 按名称模糊搜索（需 Strapi 过滤语法）     |

**响应示例**

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "总代理",
        "code": "A1B2C3D4",
        "description": "一级代理",
        "channelTier": "agent",
        "status": true,
        "path": "/1/",
        "depth": 0,
        "parentChannelId": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
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

***

### 查询单个渠道

```
GET /api/zhao-channel/channel/:id
```

**参数**

| 参数 | 类型      | 说明    |
| -- | ------- | ----- |
| id | integer | 渠道 ID |

**响应示例**

```json
{
  "data": {
    "id": 1,
    "attributes": {
      "name": "总代理",
      "code": "A1B2C3D4",
      "description": "一级代理",
      "channelTier": "agent",
      "status": true,
      "path": "/1/",
      "depth": 0,
      "parentChannelId": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

***

### 创建渠道

在指定父渠道下创建子渠道。

```
POST /api/zhao-channel/channel
```

**请求体**

```json
{
  "name": "上海区域",
  "description": "上海区域代理",
  "channelTier": "regional",
  "parentChannel": 1,
  "code": "CUSTOMCODE",
  "status": true
}
```

| 字段            | 类型      | 必填 | 说明                        |
| ------------- | ------- | -- | ------------------------- |
| name          | string  | 是  | 渠道名称                      |
| description   | string  | 否  | 描述                        |
| channelTier   | string  | 否  | 渠道层级，默认根据父级推断             |
| parentChannel | integer | 否  | 父渠道 ID。不传则创建根渠道（agent 级别） |
| code          | string  | 否  | 自定义编码，为空时自动生成             |
| status        | boolean | 否  | 状态，默认 true                |

**响应示例**

```json
{
  "data": {
    "id": 2,
    "attributes": {
      "name": "上海区域",
      "code": "CUSTOMCODE",
      "description": "上海区域代理",
      "channelTier": "regional",
      "status": true,
      "path": "/1/2/",
      "depth": 1,
      "parentChannelId": {
        "id": 1,
        "name": "总代理"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

***

### 更新渠道

```
PUT /api/zhao-channel/channel/:id
```

**请求体**

```json
{
  "name": "新名称",
  "description": "新描述",
  "status": false,
  "parentChannel": 3
}
```

**说明**

- 修改 `parentChannel` 时会自动重新计算所有子孙渠道的 `path` 和 `depth`

**响应**：返回更新后的渠道对象

***

### 删除渠道

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

**说明**

- 级联删除所有子孙渠道
- 自动删除关联的 channel-member、user-channel、role-channel 记录
- 返回 affectedUsers 表示受影响的用户数量（用于缓存清理）

***

### 注册渠道（通过邀请码）

通过上级渠道的邀请码注册一个新的子渠道，可选择同步创建登录用户。

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

| 字段          | 类型     | 必填 | 说明             |
| ----------- | ------ | -- | -------------- |
| code        | string | 是  | 上级渠道的邀请码       |
| name        | string | 是  | 新渠道名称          |
| description | string | 否  | 描述             |
| channelTier | string | 特殊 | 新渠道层级。父渠道为 root 时**必填**（7选1）；非 root 时可选，自动推断下一级 |
| email       | string | 否  | 注册者邮箱（填则同步创建用户） |
| username    | string | 否  | 注册者用户名          |
| password    | string | 否  | 注册者密码           |

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

***

### 验证邀请码

验证某个邀请码是否有效。

```
POST /api/zhao-channel/channel/validate
```

**请求体**

```json
{
  "code": "A1B2C3D4"
}
```

**响应**

```json
{
  "ok": true,
  "valid": true,
  "channel": {
    "id": 1,
    "name": "总代理",
    "code": "A1B2C3D4",
    "channelTier": "agent",
    "path": "/1/",
    "depth": 0
  }
}
```

***

### 获取渠道网络

获取指定渠道的父渠道和直接子渠道。

```
GET /api/zhao-channel/channel/network/:id
```

**响应**

```json
{
  "channel": {
    "id": 2,
    "attributes": {
      "name": "上海区域",
      "code": "CUSTOMCODE",
      "channelTier": "regional",
      "path": "/1/2/"
    }
  },
  "children": [
    {
      "id": 3,
      "attributes": {
        "name": "门店A",
        "code": "X9Y8Z7W6",
        "channelTier": "store",
        "path": "/1/2/3/"
      }
    }
  ]
}
```

***

### 获取渠道统计

获取指定渠道的成员和子渠道统计数据。

```
GET /api/zhao-channel/channel/stats/:id
```

**响应**

```json
{
  "stats": {
    "id": 1,
    "name": "总代理",
    "depth": 0,
    "path": "/1/",
    "memberCount": 10,
    "subChannelCount": 3,
    "totalSubMembers": 25,
    "totalMembers": 35
  }
}
```

| 字段              | 说明                                  |
| --------------- | ----------------------------------- |
| memberCount     | 本渠道直接成员数                            |
| subChannelCount | 子渠道数量                               |
| totalSubMembers | 所有子孙渠道成员数                           |
| totalMembers    | 成员总数（memberCount + totalSubMembers） |

***

### 获取公开渠道信息

获取渠道的公开信息（不包含敏感字段如 code、status）。

```
GET /api/zhao-channel/channel/public/:id
```

**响应**

```json
{
  "id": 1,
  "name": "总代理",
  "description": "一级代理",
  "channelTier": "agent",
  "path": "/1/",
  "depth": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

***

## 渠道成员 Channel Member

### 查询渠道成员列表

```
GET /api/zhao-channel/channel-members
```

**参数（Query）**

| 参数      | 类型      | 必填 | 说明                       |
| ------- | ------- | -- | ------------------------ |
| channel | integer | 否  | 按渠道 ID 过滤                |
| user    | integer | 否  | 按用户 ID 过滤                |
| role    | string  | 否  | 按角色过滤：owner/admin/member |

***

### 创建渠道成员

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

***

## 渠道权限 Channel Permission

### 获取用户可访问的渠道

```
GET /api/zhao-channel/permissions/user/:userId/accessible
```

**参数**

| 参数     | 类型      | 说明    |
| ------ | ------- | ----- |
| userId | integer | 用户 ID |

**响应**

```json
[
  {
    "id": 1,
    "name": "总代理"
  },
  {
    "id": 2,
    "name": "上海区域"
  }
]
```

**说明**

返回的渠道列表包含：

1. 用户直接授权的渠道（user-channel）
2. 用户角色授权的渠道（role-channel）
3. 用户当前成员渠道（channel-member）
4. 以上所有渠道的子孙渠道

***

### 批量授权

为用户或角色批量授权渠道访问权限。

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

| 字段         | 类型      | 必填 | 说明                       |
| ---------- | ------- | -- | ------------------------ |
| targetId   | integer | 是  | 用户 ID 或角色 ID（由鉴权中间件识别类型） |
| channelIds | array   | 是  | 渠道 ID 数组                 |

**响应**

```json
{
  "granted": 2,
  "channelIds": [1, 2, 3]
}
```

***

## 用户邀请与分销 User Invite

### 获取我的分销链

获取当前用户的分销链（从根级到自身，最多 3 级）。

```
GET /api/zhao-channel/user-invite/my-chain?userId=5
```

**参数（Query）**

| 参数     | 类型      | 必填 | 说明    |
| ------ | ------- | -- | ----- |
| userId | integer | 是  | 用户 ID |

**响应**

```json
[
  {
    "id": 1,
    "username": "root",
    "email": "root@example.com",
    "depth": 0
  },
  {
    "id": 3,
    "username": "middle",
    "email": "middle@example.com",
    "depth": 1
  },
  {
    "id": 5,
    "username": "current",
    "email": "current@example.com",
    "depth": 2
  }
]
```

***

### 获取我的下级用户

获取当前用户的直接下级分销用户列表。

```
GET /api/zhao-channel/user-invite/my-downstream?userId=5
```

**参数（Query）**

| 参数     | 类型      | 必填 | 说明    |
| ------ | ------- | -- | ----- |
| userId | integer | 是  | 用户 ID |

**响应**

```json
[
  {
    "userId": 6,
    "username": "user6",
    "email": "user6@example.com",
    "inviteCode": "ABCD1234",
    "inviteMethod": "invite_code",
    "distributionDepth": 1,
    "boundChannel": {
      "id": 2,
      "name": "上海区域"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

***

### 获取我的分销统计

获取当前用户的分销统计数据。

```
GET /api/zhao-channel/user-invite/my-stats?userId=5
```

**参数（Query）**

| 参数     | 类型      | 必填 | 说明    |
| ------ | ------- | -- | ----- |
| userId | integer | 是  | 用户 ID |

**响应**

```json
{
  "userId": 5,
  "inviteCode": "ABCD1234",
  "inviteMethod": "invite_code",
  "distributionDepth": 2,
  "distributionChain": [
    { "id": 1, "username": "root", "email": "root@example.com", "depth": 0 },
    { "id": 3, "username": "middle", "email": "middle@example.com", "depth": 1 },
    { "id": 5, "username": "current", "email": "current@example.com", "depth": 2 }
  ],
  "boundChannel": {
    "id": 2,
    "name": "上海区域"
  },
  "stats": {
    "directCount": 3,
    "totalDownstreamCount": 8,
    "maxDepth": 2
  }
}
```

***

## 管理面板 API (Admin API)

管理面板 API 由 Strapi v5 的 admin 认证保护，访问路径前缀为 `/admin/zhao-channel`。所有请求需要携带有效的 Strapi admin JWT。

***

### 查询渠道列表（Admin）

获取渠道列表，支持分页和过滤。

```
GET /admin/zhao-channel/channels
```

**参数（Query）**

| 参数          | 类型      | 必填 | 说明                         |
| ----------- | ------- | -- | -------------------------- |
| page        | integer | 否  | 页码，默认 1                    |
| pageSize    | integer | 否  | 每页数量，默认 20                 |
| depth       | integer | 否  | 按深度过滤。`depth=0` 仅返回根渠道      |
| channelTier | string  | 否  | 按层级过滤                      |
| status      | boolean | 否  | 按状态过滤                      |

**响应示例**

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "总代理",
        "code": "A1B2C3D4",
        "description": "一级代理",
        "channelTier": "root",
        "status": true,
        "path": "/1/",
        "depth": 0,
        "parentChannelId": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
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

***

### 查询单个渠道（Admin）

```
GET /admin/zhao-channel/channels/:id
```

**参数**

| 参数 | 类型      | 说明    |
| -- | ------- | ----- |
| id | integer | 渠道 ID |

**响应**：返回与 Content API 格式一致的渠道对象。

***

### 创建根渠道（Admin）

创建一个 root 级别的根渠道（`channelTier="root"`, `depth=0`）。

```
POST /admin/zhao-channel/channel/create-root
```

**请求体**

```json
{
  "name": "总公司渠道",
  "description": "公司总部根渠道"
}
```

| 字段          | 类型     | 必填 | 说明    |
| ----------- | ------ | -- | ----- |
| name        | string | 是  | 渠道名称  |
| description | string | 否  | 渠道描述  |

**响应**

```json
{
  "id": 1,
  "name": "总公司渠道",
  "code": "A1B2C3D4",
  "description": "公司总部根渠道",
  "channelTier": "root",
  "path": "/1/",
  "depth": 0
}
```

***

### 创建子渠道（Admin）

在指定父渠道下创建子渠道。

```
POST /admin/zhao-channel/channels
```

**请求体**

```json
{
  "name": "华东区域",
  "description": "华东区域代理",
  "channelTier": "regional",
  "parentChannel": 1,
  "status": true
}
```

| 字段            | 类型      | 必填 | 说明                        |
| ------------- | ------- | -- | ------------------------- |
| name          | string  | 是  | 渠道名称                      |
| description   | string  | 否  | 描述                        |
| channelTier   | string  | 否  | 渠道层级。不传则自动推断下一级；root 下必须指定 |
| parentChannel | integer | 否  | 父渠道 ID。不传则创建根渠道（root 级别）   |
| status        | boolean | 否  | 状态，默认 true                |

**响应**

```json
{
  "data": {
    "id": 2,
    "attributes": {
      "name": "华东区域",
      "code": "E5F6G7H8",
      "description": "华东区域代理",
      "channelTier": "regional",
      "status": true,
      "path": "/1/2/",
      "depth": 1,
      "parentChannelId": {
        "id": 1,
        "name": "总公司渠道"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

***

### 获取子渠道列表（Admin）

获取指定渠道的直接子渠道列表。

```
GET /admin/zhao-channel/channels/:id/children
```

**参数**

| 参数 | 类型      | 说明    |
| -- | ------- | ----- |
| id | integer | 父渠道 ID |

**响应**

```json
{
  "data": [
    {
      "id": 2,
      "attributes": {
        "name": "华东区域",
        "code": "E5F6G7H8",
        "channelTier": "regional",
        "status": true,
        "path": "/1/2/",
        "depth": 1,
        "parentChannelId": {
          "id": 1,
          "name": "总公司渠道"
        }
      }
    }
  ]
}
```

***

### 获取层级树（Admin）

获取指定渠道的完整子树（递归嵌套结构）。

```
GET /admin/zhao-channel/channels/:id/hierarchy
```

**参数**

| 参数 | 类型      | 说明    |
| -- | ------- | ----- |
| id | integer | 渠道 ID |

**响应**

```json
{
  "hierarchy": {
    "id": 1,
    "name": "总公司渠道",
    "code": "A1B2C3D4",
    "channelTier": "root",
    "path": "/1/",
    "depth": 0,
    "children": [
      {
        "id": 2,
        "name": "华东区域",
        "code": "E5F6G7H8",
        "channelTier": "regional",
        "path": "/1/2/",
        "depth": 1,
        "children": [
          {
            "id": 3,
            "name": "上海门店",
            "code": "X9Y8Z7W6",
            "channelTier": "store",
            "path": "/1/2/3/",
            "depth": 2,
            "children": []
          }
        ]
      }
    ]
  }
}
```

***

### 更新渠道（Admin）

```
PUT /admin/zhao-channel/channels/:id
```

**请求体**

```json
{
  "name": "新名称",
  "description": "新描述",
  "status": false,
  "parentChannel": 3
}
```

**说明**

- 修改 `parentChannel` 时会自动重新计算所有子孙渠道的 `path` 和 `depth`
- 响应格式与 Content API 一致：`{ data: { id, attributes: {...} } }`

***

### 删除渠道（Admin）

级联删除指定渠道及其所有子孙渠道。

```
DELETE /admin/zhao-channel/channels/:id
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

***

## 错误响应格式

当发生错误时，API 返回以下格式：

```json
{
  "error": "错误描述信息",
  "code": "030101"
}
```

常见错误码：

| HTTP 状态码 | 错误码    | 说明               |
| -------- | ------ | ---------------- |
| 400      | -      | 请求参数错误           |
| 404      | 000201 | 渠道不存在            |
| 400      | 030101 | 邀请码不存在或已过期       |
| 400      | 030104 | 渠道已被禁用           |
| 400      | 030105 | 渠道层级深度超限（最大 7 级） |
| 400      | 030106 | 注册者邮箱、用户名和密码不能为空 |
| 400      | 030107 | 该邮箱已被注册           |
| 400      | 030108 | 该用户名已被注册          |
| 400      | 030109 | root 渠道下注册必须指定 channelTier |
| 400      | 030110 | 不允许在当前层级下注册指定层级 |

***

## 注意事项

1. **Content API**（`/api/zhao-channel/`）—— 当前配置为 `auth: false`，面向公开客户端
2. **Admin API**（`/admin/zhao-channel/`）—— 需 Strapi admin JWT 认证，面向管理后台
3. 所有列表接口支持分页参数 `page` 和 `pageSize`，默认每页 20 条
4. 渠道路径 `path` 格式为 `/parentId/childId/`，基于此可实现高效的树查询
5. 删除渠道为级联操作，会自动清理关联数据并刷新缓存


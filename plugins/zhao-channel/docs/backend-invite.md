# 邀请码与分销系统

Base URL: `http://localhost:1337/api/zhao-channel`

---

## 邀请码生成

- 用户创建时自动生成唯一邀请码（通过 `afterCreate` 钩子在 `bootstrap` 中触发）
- 码格式：8 位大写字母数字组合（如 `A1B2C3D4`）
- 生成方式：`Math.random().toString(36).substring(2, 10).toUpperCase()`
- 唯一性保障：碰撞时最多重试 5 次，仍碰撞则扩展至 10 位字符
- 渠道（Channel）同样拥有 `code` 字段（相同格式），用于渠道注册

---

## 邀请码验证流程

1. 用户提交邀请码
2. 系统通过 `code` 字段查找渠道
3. 渠道不存在或已禁用 → `{ ok: true, valid: false }`
4. 验证通过 → 返回渠道信息（id, name, code, channelTier, path, depth）

---

## 注册流程（邀请码注册）

1. 用户提交邀请码 + 可选用户信息（email, username, password）
2. 系统通过 code 查找父渠道
3. 校验：渠道存在、未禁用、非叶子层级
4. 自动推断子层级（root 层级需显式指定 channelTier）
5. 创建新渠道并自动生成 code
6. 若提供了 email + username + password：
   - a. 校验 email / username 唯一性
   - b. 创建用户（根据层级分配角色）
   - c. 创建渠道成员（高层级为 admin，其余为 member）
   - d. 更新 user-invite 记录的分销信息
7. 公开注册时同时返回 JWT token

### 高层级自动角色分配

| 层级 | 自动分配角色 |
|------|-------------|
| core | channel-admin |
| senior | channel-admin |
| global | channel-admin |
| authorized | channel-admin |
| official | channel-admin |
| partner | channel-admin |
| 其他层级 | user |

---

## 分销链机制

### 核心字段

| 字段 | 说明 |
|------|------|
| `distributionPath` | 物化路径，追踪分销链（如 `/3/7/15/`） |
| `distributionDepth` | 分销链中的深度（0-2，最大值 2） |
| `MAX_DISTRIBUTION_DEPTH` | 常量，值为 2，即最多 3 级（0, 1, 2） |

### 规则

- 用户 A 邀请用户 B 时：
  - B 的 `distributionPath` = A 的 `distributionPath` + B 的 userId
  - B 的 `distributionDepth` = A 的 `distributionDepth` + 1
- 当深度超过 2（`MAX_DISTRIBUTION_DEPTH`）时：
  - 新链从新用户作为根节点重新开始
  - `distributionPath` = `/{newUserId}/`
  - `distributionDepth` = 0
  - 邀请人仍记录在 `invitedBy` 字段中

### 分销链示例

```
User 1 (depth=0, path=/1/)
  └── User 3 (depth=1, path=/1/3/)
       └── User 7 (depth=2, path=/1/3/7/)
            └── User 15 (depth=0, path=/15/) ← 链重置，invitedBy=7
```

### 路径工具函数

| 函数 | 说明 |
|------|------|
| `buildPath(parentPath, childId)` | 将 childId 追加到父路径 → `/1/3/7/` |
| `parsePathIds(path)` | 从路径中提取 ID 列表 → `[1, 3, 7]` |

路径前缀匹配用于查询所有下游用户。

---

## User-Invite 内容类型 Schema

| 字段 | 类型 | 说明 |
|------|------|------|
| user | oneToOne → user | 关联用户 |
| inviteCode | string (unique, max 16) | 邀请码 |
| invitedBy | manyToOne → user | 邀请人 |
| inviteChannel | manyToOne → channel | 邀请渠道 |
| inviteMethod | enum [invite_code, organic] | 邀请方式 |
| distributionPath | text | 分销路径 |
| distributionDepth | integer (0-2) | 分销深度 |

---

## Content-API 路由（邀请/分销相关，共 5 条）

### 用户路由（3 条）

#### GET /v1/my/invite/chain

获取我的分销链（向上，从自身到根节点）

**查询参数**（userIdQuerySchema）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | positive integer | 是 | 从查询字符串强制转换 |

**响应**：按深度升序排列（根节点在前，自身在末尾）

```json
[
  { "id": 1, "username": "root_user", "email": "root@example.com", "depth": 0 },
  { "id": 3, "username": "mid_user", "email": "mid@example.com", "depth": 1 },
  { "id": 7, "username": "me", "email": "me@example.com", "depth": 2 }
]
```

无分销路径时返回 `[]`

---

#### GET /v1/my/invite/downstream

获取我的直接下级用户

**查询参数**（userIdQuerySchema）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | positive integer | 是 | 从查询字符串强制转换 |

**响应**：

```json
[
  {
    "userId": 15,
    "username": "downstream1",
    "email": "ds1@example.com",
    "inviteCode": "X1Y2Z3W4",
    "inviteMethod": "invite_code",
    "distributionDepth": 0,
    "boundChannel": { "id": 5, "name": "子渠道A" },
    "createdAt": "2026-03-15T10:00:00Z"
  }
]
```

---

#### GET /v1/my/invite/stats

获取我的分销统计

**查询参数**（userIdQuerySchema）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | positive integer | 是 | 从查询字符串强制转换 |

**响应**：

```json
{
  "userId": 7,
  "inviteCode": "M7N8O9P0",
  "inviteMethod": "invite_code",
  "distributionDepth": 2,
  "distributionChain": [
    { "id": 1, "username": "root_user", "email": "root@example.com", "depth": 0 },
    { "id": 3, "username": "mid_user", "email": "mid@example.com", "depth": 1 },
    { "id": 7, "username": "me", "email": "me@example.com", "depth": 2 }
  ],
  "boundChannel": { "id": 5, "name": "华东大区" },
  "stats": {
    "directCount": 3,
    "totalDownstreamCount": 12,
    "maxDepth": 2
  }
}
```

无邀请记录时返回 `null`

---

### 管理路由（邀请管理，属于 admin 路由）

详见 backend-admin-api.md，通过 Strapi Admin 路由访问：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /user-invites | 列出所有邀请记录 |
| GET | /user-invites/:id | 获取邀请详情 |
| POST | /user-invites | 创建邀请记录 |
| POST | /user-invites/use | 使用邀请码 |
| PUT | /user-invites/:id | 更新邀请记录 |
| DELETE | /user-invites/:id | 删除邀请记录 |

#### POST /user-invites/use（管理端）

**请求体**（useInviteSchema）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string (min 1) | 是 | 邀请码 |

使用邀请码，处理邀请流程。

---

## 渠道分销统计（Service 层）

渠道服务提供 `getChannelDistributionStats(id)` 方法，委托给 user-invite 服务：

```json
{
  "stats": {
    "id": 1,
    "name": "华东大区",
    "code": "A1B2C3D4",
    "depth": 2,
    "channelTier": "regional",
    "path": "/1/3/5/",
    "directCustomerCount": 15,
    "subChannelCustomerCount": 42,
    "totalCustomerCount": 57
  }
}
```

---

## 完整流程图

```
邀请码验证流程:
  用户输入邀请码 → POST /v1/channel/validate/public
  → 系统查找渠道(code) → 返回渠道信息或 valid:false

公开注册流程:
  用户提交邀请码+用户信息 → POST /v1/channel/register/public
  → 验证邀请码 → 创建子渠道 → 创建用户 → 创建成员 → 更新分销链 → 返回渠道+用户+JWT

邀请成员流程(管理员):
  管理员提交邮箱 → POST /v1/admin/channel-members (invite模式)
  → 查找/创建用户 → 创建成员 → 创建邀请码记录 → 返回邀请结果

分销链查询流程:
  用户查询 → GET /v1/my/invite/chain
  → 解析 distributionPath → 查询链上用户 → 按深度排序返回

下级查询流程:
  用户查询 → GET /v1/my/invite/downstream
  → 查询 invitedBy=当前用户 → 返回直接下级列表

分销统计流程:
  用户查询 → GET /v1/my/invite/stats
  → 获取链+直接下级+全部下级 → 汇总统计返回
```

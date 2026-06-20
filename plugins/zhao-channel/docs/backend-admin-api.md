# zhao-channel 后台管理接口

基础 URL: `http://localhost:1337/api/zhao-channel`

---

## 路由概览

| 层级 | URL 模式 | 认证策略 | 说明 |
|------|---------|---------|------|
| 公开 | `/v1/...` | 无 | 公开渠道查询、邀请码验证、注册 |
| 用户 | `/v1/my/...` | is-authenticated | 当前用户的渠道信息、邀请码、分销链 |
| 成员 | `/v1/channel/...` | is-authenticated + has-channel-access | 渠道成员操作 |
| 管理员 | `/v1/admin/...` | is-authenticated + has-permission + has-channel-scope | 渠道管理（权限控制 + 渠道范围过滤） |

---

## 权限检查策略

### 策略执行顺序（admin 路由）

```
请求进入
  │
  ├─ 1. is-authenticated
  │     解析 JWT → ctx.state.user
  │
  ├─ 2. has-permission（zhao-auth 提供）
  │     读取用户的 roles → 查询每个角色的 permissions 数组
  │     判断目标 action（如 channel.create）是否命中
  │
  └─ 3. has-channel-scope（zhao-auth 提供）
        admin：无限制（all=true）
        其他角色：聚合 zhao-auth.role-channel + zhao-channel.user-channel
        结果写入 ctx.state.allowedChannelIds
```

### 可用权限列表（zhao-channel 定义的权限 key）

| 权限 key | 说明 |
|----------|------|
| channel.read | 查看渠道 |
| channel.create | 创建渠道 |
| channel.update | 编辑渠道 |
| channel.delete | 删除渠道 |
| channel-member.add | 添加渠道成员 |
| channel-member.remove | 移除渠道成员 |
| channel-member.read | 查看渠道成员 |
| channel-permission.set | 设置渠道权限（给用户/角色授权） |
| user-invite.send | 发送邀请码 |
| user-invite.validate | 验证邀请码 |

---

## 公开路由

| Method | Path | 说明 |
|--------|------|------|
| GET | `/v1/channel/public/:id` | 获取渠道公开信息 |
| POST | `/v1/channel/validate/public` | 验证邀请码有效性 |
| POST | `/v1/channel/register/public` | 通过邀请码注册（创建用户 + 渠道 + 成员记录） |

### POST /v1/channel/register/public

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
  "code": "自动生成的渠道编码",
  "channelTier": "city",
  "path": "/1/5/10/",
  "depth": 3,
  "parentChannelId": 5,
  "user": { "id": 8, "email": "...", "username": "..." },
  "token": "JWT..."
}
```

---

## 用户路由（需登录）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/v1/my/channels` | 我所属的渠道列表 |
| POST | `/v1/my/channel/register` | 已登录用户通过邀请码注册子渠道 |
| POST | `/v1/my/channel/validate` | 已登录用户验证邀请码 |
| GET | `/v1/my/channels/accessible` | 我可访问的所有渠道（聚合 user-channel + role-channel + channel-member） |
| GET | `/v1/my/invite/chain` | 我的分销链（向上追溯） |
| GET | `/v1/my/invite/downstream` | 我的直接下级列表 |
| GET | `/v1/my/invite/stats` | 我的分销统计 |

---

## 管理员路由（需权限 + 渠道范围）

### 渠道管理

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/channels` | channel.read | 渠道列表（分页，受 channel-scope 过滤） |
| GET | `/v1/admin/channels/tier-tree/:parentTier` | channel.read | 层级子树 |
| GET | `/v1/admin/channels/:id/children` | channel.read | 某渠道的直属子渠道 |
| GET | `/v1/admin/channels/:id/hierarchy` | channel.read | 某渠道的完整层级树 |
| GET | `/v1/admin/channels/:id` | channel.read | 单个渠道详情 |
| POST | `/v1/admin/channels` | channel.create | 创建渠道 |
| PUT | `/v1/admin/channels/:id` | channel.update | 更新渠道（含 path/depth 自动重算） |
| DELETE | `/v1/admin/channels/:id` | channel.delete | 删除渠道（级联删除子孙 + 成员 + user-channel + role-channel） |
| POST | `/v1/admin/channel` | channel.create | 创建子渠道（别名路由） |
| PUT | `/v1/admin/channel/:id` | channel.update | 更新子渠道（别名路由） |

### 渠道成员管理

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/channel-members` | channel-member.read | 成员列表（分页，按渠道过滤） |
| GET | `/v1/admin/channel-members/:id` | channel-member.read | 单个成员 |
| POST | `/v1/admin/channel-members` | channel-member.add | 添加成员（支持邀请模式：创建用户 + 成员记录） |
| PUT | `/v1/admin/channel-members/:id` | channel-member.add | 更新成员角色 |
| DELETE | `/v1/admin/channel-members/:id` | channel-member.remove | 移除成员 |

### 渠道权限管理

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| POST | `/v1/admin/channel-permissions/check` | channel-permission.set | 检查用户是否有某渠道访问权限 |
| GET | `/v1/admin/channel-permissions/user/:userId` | channel-permission.set | 获取用户被授权的渠道列表（从 user-channel 查询） |
| POST | `/v1/admin/channel-permissions/batch-grant` | channel-permission.set | 批量授权（支持 type=user 或 type=role） |

注意：角色级渠道授权（role-channel）的管理接口在 `zhao-auth` 中。

### 用户邀请管理

| Method | Path | Permission | 说明 |
|--------|------|------------|------|
| GET | `/v1/admin/user-invites` | user-invite.validate | 邀请码列表 |
| GET | `/v1/admin/user-invites/:id` | user-invite.validate | 单条邀请码 |
| POST | `/v1/admin/user-invites` | user-invite.send | 创建邀请码 |
| POST | `/v1/admin/user-invites/use` | user-invite.send | 使用邀请码 |
| PUT | `/v1/admin/user-invites/:id` | user-invite.send | 更新邀请码 |
| DELETE | `/v1/admin/user-invites/:id` | user-invite.send | 删除邀请码 |
| POST | `/v1/admin/user-invites/sync` | - | SSO 远程同步（签名认证，不走常规鉴权） |

---

## 渠道层级体系

### 层级树

```
root (depth=0)
├── core / senior / global / authorized / official / partner / agent  (depth=1, 平级，不同类型的高级渠道)
└── national → regional → city → county → local → store               (depth=2~7, 链式层级)
```

### channelTier 可选值

`root`, `core`, `senior`, `global`, `authorized`, `official`, `partner`, `agent`, `national`, `regional`, `city`, `county`, `local`, `store`

### 路径表示

渠道通过 `path` 字段物化路径，如 `/1/3/5/` 表示根渠道(1) → 大区(3) → 城市(5)。删除或移动渠道时，path 和 depth 会自动重算。

---

## 渠道内身份（channel-member.role）

| 角色 | 说明 |
|------|------|
| owner | 渠道所有者，通常是创建者 |
| admin | 渠道管理员，可管理成员和子渠道 |
| member | 普通成员 |

注意：channel-member 的 role 字段与 zhao-auth 的全局角色（如 admin、channel-admin）是不同概念。前者控制渠道内的操作权限，后者控制全局功能权限。

---

## 错误码

| HTTP | 场景 |
|------|------|
| 400 | 参数错误 / 邀请码无效 / 渠道层级超限 / 渠道名称重复 / 邮箱已注册 |
| 401 | 未认证 / token 无效 |
| 403 | 无权限（has-permission 或 has-channel-scope 拒绝） |
| 404 | 渠道 / 成员 / 邀请码不存在 |

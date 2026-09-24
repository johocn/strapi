# zhao-channel 三层路由改造设计

## 目标

将 zhao-channel 的 content-api 路由按三层规范改造：`/v1`（公开）、`/v1/my`（用户）、`/v1/admin`（管理员），统一路径风格和路由工厂函数，与 zhao-auth/zhao-course 保持一致。

## 约束

- 渠道内部权限策略（has-channel-access-advanced、is-channel-admin、is-channel-owner）保持不变
- channel-auth 中间件保持不变
- Admin 路由（type: "admin"）保持不变
- 所有 controller、service、bootstrap、permissions.ts 不改动

## 路由工厂函数

```typescript
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method: method as const,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method: method as const,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      {
        name: "plugin::zhao-channel.channel-auth",
        config: { policies: [{ name: "is-authenticated" }] },
      },
    ],
  },
});

const memberRoute = (method: Method, path: string, handler: string) => ({
  method: method as const,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      {
        name: "plugin::zhao-channel.channel-auth",
        config: {
          policies: [
            { name: "is-authenticated" },
            { name: "has-channel-access-advanced" },
          ],
        },
      },
    ],
  },
});

const channelAdminRoute = (method: Method, path: string, handler: string) => ({
  method: method as const,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      {
        name: "plugin::zhao-channel.channel-auth",
        config: {
          policies: [
            { name: "is-authenticated" },
            { name: "has-channel-access-advanced" },
            { name: "is-channel-admin" },
          ],
        },
      },
    ],
  },
});

const channelOwnerRoute = (method: Method, path: string, handler: string) => ({
  method: method as const,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    middlewares: [
      {
        name: "plugin::zhao-channel.channel-auth",
        config: {
          policies: [
            { name: "is-authenticated" },
            { name: "has-channel-access-advanced" },
            { name: "is-channel-owner" },
          ],
        },
      },
    ],
  },
});
```

## Content-API 路由映射

### 公开层（/v1）

| 方法 | 原路径 | 新路径 | Handler |
|------|--------|--------|---------|
| GET | `/channel/public/:id` | `/v1/channel/public/:id` | channel.getPublic |
| POST | `/channel/validate/public` | `/v1/channel/validate/public` | channel.validatePublic |
| POST | `/channel/register/public` | `/v1/channel/register/public` | channel.registerPublic |

### 用户层（/v1/my）

| 方法 | 原路径 | 新路径 | Handler |
|------|--------|--------|---------|
| GET | `/channel` | `/v1/my/channels` | channel.find |
| POST | `/channel/register` | `/v1/my/channel/register` | channel.register |
| POST | `/channel/validate` | `/v1/my/channel/validate` | channel.validate |
| GET | `/permissions/user/:userId/accessible` | `/v1/my/channels/accessible` | channel-permission.getUserChannels |
| GET | `/user-invite/my-chain` | `/v1/my/invite/chain` | user-invite.getMyChain |
| GET | `/user-invite/my-downstream` | `/v1/my/invite/downstream` | user-invite.getMyDownstream |
| GET | `/user-invite/my-stats` | `/v1/my/invite/stats` | user-invite.getMyStats |

### 渠道成员层（/v1 + 渠道访问权限）

| 方法 | 原路径 | 新路径 | Handler |
|------|--------|--------|---------|
| GET | `/channel/:id` | `/v1/channel/:id` | channel.findOne |
| GET | `/channel/network/:id` | `/v1/channel/:id/network` | channel.getNetwork |
| GET | `/channel/stats/:id` | `/v1/channel/:id/stats` | channel.getStats |
| GET | `/channel-members` | `/v1/channel-members` | channel-member.find |

### 渠道管理员层（/v1/admin + 渠道admin角色）

| 方法 | 原路径 | 新路径 | Handler |
|------|--------|--------|---------|
| POST | `/channel` | `/v1/admin/channel` | channel.create |
| PUT | `/channel/:id` | `/v1/admin/channel/:id` | channel.update |
| POST | `/channel-members` | `/v1/admin/channel-members` | channel-member.create |
| POST | `/permissions/batch-grant` | `/v1/admin/permissions/batch-grant` | channel-permission.batchGrant |

### 渠道所有者层（/v1/admin + 渠道owner角色）

| 方法 | 原路径 | 新路径 | Handler |
|------|--------|--------|---------|
| DELETE | `/channel/:id` | `/v1/admin/channel/:id` | channel.delete |

## 改动范围

仅 1 个文件：`server/src/routes/content-api/index.ts`

## 不改动

- `server/src/routes/admin/index.ts`
- `server/src/middlewares/channel-auth.ts`
- `server/src/policies/has-permission.ts`
- `server/src/permissions.ts`
- `server/src/bootstrap.ts`
- 所有 controller、service
- 前端 admin 页面（走 admin 路由，不受影响）

## 前端 API 同步

`web/src/api/` 下如有 zhao-channel 相关调用，需同步更新路径前缀。

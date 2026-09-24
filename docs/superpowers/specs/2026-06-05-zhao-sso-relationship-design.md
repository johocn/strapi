# zhao-sso 与本项目关系设计

> 日期：2026-06-05 | 更新：2026-06-06 | 状态：已实现

## 一、定位

- **zhao-sso**：独立认证中心（IdP），为 vendure/odoo/strapi 等多系统提供统一登录服务
- **zhao-auth**：本项目的权限核心（策略、权限树、角色管理）
- **zhao-channel**：本项目的渠道与分销核心

## 二、核心原则

1. zhao-sso 保留全部 content-type（sso-user/sso-channel/sso-invite-*/sso-referral-* 等），因为它是独立 IdP，为多个应用服务
2. 分销关系双写：SSO 登录成功后，写入 SSO 自身分销表 + 同步写入本项目分销关系
3. zhao-auth 始终是本项目的权限核心
4. 通过功能开关 `sso_enabled` 控制认证来源
5. 通过插件配置 `channelSync.mode` 控制分销同步方式（local/remote/off）

## 三、架构

```
功能开关 (feature-flag: sso_enabled)
    │
    ├── false → zhao-auth 本地认证 → zhao-channel 写入分销（本地生成邀请码）
    │
    └── true  → zhao-sso SSO 认证 → zhao-sso 写入自身分销表（SSO 生成邀请码）
                                  → ChannelSyncService 同步本项目分销关系
                                      │
                                      ├── mode=local  → 直接调用 zhao-channel 服务
                                      ├── mode=remote → HTTP API 调用（签名认证）
                                      └── mode=off    → 不同步
```

## 四、zhao-sso 保留的独特能力

| 能力 | 说明 |
|------|------|
| OAuth2 授权码流程 | 为 vendure/odoo 提供 SSO 登录 |
| 多应用管理 | app_code/app_secret/redirect_uri |
| 第三方登录 | 微信/支付宝 OAuth |
| Token 生命周期 | access/refresh token 签发、刷新、撤销 |
| 多应用角色映射 | 同一用户在不同应用中角色不同 |
| 独立用户模型 | sso-user（跨应用统一身份） |
| 独立渠道/分销 | sso-channel/sso-invite-*/sso-referral-* |

## 五、已修复的规范问题

### 5.1 安全漏洞（已修复）

- zhao-sso admin 路由（12个）添加 `plugin::zhao-auth.is-authenticated` + `has-permission` 策略
- zhao-common admin 路由（5个）添加策略保护
- zhao-third admin 路由（8个）添加策略保护
- zhao-channel admin 路由移除废弃的 `plugin::zhao-channel.has-permission`，统一使用 `plugin::zhao-auth.has-permission`

### 5.2 策略规范（已修复）

- 所有策略统一使用 Strapi v5 规范：返回 `true`/`undefined` 放行，返回 `false` 拒绝
- 不使用 `policyContext.unauthorized()/forbidden()/throw()`（Strapi v5 的 `createPolicyContext` 通过 `Object.assign` 创建，不包含 Koa 原型方法）
- 不抛出 `@strapi/utils` errors（插件打包导致 `instanceof` 检查失败）
- sso-authenticated 策略注册到 Strapi policyRegistry

### 5.3 路由规范（已修复）

- 所有 `type: "admin"` 自定义 API 路由改为 `type: "content-api"` + `/v1/admin` 路径前缀
- 所有 admin 路由添加 `auth: false` 配置
- 路由 index.ts 合并 admin 和 content-api 为单个 content-api 导出

### 5.4 废弃策略清理（已完成）

- 删除 zhao-oss/zhao-third/zhao-channel/zhao-course 的废弃 has-permission.ts
- 清空对应 policies/index.ts
- 简化 bootstrap.ts/register.ts 移除废弃策略注册

## 六、功能开关实现（已完成）

### 6.1 种子数据

zhao-common bootstrap 自动种子 `sso_enabled` 功能开关：

```typescript
// zhao-common/server/src/bootstrap.ts
const DEFAULT_FLAGS = [
  {
    flagKey: "sso_enabled",
    flagValue: false,
    description: "启用 SSO 统一登录认证，开启后 /login 接口返回 SSO 登录 URL",
    enabled: true,
  },
];
```

### 6.2 zhao-auth login 行为

- `sso_enabled=false`（默认）：正常本地认证
- `sso_enabled=true`：返回 `{ mode: "sso", sso_login_url: "/sso/login", message: "..." }`

### 6.3 zhao-sso 配置

```typescript
// zhao-sso/server/src/config.ts
loginUrl: "/sso/login"  // SSO 登录页 URL，供 zhao-auth 返回
```

## 七、分销双写流程（已完成重构）

### 7.1 已解决的问题

1. **跨服务器无效** → 已通过 ChannelSyncService 抽象接口解决，支持 local/remote/off 三种模式
2. **邀请码不一致** → 已通过 `externalInviteCode` 参数解决，sso_enabled=true 时 SSO 生成邀请码，本项目直接存储

### 7.2 重构方案：ChannelSyncService 抽象接口

```
ChannelSyncService（接口）
    │
    ├── LocalChannelSync（同进程实现）
    │   直接调用 strapi.plugin("zhao-channel") 服务
    │
    └── RemoteChannelSync（独立部署实现）
        通过 HTTP API 调用 /api/zhao-channel/v1/admin/user-invites/sync
        使用 app_code + app_secret 签名认证
```

接口方法：
- `syncUserInvite(ssoUserId, inviteCode, channelCode)` — 同步分销关系
- `mapChannel(channelCode)` — 渠道映射（sso-channel.channel_code → zhao-channel.channel.id）

### 7.3 同步模式配置

在 zhao-sso 插件配置中设置 `channelSync`：

```typescript
// zhao-sso/server/src/config.ts
channelSync: {
  mode: "local",       // "local" | "remote" | "off"
  remoteUrl: "",       // mode=remote 时，Strapi API 基础地址
  appCode: "",         // mode=remote 时，应用标识
  appSecret: "",       // mode=remote 时，应用密钥
}
```

在 `config/plugins.ts` 中覆盖：

```typescript
'zhao-sso': {
  enabled: true,
  config: {
    channelSync: {
      mode: "local",  // 部署时改为 "remote"
    }
  }
}
```

### 7.4 邀请码一致性

- `sso_enabled=true`：SSO 生成邀请码，本项目 `user-invite.inviteCode` 直接存储 SSO 传来的码，不再本地生成
- `sso_enabled=false`：本项目原有流程，自行生成邀请码

修改 `zhao-channel.user-invite.createForUser()`，增加 `externalInviteCode` 参数：
- 传入时直接使用，跳过 `generateUniqueCode()`
- 不传时走原有逻辑

### 7.5 远程通信安全

复用 SSO 现有的 `app_code` / `app_secret` 机制：

- SSO 调用本项目 API 时，请求头携带：
  - `X-App-Code`：应用标识
  - `X-Timestamp`：请求时间戳（防重放）
  - `X-Signature`：`HMAC-SHA256(app_code + timestamp + body, app_secret)`
- 本项目新增 `sso-app-auth` 策略验证签名
- 签名有效期 5 分钟

### 7.6 数据流

```
sso_enabled=true:
  SSO 登录/注册成功
    → 生成 sso-invite-code
    → ChannelSyncService.syncUserInvite(userId, inviteCode, channelCode)
        ├── mode=local:  直接调用 createForUser(userId, externalInviteCode, channelId)
        │                 createForUser 检测到 externalInviteCode，直接存储
        │
        ├── mode=remote: POST /api/zhao-channel/v1/admin/user-invites/sync
        │                 Header: X-App-Code, X-Timestamp, X-Signature
        │                 Body: { userId, inviteCode, channelCode }
        │
        └── mode=off:    不同步

sso_enabled=false:
  本地登录/注册
    → zhao-channel.user-invite.createForUser(userId, inviterCode, channelId)
    → generateUniqueCode() 本地生成邀请码
```

### 7.7 容错

- 分销双写失败不影响 SSO 登录/注册主流程
- 错误仅记录 warn 日志：`[zhao-sso] 分销双写失败: ${e.message}`
- remote 模式下增加重试机制（最多 3 次，指数退避）

## 八、Strapi v5 策略开发规范（总结）

| 做法 | 说明 |
|------|------|
| 返回 `true`/`undefined` | 放行 |
| 返回 `false` | 拒绝（403 PolicyError） |
| 不使用 `policyContext.unauthorized()` | Strapi v5 policyContext 不含此方法 |
| 不使用 `policyContext.throw()` | 同上 |
| 不抛出 `@strapi/utils` errors | 插件打包导致 instanceof 失败，被全局错误处理器捕获返回 500 |
| 策略注册 | `strapi.get('policies').add('plugin::xxx', { name: handler })` |
| 路由引用 | `policies: ["plugin::xxx.policy-name"]` |

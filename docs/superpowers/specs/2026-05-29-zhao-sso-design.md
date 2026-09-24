# zhao-sso 统一登录系统设计文档

## 概述

基于 Strapi 5 开发的独立 SSO（单点登录）插件，采用 OAuth2 授权码模式，为多业务系统（Strapi/Vendure/Odoo）提供统一登录入口。

**与 zhao-auth 关系：** 完全独立并存。zhao-sso 有独立用户表、独立 JWT 密钥、独立认证体系。zhao-auth 继续服务 Strapi 内部路由认证。

**分期策略：**
- 第一期：核心用户表 + 密码登录 + 微信/支付宝 OAuth + 营销渠道/应用编码 + 邀请码/分销表结构
- 第二期：短信验证码 + 邀请码业务逻辑 + Vendure/Odoo 对接

---

## 架构

### OAuth2 授权码流程

```
┌──────────┐    1.跳转SSO登录     ┌──────────┐
│  前端App  │ ──────────────────→ │ SSO登录页 │
│(app_code) │                     │          │
└──────────┘                     └──────────┘
     ↑                                │
     │ 4.用code换token                │ 2.用户登录
     │                                ↓
┌──────────┐                     ┌──────────┐
│  前端App  │ ← 3.回调带code ─── │ SSO服务端 │
│          │                     │          │
└──────────┘                     └──────────┘
     │                                │
     │ 5.携带access_token             │
     ↓                                ↓
┌──────────┐                     ┌──────────┐
│ Strapi   │ ← 验证JWT签名 ──── │ 下游系统  │
│ API      │                     │(预留)     │
└──────────┘                     └──────────┘
```

### JWT 结构

**Access Token（短期，15分钟）：**
```json
{
  "sub": "sso_user_uuid",
  "jti": "unique_token_id",
  "app_code": "shop_admin",
  "roles": ["admin"],
  "channel": "wechat_ads",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token（长期，30天）：**
```json
{
  "sub": "sso_user_uuid",
  "jti": "unique_refresh_id",
  "app_code": "shop_admin",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1237159890
}
```

### JWT 密钥

zhao-sso 使用独立 JWT 密钥，通过环境变量 `SSO_JWT_SECRET` 配置。下游系统验证 SSO Token 时需使用相同密钥（或公钥，若采用 RS256）。

第一期使用 HS256（对称加密，简单直接），预留 RS256（非对称加密）升级路径。

---

## 数据库表设计（sso 前缀）

### 1. sso_user — 核心用户表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto increment) | 是 | 主键 |
| uuid | string (uuid, unique) | 是 | 全局唯一标识，用于 JWT sub |
| username | string (unique, nullable) | 否 | 用户名 |
| mobile | string (unique, nullable) | 否 | 手机号（+8613800138000 格式） |
| email | string (unique, nullable) | 否 | 邮箱 |
| password_hash | string (nullable) | 否 | bcrypt 密码哈希 |
| avatar_url | string (nullable) | 否 | 头像 URL |
| nickname | string (nullable) | 否 | 昵称 |
| status | enum(active/blocked/inactive) | 是 | 用户状态，默认 active |
| register_channel | string (nullable) | 否 | 注册渠道码 |
| last_login_channel | string (nullable) | 否 | 最近登录渠道 |
| invite_code_used | string (nullable) | 否 | 使用的邀请码（二期） |
| invited_by | int (nullable, FK→sso_user) | 否 | 邀请人 user_id（二期） |
| utm_source | string (nullable) | 否 | UTM 来源 |
| utm_medium | string (nullable) | 否 | UTM 媒介 |
| utm_campaign | string (nullable) | 否 | UTM 活动 |
| last_login_at | datetime (nullable) | 否 | 最近登录时间 |
| login_count | int | 是 | 登录次数，默认 0 |
| password_changed_at | datetime (nullable) | 否 | 密码修改时间 |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

**约束：** username、mobile、email 至少填一个；password_hash 在 OAuth-only 用户可为空。

### 2. sso_third_party_binding — 第三方账号绑定

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| user_id | int (FK→sso_user) | 是 | 关联用户 |
| provider | string | 是 | 提供者：wechat/alipay/google 等 |
| provider_user_id | string | 是 | 第三方用户标识（openid/unionid/sub） |
| provider_union_id | string (nullable) | 否 | UnionID（微信开放平台） |
| provider_nickname | string (nullable) | 否 | 第三方昵称 |
| provider_avatar | string (nullable) | 否 | 第三方头像 |
| provider_data | json (nullable) | 否 | 第三方返回的原始数据 |
| bound_at | datetime | 是 | 绑定时间 |

**约束：** (provider, provider_user_id) 唯一；同一用户同一 provider 只能绑定一个账号。

### 3. sso_app — 应用编码配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| app_code | string (unique) | 是 | 应用编码（shop_admin/cms_editor 等） |
| app_name | string | 是 | 应用名称 |
| app_secret | string | 是 | OAuth2 client_secret（bcrypt 哈希存储） |
| redirect_uris | json | 是 | 允许的回调地址列表 ["https://..."] |
| allowed_grant_types | json | 是 | 允许的授权类型 ["authorization_code","refresh_token"] |
| is_active | boolean | 是 | 是否启用，默认 true |
| description | string (nullable) | 否 | 应用描述 |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

### 4. sso_channel — 营销渠道

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| channel_code | string (unique) | 是 | 渠道编码（wechat_ads/seo_landing 等） |
| channel_name | string | 是 | 渠道名称 |
| channel_type | string | 是 | 渠道类型：ads/seo/social/email/offline/other |
| utm_template | json (nullable) | 否 | 默认 UTM 参数 {"source":"...","medium":"..."} |
| is_active | boolean | 是 | 是否启用，默认 true |
| description | string (nullable) | 否 | 渠道描述 |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

### 5. sso_auth_code — OAuth2 授权码

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| code | string (unique) | 是 | 授权码（随机生成） |
| user_id | int (FK→sso_user) | 是 | 关联用户 |
| app_code | string (FK→sso_app) | 是 | 关联应用 |
| redirect_uri | string | 是 | 回调地址 |
| channel_code | string (nullable) | 否 | 登录时的渠道码 |
| scopes | json (nullable) | 否 | 授权范围 |
| expires_at | datetime | 是 | 过期时间（默认10分钟） |
| used | boolean | 是 | 是否已使用，默认 false |
| created_at | datetime | 是 | 创建时间 |

### 6. sso_token — Token 记录

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| user_id | int (FK→sso_user) | 是 | 关联用户 |
| app_code | string (FK→sso_app) | 是 | 关联应用 |
| access_token_jti | string (unique) | 是 | access_token 的 jti |
| refresh_token | string (unique) | 是 | refresh_token 值 |
| refresh_expires_at | datetime | 是 | refresh_token 过期时间 |
| revoked | boolean | 是 | 是否已撤销，默认 false |
| revoked_at | datetime (nullable) | 否 | 撤销时间 |
| channel_code | string (nullable) | 否 | 颁发时的渠道码 |
| created_at | datetime | 是 | 创建时间 |

### 7. sso_user_app_role — 用户应用角色

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| user_id | int (FK→sso_user) | 是 | 关联用户 |
| app_code | string (FK→sso_app) | 是 | 关联应用 |
| role | string | 是 | 角色标识（admin/editor/viewer 等） |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

**约束：** (user_id, app_code) 唯一。

### 8. sso_login_log — 登录审计日志

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| user_id | int (nullable, FK→sso_user) | 否 | 关联用户（匿名登录可为空） |
| login_type | string | 是 | password/oauth/sms |
| provider | string (nullable) | 否 | 第三方提供者（wechat/alipay） |
| channel_code | string (nullable) | 否 | 渠道码 |
| app_code | string (nullable) | 否 | 应用码 |
| ip | string (nullable) | 否 | 客户端 IP |
| user_agent | string (nullable) | 否 | UA |
| success | boolean | 是 | 是否成功 |
| fail_reason | string (nullable) | 否 | 失败原因 |
| created_at | datetime | 是 | 时间戳 |

### 9. sso_invite_code — 邀请码（表结构第一期建，业务二期实现）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| code | string (unique) | 是 | 邀请码 |
| creator_id | int (FK→sso_user) | 是 | 创建者 |
| invite_type | enum(system/user_campaign) | 是 | 类型：系统生成/用户推广 |
| max_uses | int (nullable) | 否 | 最大使用次数（null=无限） |
| use_count | int | 是 | 已使用次数，默认 0 |
| per_user_limit | int | 是 | 每人可使用次数，默认 1 |
| valid_from | datetime (nullable) | 否 | 生效时间 |
| valid_until | datetime (nullable) | 否 | 过期时间 |
| bonus_tags | json (nullable) | 否 | 权益标签 ["trial_7d","points_100"] |
| is_active | boolean | 是 | 是否启用，默认 true |
| created_at | datetime | 是 | 创建时间 |
| updated_at | datetime | 是 | 更新时间 |

### 10. sso_invite_usage — 邀请码使用记录（二期）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| invite_code_id | int (FK→sso_invite_code) | 是 | 关联邀请码 |
| user_id | int (FK→sso_user) | 是 | 被邀请人 |
| channel_code | string (nullable) | 否 | 使用时的渠道 |
| app_code | string (nullable) | 否 | 使用时的应用 |
| used_at | datetime | 是 | 使用时间 |

**约束：** (invite_code_id, user_id) 唯一。

### 11. sso_referral_relation — 分销关系（二期）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| inviter_id | int (FK→sso_user) | 是 | 邀请人 |
| invitee_id | int (FK→sso_user) | 是 | 被邀请人 |
| invite_code_id | int (nullable, FK→sso_invite_code) | 否 | 关联邀请码 |
| level | int | 是 | 层级（1=直推, 2=间推） |
| channel_code | string (nullable) | 否 | 来源渠道 |
| created_at | datetime | 是 | 建立时间 |

**约束：** (inviter_id, invitee_id) 唯一。

### 12. sso_invite_stats — 邀请码统计（二期，定时刷新）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int (auto) | 是 | 主键 |
| invite_code_id | int (FK→sso_invite_code, unique) | 是 | 关联邀请码 |
| total_invites | int | 是 | 总邀请人数 |
| active_invites | int | 是 | 活跃邀请人数（30天内登录） |
| last_invited_at | datetime (nullable) | 否 | 最近邀请时间 |
| updated_at | datetime | 是 | 统计更新时间 |

---

## API 接口设计

### 认证相关

| 端点 | 方法 | 说明 | 是否公开 |
|------|------|------|---------|
| `/api/sso/auth/authorize` | GET | OAuth2 授权端点，展示登录页/跳转 | 是 |
| `/api/sso/auth/token` | POST | OAuth2 Token 端点（code→token） | 是（需 client_secret） |
| `/api/sso/auth/login` | POST | 统一登录（密码/手机号/邮箱） | 是 |
| `/api/sso/auth/register` | POST | 注册新用户 | 是 |
| `/api/sso/auth/logout` | POST | 注销并撤销 Token | 需认证 |
| `/api/sso/auth/verify` | POST | 验证 Token 有效性 | 需认证 |
| `/api/sso/auth/refresh` | POST | 刷新 access_token | 需 refresh_token |
| `/api/sso/auth/wechat` | GET | 微信 OAuth 跳转 | 是 |
| `/api/sso/auth/wechat/callback` | GET | 微信 OAuth 回调 | 是 |
| `/api/sso/auth/alipay` | GET | 支付宝 OAuth 跳转 | 是 |
| `/api/sso/auth/alipay/callback` | GET | 支付宝 OAuth 回调 | 是 |

### 用户相关

| 端点 | 方法 | 说明 | 是否公开 |
|------|------|------|---------|
| `/api/sso/user/me` | GET | 获取当前用户信息 | 需认证 |
| `/api/sso/user/bind` | POST | 绑定手机/邮箱/第三方账号 | 需认证 |
| `/api/sso/user/unbind` | POST | 解绑第三方账号 | 需认证 |
| `/api/sso/user/change-password` | POST | 修改密码 | 需认证 |

### 渠道相关

| 端点 | 方法 | 说明 | 是否公开 |
|------|------|------|---------|
| `/api/sso/channel/track` | POST | 无登录状态下记录渠道点击 | 是 |

### 管理端（admin 路由）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/plugins/zhao-sso/users` | GET | 用户列表 |
| `/admin/plugins/zhao-sso/apps` | GET/POST | 应用管理 |
| `/admin/plugins/zhao-sso/channels` | GET/POST | 渠道管理 |
| `/admin/plugins/zhao-sso/invite-codes` | GET/POST | 邀请码管理 |
| `/admin/plugins/zhao-sso/login-logs` | GET | 登录日志 |
| `/admin/plugins/zhao-sso/stats/dashboard` | GET | 统计仪表盘 |
| `/admin/plugins/zhao-sso/stats/channel-report` | GET | 渠道转化报表 |
| `/admin/plugins/zhao-sso/stats/invite-report` | GET | 邀请码统计报表 |

---

## 登录流程详细设计

### 1. 密码登录流程

```
POST /api/sso/auth/login
Body: { type: "password", identifier: "user@example.com", password: "xxx", app_code: "shop_admin", channel_code: "seo_landing" }

1. 查找用户（email/username/mobile 匹配）
2. 验证密码（bcrypt.compare）
3. 检查用户状态（blocked?）
4. 记录登录日志
5. 更新 last_login_at/channel
6. 生成 access_token + refresh_token
7. 返回 { access_token, refresh_token, expires_in, user }
```

### 2. OAuth2 授权码流程

```
1. 前端跳转: GET /api/sso/auth/authorize?app_code=xxx&redirect_uri=xxx&response_type=code&state=xxx&channel_code=xxx
2. SSO 检查用户是否已登录（cookie/session）
   - 已登录 → 直接生成 auth_code，重定向回 redirect_uri?code=xxx&state=xxx
   - 未登录 → 展示 SSO 登录页
3. 用户登录成功后 → 生成 auth_code，重定向
4. 前端用 code 换 token:
   POST /api/sso/auth/token
   Body: { grant_type: "authorization_code", code: "xxx", app_code: "xxx", app_secret: "xxx", redirect_uri: "xxx" }
5. SSO 验证 code → 颁发 access_token + refresh_token
```

### 3. 微信 OAuth 流程

```
1. 前端跳转: GET /api/sso/auth/wechat?app_code=xxx&channel_code=xxx
2. SSO 重定向到微信授权页（构造微信 OAuth URL）
3. 用户扫码授权
4. 微信回调: GET /api/sso/auth/wechat/callback?code=xxx&state=xxx
5. SSO 用 code 换取 access_token + openid
6. 查找 sso_third_party_binding(provider=wechat, provider_user_id=openid)
   - 找到 → 登录成功，生成 auth_code，重定向回应用
   - 未找到 → 自动创建 sso_user + binding，登录成功
7. 重定向回 redirect_uri?code=xxx&state=xxx
```

### 4. 支付宝 OAuth 流程

与微信类似，替换为支付宝 OAuth 端点。

---

## 安全设计

| 措施 | 实现 |
|------|------|
| 登录错误限制 | 同一 IP/账号 5 分钟内最多 5 次失败，超出锁定 30 分钟 |
| JWT 过期 | access_token 15 分钟，refresh_token 30 天 |
| Token 撤销 | logout 时撤销 refresh_token，sso_token.revoked=true |
| 授权码安全 | 10 分钟过期，一次性使用，绑定 redirect_uri |
| 密码安全 | bcrypt (cost=12)，密码修改后旧 Token 不失效（简化实现） |
| app_secret | bcrypt 哈希存储，验证时 compare |
| CORS | 仅允许已注册的 redirect_uri 域名 |
| 登录审计 | 所有登录尝试记录到 sso_login_log |

---

## 插件目录结构

```
plugins/zhao-sso/
├── admin/src/
│   ├── index.ts                    # 插件注册
│   ├── pages/
│   │   ├── App.tsx                 # 路由入口
│   │   ├── HomePage.tsx            # 仪表盘
│   │   ├── UsersPage.tsx           # 用户管理
│   │   ├── AppsPage.tsx            # 应用管理
│   │   ├── ChannelsPage.tsx        # 渠道管理
│   │   ├── InviteCodesPage.tsx     # 邀请码管理
│   │   └── LoginLogsPage.tsx       # 登录日志
│   └── translations/
│       ├── en.json
│       └── zh-Hans.json
├── server/src/
│   ├── index.ts                    # 插件入口
│   ├── register.ts                 # 注册
│   ├── bootstrap.ts                # 启动
│   ├── config.ts                   # 配置
│   ├── content-types/
│   │   └── index.ts                # Strapi content-type 注册
│   ├── controllers/
│   │   ├── index.ts
│   │   ├── auth-controller.ts      # 认证控制器
│   │   ├── user-controller.ts      # 用户控制器
│   │   ├── channel-controller.ts   # 渠道控制器
│   │   ├── admin-controller.ts     # 管理端控制器
│   │   └── oauth-controller.ts     # OAuth 控制器
│   ├── routes/
│   │   ├── index.ts
│   │   ├── api.ts                  # 公开 API 路由
│   │   └── admin.ts                # 管理端路由
│   ├── services/
│   │   ├── index.ts
│   │   ├── sso-auth.ts             # SSO 认证服务（核心）
│   │   ├── sso-jwt.ts              # JWT 签发/验证
│   │   ├── sso-user.ts             # 用户 CRUD
│   │   ├── sso-oauth.ts            # OAuth2 流程
│   │   ├── sso-wechat.ts           # 微信 OAuth
│   │   ├── sso-alipay.ts           # 支付宝 OAuth
│   │   ├── sso-channel.ts          # 渠道服务
│   │   └── sso-login-log.ts        # 登录日志
│   ├── policies/
│   │   ├── index.ts
│   │   └── sso-authenticated.ts    # SSO Token 验证策略
│   └── middlewares/
│       ├── index.ts
│       └── sso-auth.ts             # SSO 认证中间件
├── package.json
├── strapi-admin.js
└── strapi-server.js
```

---

## 配置项

```typescript
// config/plugins.ts
"zhao-sso": {
  enabled: true,
  resolve: "E:/code/plugins/zhao-sso",
  config: {
    jwt: {
      secret: env("SSO_JWT_SECRET"),
      algorithm: "HS256",           // 预留 RS256
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    },
    oauth: {
      wechat: {
        appId: env("WECHAT_APP_ID"),
        appSecret: env("WECHAT_APP_SECRET"),
        scope: "snsapi_login",
      },
      alipay: {
        appId: env("ALIPAY_APP_ID"),
        privateKey: env("ALIPAY_PRIVATE_KEY"),
        scope: "auth_user",
      },
    },
    security: {
      loginMaxAttempts: 5,
      loginLockDuration: "30m",
      authCodeExpiresIn: "10m",
    },
    defaults: {
      appCode: "default",           // 默认应用编码
    },
  },
},
```

---

## 第二期预留

- 短信验证码：sso_sms_code 表 + 阿里云/腾讯云短信服务
- 邀请码业务逻辑：sso_invite_code/sso_invite_usage/sso_referral_relation 的 CRUD + 统计
- Vendure/Odoo 对接：sso_user_binding 表（user_id + system + system_user_id）+ 同步服务
- RS256 升级：JWT 算法从 HS256 切换到 RS256，下游系统用公钥验签

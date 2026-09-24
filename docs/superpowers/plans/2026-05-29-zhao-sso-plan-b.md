# zhao-sso 子计划 B：核心认证（注册/登录/OAuth2/Token）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的认证流程：用户注册、密码登录、OAuth2 授权码、微信/支付宝 OAuth、Token 刷新/撤销/验证

**Architecture:** auth-controller 处理公开认证接口，oauth-controller 处理 OAuth2 流程，sso-auth 服务编排核心认证逻辑，sso-oauth 服务处理授权码颁发/兑换，sso-wechat/sso-alipay 处理第三方 OAuth

**Tech Stack:** Strapi 5, TypeScript, jsonwebtoken, bcryptjs, axios

**Spec:** `docs/superpowers/specs/2026-05-29-zhao-sso-design.md`
**Depends on:** 子计划 A（插件骨架 + 数据表 + JWT 服务）

---

## File Structure

```
plugins/zhao-sso/server/src/
├── services/
│   ├── sso-auth.ts          # 核心认证编排
│   ├── sso-oauth.ts         # OAuth2 授权码管理
│   ├── sso-wechat.ts        # 微信 OAuth
│   ├── sso-alipay.ts        # 支付宝 OAuth
│   ├── sso-login-log.ts     # 登录日志
│   └── sso-channel.ts       # 渠道服务
├── controllers/
│   ├── auth-controller.ts   # 认证接口
│   ├── oauth-controller.ts  # OAuth2 接口
│   └── user-controller.ts   # 用户接口
├── routes/
│   ├── api.ts               # 公开 API 路由
│   └── admin.ts             # 管理端路由
├── policies/
│   └── sso-authenticated.ts # SSO Token 验证
├── middlewares/
│   └── sso-auth.ts          # SSO 认证中间件
└── tests/
    ├── sso-auth.test.ts
    ├── sso-oauth.test.ts
    └── sso-login-log.test.ts
```

---

### Task 6: 实现 sso-login-log 服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-login-log.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现 sso-login-log 服务**

```typescript
import type { Core } from "@strapi/strapi";

const LOG_UID = "plugin::zhao-sso.sso-login-log";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async log(params: {
    userId?: number;
    loginType: string;
    provider?: string;
    channelCode?: string;
    appCode?: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    failReason?: string;
  }) {
    return strapi.db.query(LOG_UID).create({
      data: {
        user: params.userId ? { id: params.userId } : null,
        login_type: params.loginType,
        provider: params.provider || null,
        channel_code: params.channelCode || null,
        app_code: params.appCode || null,
        ip: params.ip || null,
        user_agent: params.userAgent || null,
        success: params.success,
        fail_reason: params.failReason || null,
      },
    });
  },

  async getRecentFailCount(identifier: string, windowMinutes: number = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const logs = await strapi.db.query(LOG_UID).findMany({
      where: {
        $or: [{ ip: identifier }],
        success: false,
        created_at: { $gte: since },
      },
    });
    return logs.length;
  },

  async getUserLogs(userId: number, limit: number = 20) {
    return strapi.db.query(LOG_UID).findMany({
      where: { user: { id: userId } },
      orderBy: { created_at: "desc" },
      limit,
    });
  },
});
```

- [ ] **Step 2: 更新 services/index.ts**

在现有导出基础上添加：
```typescript
import ssoLoginLog from "./sso-login-log";

export default {
  "sso-jwt": ssoJwt,
  "sso-user": ssoUser,
  "sso-login-log": ssoLoginLog,
};
```

---

### Task 7: 实现 sso-channel 服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-channel.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现 sso-channel 服务**

```typescript
import type { Core } from "@strapi/strapi";

const CHANNEL_UID = "plugin::zhao-sso.sso-channel";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByCode(channelCode: string) {
    return strapi.db.query(CHANNEL_UID).findOne({
      where: { channel_code: channelCode, is_active: true },
    });
  },

  async trackClick(channelCode: string, utmParams?: Record<string, string>) {
    const channel = await this.findByCode(channelCode);
    if (!channel) {
      strapi.log.warn(`[zhao-sso] Channel not found: ${channelCode}`);
      return null;
    }
    return { channel, utm: utmParams || {} };
  },

  async listAll() {
    return strapi.db.query(CHANNEL_UID).findMany({
      where: { is_active: true },
      orderBy: { channel_code: "asc" },
    });
  },
});
```

- [ ] **Step 2: 更新 services/index.ts 添加 sso-channel**

---

### Task 8: 实现 sso-auth 核心认证服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-auth.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现 sso-auth 服务**

```typescript
import type { Core } from "@strapi/strapi";

const TOKEN_UID = "plugin::zhao-sso.sso-token";
const USER_ROLE_UID = "plugin::zhao-sso.sso-user-app-role";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const jwtService = strapi.plugin("zhao-sso").service("sso-jwt");
  const userService = strapi.plugin("zhao-sso").service("sso-user");
  const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");

  const login = async (params: {
    type: string;
    identifier?: string;
    password?: string;
    appCode: string;
    channelCode?: string;
    ip?: string;
    userAgent?: string;
  }) => {
    const { type, identifier, password, appCode, channelCode, ip, userAgent } = params;

    const maxAttempts = 5;
    if (ip) {
      const failCount = await loginLogService.getRecentFailCount(ip, 5);
      if (failCount >= maxAttempts) {
        await loginLogService.log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "too_many_attempts" });
        throw new Error("登录失败次数过多，请30分钟后重试");
      }
    }

    if (type === "password") {
      if (!identifier || !password) throw new Error("identifier 和 password 必填");

      const user = await userService.findByIdentifier(identifier);
      if (!user) {
        await loginLogService.log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_not_found" });
        throw new Error("用户名/邮箱/手机号或密码错误");
      }

      if (await userService.isBlocked(user)) {
        await loginLogService.log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_blocked" });
        throw new Error("账号已被封禁");
      }

      const valid = await userService.verifyPassword(user, password);
      if (!valid) {
        await loginLogService.log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "wrong_password" });
        throw new Error("用户名/邮箱/手机号或密码错误");
      }

      await userService.updateLoginInfo(user.id, channelCode);
      const roles = await getUserRoles(user.id, appCode);
      const tokenPair = await jwtService.signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });

      await saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      await loginLogService.log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: true });

      return {
        ...tokenPair,
        user: sanitizeUser(user),
      };
    }

    throw new Error(`不支持的登录类型: ${type}`);
  };

  const register = async (params: {
    username?: string;
    mobile?: string;
    email?: string;
    password?: string;
    appCode: string;
    channelCode?: string;
    inviteCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    ip?: string;
    userAgent?: string;
  }) => {
    const { appCode, channelCode, inviteCode, utmSource, utmMedium, utmCampaign } = params;

    const user = await userService.createUser({
      username: params.username,
      mobile: params.mobile,
      email: params.email,
      password: params.password,
      register_channel: channelCode,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      invite_code_used: inviteCode,
    });

    const roles = await getUserRoles(user.id, appCode);
    const tokenPair = await jwtService.signTokenPair({
      sub: user.uuid,
      app_code: appCode,
      roles,
      channel: channelCode,
    });

    await saveTokenRecord(user.id, appCode, tokenPair, channelCode);

    await loginLogService.log({
      userId: user.id,
      loginType: "register",
      channelCode,
      appCode,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
    });

    return {
      ...tokenPair,
      user: sanitizeUser(user),
    };
  };

  const verifyToken = async (token: string) => {
    const payload = await jwtService.verifyToken(token);
    if (payload.type !== "access") throw new Error("无效的 access token");

    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord?.revoked) throw new Error("Token 已被撤销");

    const user = await userService.findByUuid(payload.sub);
    if (!user) throw new Error("用户不存在");
    if (await userService.isBlocked(user)) throw new Error("账号已被封禁");

    return { payload, user: sanitizeUser(user) };
  };

  const refreshToken = async (refreshToken: string) => {
    const payload = await jwtService.verifyToken(refreshToken);
    if (payload.type !== "refresh") throw new Error("无效的 refresh token");

    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { refresh_token: refreshToken },
    });
    if (!tokenRecord) throw new Error("Token 记录不存在");
    if (tokenRecord.revoked) throw new Error("Refresh token 已被撤销");
    if (new Date(tokenRecord.refresh_expires_at) < new Date()) throw new Error("Refresh token 已过期");

    await strapi.db.query(TOKEN_UID).update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revoked_at: new Date() },
    });

    const user = await userService.findByUuid(payload.sub);
    if (!user) throw new Error("用户不存在");

    const roles = await getUserRoles(user.id, payload.app_code);
    const newTokenPair = await jwtService.signTokenPair({
      sub: user.uuid,
      app_code: payload.app_code,
      roles,
      channel: payload.channel,
    });

    await saveTokenRecord(user.id, payload.app_code, newTokenPair, payload.channel);

    return newTokenPair;
  };

  const logout = async (accessToken: string) => {
    const payload = await jwtService.verifyToken(accessToken);
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord && !tokenRecord.revoked) {
      await strapi.db.query(TOKEN_UID).update({
        where: { id: tokenRecord.id },
        data: { revoked: true, revoked_at: new Date() },
      });
    }
    return { success: true };
  };

  const getUserRoles = async (userId: number, appCode: string): Promise<string[]> => {
    const roles = await strapi.db.query(USER_ROLE_UID).findMany({
      where: { user: { id: userId }, app_code: appCode },
    });
    return roles.map((r: any) => r.role);
  };

  const saveTokenRecord = async (userId: number, appCode: string, tokenPair: any, channelCode?: string) => {
    const accessPayload = await jwtService.verifyToken(tokenPair.access_token);
    const refreshPayload = await jwtService.verifyToken(tokenPair.refresh_token);

    await strapi.db.query(TOKEN_UID).create({
      data: {
        user: { id: userId },
        app_code: appCode,
        access_token_jti: accessPayload.jti,
        refresh_token: tokenPair.refresh_token,
        refresh_expires_at: new Date(refreshPayload.exp * 1000),
        channel_code: channelCode || null,
      },
    });
  };

  const sanitizeUser = (user: any) => {
    const { password_hash, ...safe } = user;
    return safe;
  };

  return { login, register, verifyToken, refreshToken, logout, getUserRoles, saveTokenRecord, sanitizeUser };
};
```

- [ ] **Step 2: 更新 services/index.ts 添加 sso-auth**

---

### Task 9: 实现 sso-oauth 服务（授权码管理）

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-oauth.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现 sso-oauth 服务**

```typescript
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const AUTH_CODE_UID = "plugin::zhao-sso.sso-auth-code";
const APP_UID = "plugin::zhao-sso.sso-app";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async generateAuthCode(params: {
    userId: number;
    appCode: string;
    redirectUri: string;
    channelCode?: string;
    scopes?: string[];
  }) {
    const { userId, appCode, redirectUri, channelCode, scopes } = params;

    const app = await this.findApp(appCode);
    if (!app || !app.is_active) throw new Error("应用不存在或已禁用");
    if (!this.validateRedirectUri(app, redirectUri)) throw new Error("redirect_uri 不在允许列表中");

    const code = uuidv4() + "-" + uuidv4();
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const expiresIn = pluginConfig?.security?.authCodeExpiresIn || "10m";
    const expiresMs = parseDuration(expiresIn);

    await strapi.db.query(AUTH_CODE_UID).create({
      data: {
        code,
        user: { id: userId },
        app_code: appCode,
        redirect_uri: redirectUri,
        channel_code: channelCode || null,
        scopes: scopes || null,
        expires_at: new Date(Date.now() + expiresMs),
        used: false,
      },
    });

    return code;
  },

  async exchangeCode(params: {
    code: string;
    appCode: string;
    appSecret: string;
    redirectUri: string;
  }) {
    const { code, appCode, appSecret, redirectUri } = params;

    const app = await this.findApp(appCode);
    if (!app || !app.is_active) throw new Error("应用不存在或已禁用");
    if (!bcrypt.compareSync(appSecret, app.app_secret)) throw new Error("app_secret 验证失败");

    const authCode = await strapi.db.query(AUTH_CODE_UID).findOne({
      where: { code, app_code: appCode },
    });
    if (!authCode) throw new Error("授权码不存在");
    if (authCode.used) throw new Error("授权码已使用");
    if (new Date(authCode.expires_at) < new Date()) throw new Error("授权码已过期");
    if (authCode.redirect_uri !== redirectUri) throw new Error("redirect_uri 不匹配");

    await strapi.db.query(AUTH_CODE_UID).update({
      where: { id: authCode.id },
      data: { used: true },
    });

    return {
      userId: authCode.user.id,
      channelCode: authCode.channel_code,
      scopes: authCode.scopes,
    };
  },

  async findApp(appCode: string) {
    return strapi.db.query(APP_UID).findOne({ where: { app_code: appCode } });
  },

  validateRedirectUri(app: any, redirectUri: string): boolean {
    const allowed: string[] = app.redirect_uris || [];
    return allowed.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(redirectUri);
      }
      return pattern === redirectUri;
    });
  },
});

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(m|d|h|s)$/);
  if (!match) return 10 * 60 * 1000;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s": return val * 1000;
    case "m": return val * 60 * 1000;
    case "h": return val * 60 * 60 * 1000;
    case "d": return val * 24 * 60 * 60 * 1000;
    default: return 10 * 60 * 1000;
  }
}
```

- [ ] **Step 2: 更新 services/index.ts 添加 sso-oauth**

---

### Task 10: 实现 sso-wechat 和 sso-alipay 服务

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-wechat.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\services\sso-alipay.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\services\index.ts`

- [ ] **Step 1: 实现 sso-wechat 服务**

```typescript
import axios from "axios";
import type { Core } from "@strapi/strapi";

const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getAuthorizeUrl(state: string): string {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const { appId, scope } = pluginConfig?.oauth?.wechat || {};
    if (!appId) throw new Error("[zhao-sso] WeChat appId not configured");

    const redirectUri = `${strapi.config.get("server.url", "http://localhost:1337")}/api/sso/auth/wechat/callback`;
    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scope || "snsapi_login",
      state,
    });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  },

  async handleCallback(code: string) {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const { appId, appSecret } = pluginConfig?.oauth?.wechat || {};
    if (!appId || !appSecret) throw new Error("WeChat OAuth not configured");

    const tokenRes = await axios.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
      params: { appid: appId, secret: appSecret, code, grant_type: "authorization_code" },
    });

    if (tokenRes.data.errcode) throw new Error(`WeChat OAuth error: ${tokenRes.data.errmsg}`);

    const { openid, unionid, access_token: wxAccessToken } = tokenRes.data;

    let userInfoRes: any = {};
    try {
      userInfoRes = await axios.get("https://api.weixin.qq.com/sns/userinfo", {
        params: { access_token: wxAccessToken, openid },
      });
    } catch {}

    const binding = await strapi.db.query(BINDING_UID).findOne({
      where: { provider: "wechat", provider_user_id: openid },
      populate: { user: true },
    });

    if (binding) {
      return { userId: binding.user.id, isNew: false };
    }

    const user = await strapi.db.query(USER_UID).create({
      data: {
        uuid: require("uuid").v4(),
        nickname: userInfoRes.data?.nickname || null,
        avatar_url: userInfoRes.data?.headimgurl || null,
        status: "active",
        login_count: 0,
      },
    });

    await strapi.db.query(BINDING_UID).create({
      data: {
        user: { id: user.id },
        provider: "wechat",
        provider_user_id: openid,
        provider_union_id: unionid || null,
        provider_nickname: userInfoRes.data?.nickname || null,
        provider_avatar: userInfoRes.data?.headimgurl || null,
        provider_data: tokenRes.data,
        bound_at: new Date(),
      },
    });

    return { userId: user.id, isNew: true };
  },
});
```

- [ ] **Step 2: 实现 sso-alipay 服务**

```typescript
import crypto from "crypto";
import axios from "axios";
import type { Core } from "@strapi/strapi";

const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getAuthorizeUrl(state: string): string {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const { appId } = pluginConfig?.oauth?.alipay || {};
    if (!appId) throw new Error("[zhao-sso] Alipay appId not configured");

    const redirectUri = `${strapi.config.get("server.url", "http://localhost:1337")}/api/sso/auth/alipay/callback`;
    const params = new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri,
      scope: "auth_user",
      state,
    });
    return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params.toString()}`;
  },

  async handleCallback(code: string) {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const { appId, privateKey } = pluginConfig?.oauth?.alipay || {};
    if (!appId || !privateKey) throw new Error("Alipay OAuth not configured");

    const tokenRes = await this.requestToken(appId, privateKey, code);
    const userId = tokenRes.user_id;

    const binding = await strapi.db.query(BINDING_UID).findOne({
      where: { provider: "alipay", provider_user_id: userId },
      populate: { user: true },
    });

    if (binding) {
      return { userId: binding.user.id, isNew: false };
    }

    let userInfo: any = {};
    try {
      userInfo = await this.fetchUserInfo(appId, privateKey, tokenRes.access_token);
    } catch {}

    const user = await strapi.db.query(USER_UID).create({
      data: {
        uuid: require("uuid").v4(),
        nickname: userInfo.nick_name || null,
        avatar_url: userInfo.avatar || null,
        status: "active",
        login_count: 0,
      },
    });

    await strapi.db.query(BINDING_UID).create({
      data: {
        user: { id: user.id },
        provider: "alipay",
        provider_user_id: userId,
        provider_nickname: userInfo.nick_name || null,
        provider_avatar: userInfo.avatar || null,
        provider_data: tokenRes,
        bound_at: new Date(),
      },
    });

    return { userId: user.id, isNew: true };
  },

  async requestToken(appId: string, privateKey: string, code: string) {
    const bizContent = { grant_type: "authorization_code", code };
    const params = this.buildAlipayParams(appId, "alipay.system.oauth.token", bizContent);
    const sign = this.signParams(params, privateKey);
    params.sign = sign;

    const res = await axios.post("https://openapi.alipay.com/gateway.do", null, { params });
    const respKey = "alipay_system_oauth_token_response";
    if (res.data[respKey]) return res.data[respKey];
    throw new Error(`Alipay token error: ${JSON.stringify(res.data)}`);
  },

  async fetchUserInfo(appId: string, privateKey: string, accessToken: string) {
    const bizContent = { auth_token: accessToken };
    const params = this.buildAlipayParams(appId, "alipay.user.info.share", bizContent);
    const sign = this.signParams(params, privateKey);
    params.sign = sign;

    const res = await axios.post("https://openapi.alipay.com/gateway.do", null, { params });
    const respKey = "alipay_user_info_share_response";
    if (res.data[respKey]) return res.data[respKey];
    return {};
  },

  buildAlipayParams(appId: string, method: string, bizContent: any) {
    return {
      app_id: appId,
      method,
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
    };
  },

  signParams(params: Record<string, string>, privateKey: string): string {
    const sorted = Object.keys(params)
      .filter((k) => k !== "sign" && params[k])
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(sorted);
    sign.end();
    return sign.sign(privateKey, "base64");
  },
});
```

- [ ] **Step 3: 更新 services/index.ts 添加 sso-wechat 和 sso-alipay**

---

### Task 11: 实现 SSO 认证策略和中间件

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\policies\sso-authenticated.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\policies\index.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\middlewares\sso-auth.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\middlewares\index.ts`

- [ ] **Step 1: 实现 sso-authenticated 策略**

```typescript
export default async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const authHeader = policyContext.request?.headers?.authorization;
  if (!authHeader || typeof authHeader !== "string") return false;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  try {
    const jwtService = strapi.plugin("zhao-sso").service("sso-jwt");
    const payload = await jwtService.verifyToken(parts[1]);

    if (payload.type !== "access") return false;

    const tokenRecord = await strapi.db.query("plugin::zhao-sso.sso-token").findOne({
      where: { access_token_jti: payload.jti },
    });
    if (tokenRecord?.revoked) return false;

    policyContext.state.ssoUser = payload;
    policyContext.state.ssoToken = parts[1];
    return true;
  } catch {
    return false;
  }
};
```

- [ ] **Step 2: 更新 policies/index.ts**

```typescript
import ssoAuthenticated from "./sso-authenticated";

export default {
  "sso-authenticated": ssoAuthenticated,
};
```

- [ ] **Step 3: 实现 sso-auth 中间件**

```typescript
export default async (ctx: any, next: any) => {
  const authHeader = ctx.request?.headers?.authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      try {
        const jwtService = ctx.strapi.plugin("zhao-sso").service("sso-jwt");
        const payload = await jwtService.verifyToken(parts[1]);
        if (payload.type === "access") {
          ctx.state.ssoUser = payload;
          ctx.state.ssoToken = parts[1];
        }
      } catch {}
    }
  }
  await next();
};
```

- [ ] **Step 4: 更新 middlewares/index.ts**

```typescript
import ssoAuth from "./sso-auth";

export default {
  "sso-auth": ssoAuth,
};
```

---

### Task 12: 实现 auth-controller 和 oauth-controller

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\controllers\auth-controller.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\controllers\oauth-controller.ts`
- Create: `e:\code\plugins\zhao-sso\server\src\controllers\user-controller.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\controllers\index.ts`

- [ ] **Step 1: 实现 auth-controller**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async login(ctx: any) {
    const { type, identifier, password, app_code, channel_code } = ctx.request.body;

    if (!type) return ctx.badRequest("type 必填");
    if (!app_code) return ctx.badRequest("app_code 必填");

    const authService = strapi.plugin("zhao-sso").service("sso-auth");

    try {
      const result = await authService.login({
        type,
        identifier,
        password,
        appCode: app_code,
        channelCode: channel_code,
        ip: ctx.request.ip,
        userAgent: ctx.request.headers["user-agent"],
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = 401;
      ctx.body = { error: e.message };
    }
  },

  async register(ctx: any) {
    const body = ctx.request.body;

    if (!body.app_code) return ctx.badRequest("app_code 必填");

    const authService = strapi.plugin("zhao-sso").service("sso-auth");

    try {
      const result = await authService.register({
        username: body.username,
        mobile: body.mobile,
        email: body.email,
        password: body.password,
        appCode: body.app_code,
        channelCode: body.channel_code,
        inviteCode: body.invite_code,
        utmSource: body.utm_source,
        utmMedium: body.utm_medium,
        utmCampaign: body.utm_campaign,
        ip: ctx.request.ip,
        userAgent: ctx.request.headers["user-agent"],
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },

  async verify(ctx: any) {
    const token = ctx.state.ssoToken;
    if (!token) return ctx.unauthorized("未提供 Token");

    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.verifyToken(token);
      ctx.body = { valid: true, user: result.user, payload: result.payload };
    } catch (e: any) {
      ctx.status = 401;
      ctx.body = { valid: false, error: e.message };
    }
  },

  async refresh(ctx: any) {
    const { refresh_token } = ctx.request.body;
    if (!refresh_token) return ctx.badRequest("refresh_token 必填");

    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.refreshToken(refresh_token);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = 401;
      ctx.body = { error: e.message };
    }
  },

  async logout(ctx: any) {
    const token = ctx.state.ssoToken;
    if (!token) return ctx.unauthorized("未提供 Token");

    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.logout(token);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },
});
```

- [ ] **Step 2: 实现 oauth-controller**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async authorize(ctx: any) {
    const { app_code, redirect_uri, response_type, state, channel_code } = ctx.query;

    if (!app_code || !redirect_uri || response_type !== "code") {
      return ctx.badRequest("app_code, redirect_uri, response_type=code 必填");
    }

    const ssoUser = ctx.state.ssoUser;
    if (ssoUser) {
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const code = await oauthService.generateAuthCode({
        userId: ssoUser.sub,
        appCode: app_code,
        redirectUri: redirect_uri,
        channelCode: channel_code,
      });
      const separator = redirect_uri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirect_uri}${separator}code=${code}&state=${state || ""}`);
      return;
    }

    ctx.body = { message: "SSO login required", app_code, redirect_uri, state, channel_code };
  },

  async token(ctx: any) {
    const { grant_type, code, app_code, app_secret, redirect_uri } = ctx.request.body;

    if (grant_type === "authorization_code") {
      if (!code || !app_code || !app_secret || !redirect_uri) {
        return ctx.badRequest("code, app_code, app_secret, redirect_uri 必填");
      }

      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const authService = strapi.plugin("zhao-sso").service("sso-auth");

      try {
        const { userId, channelCode } = await oauthService.exchangeCode({ code, appCode: app_code, appSecret: app_secret, redirectUri: redirect_uri });

        const userService = strapi.plugin("zhao-sso").service("sso-user");
        const user = await strapi.db.query("plugin::zhao-sso.sso-user").findOne({ where: { id: userId } });

        await userService.updateLoginInfo(user.id, channelCode);
        const roles = await authService.getUserRoles(user.id, app_code);
        const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
          sub: user.uuid,
          app_code,
          roles,
          channel: channelCode,
        });

        await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);

        ctx.body = tokenPair;
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }

    if (grant_type === "refresh_token") {
      const { refresh_token } = ctx.request.body;
      if (!refresh_token) return ctx.badRequest("refresh_token 必填");

      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      try {
        const result = await authService.refreshToken(refresh_token);
        ctx.body = result;
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }

    ctx.badRequest("不支持的 grant_type");
  },

  async wechatRedirect(ctx: any) {
    const { app_code, channel_code } = ctx.query;
    const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
    const state = Buffer.from(JSON.stringify({ app_code: app_code || "default", channel_code: channel_code || "" })).toString("base64url");
    const url = wechatService.getAuthorizeUrl(state);
    ctx.redirect(url);
  },

  async wechatCallback(ctx: any) {
    const { code, state } = ctx.query;
    if (!code) return ctx.badRequest("微信授权码缺失");

    let stateData: any = {};
    try { stateData = JSON.parse(Buffer.from(state, "base64url").toString()); } catch {}

    const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");

    try {
      const { userId, isNew } = await wechatService.handleCallback(code);
      const appCode = stateData.app_code || "default";

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri: stateData.redirect_uri || "http://localhost:5173/sso/callback",
        channelCode: stateData.channel_code,
      });

      const redirectUri = stateData.redirect_uri || "http://localhost:5173/sso/callback";
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: "wechat_oauth_failed", message: e.message };
    }
  },

  async alipayRedirect(ctx: any) {
    const { app_code, channel_code } = ctx.query;
    const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
    const state = Buffer.from(JSON.stringify({ app_code: app_code || "default", channel_code: channel_code || "" })).toString("base64url");
    const url = alipayService.getAuthorizeUrl(state);
    ctx.redirect(url);
  },

  async alipayCallback(ctx: any) {
    const { auth_code, state } = ctx.query;
    if (!auth_code) return ctx.badRequest("支付宝授权码缺失");

    let stateData: any = {};
    try { stateData = JSON.parse(Buffer.from(state, "base64url").toString()); } catch {}

    const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");

    try {
      const { userId, isNew } = await alipayService.handleCallback(auth_code);
      const appCode = stateData.app_code || "default";

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri: stateData.redirect_uri || "http://localhost:5173/sso/callback",
        channelCode: stateData.channel_code,
      });

      const redirectUri = stateData.redirect_uri || "http://localhost:5173/sso/callback";
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: "alipay_oauth_failed", message: e.message };
    }
  },
});
```

- [ ] **Step 3: 实现 user-controller**

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx: any) {
    const ssoUser = ctx.state.ssoUser;
    if (!ssoUser) return ctx.unauthorized("未认证");

    const userService = strapi.plugin("zhao-sso").service("sso-user");
    const user = await userService.findByUuid(ssoUser.sub);
    if (!user) return ctx.notFound("用户不存在");

    const { password_hash, ...safe } = user;
    ctx.body = safe;
  },

  async bind(ctx: any) {
    const ssoUser = ctx.state.ssoUser;
    if (!ssoUser) return ctx.unauthorized("未认证");

    const { type, identifier, password, provider_data } = ctx.request.body;
    const userService = strapi.plugin("zhao-sso").service("sso-user");

    const user = await userService.findByUuid(ssoUser.sub);
    if (!user) return ctx.notFound("用户不存在");

    if (type === "mobile" || type === "email" || type === "username") {
      const updateData: any = {};
      if (type === "mobile") updateData.mobile = identifier;
      if (type === "email") updateData.email = identifier;
      if (type === "username") updateData.username = identifier;
      if (password) updateData.password_hash = await require("bcryptjs").hash(password, 12);

      await strapi.db.query("plugin::zhao-sso.sso-user").update({
        where: { id: user.id },
        data: updateData,
      });
      ctx.body = { success: true, message: `已绑定 ${type}` };
      return;
    }

    if (type === "third_party" && provider_data) {
      await strapi.db.query("plugin::zhao-sso.sso-third-party-binding").create({
        data: {
          user: { id: user.id },
          provider: provider_data.provider,
          provider_user_id: provider_data.provider_user_id,
          provider_nickname: provider_data.nickname || null,
          provider_avatar: provider_data.avatar || null,
          provider_data: provider_data.raw || null,
          bound_at: new Date(),
        },
      });
      ctx.body = { success: true, message: "已绑定第三方账号" };
      return;
    }

    ctx.badRequest("不支持的绑定类型");
  },

  async unbind(ctx: any) {
    const ssoUser = ctx.state.ssoUser;
    if (!ssoUser) return ctx.unauthorized("未认证");

    const { provider } = ctx.request.body;
    if (!provider) return ctx.badRequest("provider 必填");

    const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
    if (!user) return ctx.notFound("用户不存在");

    await strapi.db.query("plugin::zhao-sso.sso-third-party-binding").delete({
      where: { user: { id: user.id }, provider },
    });
    ctx.body = { success: true };
  },

  async changePassword(ctx: any) {
    const ssoUser = ctx.state.ssoUser;
    if (!ssoUser) return ctx.unauthorized("未认证");

    const { old_password, new_password } = ctx.request.body;
    if (!old_password || !new_password) return ctx.badRequest("old_password 和 new_password 必填");

    const userService = strapi.plugin("zhao-sso").service("sso-user");
    const user = await userService.findByUuid(ssoUser.sub);
    if (!user) return ctx.notFound("用户不存在");

    const valid = await userService.verifyPassword(user, old_password);
    if (!valid) return ctx.badRequest("旧密码错误");

    await userService.changePassword(user.id, new_password);
    ctx.body = { success: true };
  },
});
```

- [ ] **Step 4: 更新 controllers/index.ts**

```typescript
import authController from "./auth-controller";
import oauthController from "./oauth-controller";
import userController from "./user-controller";

export default {
  "auth-controller": authController,
  "oauth-controller": oauthController,
  "user-controller": userController,
};
```

---

### Task 13: 实现 API 路由

**Files:**
- Create: `e:\code\plugins\zhao-sso\server\src\routes\api.ts`
- Modify: `e:\code\plugins\zhao-sso\server\src\routes\index.ts`

- [ ] **Step 1: 实现 api.ts 路由**

```typescript
export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/sso/auth/login",
      handler: "auth-controller.login",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/sso/auth/register",
      handler: "auth-controller.register",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/sso/auth/refresh",
      handler: "auth-controller.refresh",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sso/auth/authorize",
      handler: "oauth-controller.authorize",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/sso/auth/token",
      handler: "oauth-controller.token",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sso/auth/wechat",
      handler: "oauth-controller.wechatRedirect",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sso/auth/wechat/callback",
      handler: "oauth-controller.wechatCallback",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sso/auth/alipay",
      handler: "oauth-controller.alipayRedirect",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/sso/auth/alipay/callback",
      handler: "oauth-controller.alipayCallback",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/sso/auth/verify",
      handler: "auth-controller.verify",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/sso/auth/logout",
      handler: "auth-controller.logout",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "GET",
      path: "/sso/user/me",
      handler: "user-controller.me",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/sso/user/bind",
      handler: "user-controller.bind",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/sso/user/unbind",
      handler: "user-controller.unbind",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/sso/user/change-password",
      handler: "user-controller.changePassword",
      config: {
        auth: false,
        policies: ["sso-authenticated"],
      },
    },
    {
      method: "POST",
      path: "/sso/channel/track",
      handler: "channel-controller.track",
      config: { auth: false },
    },
  ],
};
```

- [ ] **Step 2: 更新 routes/index.ts**

```typescript
import api from "./api";

export default {
  "content-api": api,
};
```

---

### Task 14: 构建、测试、验证

- [ ] **Step 1: 构建 zhao-sso**

Run: `cd e:\code\plugins\zhao-sso; npm run build`
Expected: 构建成功

- [ ] **Step 2: 运行单元测试**

Run: `cd e:\code\plugins\zhao-sso; npx jest --config tests/jest.config.ts`
Expected: 所有测试通过

- [ ] **Step 3: 重启 Strapi 验证接口可用**

Run: `cd e:\code\basic; npm run dev`

测试密码登录：
```bash
curl -X POST http://localhost:1337/api/sso/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","app_code":"default"}'
```

Expected: 返回 access_token + refresh_token + user 信息

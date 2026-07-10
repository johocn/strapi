"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const axios = require("axios");
const crypto = require("crypto");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const bcrypt__default = /* @__PURE__ */ _interopDefault(bcrypt);
const jwt__default = /* @__PURE__ */ _interopDefault(jwt);
const axios__default = /* @__PURE__ */ _interopDefault(axios);
const crypto__namespace = /* @__PURE__ */ _interopNamespace(crypto);
const ssoAuthenticated = async (policyContext, config2, { strapi }) => {
  const authHeader = policyContext.request?.headers?.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return false;
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return false;
  }
  try {
    const jwtService = strapi.plugin("zhao-sso").service("sso-jwt");
    const payload = await jwtService.verifyToken(parts[1]);
    if (payload.type !== "access") {
      return false;
    }
    const tokenRecord = await strapi.db.query("plugin::zhao-sso.sso-token").findOne({
      where: { access_token_jti: payload.jti }
    });
    if (tokenRecord?.revoked) {
      return false;
    }
    policyContext.state.ssoUser = payload;
    policyContext.state.ssoToken = parts[1];
    return true;
  } catch {
    return false;
  }
};
const register = ({ strapi }) => {
  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-sso", {
    "sso-authenticated": ssoAuthenticated
  });
  strapi.log.info("[zhao-sso] Plugin registered, policies added to registry");
};
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");
  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" }
  });
  if (!defaultApp) {
    const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
    if (!rawSecret) {
      strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
      return;
    }
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: await bcrypt__default.default.hash(rawSecret, 10),
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true
      }
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }
};
const config = {
  default: {
    jwt: {
      algorithm: "HS256",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d"
    },
    security: {
      loginMaxAttempts: 5,
      loginLockDuration: "30m",
      authCodeExpiresIn: "10m"
    },
    defaults: {
      appCode: "default"
    },
    loginUrl: "/sso/login",
    channelSync: {
      mode: "local",
      remoteUrl: "",
      appCode: "",
      appSecret: ""
    }
  }
};
const kind$d = "collectionType";
const collectionName$d = "sso_users";
const info$d = { "singularName": "sso-user", "pluralName": "sso-users", "displayName": "SSO User" };
const options$d = { "draftAndPublish": false };
const attributes$d = { "uuid": { "type": "string", "unique": true, "required": true }, "username": { "type": "string", "unique": true }, "mobile": { "type": "string", "unique": true }, "email": { "type": "email", "unique": true }, "password_hash": { "type": "string" }, "avatar_url": { "type": "string" }, "nickname": { "type": "string" }, "status": { "type": "enumeration", "enum": ["active", "blocked", "inactive"], "default": "active", "required": true }, "register_channel": { "type": "string" }, "last_login_channel": { "type": "string" }, "invite_code_used": { "type": "string" }, "invited_by": { "type": "integer" }, "utm_source": { "type": "string" }, "utm_medium": { "type": "string" }, "utm_campaign": { "type": "string" }, "last_login_at": { "type": "datetime" }, "login_count": { "type": "integer", "default": 0, "required": true }, "password_changed_at": { "type": "datetime" }, "third_party_bindings": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-sso.sso-third-party-binding", "mappedBy": "user" } };
const schema$d = {
  kind: kind$d,
  collectionName: collectionName$d,
  info: info$d,
  options: options$d,
  attributes: attributes$d
};
const ssoUser$1 = { schema: schema$d };
const kind$c = "collectionType";
const collectionName$c = "sso_third_party_bindings";
const info$c = { "singularName": "sso-third-party-binding", "pluralName": "sso-third-party-bindings", "displayName": "SSO Third Party Binding" };
const options$c = { "draftAndPublish": false };
const attributes$c = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "inversedBy": "third_party_bindings" }, "provider": { "type": "string", "required": true }, "provider_user_id": { "type": "string", "required": true }, "provider_union_id": { "type": "string" }, "provider_nickname": { "type": "string" }, "provider_avatar": { "type": "string" }, "provider_data": { "type": "json" }, "bound_at": { "type": "datetime", "required": true } };
const schema$c = {
  kind: kind$c,
  collectionName: collectionName$c,
  info: info$c,
  options: options$c,
  attributes: attributes$c
};
const ssoThirdPartyBinding = { schema: schema$c };
const kind$b = "collectionType";
const collectionName$b = "sso_apps";
const info$b = { "singularName": "sso-app", "pluralName": "sso-apps", "displayName": "SSO App" };
const options$b = { "draftAndPublish": false };
const attributes$b = { "app_code": { "type": "string", "unique": true, "required": true }, "app_name": { "type": "string", "required": true }, "app_secret": { "type": "string", "required": true }, "redirect_uris": { "type": "json", "required": true }, "allowed_grant_types": { "type": "json", "required": true }, "is_active": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$b = {
  kind: kind$b,
  collectionName: collectionName$b,
  info: info$b,
  options: options$b,
  attributes: attributes$b
};
const ssoApp$1 = { schema: schema$b };
const kind$a = "collectionType";
const collectionName$a = "sso_channels";
const info$a = { "singularName": "sso-channel", "pluralName": "sso-channels", "displayName": "SSO Channel" };
const options$a = { "draftAndPublish": false };
const attributes$a = { "channel_code": { "type": "string", "unique": true, "required": true }, "channel_name": { "type": "string", "required": true }, "channel_type": { "type": "string", "required": true }, "utm_template": { "type": "json" }, "is_active": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$a = {
  kind: kind$a,
  collectionName: collectionName$a,
  info: info$a,
  options: options$a,
  attributes: attributes$a
};
const ssoChannel$1 = { schema: schema$a };
const kind$9 = "collectionType";
const collectionName$9 = "sso_auth_codes";
const info$9 = { "singularName": "sso-auth-code", "pluralName": "sso-auth-codes", "displayName": "SSO Auth Code" };
const options$9 = { "draftAndPublish": false };
const attributes$9 = { "code": { "type": "string", "unique": true, "required": true }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "redirect_uri": { "type": "text", "required": true }, "channel_code": { "type": "string" }, "scopes": { "type": "json" }, "expires_at": { "type": "datetime", "required": true }, "used": { "type": "boolean", "default": false, "required": true } };
const schema$9 = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  attributes: attributes$9
};
const ssoAuthCode = { schema: schema$9 };
const kind$8 = "collectionType";
const collectionName$8 = "sso_tokens";
const info$8 = { "singularName": "sso-token", "pluralName": "sso-tokens", "displayName": "SSO Token" };
const options$8 = { "draftAndPublish": false };
const attributes$8 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "access_token_jti": { "type": "text", "unique": true, "required": true }, "refresh_token": { "type": "text", "unique": true, "required": true }, "refresh_expires_at": { "type": "datetime", "required": true }, "revoked": { "type": "boolean", "default": false, "required": true }, "revoked_at": { "type": "datetime" }, "channel_code": { "type": "string" } };
const schema$8 = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  attributes: attributes$8
};
const ssoToken = { schema: schema$8 };
const kind$7 = "collectionType";
const collectionName$7 = "sso_user_app_roles";
const info$7 = { "singularName": "sso-user-app-role", "pluralName": "sso-user-app-roles", "displayName": "SSO User App Role" };
const options$7 = { "draftAndPublish": false };
const attributes$7 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "role": { "type": "string", "required": true } };
const schema$7 = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  attributes: attributes$7
};
const ssoUserAppRole = { schema: schema$7 };
const kind$6 = "collectionType";
const collectionName$6 = "sso_login_logs";
const info$6 = { "singularName": "sso-login-log", "pluralName": "sso-login-logs", "displayName": "SSO Login Log" };
const options$6 = { "draftAndPublish": false };
const attributes$6 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "login_type": { "type": "string", "required": true }, "provider": { "type": "string" }, "channel_code": { "type": "string" }, "app_code": { "type": "string" }, "ip": { "type": "string" }, "user_agent": { "type": "string" }, "success": { "type": "boolean", "required": true }, "fail_reason": { "type": "string" } };
const schema$6 = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  attributes: attributes$6
};
const ssoLoginLog$1 = { schema: schema$6 };
const kind$5 = "collectionType";
const collectionName$5 = "sso_invite_codes";
const info$5 = { "singularName": "sso-invite-code", "pluralName": "sso-invite-codes", "displayName": "SSO Invite Code" };
const options$5 = { "draftAndPublish": false };
const attributes$5 = { "code": { "type": "string", "unique": true, "required": true }, "creator": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invite_type": { "type": "enumeration", "enum": ["system", "user_campaign"], "required": true }, "max_uses": { "type": "integer" }, "use_count": { "type": "integer", "default": 0, "required": true }, "per_user_limit": { "type": "integer", "default": 1, "required": true }, "valid_from": { "type": "datetime" }, "valid_until": { "type": "datetime" }, "bonus_tags": { "type": "json" }, "is_active": { "type": "boolean", "default": true, "required": true } };
const schema$5 = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  attributes: attributes$5
};
const ssoInviteCode = { schema: schema$5 };
const kind$4 = "collectionType";
const collectionName$4 = "sso_invite_usages";
const info$4 = { "singularName": "sso-invite-usage", "pluralName": "sso-invite-usages", "displayName": "SSO Invite Usage" };
const options$4 = { "draftAndPublish": false };
const attributes$4 = { "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "channel_code": { "type": "string" }, "app_code": { "type": "string" }, "used_at": { "type": "datetime", "required": true } };
const schema$4 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  attributes: attributes$4
};
const ssoInviteUsage = { schema: schema$4 };
const kind$3 = "collectionType";
const collectionName$3 = "sso_referral_relations";
const info$3 = { "singularName": "sso-referral-relation", "pluralName": "sso-referral-relations", "displayName": "SSO Referral Relation" };
const options$3 = { "draftAndPublish": false };
const attributes$3 = { "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invitee": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "level": { "type": "integer", "required": true }, "channel_code": { "type": "string" } };
const schema$3 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  attributes: attributes$3
};
const ssoReferralRelation = { schema: schema$3 };
const kind$2 = "collectionType";
const collectionName$2 = "sso_invite_stats";
const info$2 = { "singularName": "sso-invite-stats", "pluralName": "sso-invite-stats", "displayName": "SSO Invite Stats" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "invite_code": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "total_invites": { "type": "integer", "required": true }, "active_invites": { "type": "integer", "required": true }, "last_invited_at": { "type": "datetime" } };
const schema$2 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const ssoInviteStats = { schema: schema$2 };
const kind$1 = "collectionType";
const collectionName$1 = "sso_oauth_configs";
const info$1 = { "singularName": "sso-oauth-config", "pluralName": "sso-oauth-configs", "displayName": "SSO OAuth Config" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "provider": { "type": "string", "required": true }, "app_id": { "type": "string", "required": true }, "app_secret": { "type": "string", "required": true }, "scope": { "type": "string" }, "extra_config": { "type": "json" }, "redirect_uris": { "type": "json" }, "is_enabled": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$1 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const ssoOauthConfig$1 = {
  schema: schema$1
};
const kind = "collectionType";
const collectionName = "sso_sms_codes";
const info = { "singularName": "sso-sms-code", "pluralName": "sso-sms-codes", "displayName": "SSO SMS Code" };
const options = { "draftAndPublish": false };
const attributes = { "mobile": { "type": "string", "required": true }, "code": { "type": "string", "required": true }, "scene": { "type": "string", "default": "login", "required": true }, "expires_at": { "type": "datetime", "required": true }, "used": { "type": "boolean", "default": false, "required": true }, "ip": { "type": "string" }, "provider": { "type": "string", "default": "mock" } };
const schema = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const ssoSmsCode = {
  schema
};
const contentTypes = {
  "sso-user": ssoUser$1,
  "sso-third-party-binding": ssoThirdPartyBinding,
  "sso-app": ssoApp$1,
  "sso-channel": ssoChannel$1,
  "sso-auth-code": ssoAuthCode,
  "sso-token": ssoToken,
  "sso-user-app-role": ssoUserAppRole,
  "sso-login-log": ssoLoginLog$1,
  "sso-invite-code": ssoInviteCode,
  "sso-invite-usage": ssoInviteUsage,
  "sso-referral-relation": ssoReferralRelation,
  "sso-invite-stats": ssoInviteStats,
  "sso-oauth-config": ssoOauthConfig$1,
  "sso-sms-code": ssoSmsCode
};
const authController = ({ strapi }) => ({
  async login(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { type, identifier, password, code, app_code, channel_code } = body;
    if (!type) {
      ctx.status = 400;
      ctx.body = { error: "type 必填" };
      return;
    }
    if (!app_code) {
      ctx.status = 400;
      ctx.body = { error: "app_code 必填" };
      return;
    }
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.login({
        type,
        identifier,
        password,
        code,
        appCode: app_code,
        channelCode: channel_code,
        ip: ctx.request.ip,
        userAgent: ctx.request.headers["user-agent"]
      });
      ctx.body = result;
    } catch (e) {
      ctx.status = e.status || 401;
      ctx.body = { error: e.message };
    }
  },
  async sendSms(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { mobile, scene } = body;
    if (!mobile) {
      ctx.status = 400;
      ctx.body = { error: "mobile 必填" };
      return;
    }
    const smsService = strapi.plugin("zhao-sso").service("sso-sms");
    try {
      const result = await smsService.sendCode(mobile, scene || "login", ctx.request.ip);
      ctx.body = result;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async register(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    if (!body.app_code) {
      ctx.status = 400;
      ctx.body = { error: "app_code 必填" };
      return;
    }
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
        userAgent: ctx.request.headers["user-agent"]
      });
      ctx.body = result;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async verify(ctx) {
    const token = ctx.state.ssoToken;
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: "未提供 Token" };
      return;
    }
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.verifyToken(token);
      ctx.body = { valid: true, user: result.user, payload: result.payload };
    } catch (e) {
      ctx.status = e.status || 401;
      ctx.body = { valid: false, error: e.message };
    }
  },
  async refresh(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { refresh_token } = body;
    if (!refresh_token) {
      ctx.status = 400;
      ctx.body = { error: "refresh_token 必填" };
      return;
    }
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.refreshToken(refresh_token);
      ctx.body = result;
    } catch (e) {
      ctx.status = e.status || 401;
      ctx.body = { error: e.message };
    }
  },
  async logout(ctx) {
    const token = ctx.state.ssoToken;
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: "未提供 Token" };
      return;
    }
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.logout(token);
      ctx.body = result;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const oauthController = ({ strapi }) => ({
  async authorize(ctx) {
    try {
      const { app_code, redirect_uri, response_type, state, channel_code } = ctx.query;
      if (!app_code || !redirect_uri || response_type !== "code") {
        ctx.status = 400;
        ctx.body = { error: "app_code, redirect_uri, response_type=code 必填" };
        return;
      }
      const ssoUser2 = ctx.state.ssoUser;
      if (ssoUser2) {
        const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
        const code = await oauthService.generateAuthCode({
          userId: ssoUser2.sub,
          appCode: app_code,
          redirectUri: redirect_uri,
          channelCode: channel_code
        });
        const separator = redirect_uri.includes("?") ? "&" : "?";
        ctx.redirect(`${redirect_uri}${separator}code=${code}&state=${state || ""}`);
        return;
      }
      ctx.body = { message: "SSO login required", app_code, redirect_uri, state, channel_code };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async token(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { grant_type, code, app_code, app_secret, redirect_uri } = body;
    if (grant_type === "authorization_code") {
      if (!code || !app_code || !app_secret || !redirect_uri) {
        ctx.status = 400;
        ctx.body = { error: "code, app_code, app_secret, redirect_uri 必填" };
        return;
      }
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      try {
        const { userId, channelCode } = await oauthService.exchangeCode({ code, appCode: app_code, appSecret: app_secret, redirectUri: redirect_uri });
        const userService = strapi.plugin("zhao-sso").service("sso-user");
        const user = await userService.findById(userId);
        await userService.updateLoginInfo(user.id, channelCode);
        const roles = await authService.getUserRoles(user.id, app_code);
        const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
          sub: user.uuid,
          app_code,
          roles,
          channel: channelCode
        });
        await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);
        ctx.body = tokenPair;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }
    if (grant_type === "refresh_token") {
      const { refresh_token } = body;
      if (!refresh_token) {
        ctx.status = 400;
        ctx.body = { error: "refresh_token 必填" };
        return;
      }
      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      try {
        const result = await authService.refreshToken(refresh_token);
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }
    ctx.status = 400;
    ctx.body = { error: "不支持的 grant_type" };
    return;
  },
  async wechatRedirect(ctx) {
    try {
      const { app_code, channel_code, redirect_uri } = ctx.query;
      if (!redirect_uri) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 必填" };
        return;
      }
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const state = Buffer.from(JSON.stringify({
        app_code: app_code || "default",
        channel_code: channel_code || "",
        redirect_uri
      })).toString("base64url");
      const url = await wechatService.getAuthorizeUrl(state);
      ctx.redirect(url);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async wechatCallback(ctx) {
    const { code, state } = ctx.query;
    if (!code) {
      ctx.status = 400;
      ctx.body = { error: "微信授权码缺失" };
      return;
    }
    let stateData = {};
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
    }
    const redirectUri = stateData.redirect_uri;
    if (!redirectUri) {
      ctx.status = 400;
      ctx.body = { error: "state 中 redirect_uri 缺失" };
      return;
    }
    const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    try {
      const { userId } = await wechatService.handleCallback(code);
      const appCode = stateData.app_code || "default";
      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code
      });
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: "wechat_oauth_failed", message: e.message };
    }
  },
  async alipayRedirect(ctx) {
    try {
      const { app_code, channel_code, redirect_uri } = ctx.query;
      if (!redirect_uri) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 必填" };
        return;
      }
      const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
      const state = Buffer.from(JSON.stringify({
        app_code: app_code || "default",
        channel_code: channel_code || "",
        redirect_uri
      })).toString("base64url");
      const url = await alipayService.getAuthorizeUrl(state);
      ctx.redirect(url);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async alipayCallback(ctx) {
    const { auth_code, state } = ctx.query;
    if (!auth_code) {
      ctx.status = 400;
      ctx.body = { error: "支付宝授权码缺失" };
      return;
    }
    let stateData = {};
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
    }
    const redirectUri = stateData.redirect_uri;
    if (!redirectUri) {
      ctx.status = 400;
      ctx.body = { error: "state 中 redirect_uri 缺失" };
      return;
    }
    const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    try {
      const { userId } = await alipayService.handleCallback(auth_code);
      const appCode = stateData.app_code || "default";
      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code
      });
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: "alipay_oauth_failed", message: e.message };
    }
  }
});
const userController = ({ strapi }) => ({
  async me(ctx) {
    try {
      const ssoUser2 = ctx.state.ssoUser;
      if (!ssoUser2) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser2.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }
      ctx.body = user;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async bind(ctx) {
    try {
      const ssoUser2 = ctx.state.ssoUser;
      if (!ssoUser2) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const { type, identifier, password, provider_data } = body;
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser2.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }
      if (type === "mobile" || type === "email" || type === "username") {
        await userService.bindContact(user.id, type, identifier, password);
        ctx.body = { success: true, message: `已绑定 ${type}` };
        return;
      }
      if (type === "third_party" && provider_data) {
        await userService.bindThirdParty(user.id, provider_data);
        ctx.body = { success: true, message: "已绑定第三方账号" };
        return;
      }
      ctx.status = 400;
      ctx.body = { error: "不支持的绑定类型" };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async unbind(ctx) {
    try {
      const ssoUser2 = ctx.state.ssoUser;
      if (!ssoUser2) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const { provider } = body;
      if (!provider) {
        ctx.status = 400;
        ctx.body = { error: "provider 必填" };
        return;
      }
      const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser2.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }
      await strapi.plugin("zhao-sso").service("sso-user").unbindThirdParty(user.id, provider);
      ctx.body = { success: true };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async changePassword(ctx) {
    try {
      const ssoUser2 = ctx.state.ssoUser;
      if (!ssoUser2) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const { old_password, new_password } = body;
      if (!old_password || !new_password) {
        ctx.status = 400;
        ctx.body = { error: "old_password 和 new_password 必填" };
        return;
      }
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findByUuid(ssoUser2.sub);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }
      const valid = await userService.verifyPassword(user, old_password);
      if (!valid) {
        ctx.status = 400;
        ctx.body = { error: "旧密码错误" };
        return;
      }
      await userService.changePassword(user.id, new_password);
      ctx.body = { success: true };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const channelController = ({ strapi }) => ({
  async track(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { channel_code, utm_source, utm_medium, utm_campaign } = body;
      if (!channel_code) {
        ctx.status = 400;
        ctx.body = { error: "channel_code 必填" };
        return;
      }
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const result = await channelService.trackClick(channel_code, {
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign
      });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "渠道不存在" };
        return;
      }
      ctx.body = { success: true, channel: result.channel, utm: result.utm };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const adminController = ({ strapi }) => ({
  async dashboard(ctx) {
    try {
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const totalUsers = await userService.count();
      const activeUsers = await userService.count({ status: "active" });
      const blockedUsers = await userService.count({ status: "blocked" });
      const todayLogins = await loginLogService.count({
        success: true,
        created_at: { $gte: new Date((/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0)) }
      });
      const totalApps = await appService.count();
      const totalChannels = await channelService.count();
      ctx.body = {
        stats: { totalUsers, activeUsers, blockedUsers, todayLogins, totalApps, totalChannels }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async listUsers(ctx) {
    try {
      const { page = 1, pageSize = 25, search, status } = ctx.query;
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const where = {};
      if (status) where.status = status;
      if (search) {
        where.$or = [
          { email: { $contains: search } },
          { username: { $contains: search } },
          { mobile: { $contains: search } }
        ];
      }
      const users = await userService.findMany({
        where,
        orderBy: { created_at: "desc" },
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize)
      });
      const total = await userService.count(where);
      ctx.body = { users, meta: { pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total } } };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async getUser(ctx) {
    try {
      const { id } = ctx.params;
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findOneWithBindings(parseInt(id));
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "用户不存在" };
        return;
      }
      ctx.body = user;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateUser(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.updateAdmin(parseInt(id), data);
      ctx.body = user;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async listApps(ctx) {
    try {
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const apps = await appService.findMany();
      ctx.body = apps;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async createApp(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const app = await appService.create({
        app_code: body.app_code,
        app_name: body.app_name,
        app_secret: body.app_secret,
        redirect_uris: body.redirect_uris,
        allowed_grant_types: body.allowed_grant_types,
        is_active: body.is_active,
        description: body.description
      });
      ctx.body = app;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateApp(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const app = await appService.update(parseInt(id), data);
      ctx.body = app;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async listChannels(ctx) {
    try {
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channels = await channelService.listAllAdmin();
      ctx.body = channels;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async createChannel(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channel = await channelService.create({
        channel_code: body.channel_code,
        channel_name: body.channel_name,
        channel_type: body.channel_type,
        utm_template: body.utm_template,
        is_active: body.is_active,
        description: body.description
      });
      ctx.body = channel;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateChannel(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const channel = await channelService.update(parseInt(id), data);
      ctx.body = channel;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async listLoginLogs(ctx) {
    try {
      const { page = 1, pageSize = 25, login_type, success } = ctx.query;
      const loginLogService = strapi.plugin("zhao-sso").service("sso-login-log");
      const where = {};
      if (login_type) where.login_type = login_type;
      if (success !== void 0) where.success = success === "true";
      const logs = await loginLogService.findManyPaginated({
        where,
        orderBy: { created_at: "desc" },
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize),
        populate: { user: { select: ["id", "uuid", "email", "username", "nickname"] } }
      });
      const total = await loginLogService.count(where);
      ctx.body = { logs, meta: { pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total } } };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async channelReport(ctx) {
    try {
      const channelService = strapi.plugin("zhao-sso").service("sso-channel");
      const report = await channelService.channelReport();
      ctx.body = report;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$8 = "plugin::zhao-sso.sso-token";
const tokenController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$8).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$8).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$8).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Token 不存在" };
        return;
      }
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$8).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$7 = "plugin::zhao-sso.sso-auth-code";
const authCodeController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$7).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$7).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$7).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "授权码不存在" };
        return;
      }
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$7).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$6 = "plugin::zhao-sso.sso-third-party-binding";
const bindingController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$6).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$6).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$6).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "绑定记录不存在" };
        return;
      }
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$6).create({ data, populate: "*" });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$6).update({ documentId: id, data, populate: "*" });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$6).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$5 = "plugin::zhao-sso.sso-oauth-config";
const sanitize$1 = (doc) => {
  if (!doc) return doc;
  const { app_secret, ...rest } = doc;
  return rest;
};
const oauthConfigController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$5).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$5).count({ where: filters });
      ctx.body = {
        data: (results || []).map(sanitize$1),
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$5).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "OAuth 配置不存在" };
        return;
      }
      ctx.body = { data: sanitize$1(result) };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$5).create({ data, populate: "*" });
      ctx.body = { data: sanitize$1(result) };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$5).update({ documentId: id, data, populate: "*" });
      ctx.body = { data: sanitize$1(result) };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$5).delete({ documentId: id });
      ctx.body = { data: sanitize$1(result) };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$4 = "plugin::zhao-sso.sso-user-app-role";
const roleController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$4).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$4).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$4).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "用户应用角色不存在" };
        return;
      }
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$4).create({ data, populate: "*" });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$4).update({ documentId: id, data, populate: "*" });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$4).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$3 = "plugin::zhao-sso.sso-invite-code";
const inviteCodeController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$3).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$3).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID$3).create({ data, populate: "*" });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$3).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async validate(ctx) {
    try {
      const { id } = ctx.params;
      const code = await strapi.documents(UID$3).findOne({ documentId: id });
      if (!code) {
        ctx.body = { valid: false, reason: "邀请码不存在" };
        return;
      }
      if (!code.is_active) {
        ctx.body = { valid: false, reason: "邀请码未启用" };
        return;
      }
      const now = /* @__PURE__ */ new Date();
      if (code.valid_from && new Date(code.valid_from) > now) {
        ctx.body = { valid: false, reason: "邀请码尚未生效" };
        return;
      }
      if (code.valid_until && new Date(code.valid_until) < now) {
        ctx.body = { valid: false, reason: "邀请码已过期" };
        return;
      }
      if (code.max_uses != null && code.use_count >= code.max_uses) {
        ctx.body = { valid: false, reason: "邀请码已达使用上限" };
        return;
      }
      ctx.body = { valid: true };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$2 = "plugin::zhao-sso.sso-invite-usage";
const inviteUsageController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$2).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$2).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$2).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID$1 = "plugin::zhao-sso.sso-referral-relation";
const referralController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID$1).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$1).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID$1).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const UID = "plugin::zhao-sso.sso-sms-code";
const smsCodeController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const controllers = {
  "auth-controller": authController,
  "oauth-controller": oauthController,
  "user-controller": userController,
  "channel-controller": channelController,
  "admin-controller": adminController,
  token: tokenController,
  "auth-code": authCodeController,
  binding: bindingController,
  "oauth-config": oauthConfigController,
  role: roleController,
  "invite-code": inviteCodeController,
  "invite-usage": inviteUsageController,
  referral: referralController,
  "sms-code": smsCodeController
};
const api = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由 =====
    {
      method: "POST",
      path: "/v1/auth/login",
      handler: "auth-controller.login",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/register",
      handler: "auth-controller.register",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/send-sms",
      handler: "auth-controller.sendSms",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/refresh",
      handler: "auth-controller.refresh",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/authorize",
      handler: "oauth-controller.authorize",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/token",
      handler: "oauth-controller.token",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/wechat",
      handler: "oauth-controller.wechatRedirect",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/wechat/callback",
      handler: "oauth-controller.wechatCallback",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/alipay",
      handler: "oauth-controller.alipayRedirect",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/alipay/callback",
      handler: "oauth-controller.alipayCallback",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/channel/track",
      handler: "channel-controller.track",
      config: { auth: false }
    },
    // ===== SSO 认证路由 =====
    {
      method: "POST",
      path: "/v1/auth/verify",
      handler: "auth-controller.verify",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/auth/logout",
      handler: "auth-controller.logout",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "GET",
      path: "/v1/user/me",
      handler: "user-controller.me",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/user/bind",
      handler: "user-controller.bind",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/user/unbind",
      handler: "user-controller.unbind",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/user/change-password",
      handler: "user-controller.changePassword",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    }
  ]
});
const hasZhaoAuth = () => {
  try {
    const s = globalThis.strapi;
    return !!(s && s.plugin && s.plugin("zhao-auth"));
  } catch {
    return false;
  }
};
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: hasZhaoAuth() ? [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ] : [
      "plugin::zhao-sso.fallback-authenticated",
      "plugin::zhao-sso.fallback-has-permission"
    ]
  }
});
const admin = () => ({
  type: "content-api",
  routes: [
    adminRoute("GET", "/dashboard", "admin-controller.dashboard", "sso.dashboard"),
    adminRoute("GET", "/users", "admin-controller.listUsers", "sso.user-read"),
    adminRoute("GET", "/users/:id", "admin-controller.getUser", "sso.user-read"),
    adminRoute("PUT", "/users/:id", "admin-controller.updateUser", "sso.user-update"),
    adminRoute("GET", "/apps", "admin-controller.listApps", "sso.app-read"),
    adminRoute("POST", "/apps", "admin-controller.createApp", "sso.app-create"),
    adminRoute("PUT", "/apps/:id", "admin-controller.updateApp", "sso.app-update"),
    adminRoute("GET", "/channels", "admin-controller.listChannels", "sso.channel-read"),
    adminRoute("POST", "/channels", "admin-controller.createChannel", "sso.channel-create"),
    adminRoute("PUT", "/channels/:id", "admin-controller.updateChannel", "sso.channel-update"),
    adminRoute("GET", "/login-logs", "admin-controller.listLoginLogs", "sso.log-read"),
    adminRoute("GET", "/channel-report", "admin-controller.channelReport", "sso.dashboard"),
    // Token 管理
    adminRoute("GET", "/tokens", "token.list", "sso.token.read"),
    adminRoute("GET", "/tokens/:id", "token.findOne", "sso.token.read"),
    adminRoute("DELETE", "/tokens/:id", "token.delete", "sso.token.delete"),
    // 授权码管理
    adminRoute("GET", "/auth-codes", "auth-code.list", "sso.auth-code.read"),
    adminRoute("GET", "/auth-codes/:id", "auth-code.findOne", "sso.auth-code.read"),
    adminRoute("DELETE", "/auth-codes/:id", "auth-code.delete", "sso.auth-code.delete"),
    // 三方绑定
    adminRoute("GET", "/bindings", "binding.list", "sso.third-party-binding.read"),
    adminRoute("GET", "/bindings/:id", "binding.findOne", "sso.third-party-binding.read"),
    adminRoute("POST", "/bindings", "binding.create", "sso.third-party-binding.create"),
    adminRoute("PUT", "/bindings/:id", "binding.update", "sso.third-party-binding.update"),
    adminRoute("DELETE", "/bindings/:id", "binding.delete", "sso.third-party-binding.delete"),
    // OAuth 配置
    adminRoute("GET", "/oauth-configs", "oauth-config.list", "sso.oauth-config.read"),
    adminRoute("GET", "/oauth-configs/:id", "oauth-config.findOne", "sso.oauth-config.read"),
    adminRoute("POST", "/oauth-configs", "oauth-config.create", "sso.oauth-config.create"),
    adminRoute("PUT", "/oauth-configs/:id", "oauth-config.update", "sso.oauth-config.update"),
    adminRoute("DELETE", "/oauth-configs/:id", "oauth-config.delete", "sso.oauth-config.delete"),
    // 用户应用角色
    adminRoute("GET", "/user-app-roles", "role.list", "sso.user-app-role.read"),
    adminRoute("GET", "/user-app-roles/:id", "role.findOne", "sso.user-app-role.read"),
    adminRoute("POST", "/user-app-roles", "role.create", "sso.user-app-role.create"),
    adminRoute("PUT", "/user-app-roles/:id", "role.update", "sso.user-app-role.update"),
    adminRoute("DELETE", "/user-app-roles/:id", "role.delete", "sso.user-app-role.delete"),
    // 邀请码
    adminRoute("GET", "/invite-codes", "invite-code.list", "sso.invite-code.read"),
    adminRoute("POST", "/invite-codes", "invite-code.create", "sso.invite-code.create"),
    adminRoute("DELETE", "/invite-codes/:id", "invite-code.delete", "sso.invite-code.delete"),
    adminRoute("POST", "/invite-codes/:id/validate", "invite-code.validate", "sso.invite-code.validate"),
    // 邀请记录
    adminRoute("GET", "/invite-usages", "invite-usage.list", "sso.invite-usage.read"),
    adminRoute("DELETE", "/invite-usages/:id", "invite-usage.delete", "sso.invite-usage.delete"),
    // 推荐关系
    adminRoute("GET", "/referral-relations", "referral.list", "sso.referral-relation.read"),
    adminRoute("DELETE", "/referral-relations/:id", "referral.delete", "sso.referral-relation.delete"),
    // 短信验证码
    adminRoute("GET", "/sms-codes", "sms-code.list", "sso.sms-code.read"),
    adminRoute("DELETE", "/sms-codes/:id", "sms-code.delete", "sso.sms-code.delete")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...api().routes, ...admin().routes]
  }
};
const ssoJwt = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  const getSecret = () => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso");
    const secret = pluginConfig?.jwt?.secret || process.env.SSO_JWT_SECRET;
    if (!secret) throwErr("SSO_JWT_001", 500, "[zhao-sso] JWT secret not configured. Set SSO_JWT_SECRET env.");
    return secret;
  };
  const getAlgorithm = () => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso");
    return pluginConfig?.jwt?.algorithm || "HS256";
  };
  const getAccessTokenExpiry = () => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso");
    return pluginConfig?.jwt?.accessTokenExpiresIn || "15m";
  };
  const getRefreshTokenExpiry = () => {
    const pluginConfig = strapi.config.get("plugin::zhao-sso");
    return pluginConfig?.jwt?.refreshTokenExpiresIn || "30d";
  };
  const signAccessToken = async (payload) => {
    const signPayload = {
      ...payload,
      type: "access",
      jti: uuid.v4()
    };
    const options2 = {
      algorithm: getAlgorithm(),
      expiresIn: getAccessTokenExpiry()
    };
    return jwt__default.default.sign(signPayload, getSecret(), options2);
  };
  const signRefreshToken = async (payload) => {
    const signPayload = {
      ...payload,
      type: "refresh",
      jti: uuid.v4()
    };
    const options2 = {
      algorithm: getAlgorithm(),
      expiresIn: getRefreshTokenExpiry()
    };
    return jwt__default.default.sign(signPayload, getSecret(), options2);
  };
  const signTokenPair = async (payload) => {
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload)
    ]);
    const decoded = jwt__default.default.decode(accessToken);
    const expiresIn = decoded.exp - decoded.iat;
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: "Bearer"
    };
  };
  const verifyToken = async (token) => {
    return jwt__default.default.verify(token, getSecret(), { algorithms: [getAlgorithm()] });
  };
  const extractToken = (ctx) => {
    const authHeader = ctx.request?.headers?.authorization || ctx.headers?.authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    return parts[1];
  };
  return {
    getSecret,
    signAccessToken,
    signRefreshToken,
    signTokenPair,
    verifyToken,
    extractToken
  };
};
const USER_UID$2 = "plugin::zhao-sso.sso-user";
function sanitize(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}
const ssoUser = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async createUser(data) {
      if (!data.username && !data.mobile && !data.email) {
        throwErr("SSO_USER_001", 400, "username/mobile/email at least one required");
      }
      const password_hash = data.password ? await bcrypt__default.default.hash(data.password, 12) : null;
      return strapi.db.query(USER_UID$2).create({
        data: {
          uuid: uuid.v4(),
          username: data.username || null,
          mobile: data.mobile || null,
          email: data.email || null,
          password_hash,
          status: "active",
          register_channel: data.register_channel || null,
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          invite_code_used: data.invite_code_used || null,
          login_count: 0
        }
      });
    },
    async findByIdentifier(identifier) {
      return strapi.db.query(USER_UID$2).findOne({
        where: {
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier },
            { mobile: identifier }
          ]
        }
      });
    },
    async findByUuid(uuid2) {
      const user = await strapi.db.query(USER_UID$2).findOne({ where: { uuid: uuid2 } });
      return sanitize(user);
    },
    async verifyPassword(user, password) {
      if (!user.password_hash) {
        const raw = await strapi.db.query(USER_UID$2).findOne({ where: { id: user.id }, select: ["password_hash"] });
        if (!raw?.password_hash) return false;
        return bcrypt__default.default.compare(password, raw.password_hash);
      }
      return bcrypt__default.default.compare(password, user.password_hash);
    },
    async updateLoginInfo(userId, channelCode) {
      const current = await strapi.db.query(USER_UID$2).findOne({ where: { id: userId } });
      const updateData = {
        last_login_at: /* @__PURE__ */ new Date(),
        login_count: (current?.login_count || 0) + 1
      };
      if (channelCode) {
        updateData.last_login_channel = channelCode;
      }
      return strapi.db.query(USER_UID$2).update({
        where: { id: userId },
        data: updateData
      });
    },
    async changePassword(userId, newPassword) {
      const password_hash = await bcrypt__default.default.hash(newPassword, 12);
      return strapi.db.query(USER_UID$2).update({
        where: { id: userId },
        data: { password_hash, password_changed_at: /* @__PURE__ */ new Date() }
      });
    },
    async isBlocked(user) {
      return user.status === "blocked";
    },
    async findById(id) {
      const user = await strapi.db.query(USER_UID$2).findOne({ where: { id } });
      return sanitize(user);
    },
    async bindContact(userId, type, identifier, password) {
      const updateData = {};
      if (type === "mobile") updateData.mobile = identifier;
      if (type === "email") updateData.email = identifier;
      if (type === "username") updateData.username = identifier;
      if (password) updateData.password_hash = await bcrypt__default.default.hash(password, 12);
      return strapi.db.query(USER_UID$2).update({ where: { id: userId }, data: updateData });
    },
    async bindThirdParty(userId, providerData) {
      return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").create({
        data: {
          user: { id: userId },
          provider: providerData.provider,
          provider_user_id: providerData.provider_user_id,
          provider_nickname: providerData.nickname || null,
          provider_avatar: providerData.avatar || null,
          provider_data: providerData.raw || null,
          bound_at: /* @__PURE__ */ new Date()
        }
      });
    },
    async unbindThirdParty(userId, provider) {
      return strapi.db.query("plugin::zhao-sso.sso-third-party-binding").delete({
        where: { user: { id: userId }, provider }
      });
    },
    async count(where) {
      return strapi.db.query(USER_UID$2).count({ where });
    },
    async findMany(params) {
      const users = await strapi.db.query(USER_UID$2).findMany({
        where: params.where || {},
        orderBy: params.orderBy || { created_at: "desc" },
        limit: params.limit,
        offset: params.offset
      });
      return users.map(sanitize);
    },
    async findOneWithBindings(id) {
      const user = await strapi.db.query(USER_UID$2).findOne({
        where: { id },
        populate: { third_party_bindings: true }
      });
      return sanitize(user);
    },
    async updateAdmin(id, body) {
      const allowedFields = ["status", "nickname", "username"];
      const data = {};
      for (const field of allowedFields) {
        if (body[field] !== void 0) data[field] = body[field];
      }
      const user = await strapi.db.query(USER_UID$2).update({ where: { id }, data });
      return sanitize(user);
    }
  };
};
const LOG_UID = "plugin::zhao-sso.sso-login-log";
const ssoLoginLog = ({ strapi }) => ({
  async log(params) {
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
        fail_reason: params.failReason || null
      }
    });
  },
  async getRecentFailCount(identifier, windowMinutes = 5) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1e3);
    const logs = await strapi.db.query(LOG_UID).findMany({
      where: {
        $or: [{ ip: identifier }],
        success: false,
        created_at: { $gte: since }
      }
    });
    return logs.length;
  },
  async getUserLogs(userId, limit = 20) {
    return strapi.db.query(LOG_UID).findMany({
      where: { user: { id: userId } },
      orderBy: { created_at: "desc" },
      limit
    });
  },
  async count(where) {
    return strapi.db.query(LOG_UID).count({ where });
  },
  async findManyPaginated(params) {
    return strapi.db.query(LOG_UID).findMany({
      where: params.where || {},
      orderBy: params.orderBy || { created_at: "desc" },
      limit: params.limit,
      offset: params.offset,
      populate: params.populate
    });
  }
});
const CHANNEL_UID = "plugin::zhao-sso.sso-channel";
const ssoChannel = ({ strapi }) => ({
  async findByCode(channelCode) {
    return strapi.db.query(CHANNEL_UID).findOne({
      where: { channel_code: channelCode, is_active: true }
    });
  },
  async trackClick(channelCode, utmParams) {
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
      orderBy: { channel_code: "asc" }
    });
  },
  async count(where) {
    return strapi.db.query(CHANNEL_UID).count({ where });
  },
  async listAllAdmin() {
    return strapi.db.query(CHANNEL_UID).findMany({ orderBy: { channel_code: "asc" } });
  },
  async create(data) {
    return strapi.db.query(CHANNEL_UID).create({
      data: {
        channel_code: data.channel_code,
        channel_name: data.channel_name,
        channel_type: data.channel_type,
        utm_template: data.utm_template || null,
        is_active: data.is_active !== void 0 ? data.is_active : true,
        description: data.description || null
      }
    });
  },
  async update(id, body) {
    const allowedFields = ["channel_name", "channel_type", "utm_template", "is_active", "description"];
    const data = {};
    for (const field of allowedFields) {
      if (body[field] !== void 0) data[field] = body[field];
    }
    return strapi.db.query(CHANNEL_UID).update({ where: { id }, data });
  },
  async channelReport() {
    const channels = await strapi.db.query(CHANNEL_UID).findMany({ where: { is_active: true } });
    const userService = () => strapi.plugin("zhao-sso").service("sso-user");
    const loginLogService = () => strapi.plugin("zhao-sso").service("sso-login-log");
    const report = [];
    for (const ch of channels) {
      const registrations = await userService().count({ where: { register_channel: ch.channel_code } });
      const logins = await loginLogService().count({ where: { channel_code: ch.channel_code, success: true } });
      report.push({ channel_code: ch.channel_code, channel_name: ch.channel_name, registrations, logins });
    }
    return report;
  }
});
const AUTH_CODE_UID = "plugin::zhao-sso.sso-auth-code";
const APP_UID$1 = "plugin::zhao-sso.sso-app";
function parseDuration(str) {
  const match = str.match(/^(\d+)(m|d|h|s)$/);
  if (!match) return 10 * 60 * 1e3;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s":
      return val * 1e3;
    case "m":
      return val * 60 * 1e3;
    case "h":
      return val * 60 * 60 * 1e3;
    case "d":
      return val * 24 * 60 * 60 * 1e3;
    default:
      return 10 * 60 * 1e3;
  }
}
const ssoOauth = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async generateAuthCode(params) {
      const { userId, appCode, redirectUri, channelCode, scopes } = params;
      const app = await this.findApp(appCode);
      if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
      if (!this.validateRedirectUri(app, redirectUri)) throwErr("SSO_OAUTH_002", 400, "redirect_uri 不在允许列表中");
      const code = uuid.v4() + "-" + uuid.v4();
      const pluginConfig = strapi.config.get("plugin::zhao-sso");
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
          used: false
        }
      });
      return code;
    },
    async exchangeCode(params) {
      const { code, appCode, appSecret, redirectUri } = params;
      const app = await this.findApp(appCode);
      if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
      if (!bcrypt__default.default.compareSync(appSecret, app.app_secret)) throwErr("SSO_OAUTH_003", 401, "app_secret 验证失败");
      const authCode = await strapi.db.query(AUTH_CODE_UID).findOne({
        where: { code, app_code: appCode }
      });
      if (!authCode) throwErr("SSO_OAUTH_004", 404, "授权码不存在");
      if (authCode.used) throwErr("SSO_OAUTH_005", 400, "授权码已使用");
      if (new Date(authCode.expires_at) < /* @__PURE__ */ new Date()) throwErr("SSO_OAUTH_006", 400, "授权码已过期");
      if (authCode.redirect_uri !== redirectUri) throwErr("SSO_OAUTH_007", 400, "redirect_uri 不匹配");
      await strapi.db.query(AUTH_CODE_UID).update({
        where: { id: authCode.id },
        data: { used: true }
      });
      return {
        userId: authCode.user.id,
        channelCode: authCode.channel_code,
        scopes: authCode.scopes
      };
    },
    async findApp(appCode) {
      return strapi.db.query(APP_UID$1).findOne({ where: { app_code: appCode } });
    },
    validateRedirectUri(app, redirectUri) {
      const allowed = app.redirect_uris || [];
      return allowed.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          return regex.test(redirectUri);
        }
        return pattern === redirectUri;
      });
    }
  };
};
const TOKEN_UID = "plugin::zhao-sso.sso-token";
const USER_ROLE_UID = "plugin::zhao-sso.sso-user-app-role";
const ssoAuth$1 = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  const jwtService = () => strapi.plugin("zhao-sso").service("sso-jwt");
  const userService = () => strapi.plugin("zhao-sso").service("sso-user");
  const loginLogService = () => strapi.plugin("zhao-sso").service("sso-login-log");
  const getChannelSync = () => {
    const channelSyncService = strapi.plugin("zhao-sso").service("channel-sync");
    if (!channelSyncService || typeof channelSyncService.getSync !== "function") return null;
    return channelSyncService.getSync();
  };
  const syncChannelInvite = async (ssoUserId, inviteCode, channelCode) => {
    try {
      const ssoFlag = await strapi.documents("plugin::zhao-common.feature-flag").findMany({
        filters: { flagKey: "sso_enabled" }
      });
      const flag = Array.isArray(ssoFlag) ? ssoFlag[0] : null;
      if (!flag || flag.flagValue !== true || flag.enabled === false) {
        return;
      }
      const channelSync2 = getChannelSync();
      if (!channelSync2) return;
      const result = await channelSync2.syncUserInvite(ssoUserId, inviteCode, channelCode);
      if (result.success) {
        strapi.log.info(`[zhao-sso] 分销双写成功: userId=${ssoUserId}, channelCode=${channelCode}`);
      } else {
        strapi.log.warn(`[zhao-sso] 分销双写失败: userId=${ssoUserId}, ${result.message}`);
      }
    } catch (e) {
      strapi.log.warn(`[zhao-sso] 分销双写失败: ${e.message}`);
    }
  };
  const login = async (params) => {
    const { type, identifier, password, code, appCode, channelCode, ip, userAgent } = params;
    const maxAttempts = 5;
    if (ip) {
      const failCount = await loginLogService().getRecentFailCount(ip, 5);
      if (failCount >= maxAttempts) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "too_many_attempts" });
        throwErr("SSO_AUTH_001", 429, "登录失败次数过多，请30分钟后重试");
      }
    }
    if (type === "password") {
      if (!identifier || !password) throwErr("SSO_AUTH_002", 400, "identifier 和 password 必填");
      const user = await userService().findByIdentifier(identifier);
      if (!user) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_not_found" });
        throwErr("SSO_AUTH_003", 401, "用户名/邮箱/手机号或密码错误");
      }
      if (await userService().isBlocked(user)) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_blocked" });
        throwErr("SSO_AUTH_004", 403, "账号已被封禁");
      }
      const valid = await userService().verifyPassword(user, password);
      if (!valid) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "wrong_password" });
        throwErr("SSO_AUTH_003", 401, "用户名/邮箱/手机号或密码错误");
      }
      await userService().updateLoginInfo(user.id, channelCode);
      const roles = await getUserRoles(user.id, appCode);
      const tokenPair = await jwtService().signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode
      });
      await saveTokenRecord(user.id, appCode, tokenPair, channelCode);
      await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: true });
      await syncChannelInvite(user.id, void 0, channelCode);
      return {
        ...tokenPair,
        user: sanitizeUser(user)
      };
    }
    if (type === "sms") {
      if (!identifier || !code) throwErr("SSO_AUTH_002", 400, "identifier(mobile) 和 code 必填");
      const smsService = strapi.plugin("zhao-sso").service("sso-sms");
      await smsService.verifyCode(identifier, code, "login");
      const user = await userService().findByIdentifier(identifier);
      if (!user) {
        await loginLogService().log({ loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_not_found" });
        throwErr("SSO_AUTH_003", 401, "手机号未注册");
      }
      if (await userService().isBlocked(user)) {
        await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: false, failReason: "user_blocked" });
        throwErr("SSO_AUTH_004", 403, "账号已被封禁");
      }
      await userService().updateLoginInfo(user.id, channelCode);
      const roles = await getUserRoles(user.id, appCode);
      const tokenPair = await jwtService().signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode
      });
      await saveTokenRecord(user.id, appCode, tokenPair, channelCode);
      await loginLogService().log({ userId: user.id, loginType: type, channelCode, appCode, ip, userAgent, success: true });
      await syncChannelInvite(user.id, void 0, channelCode);
      return {
        ...tokenPair,
        user: sanitizeUser(user)
      };
    }
    throwErr("SSO_AUTH_005", 400, `不支持的登录类型: ${type}`);
  };
  const register2 = async (params) => {
    const { appCode, channelCode, inviteCode, utmSource, utmMedium, utmCampaign } = params;
    const user = await userService().createUser({
      username: params.username,
      mobile: params.mobile,
      email: params.email,
      password: params.password,
      register_channel: channelCode,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      invite_code_used: inviteCode
    });
    const roles = await getUserRoles(user.id, appCode);
    const tokenPair = await jwtService().signTokenPair({
      sub: user.uuid,
      app_code: appCode,
      roles,
      channel: channelCode
    });
    await saveTokenRecord(user.id, appCode, tokenPair, channelCode);
    await loginLogService().log({
      userId: user.id,
      loginType: "register",
      channelCode,
      appCode,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true
    });
    await syncChannelInvite(user.id, inviteCode, channelCode);
    return {
      ...tokenPair,
      user: sanitizeUser(user)
    };
  };
  const verifyToken = async (token) => {
    const payload = await jwtService().verifyToken(token);
    if (payload.type !== "access") throwErr("SSO_AUTH_006", 401, "无效的 access token");
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti }
    });
    if (tokenRecord?.revoked) throwErr("SSO_AUTH_007", 401, "Token 已被撤销");
    const user = await userService().findByUuid(payload.sub);
    if (!user) throwErr("SSO_AUTH_008", 404, "用户不存在");
    if (await userService().isBlocked(user)) throwErr("SSO_AUTH_004", 403, "账号已被封禁");
    return { payload, user: sanitizeUser(user) };
  };
  const refreshToken = async (refreshToken2) => {
    const payload = await jwtService().verifyToken(refreshToken2);
    if (payload.type !== "refresh") throwErr("SSO_AUTH_009", 401, "无效的 refresh token");
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { refresh_token: refreshToken2 }
    });
    if (!tokenRecord) throwErr("SSO_AUTH_010", 404, "Token 记录不存在");
    if (tokenRecord.revoked) throwErr("SSO_AUTH_011", 401, "Refresh token 已被撤销");
    if (new Date(tokenRecord.refresh_expires_at) < /* @__PURE__ */ new Date()) throwErr("SSO_AUTH_012", 401, "Refresh token 已过期");
    await strapi.db.query(TOKEN_UID).update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revoked_at: /* @__PURE__ */ new Date() }
    });
    const user = await userService().findByUuid(payload.sub);
    if (!user) throwErr("SSO_AUTH_008", 404, "用户不存在");
    const roles = await getUserRoles(user.id, payload.app_code);
    const newTokenPair = await jwtService().signTokenPair({
      sub: user.uuid,
      app_code: payload.app_code,
      roles,
      channel: payload.channel
    });
    await saveTokenRecord(user.id, payload.app_code, newTokenPair, payload.channel);
    return newTokenPair;
  };
  const logout = async (accessToken) => {
    const payload = await jwtService().verifyToken(accessToken);
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { access_token_jti: payload.jti }
    });
    if (tokenRecord && !tokenRecord.revoked) {
      await strapi.db.query(TOKEN_UID).update({
        where: { id: tokenRecord.id },
        data: { revoked: true, revoked_at: /* @__PURE__ */ new Date() }
      });
    }
    return { success: true };
  };
  const getUserRoles = async (userId, appCode) => {
    const roles = await strapi.db.query(USER_ROLE_UID).findMany({
      where: { user: { id: userId }, app_code: appCode }
    });
    return roles.map((r) => r.role);
  };
  const saveTokenRecord = async (userId, appCode, tokenPair, channelCode) => {
    const accessPayload = await jwtService().verifyToken(tokenPair.access_token);
    const refreshPayload = await jwtService().verifyToken(tokenPair.refresh_token);
    await strapi.db.query(TOKEN_UID).create({
      data: {
        user: { id: userId },
        app_code: appCode,
        access_token_jti: accessPayload.jti,
        refresh_token: tokenPair.refresh_token,
        refresh_expires_at: new Date(refreshPayload.exp * 1e3),
        channel_code: channelCode || null
      }
    });
  };
  const sanitizeUser = (user) => {
    const { password_hash, ...safe } = user;
    return safe;
  };
  return { login, register: register2, verifyToken, refreshToken, logout, getUserRoles, saveTokenRecord, sanitizeUser };
};
const BINDING_UID$1 = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID$1 = "plugin::zhao-sso.sso-user";
const ssoWechat = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  async function getConfig() {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config2 = await configService.findByProvider("wechat");
    if (!config2) throwErr("SSO_WECHAT_001", 500, "[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat)");
    return config2;
  }
  return {
    async getAuthorizeUrl(state) {
      const config2 = await getConfig();
      const serverUrl = strapi.config.get("server.url", "http://localhost:1337");
      const redirectUri = `${serverUrl}/api/zhao-sso/auth/wechat/callback`;
      const params = new URLSearchParams({
        appid: config2.appId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config2.scope || "snsapi_login",
        state
      });
      return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
    },
    async handleCallback(code) {
      const config2 = await getConfig();
      const tokenRes = await axios__default.default.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
        params: { appid: config2.appId, secret: config2.appSecret, code, grant_type: "authorization_code" }
      });
      if (tokenRes.data.errcode) throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);
      const { openid, unionid, access_token: wxAccessToken } = tokenRes.data;
      let userInfoRes = {};
      try {
        userInfoRes = await axios__default.default.get("https://api.weixin.qq.com/sns/userinfo", {
          params: { access_token: wxAccessToken, openid }
        });
      } catch {
      }
      const binding = await strapi.db.query(BINDING_UID$1).findOne({
        where: { provider: "wechat", provider_user_id: openid },
        populate: { user: true }
      });
      if (binding) {
        return { userId: binding.user.id, isNew: false };
      }
      const user = await strapi.db.query(USER_UID$1).create({
        data: {
          uuid: uuid.v4(),
          nickname: userInfoRes.data?.nickname || null,
          avatar_url: userInfoRes.data?.headimgurl || null,
          status: "active",
          login_count: 0
        }
      });
      await strapi.db.query(BINDING_UID$1).create({
        data: {
          user: { id: user.id },
          provider: "wechat",
          provider_user_id: openid,
          provider_union_id: unionid || null,
          provider_nickname: userInfoRes.data?.nickname || null,
          provider_avatar: userInfoRes.data?.headimgurl || null,
          provider_data: tokenRes.data,
          bound_at: /* @__PURE__ */ new Date()
        }
      });
      return { userId: user.id, isNew: true };
    }
  };
};
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";
const ssoAlipay = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  async function getConfig() {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config2 = await configService.findByProvider("alipay");
    if (!config2) throwErr("SSO_ALIPAY_001", 500, "[zhao-sso] Alipay OAuth 配置未找到(请在后台配置 provider=alipay)");
    const privateKey = config2.extraConfig?.privateKey;
    if (!privateKey) throwErr("SSO_ALIPAY_002", 500, "Alipay OAuth privateKey 未配置(extraConfig.privateKey)");
    return { ...config2, privateKey };
  }
  return {
    async getAuthorizeUrl(state) {
      const config2 = await getConfig();
      const serverUrl = strapi.config.get("server.url", "http://localhost:1337");
      const redirectUri = `${serverUrl}/api/zhao-sso/auth/alipay/callback`;
      const params = new URLSearchParams({
        app_id: config2.appId,
        redirect_uri: redirectUri,
        scope: "auth_user",
        state
      });
      return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params.toString()}`;
    },
    async handleCallback(code) {
      const config2 = await getConfig();
      const tokenRes = await this.requestToken(config2.appId, config2.privateKey, code);
      const userId = tokenRes.user_id;
      const binding = await strapi.db.query(BINDING_UID).findOne({
        where: { provider: "alipay", provider_user_id: userId },
        populate: { user: true }
      });
      if (binding) {
        return { userId: binding.user.id, isNew: false };
      }
      let userInfo = {};
      try {
        userInfo = await this.fetchUserInfo(config2.appId, config2.privateKey, tokenRes.access_token);
      } catch {
      }
      const user = await strapi.db.query(USER_UID).create({
        data: {
          uuid: uuid.v4(),
          nickname: userInfo.nick_name || null,
          avatar_url: userInfo.avatar || null,
          status: "active",
          login_count: 0
        }
      });
      await strapi.db.query(BINDING_UID).create({
        data: {
          user: { id: user.id },
          provider: "alipay",
          provider_user_id: userId,
          provider_nickname: userInfo.nick_name || null,
          provider_avatar: userInfo.avatar || null,
          provider_data: tokenRes,
          bound_at: /* @__PURE__ */ new Date()
        }
      });
      return { userId: user.id, isNew: true };
    },
    async requestToken(appId, privateKey, code) {
      const bizContent = { grant_type: "authorization_code", code };
      const params = this.buildAlipayParams(appId, "alipay.system.oauth.token", bizContent);
      const sign = this.signParams(params, privateKey);
      params.sign = sign;
      const res = await axios__default.default.post("https://openapi.alipay.com/gateway.do", null, { params });
      const respKey = "alipay_system_oauth_token_response";
      if (res.data[respKey]) return res.data[respKey];
      throwErr("SSO_ALIPAY_003", 502, `Alipay token error: ${JSON.stringify(res.data)}`);
    },
    async fetchUserInfo(appId, privateKey, accessToken) {
      const bizContent = { auth_token: accessToken };
      const params = this.buildAlipayParams(appId, "alipay.user.info.share", bizContent);
      const sign = this.signParams(params, privateKey);
      params.sign = sign;
      const res = await axios__default.default.post("https://openapi.alipay.com/gateway.do", null, { params });
      const respKey = "alipay_user_info_share_response";
      if (res.data[respKey]) return res.data[respKey];
      return {};
    },
    buildAlipayParams(appId, method, bizContent) {
      return {
        app_id: appId,
        method,
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
        version: "1.0",
        biz_content: JSON.stringify(bizContent)
      };
    },
    signParams(params, privateKey) {
      const sorted = Object.keys(params).filter((k) => k !== "sign" && params[k]).sort().map((k) => `${k}=${params[k]}`).join("&");
      const sign = crypto__namespace.default.createSign("RSA-SHA256");
      sign.update(sorted);
      sign.end();
      return sign.sign(privateKey, "base64");
    }
  };
};
const createLocalChannelSync = ({ strapi }) => ({
  async syncUserInvite(ssoUserId, inviteCode, channelCode) {
    const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
    if (!userInviteService || typeof userInviteService.createForUser !== "function") {
      return { success: false, message: "zhao-channel user-invite 服务不可用" };
    }
    await userInviteService.createForUser(ssoUserId, void 0, void 0, inviteCode, channelCode);
    return { success: true };
  }
});
const createRemoteChannelSync = ({
  strapi,
  config: config2
}) => ({
  async syncUserInvite(ssoUserId, inviteCode, channelCode) {
    const { remoteUrl, appCode, appSecret } = config2;
    if (!remoteUrl || !appCode || !appSecret) {
      return { success: false, message: "RemoteChannelSync 配置不完整（remoteUrl/appCode/appSecret）" };
    }
    const url = `${remoteUrl.replace(/\/+$/, "")}/api/zhao-channel/v1/admin/user-invites/sync`;
    const body = JSON.stringify({ userId: ssoUserId, inviteCode, channelCode });
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timestamp = Date.now().toString();
        const signature = crypto__namespace.createHmac("sha256", appSecret).update(`${appCode}${timestamp}${body}`).digest("hex");
        const headers = {
          "Content-Type": "application/json",
          "X-App-Code": appCode,
          "X-Timestamp": timestamp,
          "X-Signature": signature
        };
        const response = await fetch(url, {
          method: "POST",
          headers,
          body
        });
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: typeof data === "string" ? data : JSON.stringify(data) };
        }
        if (response.status >= 400 && response.status < 500) {
          const text = await response.text();
          return { success: false, message: `HTTP ${response.status}: ${text}` };
        }
        strapi.log.warn(`[zhao-sso] RemoteChannelSync 第 ${attempt + 1} 次失败: HTTP ${response.status}`);
      } catch (e) {
        strapi.log.warn(`[zhao-sso] RemoteChannelSync 第 ${attempt + 1} 次异常: ${e.message}`);
      }
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1e3 * Math.pow(2, attempt)));
      }
    }
    return { success: false, message: `RemoteChannelSync 重试 ${maxRetries} 次后仍失败` };
  }
});
const channelSync = ({ strapi }) => ({
  getSync() {
    const config2 = strapi.config.get("plugin::zhao-sso.channelSync") || strapi.plugin("zhao-sso")?.config("channelSync");
    const configTyped = config2;
    const mode = configTyped?.mode || "local";
    if (mode === "off") return null;
    if (mode === "remote") return createRemoteChannelSync({ strapi, config: configTyped || {} });
    return createLocalChannelSync({ strapi });
  }
});
const APP_UID = "plugin::zhao-sso.sso-app";
const ssoApp = ({ strapi }) => ({
  async count(where) {
    return strapi.db.query(APP_UID).count({ where });
  },
  async findMany(params) {
    return strapi.db.query(APP_UID).findMany({
      orderBy: params?.orderBy || { app_code: "asc" }
    });
  },
  async create(data) {
    const secret = data.app_secret || process.env.SSO_DEFAULT_APP_SECRET;
    if (!secret) {
      const e = new Error("app_secret 必填或设置 SSO_DEFAULT_APP_SECRET 环境变量");
      e.code = "SSO_APP_001";
      e.status = 400;
      throw e;
    }
    return strapi.db.query(APP_UID).create({
      data: {
        app_code: data.app_code,
        app_name: data.app_name,
        app_secret: await bcrypt__default.default.hash(secret, 10),
        redirect_uris: data.redirect_uris || [],
        allowed_grant_types: data.allowed_grant_types || ["authorization_code", "refresh_token"],
        is_active: data.is_active !== void 0 ? data.is_active : true,
        description: data.description || null
      }
    });
  },
  async update(id, body) {
    const allowedFields = ["app_name", "redirect_uris", "allowed_grant_types", "is_active", "description", "app_secret"];
    const data = {};
    for (const field of allowedFields) {
      if (body[field] !== void 0) data[field] = body[field];
    }
    if (data.app_secret) {
      data.app_secret = await bcrypt__default.default.hash(data.app_secret, 10);
    }
    return strapi.db.query(APP_UID).update({ where: { id }, data });
  }
});
const CONFIG_UID = "plugin::zhao-sso.sso-oauth-config";
const ssoOauthConfig = ({ strapi }) => ({
  async findByProvider(provider) {
    const row = await strapi.db.query(CONFIG_UID).findOne({
      where: { provider, is_enabled: true }
    });
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.documentId,
      provider: row.provider,
      appId: row.app_id,
      appSecret: row.app_secret,
      scope: row.scope,
      extraConfig: row.extra_config,
      redirectUris: row.redirect_uris,
      isEnabled: row.is_enabled
    };
  },
  async list() {
    const rows = await strapi.db.query(CONFIG_UID).findMany({
      orderBy: { provider: "ASC" }
    });
    return rows;
  },
  async create(data) {
    return strapi.db.query(CONFIG_UID).create({
      data: {
        provider: data.provider,
        app_id: data.app_id,
        app_secret: data.app_secret,
        scope: data.scope || null,
        extra_config: data.extra_config || {},
        redirect_uris: data.redirect_uris || [],
        is_enabled: data.is_enabled !== void 0 ? data.is_enabled : true,
        description: data.description || null
      }
    });
  },
  async update(id, data) {
    return strapi.db.query(CONFIG_UID).update({ where: { id }, data });
  },
  async delete(id) {
    return strapi.db.query(CONFIG_UID).delete({ where: { id } });
  }
});
const CODE_UID = "plugin::zhao-sso.sso-sms-code";
const ssoSms = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    /**
     * 发送验证码
     * - SMS_PROVIDER=mock(默认):固定 1234,仅写入 DB
     * - SMS_PROVIDER=aliyun:对接阿里云 dysmsapi
     * - SMS_PROVIDER=tencent:对接腾讯云 sms
     */
    async sendCode(mobile, scene = "login", ip) {
      if (!/^1[3-9]\d{9}$/.test(mobile)) {
        throwErr("SSO_SMS_001", 400, "手机号格式不正确");
      }
      const provider = process.env.SMS_PROVIDER || "mock";
      const ttlMinutes = 5;
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1e3);
      const code = provider === "mock" ? "1234" : crypto__namespace.default.randomInt(1e5, 999999).toString();
      await strapi.db.query(CODE_UID).create({
        data: { mobile, code, scene, expires_at: expiresAt, used: false, ip: ip || null, provider }
      });
      if (provider === "mock") {
        strapi.log.info(`[zhao-sso] Mock SMS code sent to ${mobile}: ${code}`);
        return { sent: true, provider, ttlMinutes };
      }
      try {
        if (provider === "aliyun") {
          await this.sendViaAliyun(mobile, code);
        } else if (provider === "tencent") {
          await this.sendViaTencent(mobile, code);
        } else {
          throwErr("SSO_SMS_008", 400, `不支持的 SMS provider: ${provider}`);
        }
        return { sent: true, provider, ttlMinutes };
      } catch (e) {
        strapi.log.error(`[zhao-sso] SMS provider=${provider} 发送失败: ${e.message}`);
        return { sent: false, provider, error: e.message, ttlMinutes };
      }
    },
    /**
     * 校验验证码(校验成功后标记 used=true)
     */
    async verifyCode(mobile, code, scene = "login") {
      const record = await strapi.db.query(CODE_UID).findOne({
        where: { mobile, code, scene, used: false },
        orderBy: { id: "DESC" }
      });
      if (!record) throwErr("SSO_SMS_002", 400, "验证码错误");
      if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) throwErr("SSO_SMS_003", 400, "验证码已过期");
      await strapi.db.query(CODE_UID).update({
        where: { id: record.id },
        data: { used: true }
      });
      return true;
    },
    /**
     * 阿里云 SMS 发送(HMAC-SHA1 签名,GET 请求)
     * 环境变量:SMS_ALIYUN_ACCESS_KEY_ID / SMS_ALIYUN_ACCESS_KEY_SECRET / SMS_ALIYUN_SIGN_NAME / SMS_ALIYUN_TEMPLATE_CODE
     */
    async sendViaAliyun(mobile, code) {
      const accessKeyId = process.env.SMS_ALIYUN_ACCESS_KEY_ID;
      const accessKeySecret = process.env.SMS_ALIYUN_ACCESS_KEY_SECRET;
      const signName = process.env.SMS_ALIYUN_SIGN_NAME;
      const templateCode = process.env.SMS_ALIYUN_TEMPLATE_CODE;
      if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
        throwErr("SSO_SMS_006", 500, "阿里云 SMS 配置缺失");
      }
      const percentEncode = (str) => encodeURIComponent(str).replace(/\+/g, "%20").replace(/\*/g, "%2A").replace(/%7E/g, "~");
      const params = {
        AccessKeyId: accessKeyId,
        Action: "SendSms",
        Format: "JSON",
        PhoneNumbers: mobile,
        RegionId: "cn-hangzhou",
        SignName: signName,
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: crypto__namespace.default.randomUUID(),
        SignatureVersion: "1.0",
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ code }),
        Timestamp: (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
        Version: "2017-05-25"
      };
      const canonicalized = Object.keys(params).sort().map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join("&");
      const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalized)}`;
      const signature = crypto__namespace.default.createHmac("sha1", `${accessKeySecret}&`).update(stringToSign).digest("base64");
      const url = `https://dysmsapi.aliyuncs.com/?${canonicalized}&Signature=${percentEncode(signature)}`;
      const resp = await axios__default.default.get(url, { timeout: 1e4 });
      if (resp.data?.Code !== "OK") {
        throwErr(
          "SSO_SMS_006",
          500,
          `阿里云 SMS 发送失败: ${resp.data?.Message || resp.data?.Code || "unknown"}`
        );
      }
      return resp.data;
    },
    /**
     * 腾讯云 SMS 发送(TC3-HMAC-SHA256 签名,POST 请求)
     * 环境变量:SMS_TENCENT_SECRET_ID / SMS_TENCENT_SECRET_KEY / SMS_TENCENT_SDK_APP_ID / SMS_TENCENT_SIGN_NAME / SMS_TENCENT_TEMPLATE_ID
     */
    async sendViaTencent(mobile, code) {
      const secretId = process.env.SMS_TENCENT_SECRET_ID;
      const secretKey = process.env.SMS_TENCENT_SECRET_KEY;
      const sdkAppId = process.env.SMS_TENCENT_SDK_APP_ID;
      const signName = process.env.SMS_TENCENT_SIGN_NAME;
      const templateId = process.env.SMS_TENCENT_TEMPLATE_ID;
      if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
        throwErr("SSO_SMS_007", 500, "腾讯云 SMS 配置缺失");
      }
      const host = "sms.tencentcloudapi.com";
      const service = "sms";
      const action = "SendSms";
      const version = "2021-01-11";
      const region = "ap-beijing";
      const timestamp = Math.floor(Date.now() / 1e3);
      const date = new Date(timestamp * 1e3).toISOString().slice(0, 10);
      const payload = JSON.stringify({
        SmsSdkAppId: sdkAppId,
        SignName: signName,
        TemplateId: templateId,
        PhoneNumberSet: [`+86${mobile}`],
        TemplateParamSet: [code]
      });
      const hashedPayload = crypto__namespace.default.createHash("sha256").update(payload).digest("hex");
      const canonicalHeaders = `content-type:application/json; charset=utf-8
host:${host}
x-tc-action:${action.toLowerCase()}
`;
      const signedHeaders = "content-type;host;x-tc-action";
      const canonicalRequest = `POST
/

${canonicalHeaders}
${signedHeaders}
${hashedPayload}`;
      const credentialScope = `${date}/${service}/tc3_request`;
      const hashedCanonicalRequest = crypto__namespace.default.createHash("sha256").update(canonicalRequest).digest("hex");
      const stringToSign = `TC3-HMAC-SHA256
${timestamp}
${credentialScope}
${hashedCanonicalRequest}`;
      const secretDate = crypto__namespace.default.createHmac("sha256", secretKey).update(date).digest();
      const secretService = crypto__namespace.default.createHmac("sha256", secretDate).update(service).digest();
      const secretSigning = crypto__namespace.default.createHmac("sha256", secretService).update("tc3_request").digest();
      const signature = crypto__namespace.default.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");
      const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
      const resp = await axios__default.default.post(`https://${host}`, payload, {
        timeout: 1e4,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: authorization,
          "X-TC-Action": action,
          "X-TC-Timestamp": String(timestamp),
          "X-TC-Version": version,
          "X-TC-Region": region
        }
      });
      const respData = resp.data?.Response;
      if (respData?.Error) {
        throwErr(
          "SSO_SMS_007",
          500,
          `腾讯云 SMS 发送失败: ${respData.Error.Message || respData.Error.Code}`
        );
      }
      const firstStatus = respData?.SendStatusSet?.[0];
      if (firstStatus && firstStatus.Code !== "Ok") {
        throwErr(
          "SSO_SMS_007",
          500,
          `腾讯云 SMS 发送失败: ${firstStatus.Message || firstStatus.Code}`
        );
      }
      return respData;
    }
  };
};
const services = {
  "sso-jwt": ssoJwt,
  "sso-user": ssoUser,
  "sso-login-log": ssoLoginLog,
  "sso-channel": ssoChannel,
  "sso-oauth": ssoOauth,
  "sso-auth": ssoAuth$1,
  "sso-wechat": ssoWechat,
  "sso-alipay": ssoAlipay,
  "channel-sync": channelSync,
  "sso-app": ssoApp,
  "sso-oauth-config": ssoOauthConfig,
  "sso-sms": ssoSms
};
const fallbackAuthenticated = (policyContext, _config, _ctx) => {
  const { state } = policyContext;
  if (state.user) {
    return true;
  }
  policyContext.throw(401, "Authentication required");
  return false;
};
const fallbackHasPermission = (policyContext, _config, _ctx) => {
  const { state } = policyContext;
  if (state.user?.roles?.some((r) => r.code === "strapi-super-admin")) {
    return true;
  }
  policyContext.throw(403, "Insufficient permissions");
  return false;
};
const policies = {
  "sso-authenticated": ssoAuthenticated,
  "fallback-authenticated": fallbackAuthenticated,
  "fallback-has-permission": fallbackHasPermission
};
const ssoAuth = async (ctx, next) => {
  const authHeader = ctx.request?.headers?.authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      try {
        const jwtService = ctx.strapi?.plugin?.("zhao-sso")?.service?.("sso-jwt");
        if (jwtService) {
          const payload = await jwtService.verifyToken(parts[1]);
          if (payload.type === "access") {
            ctx.state.ssoUser = payload;
            ctx.state.ssoToken = parts[1];
          }
        }
      } catch {
      }
    }
  }
  await next();
};
const middlewares = {
  "sso-auth": ssoAuth
};
const index = {
  register,
  bootstrap,
  config,
  contentTypes,
  controllers,
  routes,
  services,
  policies,
  middlewares
};
exports.default = index;

"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const crypto = require("crypto");
const axios = require("axios");
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
const crypto__namespace = /* @__PURE__ */ _interopNamespace(crypto);
const axios__default = /* @__PURE__ */ _interopDefault(axios);
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
  const TEMPLATE_UID_ACT = "plugin::zhao-sso.msg-template";
  const VERSION_UID_ACT = "plugin::zhao-sso.msg-template-version";
  const DEFAULT_SOP_TEMPLATES = [
    { code: "act_confirm", name: "活动报名成功确认", desc: "报名成功立即发送" },
    { code: "act_before", name: "活动开始前提醒", desc: "活动开始前 24h 提醒" },
    { code: "act_receipt", name: "活动结束回执（感谢+评价邀请）", desc: "活动结束到场用户回执" },
    { code: "act_repurchase", name: "复购/转介邀请", desc: "活动结束到场用户次日复购/转介触达" },
    { code: "act_noshow_revisit", name: "未到场挽回", desc: "活动结束未到场用户次日挽回" }
  ];
  for (const t of DEFAULT_SOP_TEMPLATES) {
    let tpl = await strapi.db.query(TEMPLATE_UID_ACT).findOne({ where: { code: t.code } });
    if (!tpl) {
      tpl = await strapi.db.query(TEMPLATE_UID_ACT).create({ data: { code: t.code, name: t.name, provider: "wechat", content: "（shenglin SOP 模板）", isEnabled: true, description: t.desc } });
      strapi.log.info(`[zhao-sso] SOP template seeded: ${t.code}`);
    }
    let ver = await strapi.db.query(VERSION_UID_ACT).findOne({ where: { code: `${t.code}_v1` } });
    if (!ver) {
      await strapi.db.query(VERSION_UID_ACT).create({ data: { template: tpl.id, code: `${t.code}_v1`, name: `${t.name} v1`, status: "active", weight: 1, clickCount: 0, sentCount: 0, successCount: 0 } });
      strapi.log.info(`[zhao-sso] SOP template version seeded: ${t.code}_v1`);
    }
  }
  const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
  if (!rawSecret) {
    strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
    return;
  }
  const hashedSecret = await bcrypt__default.default.hash(rawSecret, 10);
  const courseApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "course" }
  });
  if (!courseApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "course",
        app_name: "课程应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true
      }
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=course)");
  }
  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" }
  });
  if (!defaultApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true
      }
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }
  const wealthApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "wealth" }
  });
  if (!wealthApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "wealth",
        app_name: "理财应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true
      }
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=wealth)");
  }
  const eJohoApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "e-joho-app" }
  });
  if (!eJohoApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "e-joho-app",
        app_name: "E-Joho 应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true
      }
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=e-joho-app)");
  }
  const vendureApps = [
    { app_code: "vendure-default", app_name: "Vendure 商城默认租户", rawSecret: "default-app-secret" },
    { app_code: "vendure-shop-a", app_name: "Vendure 商城 shop-a 租户", rawSecret: "shop-a-app-secret" }
  ];
  const vendureRedirectUris = ["https://e.joho.cn/*", "http://localhost:*"];
  for (const { app_code, app_name, rawSecret: rawSecret2 } of vendureApps) {
    const existing = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
      where: { app_code }
    });
    if (existing) {
      const newUris = JSON.stringify(vendureRedirectUris);
      const oldUris = JSON.stringify(existing.redirect_uris || []);
      if (oldUris !== newUris) {
        await strapi.db.query("plugin::zhao-sso.sso-app").update({
          where: { id: existing.id },
          data: { redirect_uris: vendureRedirectUris }
        });
        strapi.log.info(`[zhao-sso] Vendure app redirect_uris updated (app_code=${app_code})`);
      }
    } else {
      const vendureSecret = await bcrypt__default.default.hash(rawSecret2, 10);
      await strapi.db.query("plugin::zhao-sso.sso-app").create({
        data: {
          app_code,
          app_name,
          app_secret: vendureSecret,
          redirect_uris: vendureRedirectUris,
          allowed_grant_types: ["authorization_code", "refresh_token"],
          is_active: true
        }
      });
      strapi.log.info(`[zhao-sso] Vendure app created (app_code=${app_code})`);
    }
  }
  const RULE_UID2 = "plugin::zhao-sso.sop-rule";
  const DEFAULT_SOP_RULES = [
    { code: "act_confirm", name: "活动报名成功确认", source: "event", event: "activity.signup", templateCode: "act_confirm", scene: "activity.confirm", delayMinutes: 0, enabled: true, description: "报名成功立即发送" },
    { code: "act_before", name: "活动开始前提醒", source: "event", event: "activity.signup", templateCode: "act_before", scene: "activity.before", delayMinutes: 0, enabled: true, description: "业务按活动开始时间排期覆盖定时" },
    { code: "act_noshow_revisit", name: "未到场回访", source: "event", event: "activity.closed", templateCode: "act_noshow_revisit", scene: "activity.noshow", delayMinutes: 0, enabled: true, description: "活动结束后对未签到者回访" },
    { code: "course_d7", name: "课后7天SOP", source: "event", event: "course.enrolled", templateCode: "course_d7", scene: "course.d7", delayMinutes: 0, enabled: true, description: "购课/报名后按 1/3/7 天排期发送" }
  ];
  for (const rule of DEFAULT_SOP_RULES) {
    const existing = await strapi.db.query(RULE_UID2).findOne({ where: { code: rule.code } });
    if (!existing) {
      await strapi.db.query(RULE_UID2).create({ data: rule });
      strapi.log.info(`[zhao-sso] SOP rule seeded: ${rule.code}`);
    }
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
      // 与 zhao-common getPublicConfig 的 ssoAppCode 默认值保持一致
      // 避免前端拿到 'course'、后端兜底 'default' 导致 app_code 不匹配
      appCode: "course"
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
const kind$k = "collectionType";
const collectionName$k = "sso_users";
const info$k = { "singularName": "sso-user", "pluralName": "sso-users", "displayName": "SSO User" };
const options$k = { "draftAndPublish": false };
const attributes$k = { "uuid": { "type": "string", "unique": true, "required": true }, "username": { "type": "string", "unique": true }, "mobile": { "type": "string", "unique": true }, "email": { "type": "email", "unique": true }, "password_hash": { "type": "string" }, "avatar_url": { "type": "string" }, "nickname": { "type": "string" }, "status": { "type": "enumeration", "enum": ["active", "blocked", "inactive", "virtual"], "default": "active", "required": true }, "register_channel": { "type": "string" }, "last_login_channel": { "type": "string" }, "invite_code_used": { "type": "string" }, "invited_by": { "type": "integer" }, "utm_source": { "type": "string" }, "utm_medium": { "type": "string" }, "utm_campaign": { "type": "string" }, "last_login_at": { "type": "datetime" }, "login_count": { "type": "integer", "default": 0, "required": true }, "password_changed_at": { "type": "datetime" }, "third_party_bindings": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-sso.sso-third-party-binding", "mappedBy": "user" } };
const schema$k = {
  kind: kind$k,
  collectionName: collectionName$k,
  info: info$k,
  options: options$k,
  attributes: attributes$k
};
const ssoUser$1 = { schema: schema$k };
const kind$j = "collectionType";
const collectionName$j = "sso_third_party_bindings";
const info$j = { "singularName": "sso-third-party-binding", "pluralName": "sso-third-party-bindings", "displayName": "SSO Third Party Binding" };
const options$j = { "draftAndPublish": false };
const attributes$j = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "inversedBy": "third_party_bindings" }, "provider": { "type": "string", "required": true }, "provider_user_id": { "type": "string", "required": true }, "provider_union_id": { "type": "string" }, "provider_nickname": { "type": "string" }, "provider_avatar": { "type": "string" }, "provider_data": { "type": "json" }, "bound_at": { "type": "datetime", "required": true }, "subscribe": { "type": "integer" }, "subscribe_at": { "type": "datetime" }, "subscribe_check_at": { "type": "datetime" } };
const schema$j = {
  kind: kind$j,
  collectionName: collectionName$j,
  info: info$j,
  options: options$j,
  attributes: attributes$j
};
const ssoThirdPartyBinding = { schema: schema$j };
const kind$i = "collectionType";
const collectionName$i = "sso_apps";
const info$i = { "singularName": "sso-app", "pluralName": "sso-apps", "displayName": "SSO App" };
const options$i = { "draftAndPublish": false };
const attributes$i = { "app_code": { "type": "string", "unique": true, "required": true }, "app_name": { "type": "string", "required": true }, "app_secret": { "type": "string", "required": true }, "redirect_uris": { "type": "json", "required": true }, "allowed_grant_types": { "type": "json", "required": true }, "is_active": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$i = {
  kind: kind$i,
  collectionName: collectionName$i,
  info: info$i,
  options: options$i,
  attributes: attributes$i
};
const ssoApp$1 = { schema: schema$i };
const kind$h = "collectionType";
const collectionName$h = "sso_channels";
const info$h = { "singularName": "sso-channel", "pluralName": "sso-channels", "displayName": "SSO Channel" };
const options$h = { "draftAndPublish": false };
const attributes$h = { "channel_code": { "type": "string", "unique": true, "required": true }, "channel_name": { "type": "string", "required": true }, "channel_type": { "type": "string", "required": true }, "utm_template": { "type": "json" }, "is_active": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$h = {
  kind: kind$h,
  collectionName: collectionName$h,
  info: info$h,
  options: options$h,
  attributes: attributes$h
};
const ssoChannel$1 = { schema: schema$h };
const kind$g = "collectionType";
const collectionName$g = "sso_auth_codes";
const info$g = { "singularName": "sso-auth-code", "pluralName": "sso-auth-codes", "displayName": "SSO Auth Code" };
const options$g = { "draftAndPublish": false };
const attributes$g = { "code": { "type": "string", "unique": true, "required": true }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "redirect_uri": { "type": "text", "required": true }, "channel_code": { "type": "string" }, "invite_code": { "type": "string" }, "scopes": { "type": "json" }, "is_new": { "type": "boolean", "default": false }, "expires_at": { "type": "datetime", "required": true }, "used": { "type": "boolean", "default": false, "required": true } };
const schema$g = {
  kind: kind$g,
  collectionName: collectionName$g,
  info: info$g,
  options: options$g,
  attributes: attributes$g
};
const ssoAuthCode = { schema: schema$g };
const kind$f = "collectionType";
const collectionName$f = "sso_tokens";
const info$f = { "singularName": "sso-token", "pluralName": "sso-tokens", "displayName": "SSO Token" };
const options$f = { "draftAndPublish": false };
const attributes$f = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "access_token_jti": { "type": "text", "unique": true, "required": true }, "refresh_token": { "type": "text", "unique": true, "required": true }, "refresh_expires_at": { "type": "datetime", "required": true }, "revoked": { "type": "boolean", "default": false, "required": true }, "revoked_at": { "type": "datetime" }, "channel_code": { "type": "string" } };
const schema$f = {
  kind: kind$f,
  collectionName: collectionName$f,
  info: info$f,
  options: options$f,
  attributes: attributes$f
};
const ssoToken = { schema: schema$f };
const kind$e = "collectionType";
const collectionName$e = "sso_user_app_roles";
const info$e = { "singularName": "sso-user-app-role", "pluralName": "sso-user-app-roles", "displayName": "SSO User App Role" };
const options$e = { "draftAndPublish": false };
const attributes$e = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "app_code": { "type": "string", "required": true }, "role": { "type": "string", "required": true } };
const schema$e = {
  kind: kind$e,
  collectionName: collectionName$e,
  info: info$e,
  options: options$e,
  attributes: attributes$e
};
const ssoUserAppRole = { schema: schema$e };
const kind$d = "collectionType";
const collectionName$d = "sso_login_logs";
const info$d = { "singularName": "sso-login-log", "pluralName": "sso-login-logs", "displayName": "SSO Login Log" };
const options$d = { "draftAndPublish": false };
const attributes$d = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "login_type": { "type": "string", "required": true }, "provider": { "type": "string" }, "channel_code": { "type": "string" }, "app_code": { "type": "string" }, "ip": { "type": "string" }, "user_agent": { "type": "string" }, "success": { "type": "boolean", "required": true }, "fail_reason": { "type": "string" } };
const schema$d = {
  kind: kind$d,
  collectionName: collectionName$d,
  info: info$d,
  options: options$d,
  attributes: attributes$d
};
const ssoLoginLog$1 = { schema: schema$d };
const kind$c = "collectionType";
const collectionName$c = "sso_invite_codes";
const info$c = { "singularName": "sso-invite-code", "pluralName": "sso-invite-codes", "displayName": "SSO Invite Code" };
const options$c = { "draftAndPublish": false };
const attributes$c = { "code": { "type": "string", "unique": true, "required": true }, "app_code": { "type": "string", "required": true }, "creator": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invite_type": { "type": "enumeration", "enum": ["system", "user_campaign"], "required": true }, "max_uses": { "type": "integer" }, "use_count": { "type": "integer", "default": 0, "required": true }, "per_user_limit": { "type": "integer", "default": 1, "required": true }, "valid_from": { "type": "datetime" }, "valid_until": { "type": "datetime" }, "bonus_tags": { "type": "json" }, "is_active": { "type": "boolean", "default": true, "required": true } };
const schema$c = {
  kind: kind$c,
  collectionName: collectionName$c,
  info: info$c,
  options: options$c,
  attributes: attributes$c
};
const ssoInviteCode = { schema: schema$c };
const kind$b = "collectionType";
const collectionName$b = "sso_invite_usages";
const info$b = { "singularName": "sso-invite-usage", "pluralName": "sso-invite-usages", "displayName": "SSO Invite Usage" };
const options$b = { "draftAndPublish": false };
const attributes$b = { "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "channel_code": { "type": "string" }, "app_code": { "type": "string" }, "used_at": { "type": "datetime", "required": true } };
const schema$b = {
  kind: kind$b,
  collectionName: collectionName$b,
  info: info$b,
  options: options$b,
  attributes: attributes$b
};
const ssoInviteUsage = { schema: schema$b };
const kind$a = "collectionType";
const collectionName$a = "sso_referral_relations";
const info$a = { "singularName": "sso-referral-relation", "pluralName": "sso-referral-relations", "displayName": "SSO Referral Relation" };
const options$a = { "draftAndPublish": false };
const attributes$a = { "inviter": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invitee": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "invite_code": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "level": { "type": "integer", "required": true }, "channel_code": { "type": "string" } };
const schema$a = {
  kind: kind$a,
  collectionName: collectionName$a,
  info: info$a,
  options: options$a,
  attributes: attributes$a
};
const ssoReferralRelation = { schema: schema$a };
const kind$9 = "collectionType";
const collectionName$9 = "sso_invite_stats";
const info$9 = { "singularName": "sso-invite-stats", "pluralName": "sso-invite-stats", "displayName": "SSO Invite Stats" };
const options$9 = { "draftAndPublish": false };
const attributes$9 = { "invite_code": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-sso.sso-invite-code" }, "total_invites": { "type": "integer", "required": true }, "active_invites": { "type": "integer", "required": true }, "last_invited_at": { "type": "datetime" } };
const schema$9 = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  attributes: attributes$9
};
const ssoInviteStats = { schema: schema$9 };
const kind$8 = "collectionType";
const collectionName$8 = "sso_oauth_configs";
const info$8 = { "singularName": "sso-oauth-config", "pluralName": "sso-oauth-configs", "displayName": "SSO OAuth Config" };
const options$8 = { "draftAndPublish": false };
const attributes$8 = { "name": { "type": "string", "required": true }, "provider": { "type": "string", "required": true }, "app_type": { "type": "enumeration", "required": true, "enum": ["official_account", "open_platform", "mini_program", "app", "default"], "default": "default" }, "app_id": { "type": "string", "required": true }, "app_secret": { "type": "string", "required": true }, "scope": { "type": "string" }, "extra_config": { "type": "json" }, "redirect_uris": { "type": "json" }, "is_enabled": { "type": "boolean", "default": true, "required": true }, "description": { "type": "string" } };
const schema$8 = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  attributes: attributes$8
};
const ssoOauthConfig$1 = {
  schema: schema$8
};
const kind$7 = "collectionType";
const collectionName$7 = "sso_sms_codes";
const info$7 = { "singularName": "sso-sms-code", "pluralName": "sso-sms-codes", "displayName": "SSO SMS Code" };
const options$7 = { "draftAndPublish": false };
const attributes$7 = { "mobile": { "type": "string", "required": true }, "code": { "type": "string", "required": true }, "scene": { "type": "string", "default": "login", "required": true }, "expires_at": { "type": "datetime", "required": true }, "used": { "type": "boolean", "default": false, "required": true }, "ip": { "type": "string" }, "provider": { "type": "string", "default": "mock" } };
const schema$7 = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  attributes: attributes$7
};
const ssoSmsCode = {
  schema: schema$7
};
const kind$6 = "collectionType";
const collectionName$6 = "sso_msg_templates";
const info$6 = { "singularName": "msg-template", "pluralName": "msg-templates", "displayName": "SSO Msg Template" };
const options$6 = { "draftAndPublish": false };
const attributes$6 = { "code": { "type": "string", "unique": true, "required": true }, "name": { "type": "string", "required": true }, "provider": { "type": "string", "default": "wechat", "required": true }, "wxTemplateId": { "type": "string" }, "wxTemplateFields": { "type": "json" }, "content": { "type": "text" }, "isEnabled": { "type": "boolean", "default": true, "required": true }, "description": { "type": "text" }, "dailyCap": { "type": "integer" }, "cooldownMinutes": { "type": "integer" } };
const schema$6 = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  attributes: attributes$6
};
const msgTemplate = {
  schema: schema$6
};
const kind$5 = "collectionType";
const collectionName$5 = "sso_msg_template_versions";
const info$5 = { "singularName": "msg-template-version", "pluralName": "msg-template-versions", "displayName": "SSO Msg Template Version" };
const options$5 = { "draftAndPublish": false };
const attributes$5 = { "template": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template", "required": true }, "code": { "type": "string", "required": true }, "name": { "type": "string" }, "wxTemplateId": { "type": "string" }, "wxTemplateFields": { "type": "json" }, "content": { "type": "text" }, "link": { "type": "string" }, "weight": { "type": "integer", "default": 1 }, "status": { "type": "enumeration", "enum": ["draft", "active"], "default": "draft", "required": true }, "sentCount": { "type": "integer", "default": 0 }, "successCount": { "type": "integer", "default": 0 }, "clickCount": { "type": "integer", "default": 0 }, "lastUsedAt": { "type": "datetime" } };
const schema$5 = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  attributes: attributes$5
};
const msgTemplateVersion = {
  schema: schema$5
};
const kind$4 = "collectionType";
const collectionName$4 = "sso_msg_jobs";
const info$4 = { "singularName": "msg-job", "pluralName": "msg-jobs", "displayName": "SSO Msg Job" };
const options$4 = { "draftAndPublish": false };
const attributes$4 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "scene": { "type": "string", "required": true }, "template": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template" }, "version": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template-version" }, "provider": { "type": "string", "default": "wechat", "required": true }, "toTarget": { "type": "string" }, "params": { "type": "json" }, "link": { "type": "string" }, "status": { "type": "enumeration", "enum": ["pending", "sending", "sent", "failed", "cancelled", "quota_limited"], "default": "pending", "required": true }, "retryCount": { "type": "integer", "default": 0 }, "nextRetryAt": { "type": "datetime" }, "wxMsgId": { "type": "string" }, "result": { "type": "json" }, "scheduledAt": { "type": "datetime" }, "sentAt": { "type": "datetime" }, "dedupeKey": { "type": "string", "unique": true }, "readAt": { "type": "datetime" }, "followStatus": { "type": "enumeration", "enum": ["none", "followed", "deal"], "default": "none" }, "followRemark": { "type": "text" } };
const schema$4 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  attributes: attributes$4
};
const msgJob = {
  schema: schema$4
};
const kind$3 = "collectionType";
const collectionName$3 = "sso_sop_rules";
const info$3 = { "singularName": "sop-rule", "pluralName": "sop-rules", "displayName": "SSO SOP Rule" };
const options$3 = { "draftAndPublish": false };
const attributes$3 = { "code": { "type": "string", "unique": true, "required": true }, "name": { "type": "string", "required": true }, "source": { "type": "enumeration", "enum": ["event", "cron"], "default": "event", "required": true }, "event": { "type": "string" }, "cronExpression": { "type": "string" }, "templateCode": { "type": "string" }, "scene": { "type": "string", "required": true }, "delayMinutes": { "type": "integer", "default": 0 }, "link": { "type": "text" }, "paramsTemplate": { "type": "json" }, "enabled": { "type": "boolean", "default": true, "required": true }, "description": { "type": "text" }, "conversionWindowDays": { "type": "integer" } };
const schema$3 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  attributes: attributes$3
};
const sopRule = {
  schema: schema$3
};
const kind$2 = "collectionType";
const collectionName$2 = "sso_user_profiles";
const info$2 = { "singularName": "sso-user-profile", "pluralName": "sso-user-profiles", "displayName": "SSO User Profile" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user" }, "segment": { "type": "enumeration", "enum": ["S", "A", "B", "C"], "default": "C", "required": true }, "segmentScore": { "type": "integer", "default": 0 }, "segmentReason": { "type": "text" }, "dimensions": { "type": "json", "default": {} }, "lastCalculatedAt": { "type": "datetime" } };
const schema$2 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const ssoUserProfile = {
  schema: schema$2
};
const kind$1 = "collectionType";
const collectionName$1 = "sso_follow_ups";
const info$1 = { "singularName": "sso-follow-up", "pluralName": "sso-follow-ups", "displayName": "SSO Follow Up" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "partner": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true }, "customer": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.sso-user", "required": true }, "content": { "type": "text", "required": true }, "status": { "type": "enumeration", "enum": ["todo", "done", "cancelled"], "default": "todo", "required": true }, "nextFollowAt": { "type": "datetime" } };
const schema$1 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const ssoFollowUp = {
  schema: schema$1
};
const kind = "collectionType";
const collectionName = "sso_quota_configs";
const info = { "singularName": "sso-quota-config", "pluralName": "sso-quota-configs", "displayName": "SSO Quota Config" };
const options = { "draftAndPublish": false };
const attributes = { "maxDailyPerUser": { "type": "integer", "default": 10 }, "cooldownMinutes": { "type": "integer", "default": 120 } };
const schema = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const ssoQuotaConfig = {
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
  "sso-sms-code": ssoSmsCode,
  "msg-template": msgTemplate,
  "msg-template-version": msgTemplateVersion,
  "msg-job": msgJob,
  "sop-rule": sopRule,
  "sso-user-profile": ssoUserProfile,
  "sso-follow-up": ssoFollowUp,
  "sso-quota-config": ssoQuotaConfig
};
const authController = ({ strapi }) => ({
  async login(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { type, identifier, password, code, app_code, channel_code, invite_code } = body;
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
        inviteCode: invite_code,
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
  /**
   * 标准 OAuth2 token 端点（RFC 6749）
   * 服务端到服务端调用，必须传 app_secret。
   * 支持 grant_type=authorization_code（换码）和 grant_type=refresh_token（刷新）。
   *
   * 与 exchange-token 的区别：本端点要求调用方持有 app_secret，适合后端直连；
   * exchange-token 是前端代理，不暴露 app_secret，仅支持 authorization_code。
   */
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
        const { userId, channelCode, isNew } = await oauthService.exchangeCode({ code, appCode: app_code, appSecret: app_secret, redirectUri: redirect_uri });
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
        ctx.body = { ...tokenPair, user, is_new: isNew };
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
  /**
   * 前端代理换 token（不暴露 app_secret）
   * 用于 OAuth 回跳中转页调用，前端只传 code + app_code + redirect_uri
   * 后端按 app_code 查 sso_apps 表获取 app_secret，复用 exchangeCode 逻辑
   *
   * 与 token 端点的区别：本端点不要求调用方传 app_secret（由后端自查），
   * 仅支持 authorization_code 流程，适合浏览器/小程序等前端环境；
   * token 端点是标准 OAuth2 端点，要求 app_secret，适合后端直连。
   * 命名保留现状：rename 会破坏所有前端调用方且无功能收益。
   */
  async exchangeToken(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { code, app_code, redirect_uri } = body;
    if (!code || !app_code || !redirect_uri) {
      ctx.status = 400;
      ctx.body = { error: "code, app_code, redirect_uri 必填" };
      return;
    }
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const app = await oauthService.findApp(app_code);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在或已禁用" };
        return;
      }
      if (!oauthService.validateRedirectUri(app, redirect_uri)) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 不在白名单" };
        return;
      }
      const { userId, channelCode, isNew } = await oauthService.exchangeCodeInternal({
        code,
        appCode: app_code,
        app,
        redirectUri: redirect_uri
      });
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findById(userId);
      const roles = await authService.getUserRoles(user.id, app_code);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code,
        roles,
        channel: channelCode
      });
      await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);
      ctx.body = { ...tokenPair, user, is_new: isNew };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: "invalid_grant", error_description: e.message };
    }
  },
  async wechatRedirect(ctx) {
    let state = null;
    let redirectUri;
    try {
      const { app_code, redirect_uri, invite_code, channel_code, scope, app_type, debugWx } = ctx.query;
      redirectUri = redirect_uri;
      if (!redirectUri) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 必填" };
        return;
      }
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(app_code || "course");
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在或已禁用" };
        return;
      }
      const userAgent = ctx.request.headers["user-agent"] || "";
      let appType;
      if (typeof app_type === "string" && app_type) {
        appType = app_type;
      } else if (debugWx === "1" || userAgent.includes("MicroMessenger")) {
        appType = "official_account";
      } else {
        appType = "open_platform";
      }
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      if (scope) {
        const loginConfig = await wechatService.getWechatLoginConfig(appType);
        const allowedScopes = loginConfig?.oauthScopes || [];
        if (allowedScopes.length > 0 && !allowedScopes.includes(scope)) {
          throw new Error(`不支持的 scope: ${scope}`);
        }
      }
      state = Buffer.from(JSON.stringify({
        app_code: app_code || "course",
        redirect_uri: redirectUri,
        invite_code: invite_code || "",
        channel_code: channel_code || "",
        app_type: appType,
        scope: scope || ""
      })).toString("base64url");
      const forwardedHost = ctx.request.headers["x-forwarded-host"];
      const host = forwardedHost || ctx.request.host;
      const callbackUrl = `https://${host}/api/zhao-sso/v1/auth/wechat/callback`;
      const ssoHost = process.env.SSO_HOST || ctx.request.host;
      if (host !== ssoHost) {
        strapi.log.warn(`[zhao-sso] callbackUrl host 不匹配: ${host} != ${ssoHost}，微信回调将回 SSO 服务器`);
      }
      const url = await wechatService.getAuthorizeUrl(state, appType, scope, callbackUrl);
      ctx.redirect(url);
    } catch (e) {
      if (state && redirectUri) {
        const separator = redirectUri.includes("?") ? "&" : "?";
        ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
      } else {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
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
      const { userId, isNew } = await wechatService.handleCallback(code, stateData.app_type);
      try {
        const channelSync2 = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync2) {
          await channelSync2.syncUserInvite(userId, stateData.invite_code, stateData.channel_code);
        }
      } catch (ce) {
        strapi.log.warn(`[zhao-sso] 微信回调分销同步失败: ${ce.message}`);
      }
      const appCode = stateData.app_code || "course";
      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
        isNew
      });
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e) {
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
    }
  },
  async passwordAuthorize(ctx) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { app_code, identifier, password, redirect_uri, state, invite_code, channel_code, scopes } = body;
    if (!app_code || !identifier || !password || !redirect_uri) {
      ctx.status = 400;
      ctx.body = { error: "app_code, identifier, password, redirect_uri 必填" };
      return;
    }
    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    try {
      const loginResult = await authService.login({
        type: "password",
        identifier,
        password,
        appCode: app_code,
        channelCode: channel_code,
        inviteCode: invite_code,
        ip: ctx.request.ip,
        userAgent: ctx.request.headers["user-agent"]
      });
      const code = await oauthService.generateAuthCode({
        userId: loginResult.user.id,
        appCode: app_code,
        redirectUri: redirect_uri,
        channelCode: channel_code,
        inviteCode: invite_code,
        scopes
      });
      ctx.body = { code, redirect_uri, state: state || "" };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async wechatMiniProgramLogin(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { code, appCode, inviteCode, channelCode } = body;
      if (!code || !appCode) {
        ctx.status = 400;
        ctx.body = { error: "invalid_request", error_description: "code 和 appCode 必填" };
        return;
      }
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(appCode);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "app_not_found", error_description: "应用不存在或已禁用" };
        return;
      }
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId, isNew } = await wechatService.handleCallback(code, "mini_program");
      try {
        const channelSync2 = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync2) {
          await channelSync2.syncUserInvite(userId, inviteCode, channelCode);
        }
      } catch (ce) {
        strapi.log.warn(`[zhao-sso] 小程序登录分销同步失败: ${ce.message}`);
      }
      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findById(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "user_not_found", error_description: "用户不存在" };
        return;
      }
      try {
        await userService.updateLoginInfo(user.id, channelCode);
        await strapi.plugin("zhao-sso").service("sso-login-log").log({
          userId: user.id,
          loginType: "wechat_miniprogram",
          provider: "wechat",
          channelCode,
          appCode,
          ip: ctx.request.ip,
          userAgent: ctx.request.headers["user-agent"],
          success: true
        });
      } catch (le) {
        strapi.log.warn(`[zhao-sso] 小程序登录日志写入失败: ${le.message}`);
      }
      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);
      ctx.body = { ...tokenPair, is_new: isNew };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: "wechat_login_failed", error_description: e.message };
    }
  },
  async wechatAppLogin(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { code, appCode, inviteCode, channelCode } = body;
      if (!code || !appCode) {
        ctx.status = 400;
        ctx.body = { error: "invalid_request", error_description: "code 和 appCode 必填" };
        return;
      }
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(appCode);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "app_not_found", error_description: "应用不存在或已禁用" };
        return;
      }
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId, isNew } = await wechatService.handleCallback(code, "app");
      try {
        const channelSync2 = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync2) {
          await channelSync2.syncUserInvite(userId, inviteCode, channelCode);
        }
      } catch (ce) {
        strapi.log.warn(`[zhao-sso] App 登录分销同步失败: ${ce.message}`);
      }
      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findById(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "user_not_found", error_description: "用户不存在" };
        return;
      }
      try {
        await userService.updateLoginInfo(user.id, channelCode);
        await strapi.plugin("zhao-sso").service("sso-login-log").log({
          userId: user.id,
          loginType: "wechat_app",
          provider: "wechat",
          channelCode,
          appCode,
          ip: ctx.request.ip,
          userAgent: ctx.request.headers["user-agent"],
          success: true
        });
      } catch (le) {
        strapi.log.warn(`[zhao-sso] App 登录日志写入失败: ${le.message}`);
      }
      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);
      ctx.body = { ...tokenPair, is_new: isNew };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: "wechat_login_failed", error_description: e.message };
    }
  },
  async jssdkSignature(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { url, appType } = body;
      if (!url) {
        ctx.status = 400;
        ctx.body = { error: "invalid_request", error_description: "url 必填" };
        return;
      }
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const signature = await wechatService.getJssdkSignature(url, appType || "official_account");
      ctx.body = signature;
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async wechatConfig(ctx) {
    try {
      const { appType } = ctx.query;
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const config2 = await wechatService.getWechatLoginConfig(appType || "official_account");
      ctx.body = {
        enabled: config2?.enabled ?? false,
        appType: appType || "official_account",
        oauthScopes: config2?.oauthScopes || [],
        appId: config2?.appId || null
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async alipayRedirect(ctx) {
    try {
      const { app_code, channel_code, invite_code, redirect_uri } = ctx.query;
      if (!redirect_uri) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 必填" };
        return;
      }
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(app_code || "course");
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在或已禁用" };
        return;
      }
      const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
      const state = Buffer.from(JSON.stringify({
        app_code: app_code || "course",
        channel_code: channel_code || "",
        invite_code: invite_code || "",
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
      const { userId, isNew } = await alipayService.handleCallback(auth_code);
      const appCode = stateData.app_code || "course";
      try {
        const channelSync2 = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync2) {
          await channelSync2.syncUserInvite(userId, stateData.invite_code || "", stateData.channel_code || "");
        }
      } catch (e) {
        strapi.log.warn(`[zhao-sso] alipay 分销关系建立失败: ${e.message}`);
      }
      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
        isNew
      });
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e) {
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
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
  async getApp(ctx) {
    try {
      const { id } = ctx.params;
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const app = await appService.findOne(parseInt(id));
      if (!app) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在" };
        return;
      }
      ctx.body = { data: app };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async deleteApp(ctx) {
    try {
      const { id } = ctx.params;
      const appService = strapi.plugin("zhao-sso").service("sso-app");
      const app = await appService.findOne(parseInt(id));
      if (!app) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在" };
        return;
      }
      await appService.delete(parseInt(id));
      ctx.body = { data: { id: parseInt(id) } };
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
      const { pagination = {}, ...restFilters } = ctx.query;
      const pageNum = Number(pagination.page || 1);
      const pageSizeNum = Number(pagination.pageSize || 20);
      const results = await strapi.documents(UID$6).findMany({
        filters: restFilters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$6).count({ where: restFilters });
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
      const { pagination = {}, ...restFilters } = ctx.query;
      const pageNum = Number(pagination.page || 1);
      const pageSizeNum = Number(pagination.pageSize || 20);
      const results = await strapi.documents(UID$5).findMany({
        filters: restFilters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum
      });
      const total = await strapi.db.query(UID$5).count({ where: restFilters });
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
      const result = await strapi.documents(UID$5).create({ data });
      ctx.body = { data: sanitize$1(result) };
    } catch (e) {
      strapi.log.error(`[zhao-sso] create oauth-config error: ${e?.stack || e?.message || e}`);
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, details: e?.details };
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
const TEMPLATE_UID$1 = "plugin::zhao-sso.msg-template";
const JOB_UID$2 = "plugin::zhao-sso.msg-job";
const messageController = ({ strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-msg");
  async function wrap(ctx, fn) {
    try {
      ctx.body = await fn();
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
  return {
    // ===== 消息模板 CRUD =====
    async listTemplates(ctx) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, ...filters } = ctx.query;
        const pageNum = Number(page);
        const pageSizeNum = Number(pageSize);
        const results = await strapi.documents(TEMPLATE_UID$1).findMany({
          filters,
          sort: { createdAt: "desc" },
          limit: pageSizeNum,
          start: (pageNum - 1) * pageSizeNum
        });
        const total = await strapi.db.query(TEMPLATE_UID$1).count({ where: filters });
        return { data: results, meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } } };
      });
    },
    async getTemplate(ctx) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID$1).findOne({ documentId: ctx.params.id });
        if (!result) throw { status: 404, message: "模板不存在" };
        return { data: result };
      });
    },
    async createTemplate(ctx) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID$1).create({ data: ctx.request.body });
        return { data: result };
      });
    },
    async updateTemplate(ctx) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID$1).update({
          documentId: ctx.params.id,
          data: ctx.request.body
        });
        return { data: result };
      });
    },
    async deleteTemplate(ctx) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(TEMPLATE_UID$1).delete({ documentId: ctx.params.id });
        return { data: result };
      });
    },
    // ===== 消息任务 =====
    async listJobs(ctx) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, ...rest } = ctx.query;
        const pageNum = Number(page);
        const pageSizeNum = Number(pageSize);
        const filters = {};
        for (const k of ["status", "scene", "provider"]) {
          if (rest[k]) filters[k] = rest[k];
        }
        const results = await strapi.documents(JOB_UID$2).findMany({
          filters,
          populate: ["template", "user", "version"],
          sort: { createdAt: "desc" },
          limit: pageSizeNum,
          start: (pageNum - 1) * pageSizeNum
        });
        const total = await strapi.db.query(JOB_UID$2).count({ where: filters });
        return { data: results, meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } } };
      });
    },
    async getJob(ctx) {
      await wrap(ctx, async () => {
        const result = await strapi.documents(JOB_UID$2).findOne({
          documentId: ctx.params.id,
          populate: ["template", "user", "version"]
        });
        if (!result) throw { status: 404, message: "任务不存在" };
        return { data: result };
      });
    },
    /** 手动单发：立即 buildJob + sendJob */
    async sendNow(ctx) {
      await wrap(ctx, async () => {
        const { userId, templateCode, params, link, scene } = ctx.request.body;
        const job = await svc().sendNow({
          user: userId,
          scene: scene || "manual",
          templateCode,
          params,
          link
        });
        return { data: job };
      });
    },
    /** 批量发送：按用户 id 列表 or 筛选，逐个 buildJob+sendJob */
    async sendBatch(ctx) {
      await wrap(ctx, async () => {
        const { userIds = [], templateCode, params, link, scene, userId } = ctx.request.body;
        const ids = Array.isArray(userIds) && userIds.length ? userIds : userId ? [userId] : [];
        if (!ids.length) throw { status: 400, message: "未指定目标用户" };
        const results = [];
        for (const uid of ids) {
          results.push(
            await svc().sendNow({ user: uid, scene: scene || "batch", templateCode, params, link })
          );
        }
        return { data: results };
      });
    },
    /** 失败重试 */
    async retryJob(ctx) {
      await wrap(ctx, async () => {
        const { retryCount } = await strapi.db.query(JOB_UID$2).findOne({
          where: { id: ctx.params.id },
          select: ["retryCount"]
        });
        if (retryCount !== void 0 && retryCount >= 3) {
          throw { status: 400, message: "重试次数已达上限" };
        }
        const job = await svc().sendJob(ctx.params.id);
        return { data: job };
      });
    },
    /** 查询/刷新用户公众号关注状态 */
    async refreshSubscribe(ctx) {
      await wrap(ctx, async () => {
        const subscribe = await svc().refreshSubscribe(Number(ctx.params.id));
        return { data: { userId: Number(ctx.params.id), subscribe } };
      });
    }
  };
};
const RULE_UID = "plugin::zhao-sso.sop-rule";
const sopController = ({ strapi }) => {
  async function wrap(ctx, fn) {
    try {
      ctx.body = await fn();
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
  return {
    async list(ctx) {
      await wrap(ctx, async () => {
        const results = await strapi.db.query(RULE_UID).findMany({
          orderBy: { id: "ASC" }
        });
        const total = await strapi.db.query(RULE_UID).count();
        return { data: results, meta: { total } };
      });
    },
    async create(ctx) {
      await wrap(ctx, async () => {
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(RULE_UID).create({ data });
        return { data: row };
      });
    },
    async update(ctx) {
      await wrap(ctx, async () => {
        const { id } = ctx.params;
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(RULE_UID).update({ where: { id: Number(id) }, data });
        return { data: row };
      });
    },
    async delete(ctx) {
      await wrap(ctx, async () => {
        const { id } = ctx.params;
        await strapi.db.query(RULE_UID).delete({ where: { id: Number(id) } });
        return { data: { id: Number(id) } };
      });
    }
  };
};
const PROFILE_UID$1 = "plugin::zhao-sso.sso-user-profile";
const profileController = ({ strapi }) => {
  async function wrap(ctx, fn) {
    try {
      ctx.body = await fn();
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
  return {
    async list(ctx) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, segment } = ctx.query;
        const limit = Math.min(Number(pageSize) || 20, 100);
        const start = (Number(page) - 1) * limit;
        const where = {};
        if (segment) where.segment = { $eq: segment };
        const results = await strapi.db.query(PROFILE_UID$1).findMany({
          where,
          populate: { user: true },
          orderBy: { segmentScore: "DESC" },
          limit,
          offset: start
        });
        const total = await strapi.db.query(PROFILE_UID$1).count({ where });
        return { data: results, meta: { pagination: { page: Number(page), pageSize: limit, total } } };
      });
    },
    async detail(ctx) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.getProfile(Number(ctx.params.id)) };
      });
    },
    async recalcAll(ctx) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.recalcAll(Number(ctx.query.limit) || 500) };
      });
    }
  };
};
const REF_UID = "plugin::zhao-sso.sso-referral-relation";
const FOLLOW_UID = "plugin::zhao-sso.sso-follow-up";
const partnerController = ({ strapi }) => {
  async function wrap(ctx, fn) {
    try {
      ctx.body = await fn();
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
  const me = async (ctx) => {
    const ssoUser2 = ctx.state?.ssoUser;
    if (!ssoUser2?.sub) return null;
    const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser2.sub);
    return user?.id ?? null;
  };
  async function assertCustomer(partnerId, customerId) {
    const rel = await strapi.db.query(REF_UID).findOne({ where: { inviter: partnerId, invitee: customerId } });
    if (!rel) {
      const e = new Error("无权查看该客户");
      e.status = 403;
      throw e;
    }
    return rel;
  }
  return {
    async myCustomers(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        const rels = await strapi.db.query(REF_UID).findMany({ where: { inviter: partnerId }, populate: ["invitee"] });
        const out = [];
        for (const r of rels) {
          const cust = r.invitee;
          if (!cust) continue;
          const prof = await svc.getProfile(cust.id);
          out.push({ id: cust.id, username: cust.username, email: cust.email, mobile: cust.mobile, profile: prof });
        }
        return { data: out };
      });
    },
    async customerDetail(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        await assertCustomer(partnerId, Number(ctx.params.id));
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.getProfile(Number(ctx.params.id)) };
      });
    },
    async touch(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        const customerId = Number(ctx.params.id);
        await assertCustomer(partnerId, customerId);
        const { templateCode, params = {}, link } = ctx.request?.body || {};
        if (!templateCode) {
          const e = new Error("缺少 templateCode");
          e.status = 400;
          throw e;
        }
        const msg = strapi.plugin("zhao-sso").service("sso-msg");
        const job = await msg.sendNow({ user: customerId, scene: "partner.touch", templateCode, params, link, dedupeKey: `partner:${partnerId}:${customerId}:${templateCode}` });
        return { data: job };
      });
    },
    async listFollowUps(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        const rows = await strapi.db.query(FOLLOW_UID).findMany({ where: { partner: partnerId }, orderBy: { id: "DESC" }, limit: 100 });
        return { data: rows };
      });
    },
    async createFollowUp(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        const { customer, content, status = "todo", nextFollowAt } = ctx.request?.body || {};
        if (!customer || !content) {
          const e = new Error("缺少 customer/content");
          e.status = 400;
          throw e;
        }
        await assertCustomer(partnerId, Number(customer));
        const row = await strapi.db.query(FOLLOW_UID).create({ data: { partner: partnerId, customer: Number(customer), content, status, nextFollowAt } });
        return { data: row };
      });
    },
    async updateFollowUp(ctx) {
      await wrap(ctx, async () => {
        const partnerId = await me(ctx);
        if (!partnerId) {
          ctx.status = 401;
          return { error: "未登录" };
        }
        const row = await strapi.db.query(FOLLOW_UID).findOne({ where: { id: Number(ctx.params.id), partner: partnerId } });
        if (!row) {
          ctx.status = 403;
          return { error: "无权操作" };
        }
        const updated = await strapi.db.query(FOLLOW_UID).update({ where: { id: row.id }, data: ctx.request?.body || {} });
        return { data: updated };
      });
    }
  };
};
const VERSION_UID$1 = "plugin::zhao-sso.msg-template-version";
const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const JOB_UID$1 = "plugin::zhao-sso.msg-job";
const VISIT_LOG_UID$1 = "plugin::zhao-website.visit-log";
const msgVersionController = ({ strapi }) => {
  async function wrap(ctx, fn) {
    try {
      ctx.body = await fn();
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
  async function resolveTemplate(templateId) {
    const num = Number(templateId);
    if (Number.isInteger(num) && num > 0) {
      const t2 = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: num } });
      if (t2) return t2.id;
    }
    const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { documentId: templateId } });
    if (!t) {
      const e = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    return t.id;
  }
  return {
    async list(ctx) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID$1).findMany({
          where: { template: templateId },
          orderBy: { id: "DESC" }
        });
        const clicks = {};
        for (const r of rows) {
          if (!r.code) continue;
          const c = await strapi.db.query(VISIT_LOG_UID$1).count({ where: { utmSource: "msg", utmCampaign: r.code } }).catch(() => 0);
          clicks[r.code] = c;
        }
        return { data: rows.map((r) => ({ ...r, clickCountLive: clicks[r.code] || 0 })) };
      });
    },
    async create(ctx) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(VERSION_UID$1).create({
          data: { ...data, template: templateId, sentCount: 0, successCount: 0, clickCount: 0 }
        });
        return { data: row };
      });
    },
    async update(ctx) {
      await wrap(ctx, async () => {
        const row = await strapi.db.query(VERSION_UID$1).update({
          where: { id: Number(ctx.params.id) },
          data: ctx.request?.body || {}
        });
        return { data: row };
      });
    },
    async delete(ctx) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const used = await strapi.db.query(JOB_UID$1).count({ where: { version: id } });
        if (used > 0) {
          const e = new Error(`该版本已被 ${used} 个消息任务引用，无法删除`);
          e.status = 400;
          throw e;
        }
        await strapi.db.query(VERSION_UID$1).delete({ where: { id } });
        return { data: { id } };
      });
    },
    async activate(ctx) {
      await wrap(ctx, async () => {
        const id = Number(ctx.params.id);
        const row = await strapi.db.query(VERSION_UID$1).findOne({ where: { id } });
        if (!row) {
          const e = new Error("版本不存在");
          e.status = 404;
          throw e;
        }
        await strapi.db.query(VERSION_UID$1).update({ where: { id }, data: { status: "active" } });
        return { data: await strapi.db.query(VERSION_UID$1).findOne({ where: { id } }) };
      });
    },
    async abStats(ctx) {
      await wrap(ctx, async () => {
        const templateId = await resolveTemplate(ctx.params.templateId);
        const rows = await strapi.db.query(VERSION_UID$1).findMany({
          where: { template: templateId },
          orderBy: { id: "ASC" }
        });
        const out = [];
        for (const r of rows) {
          const click = await strapi.db.query(VISIT_LOG_UID$1).count({ where: { utmSource: "msg", utmCampaign: r.code } }).catch(() => 0);
          const sent = r.sentCount || 0;
          out.push({
            ...r,
            clickCountLive: click,
            clickRate: sent ? Math.round(click / sent * 1e3) / 10 : 0,
            successRate: sent ? Math.round((r.successCount || 0) / sent * 1e3) / 10 : 0
          });
        }
        return { data: out };
      });
    }
  };
};
const recommendController = ({ strapi }) => ({
  /** C 端"猜你喜欢"：基于 sso-user 画像兴趣标签推荐 课程/文章/活动 */
  async my(ctx) {
    try {
      const ssoUser2 = ctx.state?.ssoUser;
      if (!ssoUser2?.sub) {
        ctx.status = 401;
        return { error: "未登录" };
      }
      const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser2.sub);
      if (!user?.id) {
        ctx.status = 401;
        return { error: "未登录" };
      }
      const limit = Math.min(Number(ctx.query?.limit) || 5, 10);
      const svc = strapi.plugin("zhao-sso").service("sso-recommend");
      ctx.body = { data: await svc.recommendFor(user.id, limit) };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code || null };
    }
  }
});
const JOB_UID = "plugin::zhao-sso.msg-job";
const noticeController = ({ strapi }) => {
  return {
    /**
     * 我的站内信：读 provider=inapp && status=sent 的消息（按 sso-user 归属）
     * ?page&pageSize&unreadOnly  => { data: { list, unreadCount }, meta }
     */
    async myNotices(ctx) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const { page = "1", pageSize = "20", unreadOnly } = ctx.query;
        const pageNum = parseInt(page, 10);
        const pageSizeNum = parseInt(pageSize, 10);
        const where = {
          provider: "inapp",
          status: "sent",
          user: ssoUserId
        };
        if (unreadOnly === "true" || unreadOnly === "1") where.readAt = { $null: true };
        const [total, unreadCount] = await Promise.all([
          strapi.db.query(JOB_UID).count({ where }),
          strapi.db.query(JOB_UID).count({ where: { ...where, readAt: { $null: true } } })
        ]);
        const rows = await strapi.db.query(JOB_UID).findMany({
          where,
          orderBy: { sentAt: "desc" },
          offset: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum
        });
        ctx.body = {
          data: {
            list: rows,
            unreadCount
          },
          meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } }
        };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    /** 标记站内信已读（幂等，仅属主可操作） */
    async read(ctx) {
      try {
        const ssoUserId = Number(ctx.state.user?.id || ctx.state.user?.documentId);
        const jobId = parseInt(ctx.params.id, 10);
        const job = await strapi.db.query(JOB_UID).findOne({ where: { id: jobId } });
        if (!job) {
          ctx.status = 404;
          ctx.body = { error: "消息不存在" };
          return;
        }
        if ((job.user?.id ?? job.user) !== ssoUserId) {
          ctx.status = 403;
          ctx.body = { error: "无权操作" };
          return;
        }
        if (!job.readAt) {
          await strapi.db.query(JOB_UID).update({ where: { id: jobId }, data: { readAt: /* @__PURE__ */ new Date() } });
        }
        ctx.body = { data: { ok: true } };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    }
  };
};
const msgStats = ({ strapi }) => ({
  async sopStats(ctx) {
    const { from, to, scene } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getSopStats({ from, to, scene });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async repurchaseStats(ctx) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseStats({ from, to });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async courseD7Stats(ctx) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseD7Stats({ from, to });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async courseCompletionStats(ctx) {
    const { from, to } = ctx.query || {};
    try {
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getCourseCompletionStats({ from, to });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async repurchaseLeads(ctx) {
    try {
      const { from, to, page, pageSize, status } = ctx.query || {};
      const data = await strapi.plugin("zhao-sso").service("sso-stats").getRepurchaseLeads({ from, to, page, pageSize, status });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateRepurchaseFollow(ctx) {
    try {
      const { status, remark } = ctx.request?.body || {};
      const data = await strapi.plugin("zhao-sso").service("sso-stats").updateRepurchaseFollow({ jobId: ctx.params.id, status, remark });
      ctx.body = { data };
    } catch (e) {
      ctx.status = e.status || e.cause?.status || 400;
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
  "sms-code": smsCodeController,
  message: messageController,
  sop: sopController,
  profile: profileController,
  partner: partnerController,
  "msg-version": msgVersionController,
  "recommend-controller": recommendController,
  "notice-controller": noticeController,
  "msg-stats": msgStats
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
      method: "POST",
      path: "/v1/auth/exchange-token",
      handler: "oauth-controller.exchangeToken",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/wechat",
      handler: "oauth-controller.wechatRedirect",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/password-authorize",
      handler: "oauth-controller.passwordAuthorize",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/wechat/callback",
      handler: "oauth-controller.wechatCallback",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/wechat/miniprogram",
      handler: "oauth-controller.wechatMiniProgramLogin",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/wechat/app",
      handler: "oauth-controller.wechatAppLogin",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/v1/auth/jssdk-signature",
      handler: "oauth-controller.jssdkSignature",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/v1/auth/wechat/config",
      handler: "oauth-controller.wechatConfig",
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
    },
    {
      method: "GET",
      path: "/v1/recommend",
      handler: "recommend-controller.my",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "GET",
      path: "/v1/my/notices",
      handler: "notice-controller.myNotices",
      config: {
        auth: false,
        policies: ["plugin::zhao-sso.sso-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/my/notices/:id/read",
      handler: "notice-controller.read",
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
    adminRoute("GET", "/apps/:id", "admin-controller.getApp", "sso.app-read"),
    adminRoute("PUT", "/apps/:id", "admin-controller.updateApp", "sso.app-update"),
    adminRoute("DELETE", "/apps/:id", "admin-controller.deleteApp", "sso.app-delete"),
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
    adminRoute("DELETE", "/sms-codes/:id", "sms-code.delete", "sso.sms-code.delete"),
    // 消息中心
    adminRoute("GET", "/msg-templates", "message.listTemplates", "sso.msg.read"),
    adminRoute("GET", "/msg-templates/:id", "message.getTemplate", "sso.msg.read"),
    adminRoute("POST", "/msg-templates", "message.createTemplate", "sso.msg.write"),
    adminRoute("PUT", "/msg-templates/:id", "message.updateTemplate", "sso.msg.write"),
    adminRoute("DELETE", "/msg-templates/:id", "message.deleteTemplate", "sso.msg.write"),
    adminRoute("GET", "/msg-jobs", "message.listJobs", "sso.msg.read"),
    adminRoute("GET", "/msg-jobs/:id", "message.getJob", "sso.msg.read"),
    adminRoute("POST", "/msg-jobs/anonymous", "message.sendNow", "sso.msg.write"),
    adminRoute("POST", "/msg-jobs/batch", "message.sendBatch", "sso.msg.write"),
    adminRoute("POST", "/msg-jobs/:id/retry", "message.retryJob", "sso.msg.write"),
    adminRoute("GET", "/users/:id/subscribe", "message.refreshSubscribe", "sso.user-read"),
    // 模板版本 / AB 测试
    adminRoute("GET", "/msg-templates/:templateId/versions", "msg-version.list", "sso.msg.read"),
    adminRoute("POST", "/msg-templates/:templateId/versions", "msg-version.create", "sso.msg.write"),
    adminRoute("PUT", "/msg-templates/:templateId/versions/:id", "msg-version.update", "sso.msg.write"),
    adminRoute("DELETE", "/msg-templates/:templateId/versions/:id", "msg-version.delete", "sso.msg.write"),
    adminRoute("POST", "/msg-templates/:templateId/versions/:id/activate", "msg-version.activate", "sso.msg.write"),
    adminRoute("GET", "/msg-templates/:templateId/ab-stats", "msg-version.abStats", "sso.msg.read"),
    // 自动化 SOP 规则
    adminRoute("GET", "/sop-rules", "sop.list", "sso.msg.read"),
    adminRoute("POST", "/sop-rules", "sop.create", "sso.msg.write"),
    adminRoute("PUT", "/sop-rules/:id", "sop.update", "sso.msg.write"),
    adminRoute("DELETE", "/sop-rules/:id", "sop.delete", "sso.msg.write"),
    adminRoute("GET", "/msg/sop-stats", "msg-stats.sopStats", "sso.msg.read"),
    adminRoute("GET", "/msg/repurchase-stats", "msg-stats.repurchaseStats", "sso.msg.read"),
    adminRoute("GET", "/msg/repurchase-leads", "msg-stats.repurchaseLeads", "sso.msg.read"),
    adminRoute("POST", "/msg/repurchase-leads/:id/follow", "msg-stats.updateRepurchaseFollow", "sso.msg.write"),
    adminRoute("GET", "/msg/course-d7-stats", "msg-stats.courseD7Stats", "sso.msg.read"),
    adminRoute("GET", "/msg/course-completion-stats", "msg-stats.courseCompletionStats", "sso.msg.read"),
    // 用户画像分层
    adminRoute("GET", "/profiles", "profile.list", "sso.profile.read"),
    adminRoute("GET", "/profiles/:id", "profile.detail", "sso.profile.read"),
    adminRoute("POST", "/profiles/recalc-all", "profile.recalcAll", "sso.profile.write")
  ]
});
const partnerRoute = (method, path, handler) => ({
  method,
  path: `/v1/partner${path}`,
  handler,
  config: { auth: false, policies: ["plugin::zhao-sso.sso-authenticated"] }
});
const partner = () => ({
  type: "content-api",
  routes: [
    partnerRoute("GET", "/my-customers", "partner.myCustomers"),
    partnerRoute("GET", "/customers/:id", "partner.customerDetail"),
    partnerRoute("POST", "/customers/:id/touch", "partner.touch"),
    partnerRoute("GET", "/follow-ups", "partner.listFollowUps"),
    partnerRoute("POST", "/follow-ups", "partner.createFollowUp"),
    partnerRoute("PUT", "/follow-ups/:id", "partner.updateFollowUp")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...api().routes, ...admin().routes, ...partner().routes]
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
const USER_UID$3 = "plugin::zhao-sso.sso-user";
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
      return strapi.db.query(USER_UID$3).create({
        data: {
          uuid: uuid.v4(),
          username: data.username || null,
          mobile: data.mobile || null,
          email: data.email || null,
          password_hash,
          status: "active",
          register_channel: data.register_channel || "sso_local",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          invite_code_used: data.invite_code_used || null,
          login_count: 0
        }
      });
    },
    async findByIdentifier(identifier) {
      return strapi.db.query(USER_UID$3).findOne({
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
      const user = await strapi.db.query(USER_UID$3).findOne({ where: { uuid: uuid2 } });
      return sanitize(user);
    },
    async verifyPassword(user, password) {
      if (!user.password_hash) {
        const raw = await strapi.db.query(USER_UID$3).findOne({ where: { id: user.id }, select: ["password_hash"] });
        if (!raw?.password_hash) return false;
        return bcrypt__default.default.compare(password, raw.password_hash);
      }
      return bcrypt__default.default.compare(password, user.password_hash);
    },
    async updateLoginInfo(userId, channelCode) {
      const current = await strapi.db.query(USER_UID$3).findOne({ where: { id: userId } });
      const updateData = {
        last_login_at: /* @__PURE__ */ new Date(),
        login_count: (current?.login_count || 0) + 1
      };
      if (channelCode) {
        updateData.last_login_channel = channelCode;
      }
      return strapi.db.query(USER_UID$3).update({
        where: { id: userId },
        data: updateData
      });
    },
    async changePassword(userId, newPassword) {
      const password_hash = await bcrypt__default.default.hash(newPassword, 12);
      return strapi.db.query(USER_UID$3).update({
        where: { id: userId },
        data: { password_hash, password_changed_at: /* @__PURE__ */ new Date() }
      });
    },
    async isBlocked(user) {
      return user.status === "blocked";
    },
    async findById(id) {
      const user = await strapi.db.query(USER_UID$3).findOne({ where: { id } });
      return sanitize(user);
    },
    async bindContact(userId, type, identifier, password) {
      const updateData = {};
      if (type === "mobile") updateData.mobile = identifier;
      if (type === "email") updateData.email = identifier;
      if (type === "username") updateData.username = identifier;
      if (password) updateData.password_hash = await bcrypt__default.default.hash(password, 12);
      return strapi.db.query(USER_UID$3).update({ where: { id: userId }, data: updateData });
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
      return strapi.db.query(USER_UID$3).count({ where });
    },
    async findMany(params) {
      const users = await strapi.db.query(USER_UID$3).findMany({
        where: params.where || {},
        orderBy: params.orderBy || { created_at: "desc" },
        limit: params.limit,
        offset: params.offset
      });
      return users.map(sanitize);
    },
    async findOneWithBindings(id) {
      const user = await strapi.db.query(USER_UID$3).findOne({
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
      const user = await strapi.db.query(USER_UID$3).update({ where: { id }, data });
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
      const { userId, appCode, redirectUri, channelCode, inviteCode, scopes, isNew } = params;
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
          invite_code: inviteCode || null,
          scopes: scopes || null,
          is_new: !!isNew,
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
      return this.exchangeCodeInternal({ code, appCode, app, redirectUri });
    },
    /**
     * 内部方法：校验并核销授权码，不校验 app_secret
     * 用于服务端内部调用（如 exchange-token 代理接口，app_secret 由后端自查）
     */
    async exchangeCodeInternal(params) {
      const { code, appCode, app, redirectUri } = params;
      if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
      if (!this.validateGrantType(app, "authorization_code")) throwErr("SSO_OAUTH_008", 400, "该应用未开启 authorization_code 授权");
      if (!this.validateRedirectUri(app, redirectUri)) throwErr("SSO_OAUTH_002", 400, "redirect_uri 不在允许列表中");
      const authCode = await strapi.db.query(AUTH_CODE_UID).findOne({
        where: { code, app_code: appCode },
        populate: ["user"]
      });
      if (!authCode) throwErr("SSO_OAUTH_004", 404, "授权码不存在");
      if (authCode.used) throwErr("SSO_OAUTH_005", 400, "授权码已使用");
      if (new Date(authCode.expires_at) < /* @__PURE__ */ new Date()) throwErr("SSO_OAUTH_006", 400, "授权码已过期");
      const storedBase = (authCode.redirect_uri || "").split("?")[0];
      const requestBase = (redirectUri || "").split("?")[0];
      if (storedBase !== requestBase) throwErr("SSO_OAUTH_007", 400, "redirect_uri 不匹配");
      await strapi.db.query(AUTH_CODE_UID).update({
        where: { id: authCode.id },
        data: { used: true }
      });
      return {
        userId: authCode.user.id,
        channelCode: authCode.channel_code,
        inviteCode: authCode.invite_code,
        scopes: authCode.scopes,
        isNew: !!authCode.is_new
      };
    },
    async findApp(appCode) {
      return strapi.db.query(APP_UID$1).findOne({ where: { app_code: appCode } });
    },
    /**
     * 校验 redirect_uri 是否在白名单中
     * 剥离 query 参数后比对（origin + path + hash），
     * 与 zhao-third 行为对齐：不因 query 参数阻断合法回调地址。
     * 白名单条目示例：https://h.joho.cn/#/pages/sso/login-callback
     * 实际 redirectUri 可能携带 ?return_url=...&app_code=... 等参数，只比对基础部分。
     */
    validateRedirectUri(app, redirectUri) {
      const allowed = app.redirect_uris || [];
      const baseUri = (redirectUri || "").split("?")[0];
      return allowed.some((pattern) => {
        const basePattern = (pattern || "").split("?")[0];
        if (basePattern.includes("*")) {
          const regex = new RegExp("^" + basePattern.replace(/\*/g, ".*") + "$");
          return regex.test(baseUri);
        }
        return basePattern === baseUri;
      });
    },
    /**
     * 校验 app 是否允许使用指定 grant_type
     * allowed_grant_types 为 sso_apps 表的 JSON 字段，如 ["authorization_code", "refresh_token"]
     * 未配置或非数组时视为允许所有（向后兼容旧数据）
     */
    validateGrantType(app, grantType) {
      const allowed = Array.isArray(app?.allowed_grant_types) ? app.allowed_grant_types : [];
      if (allowed.length === 0) return true;
      return allowed.includes(grantType);
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
  const inviteService = () => strapi.plugin("zhao-sso").service("sso-invite");
  const buildInviteRelation = async (inviteeId, inviteCode, appCode, channelCode) => {
    if (!inviteCode) return;
    try {
      const result = await inviteService().buildReferralRelation({
        inviteeId,
        inviteCode,
        appCode,
        channelCode
      });
      if (result.success) {
        if (!result.skip) {
          strapi.log.info(`[zhao-sso] 分销关系建立: userId=${inviteeId}, code=${inviteCode}, msg=${result.message}`);
        }
      } else {
        strapi.log.warn(`[zhao-sso] 分销关系建立失败: userId=${inviteeId}, code=${inviteCode}, msg=${result.message}`);
      }
    } catch (e) {
      strapi.log.warn(`[zhao-sso] 分销关系建立异常: ${e.message}`);
    }
  };
  const login = async (params) => {
    const { type, identifier, password, code, appCode, channelCode, inviteCode, ip, userAgent } = params;
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
      await buildInviteRelation(user.id, inviteCode, appCode, channelCode);
      return {
        ...tokenPair,
        ssoUserId: user.id,
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
      await buildInviteRelation(user.id, inviteCode, appCode, channelCode);
      return {
        ...tokenPair,
        ssoUserId: user.id,
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
    await buildInviteRelation(user.id, inviteCode, appCode, channelCode);
    return {
      ...tokenPair,
      ssoUserId: user.id,
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
    let payload;
    try {
      payload = await jwtService().verifyToken(refreshToken2);
    } catch (e) {
      strapi.log.warn(`[zhao-sso] refresh verify failed: ${e?.message || e}`);
      throwErr("SSO_AUTH_009", 401, "无效的 refresh token");
    }
    if (payload.type !== "refresh") throwErr("SSO_AUTH_009", 401, "无效的 refresh token");
    if (!payload.sub) throwErr("SSO_AUTH_009", 401, "无效的 refresh token");
    const tokenRecord = await strapi.db.query(TOKEN_UID).findOne({
      where: { refresh_token: refreshToken2 }
    });
    if (!tokenRecord) throwErr("SSO_AUTH_010", 404, "Token 记录不存在");
    if (tokenRecord.revoked) throwErr("SSO_AUTH_011", 401, "Refresh token 已被撤销");
    if (new Date(tokenRecord.refresh_expires_at) < /* @__PURE__ */ new Date()) throwErr("SSO_AUTH_012", 401, "Refresh token 已过期");
    const appCode = payload.app_code || tokenRecord.app_code;
    if (!appCode) throwErr("SSO_AUTH_009", 401, "无效的 refresh token");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
    const app = await oauthService.findApp(appCode);
    if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
    if (!oauthService.validateGrantType(app, "refresh_token")) throwErr("SSO_OAUTH_008", 400, "该应用未开启 refresh_token 授权");
    await strapi.db.query(TOKEN_UID).update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revoked_at: /* @__PURE__ */ new Date() }
    });
    const user = await userService().findByUuid(payload.sub);
    if (!user) throwErr("SSO_AUTH_008", 404, "用户不存在");
    const roles = await getUserRoles(user.id, appCode);
    const newTokenPair = await jwtService().signTokenPair({
      sub: user.uuid,
      app_code: appCode,
      roles,
      channel: payload.channel
    });
    await saveTokenRecord(user.id, appCode, newTokenPair, payload.channel);
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
const BINDING_UID$2 = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID$2 = "plugin::zhao-sso.sso-user";
const ssoWechat = ({ strapi }) => {
  const tokenCache = /* @__PURE__ */ new Map();
  const ticketCache = /* @__PURE__ */ new Map();
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  async function getConfig(appType) {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config2 = await configService.findByProviderAndAppType("wechat", appType);
    if (!config2) throwErr("SSO_WECHAT_001", 500, `[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat, appType=${appType})`);
    return config2;
  }
  async function getValidAccessToken(config2) {
    const cacheKey = config2.appId.trim();
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 6e4) {
      return cached.value;
    }
    const fetchToken = async () => {
      const res = await axios__default.default.get("https://api.weixin.qq.com/cgi-bin/token", {
        params: {
          grant_type: "client_credential",
          appid: config2.appId.trim(),
          secret: config2.appSecret
        }
      });
      return res.data || {};
    };
    let data = await fetchToken();
    if (data.errcode === 40001) {
      tokenCache.delete(cacheKey);
      data = await fetchToken();
    }
    if (data.errcode) {
      throwErr("SSO_WECHAT_010", 502, `WeChat token error: ${data.errmsg}`);
    }
    const expiresIn = data.expires_in || 7200;
    tokenCache.set(cacheKey, {
      value: data.access_token,
      expiresAt: Date.now() + expiresIn * 1e3
    });
    return data.access_token;
  }
  async function getJsapiTicket(accessToken) {
    const cached = ticketCache.get(accessToken);
    if (cached && cached.expiresAt > Date.now() + 6e4) {
      return cached.value;
    }
    const res = await axios__default.default.get("https://api.weixin.qq.com/cgi-bin/ticket/getticket", {
      params: { access_token: accessToken, type: "jsapi" }
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_WECHAT_011", 502, `WeChat ticket error: ${data.errmsg}`);
    }
    const expiresIn = data.expires_in || 7200;
    ticketCache.set(accessToken, {
      value: data.ticket,
      expiresAt: Date.now() + expiresIn * 1e3
    });
    return data.ticket;
  }
  return {
    async getAuthorizeUrl(state, appType, scope, callbackUrl) {
      const config2 = await getConfig(appType);
      const cleanAppId = config2.appId.trim();
      if (appType === "mini_program") {
        return "";
      }
      if (appType === "open_platform") {
        const finalScope2 = scope || "snsapi_login";
        const params2 = new URLSearchParams({
          appid: cleanAppId,
          redirect_uri: callbackUrl || "",
          response_type: "code",
          scope: finalScope2,
          state
        });
        return `https://open.weixin.qq.com/connect/qrconnect?${params2.toString()}#wechat_redirect`;
      }
      const finalScope = scope || "snsapi_userinfo";
      const params = new URLSearchParams({
        appid: cleanAppId,
        redirect_uri: callbackUrl || "",
        response_type: "code",
        scope: finalScope,
        state
      });
      return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
    },
    async handleCallback(code, appType) {
      const config2 = await getConfig(appType);
      const cleanAppId = config2.appId.trim();
      let openid;
      let unionid = null;
      let tokenData = {};
      let userInfo = null;
      if (appType === "mini_program") {
        const sessionRes = await axios__default.default.get("https://api.weixin.qq.com/sns/jscode2session", {
          params: {
            appid: cleanAppId,
            secret: config2.appSecret,
            js_code: code,
            grant_type: "authorization_code"
          }
        });
        if (sessionRes.data.errcode) {
          throwErr("SSO_WECHAT_004", 502, `WeChat jscode2session error: ${sessionRes.data.errmsg}`);
        }
        openid = sessionRes.data.openid;
        unionid = sessionRes.data.unionid || null;
        tokenData = sessionRes.data;
      } else {
        const tokenRes = await axios__default.default.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
          params: {
            appid: cleanAppId,
            secret: config2.appSecret,
            code,
            grant_type: "authorization_code"
          }
        });
        if (tokenRes.data.errcode) throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);
        openid = tokenRes.data.openid;
        unionid = tokenRes.data.unionid || null;
        tokenData = tokenRes.data;
        const wxAccessToken = tokenRes.data.access_token;
        let userInfoRes = {};
        try {
          userInfoRes = await axios__default.default.get("https://api.weixin.qq.com/sns/userinfo", {
            params: { access_token: wxAccessToken, openid }
          });
        } catch {
        }
        userInfo = userInfoRes.data;
      }
      const binding = await strapi.db.query(BINDING_UID$2).findOne({
        where: { provider: "wechat", provider_user_id: openid },
        populate: { user: true }
      });
      if (binding) {
        try {
          const subscribe = await this.querySubscribe(openid, "wechat", appType);
          await strapi.db.query(BINDING_UID$2).update({
            where: { id: binding.id },
            data: { subscribe, subscribe_at: /* @__PURE__ */ new Date(), subscribe_check_at: /* @__PURE__ */ new Date() }
          });
        } catch {
        }
        return { userId: binding.user.id, isNew: false };
      }
      const rawNickname = (userInfo?.nickname || "wx_user").replace(/[^\w\u4e00-\u9fa5]/g, "").substring(0, 12) || "wx_user";
      const shortId = uuid.v4().replace(/-/g, "").substring(0, 8);
      const username = `wx_${rawNickname}_${shortId}`;
      const user = await strapi.db.query(USER_UID$2).create({
        data: {
          uuid: uuid.v4(),
          username,
          nickname: userInfo?.nickname || null,
          avatar_url: userInfo?.headimgurl || null,
          status: "active",
          login_count: 0,
          register_channel: `sso_wechat_${appType}`
        }
      });
      await strapi.db.query(BINDING_UID$2).create({
        data: {
          user: { id: user.id },
          provider: "wechat",
          provider_user_id: openid,
          provider_union_id: unionid,
          provider_nickname: userInfo?.nickname || null,
          provider_avatar: userInfo?.headimgurl || null,
          provider_data: tokenData,
          bound_at: /* @__PURE__ */ new Date()
        }
      });
      try {
        const subscribe = await this.querySubscribe(openid, "wechat", appType);
        await strapi.db.query(BINDING_UID$2).update({
          where: { provider_user_id: openid },
          data: { subscribe, subscribe_at: /* @__PURE__ */ new Date(), subscribe_check_at: /* @__PURE__ */ new Date() }
        });
      } catch {
      }
      return { userId: user.id, isNew: true };
    },
    async getJssdkSignature(url, appType) {
      const config2 = await getConfig(appType);
      const accessToken = await getValidAccessToken(config2);
      const ticket = await getJsapiTicket(accessToken);
      const nonceStr = uuid.v4().replace(/-/g, "").substring(0, 16);
      const timestamp = Math.floor(Date.now() / 1e3).toString();
      const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
      const signature = crypto__namespace.default.createHash("sha1").update(raw).digest("hex");
      return {
        appId: config2.appId.trim(),
        timestamp,
        nonceStr,
        signature
      };
    },
    async getWechatLoginConfig(appType) {
      const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
      const config2 = await configService.findByProviderAndAppType("wechat", appType);
      if (!config2) {
        return { enabled: false, appType, oauthScopes: [], appId: null };
      }
      return {
        enabled: true,
        appType,
        oauthScopes: config2.extraConfig?.oauthScopes || ["snsapi_userinfo"],
        appId: config2.appId
      };
    },
    /**
     * 查询用户是否关注公众号(subscribe)
     * 调 cgi-bin/user/info + 全局 access_token，返回 subscribe(1关注/0未关注)
     */
    async querySubscribe(openid, provider = "wechat", appType = "official_account") {
      if (provider !== "wechat") return 0;
      if (process.env.MSG_WECHAT_PROVIDER === "mock") return 1;
      const config2 = await getConfig(appType);
      const accessToken = await getValidAccessToken(config2);
      const res = await axios__default.default.get("https://api.weixin.qq.com/cgi-bin/user/info", {
        params: { access_token: accessToken, openid },
        timeout: 1e4
      });
      const data = res.data || {};
      if (data.errcode) {
        throwErr("SSO_WECHAT_012", 502, `WeChat user info error: ${data.errmsg}`);
      }
      return data.subscribe === 1 ? 1 : 0;
    }
  };
};
const BINDING_UID$1 = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID$1 = "plugin::zhao-sso.sso-user";
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
      const redirectUri = `${serverUrl}/api/zhao-sso/v1/auth/alipay/callback`;
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
      const binding = await strapi.db.query(BINDING_UID$1).findOne({
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
      const user = await strapi.db.query(USER_UID$1).create({
        data: {
          uuid: uuid.v4(),
          nickname: userInfo.nick_name || null,
          avatar_url: userInfo.avatar || null,
          status: "active",
          login_count: 0
        }
      });
      await strapi.db.query(BINDING_UID$1).create({
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
    await userInviteService.createForUser(ssoUserId, inviteCode, void 0, void 0, channelCode);
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
  },
  async findOne(id) {
    return strapi.db.query(APP_UID).findOne({ where: { id } });
  },
  async delete(id) {
    return strapi.db.query(APP_UID).delete({ where: { id } });
  }
});
const CONFIG_UID$1 = "plugin::zhao-sso.sso-oauth-config";
const ssoOauthConfig = ({ strapi }) => ({
  async findByProvider(provider) {
    const row = await strapi.db.query(CONFIG_UID$1).findOne({
      where: { provider, is_enabled: true }
    });
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.documentId,
      name: row.name,
      provider: row.provider,
      appType: row.app_type,
      appId: row.app_id,
      appSecret: row.app_secret,
      scope: row.scope,
      extraConfig: row.extra_config,
      redirectUris: row.redirect_uris,
      isEnabled: row.is_enabled
    };
  },
  async findByProviderAndAppType(provider, appType) {
    const row = await strapi.db.query(CONFIG_UID$1).findOne({
      where: { provider, app_type: appType, is_enabled: true }
    });
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.documentId,
      name: row.name,
      provider: row.provider,
      appType: row.app_type,
      appId: row.app_id,
      appSecret: row.app_secret,
      scope: row.scope,
      extraConfig: row.extra_config,
      redirectUris: row.redirect_uris,
      isEnabled: row.is_enabled
    };
  },
  async list() {
    const rows = await strapi.db.query(CONFIG_UID$1).findMany({
      orderBy: { provider: "ASC" }
    });
    return rows;
  },
  async create(data) {
    return strapi.db.query(CONFIG_UID$1).create({
      data: {
        name: data.name,
        provider: data.provider,
        app_type: data.app_type || "default",
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
    return strapi.db.query(CONFIG_UID$1).update({ where: { id }, data });
  },
  async delete(id) {
    return strapi.db.query(CONFIG_UID$1).delete({ where: { id } });
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
const INVITE_CODE_UID = "plugin::zhao-sso.sso-invite-code";
const REFERRAL_RELATION_UID = "plugin::zhao-sso.sso-referral-relation";
const INVITE_USAGE_UID = "plugin::zhao-sso.sso-invite-usage";
const USER_UID = "plugin::zhao-sso.sso-user";
const ssoInvite = ({ strapi }) => {
  const validateInviteCode = async (code, appCode) => {
    if (!code || !appCode) return null;
    try {
      const inviteCode = await strapi.db.query(INVITE_CODE_UID).findOne({
        where: { code, app_code: appCode, is_active: true },
        populate: ["creator"]
      });
      if (!inviteCode) return null;
      const now = /* @__PURE__ */ new Date();
      if (inviteCode.valid_from && new Date(inviteCode.valid_from) > now) return null;
      if (inviteCode.valid_until && new Date(inviteCode.valid_until) < now) return null;
      if (inviteCode.max_uses && inviteCode.use_count >= inviteCode.max_uses) return null;
      return inviteCode;
    } catch (e) {
      strapi.log.warn(`[sso-invite] 校验邀请码失败: ${e.message}`);
      return null;
    }
  };
  const getOrCreateVirtualUser = async (inviteCodeRecord) => {
    if (inviteCodeRecord.creator && inviteCodeRecord.creator.id) {
      const existing = await strapi.db.query(USER_UID).findOne({
        where: { id: inviteCodeRecord.creator.id }
      });
      if (existing) return existing;
    }
    const virtualUsername = `virtual_${inviteCodeRecord.code}`;
    const existingVirtual = await strapi.db.query(USER_UID).findOne({
      where: { username: virtualUsername }
    });
    if (existingVirtual) return existingVirtual;
    return strapi.db.query(USER_UID).create({
      data: {
        uuid: uuid.v4(),
        username: virtualUsername,
        mobile: null,
        email: null,
        password_hash: null,
        status: "virtual",
        register_channel: "virtual_invite_code",
        invite_code_used: null,
        invited_by: null
      }
    });
  };
  const calculateLevel = async (inviterId) => {
    const inviterRelation = await strapi.db.query(REFERRAL_RELATION_UID).findOne({
      where: { invitee: { id: inviterId } },
      orderBy: { level: "desc" }
    });
    if (!inviterRelation) return 1;
    return (inviterRelation.level || 0) + 1;
  };
  const buildReferralRelation = async (params) => {
    const { inviteeId, inviteCode, appCode, channelCode } = params;
    try {
      const invitee = await strapi.db.query(USER_UID).findOne({ where: { id: inviteeId } });
      if (!invitee) {
        return { success: false, message: "被邀请用户不存在" };
      }
      if (invitee.invite_code_used && invitee.invited_by) {
        return { success: true, message: "已建立分销关系，跳过", skip: true };
      }
      const inviteCodeRecord = await validateInviteCode(inviteCode, appCode);
      if (!inviteCodeRecord) {
        strapi.log.info(`[sso-invite] 邀请码无效或已过期: code=${inviteCode}, appCode=${appCode}`);
        return { success: false, message: "邀请码无效或已过期" };
      }
      const inviter = await getOrCreateVirtualUser(inviteCodeRecord);
      if (!inviter) {
        return { success: false, message: "无法获取邀请人" };
      }
      if (inviter.id === inviteeId) {
        return { success: false, message: "不能邀请自己" };
      }
      const level = await calculateLevel(inviter.id);
      const result = await strapi.db.transaction(async () => {
        await strapi.db.query(USER_UID).update({
          where: { id: inviteeId },
          data: {
            invite_code_used: inviteCode,
            invited_by: inviter.id
          }
        });
        await strapi.db.query(REFERRAL_RELATION_UID).create({
          data: {
            inviter: { id: inviter.id },
            invitee: { id: inviteeId },
            invite_code: { id: inviteCodeRecord.id },
            level,
            channel_code: channelCode || null
          }
        });
        await strapi.db.query(INVITE_USAGE_UID).create({
          data: {
            user: { id: inviteeId },
            invite_code: { id: inviteCodeRecord.id },
            app_code: appCode,
            channel_code: channelCode || null,
            used_at: /* @__PURE__ */ new Date()
          }
        });
        await strapi.db.query(INVITE_CODE_UID).update({
          where: { id: inviteCodeRecord.id },
          data: { use_count: (inviteCodeRecord.use_count || 0) + 1 }
        });
        return { level, inviterId: inviter.id };
      });
      strapi.log.info(
        `[sso-invite] 分销关系建立成功: invitee=${inviteeId}, inviter=${result.inviterId}, level=${result.level}, code=${inviteCode}`
      );
      return { success: true, message: "分销关系建立成功" };
    } catch (e) {
      strapi.log.warn(`[sso-invite] 建立分销关系失败: ${e.message}`);
      return { success: false, message: e.message };
    }
  };
  return {
    validateInviteCode,
    getOrCreateVirtualUser,
    buildReferralRelation
  };
};
const CONFIG_UID = "plugin::zhao-sso.sso-oauth-config";
function createWechatTemplateChannel({ strapi }) {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  async function getAccessToken() {
    const provider = process.env.MSG_WECHAT_PROVIDER || "wechat";
    if (provider === "mock") return "mock_access_token";
    const config2 = await strapi.db.query(CONFIG_UID).findOne({
      where: { provider: "wechat", app_type: "official_account", is_enabled: true }
    });
    if (!config2) {
      throwErr("SSO_MSG_WECHAT_001", 500, "[zhao-sso] 未找到公众号(wechat/official_account)配置，请在后台配置");
    }
    const res = await axios__default.default.get("https://api.weixin.qq.com/cgi-bin/token", {
      params: { grant_type: "client_credential", appid: config2.app_id.trim(), secret: config2.app_secret },
      timeout: 1e4
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_MSG_WECHAT_010", 502, `WeChat token error: ${data.errmsg}`);
    }
    return data.access_token;
  }
  return {
    provider: "wechat",
    /**
     * 发送模板消息
     * @param opts { openid, templateId, url, data }  data 为 {字段名:{value}}，调用方已按模板字段映射
     * @returns { msgId, raw }  微信返回 msgid + 原始数据
     */
    async send(opts) {
      const provider = process.env.MSG_WECHAT_PROVIDER || "wechat";
      const accessToken = await getAccessToken();
      if (provider === "mock") {
        return { msgId: `mock_${Date.now()}`, raw: { errcode: 0, errmsg: "mock ok", msgid: Date.now() } };
      }
      const body = {
        touser: opts.openid,
        template_id: opts.templateId,
        data: opts.data
      };
      if (opts.url) body.url = opts.url;
      const res = await axios__default.default.post(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        body,
        { timeout: 1e4 }
      );
      const data = res.data || {};
      if (data.errcode === 43101) {
        throwErr("SSO_MSG_NOT_SUBSCRIBE", 420, "用户未关注公众号");
      }
      if (data.errcode) {
        throwErr("SSO_MSG_WECHAT_020", 502, `WeChat template send error: ${data.errmsg}(${data.errcode})`);
      }
      return { msgId: data.msgid, raw: data };
    }
  };
}
const MSG_TEMPLATE_UID$2 = "plugin::zhao-sso.msg-template";
const MSG_JOB_UID$2 = "plugin::zhao-sso.msg-job";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const VERSION_UID = "plugin::zhao-sso.msg-template-version";
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 5 * 60 * 1e3;
function pickVersion(versions) {
  const pool = (versions || []).filter((v) => (v.weight || 0) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((s, v) => s + (v.weight || 0), 0);
  let r = Math.random() * total;
  for (const v of pool) {
    r -= v.weight || 0;
    if (r <= 0) return v;
  }
  return pool[pool.length - 1];
}
function appendUtm(link, code, jobId) {
  if (!link) return link;
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}utm_source=msg&utm_campaign=${encodeURIComponent(code)}&utm_content=${jobId}`;
}
const ssoMsg = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  function resolveChannel(provider) {
    const channels = {
      wechat: createWechatTemplateChannel({ strapi })
    };
    const ch = channels[provider];
    if (!ch) throwErr("SSO_MSG_400", 400, `不支持的通道 provider=${provider}`);
    return ch;
  }
  function renderData(params, wxTemplateFields) {
    const data = {};
    const list = Array.isArray(wxTemplateFields) ? wxTemplateFields : [];
    for (const f of list) {
      const key = f.key;
      const val = params?.[key];
      if (val === null || val === void 0) continue;
      data[f.name] = { value: String(val) };
    }
    return data;
  }
  async function resolveToTarget(userId, provider) {
    if (provider === "wechat") {
      const bindings = await strapi.db.query(BINDING_UID).findMany({
        where: { provider: "wechat" },
        orderBy: { id: "DESC" },
        limit: 100
      });
      const b = bindings.find((x) => x.user === userId || x.user && x.user.id === userId);
      return b?.provider_user_id || null;
    }
    return null;
  }
  return {
    /**
     * 构建消息任务(pending)。幂等：同 dedupeKey 已有未终态任务则跳过。
     * @param opts { user, scene, templateCode, params, link, scheduledAt?, dedupeKey? }
     */
    async buildJob(opts) {
      const { user, scene, templateCode, params = {}, link, scheduledAt, dedupeKey } = opts;
      const template = await strapi.db.query(MSG_TEMPLATE_UID$2).findOne({
        where: { code: templateCode, isEnabled: true }
      });
      if (!template) throwErr("SSO_MSG_TEMPLATE_404", 404, `消息模板未找到或未启用: ${templateCode}`);
      const versions = await strapi.db.query(VERSION_UID).findMany({
        where: { template: template.id, status: "active" }
      });
      const picked = pickVersion(versions);
      template.wxTemplateId;
      template.wxTemplateFields;
      let useLink = template.link || link;
      if (picked) {
        picked.wxTemplateId || template.wxTemplateId;
        picked.wxTemplateFields || template.wxTemplateFields;
        useLink = picked.link || template.link || link;
      }
      const provider = template.provider || "wechat";
      const key = dedupeKey || `${scene}:${user}`;
      const existing = await strapi.db.query(MSG_JOB_UID$2).findOne({
        where: { dedupeKey: key }
      });
      if (existing && existing.status !== "sent" && existing.status !== "failed" && existing.status !== "cancelled") {
        return { job: existing, skipped: true };
      }
      const toTarget = await resolveToTarget(user, provider);
      const jobData = {
        user,
        scene,
        provider,
        params,
        link: null,
        // link 占位，创建后用 job.id 追加 utm 再更新
        version: picked ? picked.id : null,
        status: "pending",
        retryCount: 0,
        dedupeKey: key,
        template: template.id
      };
      if (toTarget) jobData.toTarget = toTarget;
      if (scheduledAt) jobData.scheduledAt = scheduledAt;
      const job = await strapi.db.query(MSG_JOB_UID$2).create({ data: jobData });
      if (useLink && job?.id) {
        const finalLink = appendUtm(useLink, picked ? picked.code : template.code, job.id);
        await strapi.db.query(MSG_JOB_UID$2).update({ where: { id: job.id }, data: { link: finalLink } });
        job.link = finalLink;
      }
      return { job, skipped: false };
    },
    /**
     * 站内信：直接落一条 provider=inapp、status=sent、sentAt=now 的 msg-job，
     * 即时可见、幂等（同 dedupeKey 已存在且非 failed/cancelled 则跳过），不经过 cron 待发队列。
     * @param opts { user, scene, params, link?, dedupeKey? }
     */
    async sendInApp(opts) {
      const { user, scene, params = {}, link, dedupeKey } = opts;
      const key = dedupeKey || `inapp:${scene}:${user}`;
      const existing = await strapi.db.query(MSG_JOB_UID$2).findOne({
        where: { dedupeKey: key }
      });
      if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
        return { job: existing, skipped: true };
      }
      const job = await strapi.db.query(MSG_JOB_UID$2).create({
        data: {
          user,
          scene,
          provider: "inapp",
          params,
          link: link || null,
          status: "sent",
          sentAt: /* @__PURE__ */ new Date(),
          dedupeKey: key
        }
      });
      return { job, skipped: false };
    },
    /**
     * 立即构建并发送（手动/单发）——同步执行，返回发送结果。
     */
    async sendNow(opts) {
      const { job } = await this.buildJob(opts);
      if (!job) throwErr("SSO_MSG_500", 500, "创建任务失败");
      return this.sendJob(job.id);
    },
    /**
     * 发送指定 job（含重试上限），落库回执。
     */
    async sendJob(jobId) {
      const job = await strapi.db.query(MSG_JOB_UID$2).findOne({
        where: { id: jobId },
        populate: { template: true, version: true, user: true }
      });
      if (!job) throwErr("SSO_MSG_JOB_404", 404, "消息任务不存在");
      if (job.status === "sent") return job;
      if (!job.template) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板");
      if (job.status === "failed" && job.retryCount >= MAX_RETRY) return job;
      const qUserId = typeof job.user === "number" ? job.user : job.user?.id;
      const quota = await strapi.plugin("zhao-sso").service("sso-quota").evaluate({ userId: qUserId, scene: job.scene, templateId: job.template?.id });
      if (!quota.allowed) {
        strapi.log.warn(`[zhao-sso:msg] sent blocked by quota (user=${qUserId}, scene=${job.scene}): ${quota.reason}`);
        await strapi.db.query(MSG_JOB_UID$2).update({
          where: { id: job.id },
          data: { status: "quota_limited", result: { reason: quota.reason, scene: job.scene, detail: quota.detail || null } }
        });
        return this.getJob(job.id);
      }
      await strapi.db.query(MSG_JOB_UID$2).update({ where: { id: job.id }, data: { status: "sending" } });
      const channel = resolveChannel(job.provider);
      let toTarget = job.toTarget;
      if (!toTarget) {
        toTarget = await resolveToTarget(job.user, job.provider);
        if (toTarget) {
          await strapi.db.query(MSG_JOB_UID$2).update({ where: { id: job.id }, data: { toTarget } });
        }
      }
      if (!toTarget) {
        await strapi.db.query(MSG_JOB_UID$2).update({
          where: { id: job.id },
          data: { status: "failed", result: { reason: "no_target", message: "未解析到触达目标(openid)" } }
        });
        return this.getJob(job.id);
      }
      const wxFields = job.version?.wxTemplateFields || job.template.wxTemplateFields;
      const wxTemplateId = job.version?.wxTemplateId || job.template.wxTemplateId;
      if (!wxTemplateId) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板ID");
      const data = renderData(job.params || {}, wxFields);
      try {
        const res = await channel.send({
          openid: toTarget,
          templateId: wxTemplateId,
          url: job.link || void 0,
          data
        });
        await strapi.db.query(MSG_JOB_UID$2).update({
          where: { id: job.id },
          data: { status: "sent", wxMsgId: String(res.msgId), sentAt: /* @__PURE__ */ new Date(), result: res.raw || null }
        });
        if (job.version?.id) {
          await strapi.db.query(VERSION_UID).update({
            where: { id: job.version.id },
            data: { sentCount: (job.version.sentCount || 0) + 1, successCount: (job.version.successCount || 0) + 1, lastUsedAt: /* @__PURE__ */ new Date() }
          });
        }
      } catch (e) {
        const retryCount = (job.retryCount || 0) + 1;
        const retryable = retryCount <= MAX_RETRY && e?.code !== "SSO_MSG_NOT_SUBSCRIBE";
        await strapi.db.query(MSG_JOB_UID$2).update({
          where: { id: job.id },
          data: {
            status: retryable ? "pending" : "failed",
            retryCount,
            nextRetryAt: retryable ? new Date(Date.now() + RETRY_DELAY_MS) : null,
            result: { error: e.message, code: e.code || null }
          }
        });
      }
      return this.getJob(job.id);
    },
    async getJob(jobId) {
      const job = await strapi.db.query(MSG_JOB_UID$2).findOne({
        where: { id: jobId },
        populate: { template: true, user: true }
      });
      if (!job) throwErr("SSO_MSG_JOB_404", 404, "消息任务不存在");
      return job;
    },
    /** 拉取待发送任务（供 cron 进程调度）。dueOnly=true 时只取已到发送时间的任务 */
    async listPendingJobsForSend(limit = 50, dueOnly = false) {
      const now = /* @__PURE__ */ new Date();
      const where = { status: "pending" };
      if (dueOnly) {
        where.$or = [
          { scheduledAt: null },
          { scheduledAt: { $lte: now } },
          { nextRetryAt: { $lte: now } }
        ];
      }
      return strapi.db.query(MSG_JOB_UID$2).findMany({
        where,
        populate: { template: true },
        orderBy: { scheduledAt: "ASC" },
        limit
      });
    },
    /** 查询/刷新用户公众号关注状态，落库到 sso-third-party-binding.subscribe */
    async refreshSubscribe(userId, appType = "official_account") {
      const binding = await strapi.db.query(BINDING_UID).findOne({
        where: { provider: "wechat", user: userId },
        orderBy: { id: "DESC" }
      });
      if (!binding) throwErr("SSO_MSG_BINDING_404", 404, "该用户无微信绑定，无法查询关注状态");
      const wechatSvc = strapi.plugin("zhao-sso").service("sso-wechat");
      const subscribe = await wechatSvc.querySubscribe(binding.provider_user_id, binding.provider, appType) || 0;
      await strapi.db.query(BINDING_UID).update({
        where: { id: binding.id },
        data: {
          subscribe,
          subscribe_at: /* @__PURE__ */ new Date(),
          subscribe_check_at: /* @__PURE__ */ new Date()
        }
      });
      return subscribe;
    }
  };
};
const SOP_RULE_UID$1 = "plugin::zhao-sso.sop-rule";
const SSO_USER_UID$1 = "plugin::zhao-sso.sso-user";
function pick(obj, path) {
  if (!path) return void 0;
  return String(path).split(".").reduce((acc, key) => acc == null ? void 0 : acc[key], obj);
}
function renderParams(template, payload) {
  const out = {};
  const map = template && typeof template === "object" ? template : {};
  for (const [k, p] of Object.entries(map)) {
    const v = pick(payload, String(p));
    if (v !== void 0) out[k] = v;
  }
  return out;
}
function renderLink(tpl, payload) {
  if (!tpl) return void 0;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => payload[k] !== void 0 ? String(payload[k]) : "");
}
const ssoSop = ({ strapi }) => ({
  /**
   * 身份桥接：按标识(mobile 优先/username/email)把业务用户(up_users)解析为 sso-user。
   * 匹配不到(未做微信绑定/标识不一)返回 null，调用方跳过触达并记日志。
   */
  async resolveSsoUserForUpUser(upUserId) {
    const up = await strapi.db.query("plugin::users-permissions.user").findOne({
      where: { id: upUserId },
      select: ["id", "username", "email"]
    });
    if (!up) return null;
    const or = [];
    if (up.username) or.push({ username: up.username });
    if (up.email) or.push({ email: String(up.email).toLowerCase() });
    if (up.mobile) or.push({ mobile: up.mobile });
    if (or.length === 0) return null;
    return strapi.db.query(SSO_USER_UID$1).findOne({ where: { $or: or } });
  },
  /** 事件触发：业务埋点统一入口。
   * - 有 schedules：按业务精确排期逐条建任务（覆盖规则默认延迟）。
   * - 无 schedules：按匹配事件且启用的规则生成任务（delayMinutes 相对延迟）。
   */
  async trigger(event, opts) {
    const { user, payload = {}, schedules } = opts || {};
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const results = [];
    let jobs = schedules || [];
    if (!schedules || schedules.length === 0) {
      const rules = await strapi.db.query(SOP_RULE_UID$1).findMany({
        where: { source: "event", event, enabled: true }
      });
      jobs = rules.map((r) => ({
        templateCode: r.template_code,
        scene: r.scene,
        params: renderParams(r.params_template, payload),
        link: renderLink(r.link, payload),
        delayMinutes: r.delay_minutes || 0,
        dedupeKey: `sop:${r.code}:${user}`
      }));
    }
    for (const j of jobs) {
      const base = {
        user,
        scene: j.scene || event,
        templateCode: j.templateCode,
        params: j.params || {},
        link: j.link,
        dedupeKey: j.dedupeKey
      };
      if (j.scheduledAt) {
        base.scheduledAt = j.scheduledAt;
      } else if (j.delayMinutes) {
        base.scheduledAt = new Date(Date.now() + j.delayMinutes * 6e4).toISOString();
      }
      try {
        results.push(await msg.buildJob(base));
      } catch (e) {
        strapi.log.warn(`[sso-sop] buildJob failed (${event}): ${e.message}`);
        results.push({ skipped: true, error: e.message });
      }
    }
    return results;
  },
  /** cron 调度：扫描到期 pending 任务并发送，返回已发送条数 */
  async runDueJobs(limit = 50) {
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    let jobs = [];
    try {
      jobs = await msg.listPendingJobsForSend(limit, true);
    } catch (e) {
      strapi.log.warn(`[sso-sop] listPendingJobsForSend failed: ${e.message}`);
      return 0;
    }
    let sent = 0;
    for (const j of jobs) {
      try {
        await msg.sendJob(j.id);
        sent++;
      } catch (e) {
        strapi.log.warn(`[sso-sop] sendJob(${j.id}) failed: ${e.message}`);
      }
    }
    return sent;
  }
});
const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const UP_USER_UID = "plugin::users-permissions.user";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const ENROLL_UID$1 = "plugin::zhao-course.course-enrollment";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";
const ARTICLE_UID$1 = "plugin::zhao-website.article";
const SIGNS_UID$1 = "plugin::zhao-point.activity-signup";
const REDEMPTION_UID = "plugin::zhao-point.point-redemption";
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const ssoProfile = ({ strapi }) => ({
  /** sso-user → up_user 反向桥接（按标识匹配；匹配不到返回 null） */
  async resolveUpUserForSsoUser(ssoUserId) {
    const sso = await strapi.db.query(SSO_USER_UID).findOne({
      where: { id: ssoUserId },
      select: ["id", "username", "email", "mobile"]
    });
    if (!sso) return null;
    const or = [];
    if (sso.username) or.push({ username: sso.username });
    if (sso.email) or.push({ email: String(sso.email).toLowerCase() });
    if (sso.mobile) or.push({ mobile: sso.mobile });
    if (!or.length) return null;
    return strapi.db.query(UP_USER_UID).findOne({ where: { $or: or } });
  },
  /** 实时聚合六维画像（不落库） */
  async calculateProfile(ssoUserId) {
    const up = await this.resolveUpUserForSsoUser(ssoUserId);
    const zero = { activity: 0, reading: 0, completion: 0, attendance: 0, payment: 0, interests: [] };
    if (!up) return { ...zero, user: ssoUserId, upUser: null, hasData: false };
    const userId = up.id;
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1e3);
    const [lp30, visit30] = await Promise.all([
      strapi.db.query(LESSON_PROGRESS_UID).count({ where: { user: userId, lastStudyAt: { $gte: days30 } } }),
      strapi.db.query(VISIT_LOG_UID).count({ where: { userId, createdAt: { $gte: days30 } } })
    ]);
    const activity = clamp(lp30 * 10 + visit30 * 3);
    const reads = await strapi.db.query(VISIT_LOG_UID).findMany({
      where: { userId, type: "article_view" },
      select: ["id", "dwellTime", "scrollDepth"],
      limit: 200
    });
    const avgDwell = reads.length ? reads.reduce((s, r) => s + (r.dwellTime || 0), 0) / reads.length : 0;
    const reading = clamp(Math.min(reads.length, 20) * 3 + Math.min(avgDwell, 120) / 120 * 40);
    const allLp = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId },
      select: ["isCompleted", "isCorrect"],
      limit: 500
    });
    const done = allLp.filter((r) => r.isCompleted).length;
    const correct = allLp.filter((r) => r.isCorrect === true).length;
    const completion = clamp((allLp.length ? done / allLp.length : 0) * 60 + (correct ? correct / Math.max(allLp.length, 1) : 0) * 40);
    const signs = await strapi.db.query(SIGNS_UID$1).findMany({
      where: { user: userId },
      select: ["attendedAt", "status"],
      limit: 100
    });
    const activeSigns = signs.filter((s) => s.status !== "cancelled");
    const attended = activeSigns.filter((s) => s.attendedAt).length;
    const attendance = clamp(activeSigns.length * 10 + (activeSigns.length ? attended / activeSigns.length * 50 : 0));
    const [paid, points] = await Promise.all([
      strapi.db.query(ENROLL_UID$1).count({ where: { user: userId, enrollType: { $in: ["paid", "points"] } } }),
      strapi.db.query(REDEMPTION_UID).count({ where: { user: userId } }).catch(() => 0)
    ]);
    const payment = clamp(paid * 30 + points * 15);
    const interests = await this.collectInterests(userId);
    return { activity, reading, completion, attendance, payment, interests, user: ssoUserId, upUser: up, hasData: true };
  },
  /** 兴趣标签：近30天 课程分类/文章分类/活动类型 频次 top3（跨来源同名合并） */
  async collectInterests(userId) {
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1e3);
    const counts = {};
    const lps = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId, lastStudyAt: { $gte: days30 } },
      populate: { course: { select: ["id"], populate: { category: { select: ["name"] } } } },
      limit: 500
    });
    const courseCats = /* @__PURE__ */ new Map();
    for (const lp of lps) {
      const c = lp.course;
      if (c?.id && c.category?.name) courseCats.set(c.id, c.category.name);
    }
    for (const name of courseCats.values()) counts[name] = (counts[name] || 0) + 1;
    const reads = await strapi.db.query(VISIT_LOG_UID).findMany({
      where: { userId, type: "article_view", createdAt: { $gte: days30 } },
      select: ["targetId"],
      limit: 300
    });
    const docIds = [...new Set(reads.map((r) => r.targetId).filter(Boolean))].slice(0, 200);
    if (docIds.length) {
      const articles = await strapi.db.query(ARTICLE_UID$1).findMany({
        where: { documentId: { $in: docIds } },
        populate: { category: { select: ["name"] } },
        limit: 200
      });
      const seenCats = /* @__PURE__ */ new Set();
      for (const a of articles) {
        if (a.category?.name && !seenCats.has(a.category.name)) {
          seenCats.add(a.category.name);
          counts[a.category.name] = (counts[a.category.name] || 0) + 1;
        }
      }
    }
    const signs = await strapi.db.query(SIGNS_UID$1).findMany({
      where: { user: userId, signupAt: { $gte: days30 } },
      populate: { activity: { select: ["id", "type"] } },
      limit: 200
    });
    const actTypes = /* @__PURE__ */ new Map();
    for (const s of signs) {
      const a = s.activity;
      if (a?.id && a.type && a.type !== "其他") actTypes.set(a.id, a.type);
    }
    for (const t of actTypes.values()) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag);
  },
  /** 加权打分 + 分层 */
  segmentOf(profile) {
    const score = clamp(
      (profile.completion || 0) * 0.25 + (profile.payment || 0) * 0.25 + (profile.activity || 0) * 0.2 + (profile.attendance || 0) * 0.15 + (profile.reading || 0) * 0.15
    );
    const segment = score >= 80 ? "S" : score >= 60 ? "A" : score >= 40 ? "B" : "C";
    const reason = profile.hasData === false ? "无行为数据" : `综合分${score}（完课${profile.completion}/付费${profile.payment}/活跃${profile.activity}）`;
    return { segment, segmentScore: score, segmentReason: reason };
  },
  /** 详情：实时聚合 + 打分 + 落库 sso-user-profile */
  async getProfile(ssoUserId) {
    const profile = await this.calculateProfile(ssoUserId);
    const seg = this.segmentOf(profile);
    const existing = await strapi.db.query(PROFILE_UID).findOne({ where: { user: ssoUserId } });
    const data = {
      segment: seg.segment,
      segmentScore: seg.segmentScore,
      segmentReason: seg.segmentReason,
      dimensions: { ...profile },
      lastCalculatedAt: /* @__PURE__ */ new Date()
    };
    if (existing) await strapi.db.query(PROFILE_UID).update({ where: { id: existing.id }, data });
    else await strapi.db.query(PROFILE_UID).create({ data: { ...data, user: ssoUserId } });
    return { ...profile, ...seg };
  },
  /** 批量重算：遍历 up_users → sso-user → getProfile */
  async recalcAll(limit = 500) {
    const upUsers = await strapi.db.query(UP_USER_UID).findMany({
      select: ["id", "username", "email"],
      limit
    });
    let n = 0;
    let sso = 0;
    for (const u of upUsers) {
      const ssoUser2 = await strapi.db.query(SSO_USER_UID).findOne({
        where: {
          $or: [].concat(
            u.username ? [{ username: u.username }] : [],
            u.email ? [{ email: String(u.email).toLowerCase() }] : [],
            u.mobile ? [{ mobile: u.mobile }] : []
          )
        }
      });
      if (!ssoUser2) continue;
      await this.getProfile(ssoUser2.id);
      sso++;
      n++;
    }
    return { scanned: upUsers.length, calculated: n, matchedSso: sso };
  }
});
const COURSE_UID = "plugin::zhao-course.course";
const COURSE_CAT_UID = "plugin::zhao-course.course-category";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const ARTICLE_UID = "plugin::zhao-website.article";
const ARTICLE_CAT_UID = "plugin::zhao-website.article-category";
const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ssoRecommend = ({ strapi }) => ({
  async recommendFor(ssoUserId, limit = 5) {
    const profile = await strapi.plugin("zhao-sso").service("sso-profile").getProfile(ssoUserId);
    const interests = Array.isArray(profile.interests) ? profile.interests : [];
    const upUserId = profile.upUser?.id ?? null;
    const [courses, articles, activities] = await Promise.all([
      this.recCourses(interests, upUserId, limit),
      this.recArticles(interests, limit),
      this.recActivities(interests, upUserId, limit)
    ]);
    return { interests, courses, articles, activities };
  },
  /** 推荐课程：兴趣分类内，排除已购/已报名，按学员数排序；无兴趣 → 最新课程兜底 */
  async recCourses(interests, upUserId, limit) {
    let enrolled = /* @__PURE__ */ new Set();
    if (upUserId) {
      const ens = await strapi.db.query(ENROLL_UID).findMany({
        where: { user: upUserId },
        populate: { course: { select: ["id"] } },
        limit: 500
      });
      enrolled = new Set(ens.map((e) => e.course?.id).filter(Boolean));
    }
    let rows = [];
    if (interests.length) {
      const cats = await strapi.db.query(COURSE_CAT_UID).findMany({ where: { name: { $in: interests } }, select: ["id"] });
      const catIds = cats.map((c) => c.id);
      if (catIds.length) {
        rows = await strapi.db.query(COURSE_UID).findMany({
          where: { category: catIds },
          populate: { category: { select: ["name"] }, cover: true },
          limit: 100
        });
      }
    }
    if (!rows.length) {
      rows = await strapi.db.query(COURSE_UID).findMany({
        populate: { category: { select: ["name"] }, cover: true },
        orderBy: { createdAt: "DESC" },
        limit: 100
      });
    }
    return rows.filter((c) => !enrolled.has(c.id)).sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0)).slice(0, limit).map((c) => ({
      documentId: c.documentId,
      id: c.id,
      title: c.title,
      category: c.category?.name ?? null,
      cover: c.cover ?? null,
      price: c.price,
      isFree: c.isFree ?? true,
      isPaid: c.isPaid,
      courseType: c.courseType,
      pointsPrice: c.pointsPrice,
      studentCount: c.studentCount
    }));
  },
  /** 推荐文章：兴趣分类内已发布文章，按发布时间排序；无兴趣 → 最新兜底 */
  async recArticles(interests, limit) {
    let rows = [];
    if (interests.length) {
      const cats = await strapi.db.query(ARTICLE_CAT_UID).findMany({ where: { name: { $in: interests } }, select: ["id"] });
      const catIds = cats.map((c) => c.id);
      if (catIds.length) {
        rows = await strapi.db.query(ARTICLE_UID).findMany({
          where: { category: catIds, status: "published" },
          populate: { category: { select: ["name"] } },
          limit: 100
        });
      }
    }
    if (!rows.length) {
      rows = await strapi.db.query(ARTICLE_UID).findMany({
        where: { status: "published" },
        populate: { category: { select: ["name"] } },
        orderBy: { publishedAt: "DESC" },
        limit: 100
      });
    }
    return rows.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()).slice(0, limit).map((a) => ({
      documentId: a.documentId,
      id: a.id,
      title: a.seoTitle || a.title,
      excerpt: a.excerpt,
      category: a.category?.name ?? null,
      publishedAt: a.publishedAt || a.createdAt
    }));
  },
  /** 推荐活动：兴趣类型内报名中的活动，排除已报名，按开始时间排序；无匹配 → 报名中兜底 */
  async recActivities(interests, upUserId, limit) {
    let signed = /* @__PURE__ */ new Set();
    if (upUserId) {
      const signs = await strapi.db.query(SIGNS_UID).findMany({
        where: { user: upUserId },
        populate: { activity: { select: ["id"] } },
        limit: 500
      });
      signed = new Set(signs.map((s) => s.activity?.id).filter(Boolean));
    }
    let rows = [];
    if (interests.length) {
      rows = await strapi.db.query(ACTIVITY_UID).findMany({
        where: { status: "signup_open", type: { $in: interests } },
        limit: 100
      });
    }
    if (!rows.length) {
      rows = await strapi.db.query(ACTIVITY_UID).findMany({ where: { status: "signup_open" }, limit: 100 });
    }
    return rows.filter((a) => !signed.has(a.id)).sort((a, b) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime()).slice(0, limit).map((a) => ({
      documentId: a.documentId,
      id: a.id,
      title: a.title,
      type: a.type,
      startTime: a.startTime,
      endTime: a.endTime,
      venueName: a.venueName,
      capacity: a.capacity,
      usedCapacity: a.usedCapacity
    }));
  }
});
const MSG_JOB_UID$1 = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID$1 = "plugin::zhao-sso.msg-template";
const QUOTA_CONFIG_UID = "plugin::zhao-sso.sso-quota-config";
const ssoQuota = ({ strapi }) => {
  async function resolveConfig(templateId) {
    const cfg = await strapi.db.query(QUOTA_CONFIG_UID).findOne({}) || {};
    const defDaily = typeof cfg.maxDailyPerUser === "number" ? cfg.maxDailyPerUser : 10;
    const defCool = typeof cfg.cooldownMinutes === "number" ? cfg.cooldownMinutes : 120;
    let dailyCap = defDaily;
    let cooldownMinutes = defCool;
    if (templateId) {
      const t = await strapi.db.query(MSG_TEMPLATE_UID$1).findOne({ where: { id: templateId } });
      if (t && typeof t.dailyCap === "number") dailyCap = t.dailyCap;
      if (t && typeof t.cooldownMinutes === "number") cooldownMinutes = t.cooldownMinutes;
    }
    return { dailyCap, cooldownMinutes, source: templateId ? "template" : "global" };
  }
  return {
    /**
     * 频控判定（发送前调用）
     * @param opts { userId, scene, templateId }
     * @returns { allowed: boolean, reason?: 'daily_cap'|'cooldown', detail? }
     */
    async evaluate(opts) {
      const { userId, scene, templateId } = opts;
      if (!userId) return { allowed: true };
      const cfg = await resolveConfig(templateId || null);
      const dayStart = /* @__PURE__ */ new Date();
      dayStart.setHours(0, 0, 0, 0);
      const sentCount = await strapi.db.query(MSG_JOB_UID$1).count({
        where: { user: { id: userId }, status: "sent", sentAt: { $gte: dayStart } }
      });
      if (sentCount >= cfg.dailyCap) {
        return { allowed: false, reason: "daily_cap", detail: { sentCount, dailyCap: cfg.dailyCap, source: cfg.source } };
      }
      const recents = await strapi.db.query(MSG_JOB_UID$1).findMany({
        where: { scene, status: "sent" },
        orderBy: { sentAt: "DESC" },
        limit: 50,
        populate: { user: true }
      });
      const last = recents.find((x) => typeof x.user === "number" ? x.user === userId : x.user?.id === userId) || null;
      if (last && last.sentAt) {
        const gapMin = (Date.now() - new Date(last.sentAt).getTime()) / 6e4;
        if (gapMin < cfg.cooldownMinutes) {
          return { allowed: false, reason: "cooldown", detail: { gapMin: Math.round(gapMin), cooldownMinutes: cfg.cooldownMinutes, lastSentAt: last.sentAt, source: cfg.source } };
        }
      }
      return { allowed: true };
    }
  };
};
const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
const REPURCHASE_SIGNS_UID = "plugin::zhao-point.activity-signup";
const COURSE_ENROLL_UID = "plugin::zhao-course.course-enrollment";
const COURSE_PROGRESS_UID = "plugin::zhao-course.course-progress";
const DATE_MS = 864e5;
const ssoStats = ({ strapi }) => ({
  async getSopStats(opts) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : /* @__PURE__ */ new Date();
    if (from.getTime() > to.getTime()) {
      const err = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const range = { createdAt: { $gte: from, $lte: to } };
    const rules = await strapi.db.query(SOP_RULE_UID).findMany({});
    const ruleByScene = /* @__PURE__ */ new Map();
    for (const r of rules) {
      if (!ruleByScene.has(r.scene)) ruleByScene.set(r.scene, []);
      ruleByScene.get(r.scene).push(r);
    }
    const sceneSet = /* @__PURE__ */ new Set([...ruleByScene.keys()]);
    if (opts.scene) {
      sceneSet.add(opts.scene);
    } else {
      const jobScenes = await strapi.db.query(MSG_JOB_UID).findMany({ select: ["scene"] });
      for (const s of jobScenes) sceneSet.add(s.scene);
    }
    const scenes = Array.from(sceneSet).filter((s) => opts.scene ? s === opts.scene : true);
    const countBy = (scene, status) => status ? strapi.db.query(MSG_JOB_UID).count({ where: { scene, status, ...range } }) : strapi.db.query(MSG_JOB_UID).count({ where: { scene, ...range } });
    const rows = [];
    const summary = { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, pending: 0, sentRate: 0 };
    for (const s of scenes) {
      const [total, sent, failed, quota, pending, cancelled] = await Promise.all([
        countBy(s),
        countBy(s, "sent"),
        countBy(s, "failed"),
        countBy(s, "quota_limited"),
        countBy(s, "pending"),
        countBy(s, "cancelled")
      ]);
      let clicks = 0;
      const ruleList = ruleByScene.get(s) || [];
      for (const r of ruleList) {
        if (!r.templateCode) continue;
        const tpl = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { code: r.templateCode } });
        if (!tpl) continue;
        const vers = await strapi.db.query(MSG_VERSION_UID).findMany({ where: { template: tpl.id } });
        for (const v of vers) clicks += v.clickCount || 0;
      }
      const sentRate = total ? Math.round(sent / total * 100) : 0;
      rows.push({
        scene: s,
        rules: ruleList.map((r) => ({ code: r.code, name: r.name ?? null, templateCode: r.templateCode ?? null, source: r.source ?? null })),
        total,
        sent,
        failed,
        quotaLimited: quota,
        pending,
        cancelled,
        sentRate,
        clicks
      });
      summary.sceneCount += 1;
      summary.total += total;
      summary.sent += sent;
      summary.failed += failed;
      summary.quotaLimited += quota;
      summary.pending += pending;
    }
    summary.sentRate = summary.total ? Math.round(summary.sent / summary.total * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), summary, rows };
  },
  async getRepurchaseStats(opts) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : /* @__PURE__ */ new Date();
    if (from.getTime() > to.getTime()) {
      const err = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "activity.repurchase", status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } }
    });
    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = /* @__PURE__ */ new Set();
    let conversions = 0;
    for (const j of jobs) {
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(REPURCHASE_SIGNS_UID).count({
        where: { user: userId, status: "active", signupAt: { $gt: from2, $lte: to2 } }
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round(convertedUsers / sent * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },
  async getCourseD7Stats(opts) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : /* @__PURE__ */ new Date();
    if (from.getTime() > to.getTime()) {
      const err = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "course.d7", status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } }
    });
    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = /* @__PURE__ */ new Set();
    let conversions = 0;
    for (const j of jobs) {
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(COURSE_ENROLL_UID).count({
        where: { user: userId, status: "enrolled", enrolledAt: { $gt: from2, $lte: to2 } }
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round(convertedUsers / sent * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },
  async getCourseCompletionStats(opts) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : /* @__PURE__ */ new Date();
    if (from.getTime() > to.getTime()) {
      const err = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: { $in: ["course.d7", "course.activate"] }, status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } }
    });
    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = /* @__PURE__ */ new Set();
    let conversions = 0;
    for (const j of jobs) {
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(COURSE_PROGRESS_UID).count({
        where: { user: userId, isCompleted: true, completedAt: { $gt: from2, $lte: to2 } }
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round(convertedUsers / sent * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },
  async getRepurchaseLeads(opts) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : /* @__PURE__ */ new Date();
    if (from.getTime() > to.getTime()) {
      const err = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const page = Number(opts.page) || 1;
    const pageSize = Number(opts.pageSize) || 20;
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;
    const base = { sentAt: { $gte: from, $lte: to } };
    let where = { scene: "activity.repurchase", ...base };
    if (opts.status) {
      if (opts.status === "none") {
        where = {
          $and: [{ scene: "activity.repurchase" }, base, { $or: [{ followStatus: "none" }, { followStatus: { $null: true } }] }]
        };
      } else {
        where.followStatus = opts.status;
      }
    }
    const result = await strapi.db.query(MSG_JOB_UID).findPage({
      where,
      populate: { user: true },
      orderBy: { sentAt: "desc" },
      page,
      pageSize
    });
    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const summary = { total: 0, followed: 0, deal: 0 };
    const rows = [];
    for (const j of result?.results ?? []) {
      summary.total += 1;
      if (j.followStatus === "followed") summary.followed += 1;
      if (j.followStatus === "deal") summary.deal += 1;
      const userObj = typeof j.user === "object" && j.user ? j.user : null;
      const ssoUserId = userObj ? userObj.id : j.user;
      let upId = null;
      if (ssoUserId) {
        const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
        upId = up?.id ?? null;
      }
      let reorderedCount = 0;
      if (upId) {
        const touchTime = j.sentAt || j.scheduledAt || j.createdAt;
        if (touchTime) {
          reorderedCount = await strapi.db.query(REPURCHASE_SIGNS_UID).count({
            where: { user: upId, status: "active", signupAt: { $gte: new Date(touchTime), $lte: new Date(new Date(touchTime).getTime() + windowMs) } }
          });
        }
      }
      rows.push({
        id: j.id,
        status: j.status,
        followStatus: j.followStatus ?? "none",
        followRemark: j.followRemark ?? null,
        touchTime: j.sentAt || j.scheduledAt || j.createdAt || null,
        windowDays,
        reorderedCount,
        user: {
          id: userObj?.id ?? ssoUserId,
          upId,
          username: userObj?.username ?? null,
          mobile: userObj?.mobile ?? null,
          email: userObj?.email ?? null
        }
      });
    }
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      windowDays,
      summary,
      pagination: result?.pagination ?? {},
      rows
    };
  },
  async updateRepurchaseFollow({ jobId, status, remark }) {
    if (!["none", "followed", "deal"].includes(status)) {
      const err = new Error("status 必须是 none/followed/deal 之一");
      err.status = 400;
      throw err;
    }
    const existing = await strapi.db.query(MSG_JOB_UID).findOne({ where: { id: jobId } });
    if (!existing) {
      const err = new Error("msg-job 不存在");
      err.status = 404;
      throw err;
    }
    const updated = await strapi.db.query(MSG_JOB_UID).update({
      where: { id: jobId },
      data: { followStatus: status, ...remark !== void 0 ? { followRemark: remark } : {} }
    });
    return updated;
  }
});
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
  "sso-sms": ssoSms,
  "sso-invite": ssoInvite,
  "sso-msg": ssoMsg,
  "sso-sop": ssoSop,
  "sso-profile": ssoProfile,
  "sso-recommend": ssoRecommend,
  "sso-quota": ssoQuota,
  "sso-stats": ssoStats
};
const fallbackAuthenticated = async (policyContext, _config, { strapi }) => {
  try {
    const zhaoAuth = strapi.plugin("zhao-auth");
    if (zhaoAuth) {
      const authService = zhaoAuth.service("auth");
      if (authService) {
        const token = authService.extractToken(policyContext);
        if (token) {
          const user = await authService.authenticate(token);
          if (user) {
            policyContext.state.user = user;
            policyContext.user = user;
            return true;
          }
        }
      }
    }
  } catch (e) {
  }
  if (policyContext.state?.user) {
    return true;
  }
  return false;
};
const fallbackHasPermission = async (policyContext, config2, { strapi }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }
  const action = config2?.action;
  if (!action) {
    return true;
  }
  const userRoles = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : Array.isArray(user.roles) ? typeof user.roles[0] === "string" ? user.roles : user.roles.map((r) => r?.code || r?.name || r?.type).filter(Boolean) : [];
  if (userRoles.includes("admin")) {
    return true;
  }
  try {
    const zhaoAuth = strapi.plugin("zhao-auth");
    if (zhaoAuth) {
      const permissionService = zhaoAuth.service("permission");
      if (permissionService) {
        const tenantDocumentId = policyContext.state?.siteDocumentId;
        const result = await permissionService.getMyPermissions(user.id, tenantDocumentId);
        if (result?.permissions?.includes(action)) {
          return true;
        }
      }
    }
  } catch {
  }
  const isSuperAdmin = userRoles.includes("strapi-super-admin") || user.roles?.some((r) => r.code === "strapi-super-admin" || r.code === "admin" || r.name === "admin");
  if (isSuperAdmin) {
    return true;
  }
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

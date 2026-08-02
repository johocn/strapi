import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const AUTH_CODE_UID = "plugin::zhao-sso.sso-auth-code";
const APP_UID = "plugin::zhao-sso.sso-app";

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

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async generateAuthCode(params: {
    userId: number;
    appCode: string;
    redirectUri: string;
    channelCode?: string;
    inviteCode?: string;
    scopes?: string[];
    isNew?: boolean;
  }) {
    const { userId, appCode, redirectUri, channelCode, inviteCode, scopes, isNew } = params;

    const app = await this.findApp(appCode);
    if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
    if (!this.validateRedirectUri(app, redirectUri)) throwErr("SSO_OAUTH_002", 400, "redirect_uri 不在允许列表中");

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
        invite_code: inviteCode || null,
        scopes: scopes || null,
        is_new: !!isNew,
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
    if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
    if (!bcrypt.compareSync(appSecret, app.app_secret)) throwErr("SSO_OAUTH_003", 401, "app_secret 验证失败");

    return this.exchangeCodeInternal({ code, appCode, app, redirectUri });
  },

  /**
   * 内部方法：校验并核销授权码，不校验 app_secret
   * 用于服务端内部调用（如 exchange-token 代理接口，app_secret 由后端自查）
   */
  async exchangeCodeInternal(params: {
    code: string;
    appCode: string;
    app: any;
    redirectUri: string;
  }) {
    const { code, appCode, app, redirectUri } = params;

    if (!app || !app.is_active) throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
    if (!this.validateGrantType(app, "authorization_code")) throwErr("SSO_OAUTH_008", 400, "该应用未开启 authorization_code 授权");
    if (!this.validateRedirectUri(app, redirectUri)) throwErr("SSO_OAUTH_002", 400, "redirect_uri 不在允许列表中");

    const authCode = await strapi.db.query(AUTH_CODE_UID).findOne({
      where: { code, app_code: appCode },
      populate: ["user"],
    });
    if (!authCode) throwErr("SSO_OAUTH_004", 404, "授权码不存在");
    if (authCode.used) throwErr("SSO_OAUTH_005", 400, "授权码已使用");
    if (new Date(authCode.expires_at) < new Date()) throwErr("SSO_OAUTH_006", 400, "授权码已过期");
    // redirect_uri 匹配校验：剥离 query 参数后比对基础部分
    // generateAuthCode 存储的 redirect_uri 可能含 ?return_url=... 等参数，
    // 而 exchangeToken 调用方（login-callback.vue）只传 origin + path（不含参数），
    // 两边都剥离 query 后比对，避免参数差异导致校验失败
    const storedBase = (authCode.redirect_uri || "").split("?")[0];
    const requestBase = (redirectUri || "").split("?")[0];
    if (storedBase !== requestBase) throwErr("SSO_OAUTH_007", 400, "redirect_uri 不匹配");

    await strapi.db.query(AUTH_CODE_UID).update({
      where: { id: authCode.id },
      data: { used: true },
    });

    return {
      userId: authCode.user.id,
      channelCode: authCode.channel_code,
      inviteCode: authCode.invite_code,
      scopes: authCode.scopes,
      isNew: !!authCode.is_new,
    };
  },

  async findApp(appCode: string) {
    return strapi.db.query(APP_UID).findOne({ where: { app_code: appCode } });
  },

  /**
   * 校验 redirect_uri 是否在白名单中
   * 剥离 query 参数后比对（origin + path + hash），
   * 与 zhao-third 行为对齐：不因 query 参数阻断合法回调地址。
   * 白名单条目示例：https://h.joho.cn/#/pages/sso/login-callback
   * 实际 redirectUri 可能携带 ?return_url=...&app_code=... 等参数，只比对基础部分。
   */
  validateRedirectUri(app: any, redirectUri: string): boolean {
    const allowed: string[] = app.redirect_uris || [];
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
  validateGrantType(app: any, grantType: string): boolean {
    const allowed: string[] = Array.isArray(app?.allowed_grant_types) ? app.allowed_grant_types : [];
    if (allowed.length === 0) return true;
    return allowed.includes(grantType);
  },
  };
};

import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";

const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  getAuthorizeUrl(state: string): string {
    const pluginConfig = strapi.config.get("plugin::zhao-sso") as any;
    const { appId } = pluginConfig?.oauth?.alipay || {};
    if (!appId) throwErr("SSO_ALIPAY_001", 500, "[zhao-sso] Alipay appId not configured");

    const serverUrl = strapi.config.get("server.url", "http://localhost:1337");
    const redirectUri = `${serverUrl}/api/zhao-sso/auth/alipay/callback`;
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
    if (!appId || !privateKey) throwErr("SSO_ALIPAY_002", 500, "Alipay OAuth not configured");

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
    } catch { /* ignore */ }

    const user = await strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
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
    throwErr("SSO_ALIPAY_003", 502, `Alipay token error: ${JSON.stringify(res.data)}`);
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

  buildAlipayParams(appId: string, method: string, bizContent: any): Record<string, string> {
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
  };
};

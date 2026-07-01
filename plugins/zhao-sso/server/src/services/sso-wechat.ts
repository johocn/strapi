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

  async function getConfig() {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config = await configService.findByProvider("wechat");
    if (!config) throwErr("SSO_WECHAT_001", 500, "[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat)");
    return config;
  }

  return {
  async getAuthorizeUrl(state: string): Promise<string> {
    const config = await getConfig();
    const serverUrl = strapi.config.get("server.url", "http://localhost:1337");
    const redirectUri = `${serverUrl}/api/zhao-sso/auth/wechat/callback`;
    const params = new URLSearchParams({
      appid: config.appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scope || "snsapi_login",
      state,
    });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  },

  async handleCallback(code: string) {
    const config = await getConfig();

    const tokenRes = await axios.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
      params: { appid: config.appId, secret: config.appSecret, code, grant_type: "authorization_code" },
    });

    if (tokenRes.data.errcode) throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);

    const { openid, unionid, access_token: wxAccessToken } = tokenRes.data;

    let userInfoRes: any = {};
    try {
      userInfoRes = await axios.get("https://api.weixin.qq.com/sns/userinfo", {
        params: { access_token: wxAccessToken, openid },
      });
    } catch { /* ignore */ }

    const binding = await strapi.db.query(BINDING_UID).findOne({
      where: { provider: "wechat", provider_user_id: openid },
      populate: { user: true },
    });

    if (binding) {
      return { userId: binding.user.id, isNew: false };
    }

    const user = await strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
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
  };
};

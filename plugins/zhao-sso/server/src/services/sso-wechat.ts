import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import type { Core } from "@strapi/strapi";

const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";

type WechatAppType = "official_account" | "open_platform" | "mini_program" | "app";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const tokenCache = new Map<string, { value: string; expiresAt: number }>();
  const ticketCache = new Map<string, { value: string; expiresAt: number }>();

  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  async function getConfig(appType: string) {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config = await configService.findByProviderAndAppType("wechat", appType);
    if (!config) throwErr("SSO_WECHAT_001", 500, `[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat, appType=${appType})`);
    return config;
  }

  async function getValidAccessToken(config: any): Promise<string> {
    const cacheKey = config.appId.trim();
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.value;
    }

    const fetchToken = async (): Promise<any> => {
      const res = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
        params: {
          grant_type: "client_credential",
          appid: config.appId.trim(),
          secret: config.appSecret,
        },
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
      expiresAt: Date.now() + expiresIn * 1000,
    });
    return data.access_token;
  }

  async function getJsapiTicket(accessToken: string): Promise<string> {
    const cached = ticketCache.get(accessToken);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.value;
    }

    const res = await axios.get("https://api.weixin.qq.com/cgi-bin/ticket/getticket", {
      params: { access_token: accessToken, type: "jsapi" },
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_WECHAT_011", 502, `WeChat ticket error: ${data.errmsg}`);
    }

    const expiresIn = data.expires_in || 7200;
    ticketCache.set(accessToken, {
      value: data.ticket,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    return data.ticket;
  }

  return {
  /**
   * 公开获取已缓存/刷新后的全局 access_token（复用闭包 tokenCache），供二维码/菜单等调用
   */
  async getAccessToken(appType: WechatAppType = "official_account"): Promise<string> {
    const config = await getConfig(appType);
    return getValidAccessToken(config);
  },

  /**
   * 使用调用方提供的 appId/appSecret 换取全局 access_token（复用 tokenCache）。
   * 供公众号动作从外部账号体系（如 zhao-studio publish-account.config）拿凭据时使用。
   */
  async getAccessTokenByConfig(config: { appId: string; appSecret: string }): Promise<string> {
    if (!config?.appId) throwErr("SSO_WECHAT_002", 400, "[zhao-sso] 缺少公众号 appId");
    return getValidAccessToken(config);
  },

  async getAuthorizeUrl(state: string, appType: WechatAppType, scope?: string, callbackUrl?: string): Promise<string> {
    const config = await getConfig(appType);
    const cleanAppId = config.appId.trim();

    if (appType === "mini_program") {
      return "";
    }

    if (appType === "open_platform") {
      const finalScope = scope || "snsapi_login";
      const params = new URLSearchParams({
        appid: cleanAppId,
        redirect_uri: callbackUrl || "",
        response_type: "code",
        scope: finalScope,
        state,
      });
      return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
    }

    // official_account / app
    const finalScope = scope || "snsapi_userinfo";
    const params = new URLSearchParams({
      appid: cleanAppId,
      redirect_uri: callbackUrl || "",
      response_type: "code",
      scope: finalScope,
      state,
    });
    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  },

  async handleCallback(code: string, appType: WechatAppType) {
    const config = await getConfig(appType);
    const cleanAppId = config.appId.trim();

    let openid: string;
    let unionid: string | null = null;
    let tokenData: any = {};
    let userInfo: any = null;

    if (appType === "mini_program") {
      const sessionRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
        params: {
          appid: cleanAppId,
          secret: config.appSecret,
          js_code: code,
          grant_type: "authorization_code",
        },
      });
      if (sessionRes.data.errcode) {
        throwErr("SSO_WECHAT_004", 502, `WeChat jscode2session error: ${sessionRes.data.errmsg}`);
      }
      openid = sessionRes.data.openid;
      unionid = sessionRes.data.unionid || null;
      tokenData = sessionRes.data;
    } else {
      // official_account / open_platform / app
      const tokenRes = await axios.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
        params: {
          appid: cleanAppId,
          secret: config.appSecret,
          code,
          grant_type: "authorization_code",
        },
      });

      if (tokenRes.data.errcode) throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);

      openid = tokenRes.data.openid;
      unionid = tokenRes.data.unionid || null;
      tokenData = tokenRes.data;

      const wxAccessToken = tokenRes.data.access_token;
      let userInfoRes: any = {};
      try {
        userInfoRes = await axios.get("https://api.weixin.qq.com/sns/userinfo", {
          params: { access_token: wxAccessToken, openid },
        });
      } catch { /* ignore */ }
      userInfo = userInfoRes.data;
    }

    const binding = await strapi.db.query(BINDING_UID).findOne({
      where: { provider: "wechat", provider_user_id: openid },
      populate: { user: true },
    });

    if (binding) {
      // 补充关注状态（非关键路径，失败静默）
      try {
        const subscribe = await this.querySubscribe(openid, "wechat", appType);
        await strapi.db.query(BINDING_UID).update({
          where: { id: binding.id },
          data: { subscribe, subscribe_at: new Date(), subscribe_check_at: new Date() },
        });
      } catch { /* ignore */ }
      return { userId: binding.user.id, isNew: false };
    }

    // 生成用户名：wx_昵称前12位_8位uuid短码，保证唯一性且可读
    // 昵称清洗后若为空（如全为表情符号），用 wx_user 兜底
    const rawNickname = (userInfo?.nickname || "wx_user").replace(/[^\w\u4e00-\u9fa5]/g, "").substring(0, 12) || "wx_user";
    const shortId = uuidv4().replace(/-/g, "").substring(0, 8);
    const username = `wx_${rawNickname}_${shortId}`;

    const user = await strapi.db.query(USER_UID).create({
      data: {
        uuid: uuidv4(),
        username,
        nickname: userInfo?.nickname || null,
        avatar_url: userInfo?.headimgurl || null,
        status: "active",
        login_count: 0,
        register_channel: `sso_wechat_${appType}`,
      },
    });

    await strapi.db.query(BINDING_UID).create({
      data: {
        user: { id: user.id },
        provider: "wechat",
        provider_user_id: openid,
        provider_union_id: unionid,
        provider_nickname: userInfo?.nickname || null,
        provider_avatar: userInfo?.headimgurl || null,
        provider_data: tokenData,
        bound_at: new Date(),
      },
    });

    // 补充关注状态（非关键路径，失败静默）
    try {
      const subscribe = await this.querySubscribe(openid, "wechat", appType);
      await strapi.db.query(BINDING_UID).update({
        where: { provider_user_id: openid },
        data: { subscribe, subscribe_at: new Date(), subscribe_check_at: new Date() },
      });
    } catch { /* ignore */ }

    return { userId: user.id, isNew: true };
  },

  async getJssdkSignature(url: string, appType: WechatAppType) {
    const config = await getConfig(appType);
    const accessToken = await getValidAccessToken(config);
    const ticket = await getJsapiTicket(accessToken);

    const nonceStr = uuidv4().replace(/-/g, "").substring(0, 16);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash("sha1").update(raw).digest("hex");

    return {
      appId: config.appId.trim(),
      timestamp,
      nonceStr,
      signature,
    };
  },

  async getWechatLoginConfig(appType: WechatAppType) {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config = await configService.findByProviderAndAppType("wechat", appType);
    if (!config) {
      return { enabled: false, appType, oauthScopes: [], appId: null };
    }
    return {
      enabled: true,
      appType,
      oauthScopes: config.extraConfig?.oauthScopes || ["snsapi_userinfo"],
      appId: config.appId,
    };
  },

  /**
   * 查询用户是否关注公众号(subscribe)
   * 调 cgi-bin/user/info + 全局 access_token，返回 subscribe(1关注/0未关注)
   */
  async querySubscribe(openid: string, provider = "wechat", appType: WechatAppType = "official_account") {
    if (provider !== "wechat") return 0;
    if (process.env.MSG_WECHAT_PROVIDER === "mock") return 1; // mock 模式视为已关注，便于联调
    const config = await getConfig(appType);
    const accessToken = await getValidAccessToken(config);
    const res = await axios.get("https://api.weixin.qq.com/cgi-bin/user/info", {
      params: { access_token: accessToken, openid },
      timeout: 10000,
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_WECHAT_012", 502, `WeChat user info error: ${data.errmsg}`);
    }
    return data.subscribe === 1 ? 1 : 0;
  },
  };
};

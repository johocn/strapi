"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const crypto = require("crypto");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const crypto__default = /* @__PURE__ */ _interopDefault(crypto);
function decryptWechatData(sessionKey, encryptedData, iv, appId) {
  const sessionKeyBuf = Buffer.from(sessionKey, "base64");
  const encryptedDataBuf = Buffer.from(encryptedData, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  const decipher = crypto__default.default.createDecipheriv("aes-128-cbc", sessionKeyBuf, ivBuf);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(encryptedDataBuf),
    decipher.final()
  ]);
  const decoded = JSON.parse(decrypted.toString("utf8"));
  if (appId && decoded.watermark?.appid !== appId) {
    throw new Error("水印验证失败：appid 不匹配");
  }
  return decoded;
}
const USER_UID = "plugin::users-permissions.user";
const thirdPartyAuthService = ({ strapi }) => ({
  /**
   * 获取三方授权 URL
   */
  async getAuthUrl(platform, appType, redirectUrl, siteId) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config2 = await configService.findByPlatformAndAppType(platform, appType, siteId);
    if (!config2) {
      const e = new Error(`未找到 ${platform}/${appType} 的三方配置`);
      e.status = 404;
      throw e;
    }
    const pluginConfig = strapi.plugin("zhao-third").config("platforms");
    const platformConfig = pluginConfig?.[platform]?.[appType];
    if (!platformConfig?.authorizeUrl) {
      const e = new Error(`${platform}/${appType} 不支持授权登录`);
      e.status = 400;
      throw e;
    }
    const params = {};
    if (platform === "wechat") {
      params.appid = config2.appId;
      params.redirect_uri = redirectUrl;
      params.response_type = "code";
      params.scope = appType === "official_account" ? "snsapi_userinfo" : "snsapi_login";
      params.state = Math.random().toString(36).substring(2, 10);
    } else if (platform === "alipay") {
      params.app_id = config2.appId;
      params.scope = "auth_user";
      params.redirect_uri = redirectUrl;
    } else if (platform === "douyin") {
      params.client_key = config2.appId;
      params.scope = "user_info";
      params.redirect_uri = redirectUrl;
      params.response_type = "code";
      params.state = Math.random().toString(36).substring(2, 10);
    }
    const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    let authUrl = platformConfig.authorizeUrl;
    if (platform === "wechat") {
      authUrl = `${authUrl}?${queryString}#wechat_redirect`;
    } else {
      authUrl = `${authUrl}?${queryString}`;
    }
    return { authUrl, state: params.state || null, appId: config2.appId };
  },
  /**
   * 获取微信开放平台扫码登录 URL（内嵌二维码 + 跳转模式）
   */
  async getQrconnectUrl(redirectUrl, siteId) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config2 = await configService.findByPlatformAndAppType("wechat", "open_platform", siteId);
    if (!config2) {
      const e = new Error("未找到微信开放平台配置");
      e.status = 404;
      throw e;
    }
    const state = Math.random().toString(36).substring(2, 10);
    const qrconnectUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${config2.appId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    const redirectAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${config2.appId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    return {
      qrconnectUrl,
      redirectAuthUrl,
      state,
      appId: config2.appId
    };
  },
  /**
   * 三方登录回调：换取 token + openId，绑定或创建用户
   */
  async handleCallback(params) {
    const { platform, appType, code, encryptedData, iv, inviteCode, siteId } = params;
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const accountService = strapi.plugin("zhao-third").service("third-party-account");
    const config2 = await configService.findByPlatformAndAppType(platform, appType, siteId);
    if (!config2) {
      const e = new Error(`未找到 ${platform}/${appType} 的三方配置`);
      e.status = 404;
      throw e;
    }
    const tokenResult = await this.exchangeToken(platform, appType, code, config2, encryptedData, iv);
    let account = await accountService.findByOpenId(platform, appType, tokenResult.openId);
    if (!account && tokenResult.unionId) {
      account = await accountService.findByUnionId(platform, tokenResult.unionId);
    }
    let user;
    if (account?.user) {
      user = account.user;
    } else {
      user = await this.createUserFromThirdParty(platform, tokenResult, inviteCode);
      const accountData = {
        platform,
        appType,
        openId: tokenResult.openId,
        unionId: tokenResult.unionId || null,
        nickname: tokenResult.nickname || null,
        avatar: tokenResult.avatar || null,
        user: user.id
      };
      await accountService.createAccount(accountData);
    }
    const jwtService = strapi.plugin("zhao-auth").service("jwt");
    const jwt = await jwtService.sign({
      id: user.id,
      email: user.email || "",
      username: user.username,
      zhaoRoles: user.zhaoRoles || ["user"]
    });
    return {
      jwt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || null
      },
      isNew: !account
    };
  },
  /**
   * 换取三方 access_token
   */
  async exchangeToken(platform, appType, code, config2, encryptedData, iv) {
    if (platform === "wechat") {
      return this.exchangeWechatToken(appType, code, config2, encryptedData, iv);
    } else if (platform === "alipay") {
      return this.exchangeAlipayToken(code, config2);
    } else if (platform === "douyin") {
      return this.exchangeDouyinToken(code, config2);
    }
    const e = new Error(`不支持的平台: ${platform}`);
    e.status = 400;
    throw e;
  },
  async exchangeWechatToken(appType, code, config2, encryptedData, iv) {
    const tokenUrl = appType === "mini_program" ? "https://api.weixin.qq.com/sns/jscode2session" : "https://api.weixin.qq.com/sns/oauth2/access_token";
    const params = new URLSearchParams();
    if (appType === "mini_program") {
      params.set("appid", config2.appId);
      params.set("secret", config2.appSecret);
      params.set("js_code", code);
      params.set("grant_type", "authorization_code");
    } else {
      params.set("appid", config2.appId);
      params.set("secret", config2.appSecret);
      params.set("code", code);
      params.set("grant_type", "authorization_code");
    }
    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json();
    if (data.errcode) {
      const e = new Error(`微信 token 换取失败: ${data.errmsg}`);
      e.status = 400;
      throw e;
    }
    const result = {
      accessToken: data.access_token || "",
      openId: data.openid || "",
      unionId: data.unionid || null,
      sessionKey: data.session_key || null,
      nickname: null,
      avatar: null
    };
    if (appType === "mini_program" && data.session_key && encryptedData && iv) {
      try {
        const decrypted = decryptWechatData(data.session_key, encryptedData, iv, config2.appId);
        if (decrypted.unionId) result.unionId = decrypted.unionId;
        if (decrypted.nickName) result.nickname = decrypted.nickName;
        if (decrypted.avatarUrl) result.avatar = decrypted.avatarUrl;
        if (decrypted.phoneNumber) result.phoneNumber = decrypted.phoneNumber;
      } catch (err) {
        strapi.log.warn(`[zhao-third] 小程序加密数据解密失败: ${err.message}`);
      }
    }
    if (appType === "official_account" && data.access_token && data.openid) {
      try {
        const userinfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${data.access_token}&openid=${data.openid}&lang=zh_CN`;
        const userinfoRes = await fetch(userinfoUrl);
        const userinfo = await userinfoRes.json();
        if (!userinfo.errcode) {
          result.nickname = userinfo.nickname || null;
          result.avatar = userinfo.headimgurl || null;
          if (userinfo.unionid) result.unionId = userinfo.unionid;
        }
      } catch (err) {
        strapi.log.warn(`[zhao-third] 获取微信用户信息失败: ${err.message}`);
      }
    }
    return result;
  },
  async exchangeAlipayToken(code, config2) {
    const tokenUrl = "https://openapi.alipay.com/gateway.do";
    const params = new URLSearchParams();
    params.set("app_id", config2.appId);
    params.set("method", "alipay.system.oauth.token");
    params.set("charset", "utf-8");
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json();
    const tokenData = data?.alipay_system_oauth_token_response;
    if (!tokenData || tokenData.code) {
      const e = new Error(`支付宝 token 换取失败: ${tokenData?.sub_msg || "未知错误"}`);
      e.status = 400;
      throw e;
    }
    return {
      accessToken: tokenData.access_token || "",
      openId: tokenData.user_id || "",
      unionId: tokenData.user_id || null,
      sessionKey: null,
      nickname: null,
      avatar: null
    };
  },
  async exchangeDouyinToken(code, config2) {
    const response = await fetch("https://open.douyin.com/oauth/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: config2.appId,
        client_secret: config2.appSecret,
        code,
        grant_type: "authorization_code"
      })
    });
    const data = await response.json();
    if (data?.data?.error_code !== 0) {
      const e = new Error(`抖音 token 换取失败: ${data?.data?.description || "未知错误"}`);
      e.status = 400;
      throw e;
    }
    return {
      accessToken: data.data.access_token || "",
      openId: data.data.open_id || "",
      unionId: null,
      sessionKey: null,
      nickname: null,
      avatar: null
    };
  },
  /**
   * 创建用户（三方登录自动注册）
   */
  async createUserFromThirdParty(platform, tokenResult, inviteCode) {
    const prefix = platform === "wechat" ? "wx" : platform === "alipay" ? "alipay" : "dy";
    const username = `${prefix}_${tokenResult.openId.substring(0, 16)}`;
    const email = `${username}@third.placeholder`;
    const user = await strapi.db.query(USER_UID).create({
      data: {
        username,
        email,
        provider: platform,
        password: Math.random().toString(36).substring(2, 18),
        confirmed: true,
        blocked: false
      }
    });
    if (inviteCode) {
      try {
        const channelService = strapi.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          await channelService.createForUser(user.id, inviteCode);
        }
      } catch (e) {
        strapi.log.warn(`[zhao-third] 创建邀请码失败: ${e.message}`);
      }
    }
    return user;
  },
  /**
   * 获取三方公开配置
   */
  async getPublicConfig(platform, appType, siteId) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config2 = await configService.findByPlatformAndAppType(platform, appType, siteId);
    if (!config2) {
      return null;
    }
    let authMode = null;
    if (platform === "wechat") {
      if (appType === "open_platform") {
        authMode = "qrconnect";
      } else if (appType === "official_account") {
        authMode = "redirect";
      }
    }
    return {
      platform: config2.platform,
      appType: config2.appType,
      appId: config2.appId,
      enabled: config2.enabled,
      authMode
    };
  },
  /**
   * 微信 JS-SDK 签名
   * 公众号网页优先用 official_account 配置(公众号 appId/secret 也能调用 JS-SDK)
   * fallback 到 open_platform(开放平台)
   */
  async getJssdkSignature(url, siteId) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    let config2 = await configService.findByPlatformAndAppType("wechat", "official_account", siteId);
    if (!config2) {
      config2 = await configService.findByPlatformAndAppType("wechat", "open_platform", siteId);
    }
    if (!config2) {
      const e = new Error("未找到微信公众号或开放平台配置");
      e.status = 404;
      throw e;
    }
    const tokenResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config2.appId}&secret=${config2.appSecret}`
    );
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      const e = new Error(`获取微信 access_token 失败: ${tokenData.errmsg}`);
      e.status = 400;
      throw e;
    }
    const ticketResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${tokenData.access_token}&type=jsapi`
    );
    const ticketData = await ticketResponse.json();
    if (ticketData.errcode !== 0) {
      const e = new Error(`获取微信 jsapi_ticket 失败: ${ticketData.errmsg}`);
      e.status = 400;
      throw e;
    }
    const crypto2 = await import("crypto");
    const nonceStr = Math.random().toString(36).substring(2, 15);
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const signStr = `jsapi_ticket=${ticketData.ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto2.createHash("sha1").update(signStr).digest("hex");
    return {
      appId: config2.appId,
      timestamp,
      nonceStr,
      signature
    };
  },
  /**
   * 更新三方资料
   */
  async updateProfile(userId, data) {
    const accountService = strapi.plugin("zhao-third").service("third-party-account");
    const accounts = await accountService.findByUser(userId);
    if (!accounts || Array.isArray(accounts) && accounts.length === 0) {
      const e = new Error("未找到绑定的三方账号");
      e.status = 404;
      throw e;
    }
    const account = Array.isArray(accounts) ? accounts[0] : accounts;
    const updateData = {};
    if (data.nickname) updateData.nickname = data.nickname;
    if (data.avatar) updateData.avatar = data.avatar;
    if (Object.keys(updateData).length > 0) {
      await accountService.updateAccount(account.documentId, updateData);
    }
    return { success: true };
  },
  /**
   * 微信授权中转回调
   * 接收微信回调的 code，完成 token 交换后 302 重定向到前端页面
   * @param ctx - Koa context，包含 code、state、host
   */
  async wechatRedirectCallback(ctx) {
    const { code, state } = ctx.query;
    if (!code) {
      return this.handleAuthError(ctx, "缺少 code 参数");
    }
    const host = ctx.request.host;
    let siteId;
    try {
      const configService = strapi.plugin("zhao-common").service("config");
      if (configService) {
        const site = await configService.getSiteByDomain(host);
        if (site) {
          siteId = site.documentId;
        }
      }
    } catch (e) {
      strapi.log.warn(`[zhao-third] 无法根据域名 ${host} 获取站点配置: ${e.message}`);
    }
    try {
      const result = await this.handleCallback({
        platform: "wechat",
        appType: "official_account",
        code,
        siteId
      });
      const redirectUrl = this.buildFrontendRedirectUrl(ctx, result, state);
      ctx.response.redirect(redirectUrl);
    } catch (e) {
      strapi.log.error(`[zhao-third] 微信中转回调处理失败: ${e.message}`);
      return this.handleAuthError(ctx, e.message);
    }
  },
  /**
   * 构建前端重定向 URL
   */
  buildFrontendRedirectUrl(ctx, result, state) {
    const protocol = ctx.request.protocol;
    const host = ctx.request.host;
    const queryParams = {};
    if (result.jwt) queryParams.token = result.jwt;
    if (result.user?.id) queryParams.userId = String(result.user.id);
    if (result.isNew !== void 0) queryParams.isNew = String(result.isNew);
    if (state) queryParams.state = state;
    const queryString = new URLSearchParams(queryParams).toString();
    const authCallbackPath = "/#/pages/auth-callback/auth-callback";
    return `${protocol}://${host}${authCallbackPath}${queryString ? `?${queryString}` : ""}`;
  },
  /**
   * 处理授权错误
   */
  handleAuthError(ctx, message) {
    const protocol = ctx.request.protocol;
    const host = ctx.request.host;
    const errorUrl = `${protocol}://${host}/#/pages/auth-callback/auth-callback?error=${encodeURIComponent(message)}`;
    ctx.response.redirect(errorUrl);
  }
});
const CONFIG_UID = "plugin::zhao-third.third-party-config";
const thirdPartyConfigService = ({ strapi }) => ({
  async findConfig(filters) {
    return strapi.documents(CONFIG_UID).findFirst({ filters });
  },
  async findConfigs(filters) {
    return strapi.documents(CONFIG_UID).findMany({ filters });
  },
  async createConfig(data) {
    return strapi.documents(CONFIG_UID).create({ data });
  },
  async updateConfig(documentId, data) {
    return strapi.documents(CONFIG_UID).update({ documentId, data });
  },
  async deleteConfig(documentId) {
    return strapi.documents(CONFIG_UID).delete({ documentId });
  },
  async findByPlatformAndAppType(platform, appType, siteId) {
    if (!siteId) {
      return strapi.documents(CONFIG_UID).findFirst({
        filters: { platform, appType, enabled: true }
      });
    }
    const knex = strapi.db.connection;
    const siteRow = await knex("zhao_site_configs").select("id").where("document_id", siteId).first();
    if (!siteRow) return null;
    const linkRow = await knex("third_party_configs_site_lnk").select("third_party_config_id").where("site_config_id", siteRow.id).first();
    if (!linkRow) return null;
    const row = await knex("third_party_configs").select("id", "document_id", "name", "platform", "app_type", "app_id", "app_secret", "enabled").where("id", linkRow.third_party_config_id).where("platform", platform).where("app_type", appType).where("enabled", true).whereNotNull("published_at").first();
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.document_id,
      name: row.name,
      platform: row.platform,
      appType: row.app_type,
      appId: row.app_id,
      appSecret: row.app_secret,
      enabled: row.enabled
    };
  }
});
const ACCOUNT_UID = "plugin::zhao-third.third-party-account";
const thirdPartyAccountService = ({ strapi }) => ({
  async findByOpenId(platform, appType, openId) {
    return strapi.documents(ACCOUNT_UID).findFirst({
      filters: { platform, appType, openId },
      populate: { user: true }
    });
  },
  async findByUnionId(platform, unionId) {
    return strapi.documents(ACCOUNT_UID).findFirst({
      filters: { platform, unionId },
      populate: { user: true }
    });
  },
  async findByUser(userId) {
    return strapi.documents(ACCOUNT_UID).findMany({
      filters: { user: { id: userId } }
    });
  },
  async createAccount(data) {
    return strapi.documents(ACCOUNT_UID).create({ data });
  },
  async updateAccount(documentId, data) {
    return strapi.documents(ACCOUNT_UID).update({ documentId, data });
  },
  async findAccounts(filters) {
    return strapi.documents(ACCOUNT_UID).findMany({ filters, populate: { user: true } });
  }
});
const services = {
  "third-party-auth": thirdPartyAuthService,
  "third-party-config": thirdPartyConfigService,
  "third-party-account": thirdPartyAccountService
};
const thirdPartyAuthController = ({ strapi }) => ({
  async authUrl(ctx) {
    try {
      const { platform, appType, redirectUrl } = ctx.request.body;
      if (!platform || !appType || !redirectUrl) {
        ctx.status = 400;
        ctx.body = { error: "请提供 platform, appType 和 redirectUrl" };
        return;
      }
      const siteId = ctx.state?.siteId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getAuthUrl(platform, appType, redirectUrl, siteId);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取授权URL失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async qrconnectUrl(ctx) {
    try {
      const { redirectUrl } = ctx.request.body;
      if (!redirectUrl) {
        ctx.status = 400;
        ctx.body = { error: "请提供 redirectUrl" };
        return;
      }
      const siteId = ctx.state?.siteId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getQrconnectUrl(redirectUrl, siteId);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取扫码登录URL失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async callback(ctx) {
    try {
      const { platform, appType, code, encryptedData, iv, inviteCode } = ctx.request.body;
      if (!platform || !appType || !code) {
        ctx.status = 400;
        ctx.body = { error: "请提供 platform, appType 和 code" };
        return;
      }
      const siteId = ctx.state?.siteId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.handleCallback({
        platform,
        appType,
        code,
        encryptedData,
        iv,
        inviteCode,
        siteId
      });
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 三方登录回调失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async publicConfig(ctx) {
    try {
      const { platform, appType } = ctx.params;
      const siteId = ctx.state?.siteId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getPublicConfig(platform, appType, siteId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "未找到配置" };
        return;
      }
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取公开配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async updateProfile(ctx) {
    try {
      const userId = ctx.state?.user?.id;
      if (!userId) {
        ctx.status = 401;
        ctx.body = { error: "未认证" };
        return;
      }
      const { nickname, avatar } = ctx.request.body;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.updateProfile(userId, { nickname, avatar });
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 更新三方资料失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async jssdkSignature(ctx) {
    try {
      const { url } = ctx.request.body;
      if (!url) {
        ctx.status = 400;
        ctx.body = { error: "请提供 url" };
        return;
      }
      const siteId = ctx.state?.siteId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getJssdkSignature(url, siteId);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取JS-SDK签名失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async wechatRedirectCallback(ctx) {
    try {
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      await authService.wechatRedirectCallback(ctx);
    } catch (error) {
      strapi.log.error(`[zhao-third] 微信中转回调失败: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }
});
const thirdPartyConfigController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const filters = {};
      const siteParam = ctx.query?.site;
      const stateSiteId = ctx.state?.siteId;
      const effectiveSiteId = siteParam || stateSiteId;
      if (effectiveSiteId) {
        filters.site = { documentId: effectiveSiteId };
      }
      const result = await configService.findConfigs(filters);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取配置列表失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async create(ctx) {
    try {
      const { name, platform, appType, appId, appSecret, enabled, site } = ctx.request.body;
      if (!name || !platform || !appType || !appId || !appSecret) {
        ctx.status = 400;
        ctx.body = { error: "请提供 name, platform, appType, appId 和 appSecret" };
        return;
      }
      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const data = { name, platform, appType, appId, appSecret, enabled: enabled !== false };
      const siteId = site || ctx.state?.siteId;
      if (siteId) {
        data.site = siteId;
      }
      const result = await configService.createConfig(data);
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 创建配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }
      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.updateConfig(documentId, body);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 更新配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }
      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.deleteConfig(documentId);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 删除配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});
const thirdPartyAccountController = ({ strapi }) => ({
  async list(ctx) {
    try {
      const accountService = strapi.plugin("zhao-third").service("third-party-account");
      const filters = {};
      const { platform, appType } = ctx.query;
      if (platform) filters.platform = platform;
      if (appType) filters.appType = appType;
      const result = await accountService.findAccounts(filters);
      ctx.body = result;
    } catch (error) {
      strapi.log.error(`[zhao-third] 获取账号列表失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  }
});
const controllers = {
  "third-party-auth": thirdPartyAuthController,
  "third-party-config": thirdPartyConfigController,
  "third-party-account": thirdPartyAccountController
};
const kind$1 = "collectionType";
const collectionName$1 = "third_party_configs";
const info$1 = { "singularName": "third-party-config", "pluralName": "third-party-configs", "displayName": "三方登录配置" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": false } };
const attributes$1 = { "name": { "type": "string", "required": true }, "platform": { "type": "enumeration", "enum": ["wechat", "alipay", "douyin"], "required": true }, "appType": { "type": "enumeration", "enum": ["official_account", "mini_program", "open_platform", "h5", "app"], "required": true }, "appId": { "type": "string", "required": true }, "appSecret": { "type": "string", "required": true }, "enabled": { "type": "boolean", "default": true }, "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config" } };
const thirdPartyConfigSchema = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "third_party_accounts";
const info = { "singularName": "third-party-account", "pluralName": "third-party-accounts", "displayName": "三方账号绑定" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": false } };
const attributes = { "platform": { "type": "enumeration", "enum": ["wechat", "alipay", "douyin"], "required": true }, "appType": { "type": "enumeration", "enum": ["official_account", "mini_program", "open_platform", "h5", "app"], "required": true }, "openId": { "type": "string", "required": true }, "unionId": { "type": "string" }, "nickname": { "type": "string" }, "avatar": { "type": "string" }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" } };
const thirdPartyAccountSchema = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "third-party-config": {
    schema: thirdPartyConfigSchema
  },
  "third-party-account": {
    schema: thirdPartyAccountSchema
  }
};
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-third] 三方登录插件已启动");
};
const register = ({ strapi }) => {
  strapi.log.info("[zhao-third] 三方登录插件已注册");
};
const destroy = ({ strapi }) => {
  strapi.log.info("[zhao-third] 三方登录插件已销毁");
};
const config = {
  default: {
    platforms: {
      wechat: {
        official_account: {
          authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize",
          parameters: ["appid", "redirect_uri", "response_type", "scope", "state"]
        },
        mini_program: {},
        open_platform: {
          authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect",
          parameters: ["appid", "redirect_uri", "response_type", "scope", "state"]
        }
      },
      alipay: {
        h5: {
          authorizeUrl: "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm",
          parameters: ["app_id", "scope", "redirect_uri"]
        }
      },
      douyin: {
        h5: {
          authorizeUrl: "https://open.douyin.com/platform/oauth/connect",
          parameters: ["client_key", "scope", "redirect_uri", "response_type", "state"]
        }
      }
    }
  },
  validator: () => {
  }
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false }
});
const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // C 端公开接口
    publicRoute("POST", "/third/auth-url", "third-party-auth.authUrl"),
    publicRoute("POST", "/third/qrconnect-url", "third-party-auth.qrconnectUrl"),
    publicRoute("POST", "/third/callback", "third-party-auth.callback"),
    publicRoute("GET", "/wechat/callback", "third-party-auth.wechatRedirectCallback"),
    publicRoute("GET", "/third/config/:platform/:appType", "third-party-auth.publicConfig"),
    publicRoute("POST", "/third/jssdk-signature", "third-party-auth.jssdkSignature"),
    // C 端需认证接口
    userRoute("POST", "/third/profile/update", "third-party-auth.updateProfile"),
    // 管理端接口
    adminRoute("GET", "/third-party-config", "third-party-config.list", "third-party-config.read"),
    adminRoute("POST", "/third-party-config", "third-party-config.create", "third-party-config.create"),
    adminRoute("PUT", "/third-party-config/:documentId", "third-party-config.update", "third-party-config.update"),
    adminRoute("DELETE", "/third-party-config/:documentId", "third-party-config.delete", "third-party-config.delete"),
    adminRoute("GET", "/third-party-accounts", "third-party-account.list", "third-party-account.read")
  ]
});
const contentApiRoutes = contentApi();
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes
  }
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  services,
  controllers,
  contentTypes,
  routes
};
exports.default = index;

import type { Core } from "@strapi/strapi";
import { decryptWechatData } from "../utils/wechat-crypto";

const USER_UID = "plugin::users-permissions.user";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取三方授权 URL
   */
  async getAuthUrl(platform: string, appType: string, redirectUrl: string, siteId?: string, state?: string, scope?: string) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config = await configService.findByPlatformAndAppType(platform, appType, siteId);

    if (!config) {
      const e: any = new Error(`未找到 ${platform}/${appType} 的三方配置`);
      e.status = 404;
      throw e;
    }

    const pluginConfig = strapi.plugin("zhao-third").config("platforms") as Record<string, any>;
    const platformConfig = pluginConfig?.[platform]?.[appType];

    if (!platformConfig?.authorizeUrl) {
      const e: any = new Error(`${platform}/${appType} 不支持授权登录`);
      e.status = 400;
      throw e;
    }

    const params: Record<string, string> = {};
    if (platform === "wechat") {
      params.appid = config.appId;
      params.redirect_uri = redirectUrl;
      params.response_type = "code";
      params.scope = scope || (appType === "official_account" ? "snsapi_userinfo" : "snsapi_login");
      params.state = state || Math.random().toString(36).substring(2, 10);
    } else if (platform === "alipay") {
      params.app_id = config.appId;
      params.scope = "auth_user";
      params.redirect_uri = redirectUrl;
    } else if (platform === "douyin") {
      params.client_key = config.appId;
      params.scope = "user_info";
      params.redirect_uri = redirectUrl;
      params.response_type = "code";
      params.state = state || Math.random().toString(36).substring(2, 10);
    }

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    let authUrl = platformConfig.authorizeUrl;
    if (platform === "wechat") {
      authUrl = `${authUrl}?${queryString}#wechat_redirect`;
    } else {
      authUrl = `${authUrl}?${queryString}`;
    }

    return { authUrl, state: params.state || null, appId: config.appId };
  },

  /**
   * 获取微信开放平台扫码登录 URL（内嵌二维码 + 跳转模式）
   */
  async getQrconnectUrl(redirectUrl: string, siteId?: string) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config = await configService.findByPlatformAndAppType("wechat", "open_platform", siteId);

    if (!config) {
      const e: any = new Error("未找到微信开放平台配置");
      e.status = 404;
      throw e;
    }

    const state = Math.random().toString(36).substring(2, 10);

    // 内嵌二维码 URL
    const qrconnectUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${config.appId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

    // 跳转授权 URL（与 authUrl 接口返回格式一致）
    const redirectAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${config.appId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

    return {
      qrconnectUrl,
      redirectAuthUrl,
      state,
      appId: config.appId,
    };
  },

  /**
   * 三方登录回调：换取 token + openId，绑定或创建用户
   */
  async handleCallback(params: {
    platform: string;
    appType: string;
    code: string;
    encryptedData?: string;
    iv?: string;
    inviteCode?: string;
    siteId?: string;
  }) {
    const { platform, appType, code, encryptedData, iv, inviteCode, siteId } = params;

    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const accountService = strapi.plugin("zhao-third").service("third-party-account");

    const config = await configService.findByPlatformAndAppType(platform, appType, siteId);
    if (!config) {
      const e: any = new Error(`未找到 ${platform}/${appType} 的三方配置`);
      e.status = 404;
      throw e;
    }

    // 换取 access_token + openId
    const tokenResult = await this.exchangeToken(platform, appType, code, config, encryptedData, iv);

    // 查找已绑定的三方账号
    let account = await accountService.findByOpenId(platform, appType, tokenResult.openId);

    // 如果没有通过 openId 找到，尝试 unionId
    if (!account && tokenResult.unionId) {
      account = await accountService.findByUnionId(platform, tokenResult.unionId);
    }

    let user: any;

    if (account?.user) {
      // 已绑定用户，直接登录
      user = account.user;
    } else {
      // 未绑定，创建用户并绑定
      user = await this.createUserFromThirdParty(platform, tokenResult, inviteCode);

      const accountData: Record<string, any> = {
        platform,
        appType,
        openId: tokenResult.openId,
        unionId: tokenResult.unionId || null,
        nickname: tokenResult.nickname || null,
        avatar: tokenResult.avatar || null,
        user: user.id,
      };

      await accountService.createAccount(accountData);
    }

    // 签发 JWT
    const jwtService = strapi.plugin("zhao-auth").service("jwt");
    const jwt = await jwtService.sign({
      id: user.id,
      email: user.email || "",
      username: user.username,
      zhaoRoles: user.zhaoRoles || ["user"],
    });

    return {
      jwt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || null,
      },
      isNew: !account,
    };
  },

  /**
   * 换取三方 access_token
   */
  async exchangeToken(platform: string, appType: string, code: string, config: any, encryptedData?: string, iv?: string) {
    if (platform === "wechat") {
      return this.exchangeWechatToken(appType, code, config, encryptedData, iv);
    } else if (platform === "alipay") {
      return this.exchangeAlipayToken(code, config);
    } else if (platform === "douyin") {
      return this.exchangeDouyinToken(code, config);
    }
    const e: any = new Error(`不支持的平台: ${platform}`);
    e.status = 400;
    throw e;
  },

  async exchangeWechatToken(appType: string, code: string, config: any, encryptedData?: string, iv?: string) {
    const tokenUrl = appType === "mini_program"
      ? "https://api.weixin.qq.com/sns/jscode2session"
      : "https://api.weixin.qq.com/sns/oauth2/access_token";

    const params = new URLSearchParams();
    if (appType === "mini_program") {
      params.set("appid", config.appId);
      params.set("secret", config.appSecret);
      params.set("js_code", code);
      params.set("grant_type", "authorization_code");
    } else {
      params.set("appid", config.appId);
      params.set("secret", config.appSecret);
      params.set("code", code);
      params.set("grant_type", "authorization_code");
    }

    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.errcode) {
      const e: any = new Error(`微信 token 换取失败: ${data.errmsg}`);
      e.status = 400;
      throw e;
    }

    const result: Record<string, any> = {
      accessToken: data.access_token || "",
      openId: data.openid || "",
      unionId: data.unionid || null,
      sessionKey: data.session_key || null,
      nickname: null,
      avatar: null,
    };

    // 小程序场景：解密 encryptedData 获取用户信息
    if (appType === "mini_program" && data.session_key && encryptedData && iv) {
      try {
        const decrypted = decryptWechatData(data.session_key, encryptedData, iv, config.appId);
        if (decrypted.unionId) result.unionId = decrypted.unionId;
        if (decrypted.nickName) result.nickname = decrypted.nickName;
        if (decrypted.avatarUrl) result.avatar = decrypted.avatarUrl;
        if (decrypted.phoneNumber) result.phoneNumber = decrypted.phoneNumber;
      } catch (err) {
        strapi.log.warn(`[zhao-third] 小程序加密数据解密失败: ${(err as Error).message}`);
      }
    }

    // 公众号/开放平台场景：用 access_token 获取用户信息
    if (appType === "official_account" && data.access_token && data.openid) {
      try {
        const userinfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${data.access_token}&openid=${data.openid}&lang=zh_CN`;
        const userinfoRes = await fetch(userinfoUrl);
        const userinfo = await userinfoRes.json() as any;
        if (!userinfo.errcode) {
          result.nickname = userinfo.nickname || null;
          result.avatar = userinfo.headimgurl || null;
          if (userinfo.unionid) result.unionId = userinfo.unionid;
        }
      } catch (err) {
        strapi.log.warn(`[zhao-third] 获取微信用户信息失败: ${(err as Error).message}`);
      }
    }

    return result;
  },

  async exchangeAlipayToken(code: string, config: any) {
    const tokenUrl = "https://openapi.alipay.com/gateway.do";
    const params = new URLSearchParams();
    params.set("app_id", config.appId);
    params.set("method", "alipay.system.oauth.token");
    params.set("charset", "utf-8");
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    // 实际生产需加 sign，此处简化
    const response = await fetch(`${tokenUrl}?${params.toString()}`);
    const data = await response.json() as any;

    const tokenData = data?.alipay_system_oauth_token_response;
    if (!tokenData || tokenData.code) {
      const e: any = new Error(`支付宝 token 换取失败: ${tokenData?.sub_msg || "未知错误"}`);
      e.status = 400;
      throw e;
    }

    return {
      accessToken: tokenData.access_token || "",
      openId: tokenData.user_id || "",
      unionId: tokenData.user_id || null,
      sessionKey: null,
      nickname: null,
      avatar: null,
    };
  },

  async exchangeDouyinToken(code: string, config: any) {
    const tokenUrl = "https://open.douyin.com/oauth/connect/";
    const response = await fetch("https://open.douyin.com/oauth/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: config.appId,
        client_secret: config.appSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    const data = await response.json() as any;

    if (data?.data?.error_code !== 0) {
      const e: any = new Error(`抖音 token 换取失败: ${data?.data?.description || "未知错误"}`);
      e.status = 400;
      throw e;
    }

    return {
      accessToken: data.data.access_token || "",
      openId: data.data.open_id || "",
      unionId: null,
      sessionKey: null,
      nickname: null,
      avatar: null,
    };
  },

  /**
   * 创建用户（三方登录自动注册）
   */
  async createUserFromThirdParty(platform: string, tokenResult: any, inviteCode?: string) {
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
        blocked: false,
      },
    });

    // 尝试处理邀请码
    if (inviteCode) {
      try {
        const channelService = strapi.service("plugin::zhao-channel.user-invite");
        if (channelService && typeof channelService.createForUser === "function") {
          await channelService.createForUser(user.id, inviteCode);
        }
      } catch (e) {
        strapi.log.warn(`[zhao-third] 创建邀请码失败: ${(e as Error).message}`);
      }
    }

    return user;
  },

  /**
   * 获取三方公开配置
   */
  async getPublicConfig(platform: string, appType: string, siteId?: string) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    const config = await configService.findByPlatformAndAppType(platform, appType, siteId);

    if (!config) {
      return null;
    }

    // 根据 platform/appType 决定 authMode
    let authMode: string | null = null;
    if (platform === "wechat") {
      if (appType === "open_platform") {
        authMode = "qrconnect";
      } else if (appType === "official_account") {
        authMode = "redirect";
      }
    }

    return {
      platform: config.platform,
      appType: config.appType,
      appId: config.appId,
      enabled: config.enabled,
      authMode,
    };
  },

  /**
   * 微信 JS-SDK 签名
   * 公众号网页优先用 official_account 配置(公众号 appId/secret 也能调用 JS-SDK)
   * fallback 到 open_platform(开放平台)
   */
  async getJssdkSignature(url: string, siteId?: string) {
    const configService = strapi.plugin("zhao-third").service("third-party-config");
    // 优先公众号(微信公众号网页场景)
    let config = await configService.findByPlatformAndAppType("wechat", "official_account", siteId);
    // fallback 开放平台
    if (!config) {
      config = await configService.findByPlatformAndAppType("wechat", "open_platform", siteId);
    }

    if (!config) {
      const e: any = new Error("未找到微信公众号或开放平台配置");
      e.status = 404;
      throw e;
    }

    // 获取 access_token
    const tokenResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`
    );
    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.access_token) {
      const e: any = new Error(`获取微信 access_token 失败: ${tokenData.errmsg}`);
      e.status = 400;
      throw e;
    }

    // 获取 jsapi_ticket
    const ticketResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${tokenData.access_token}&type=jsapi`
    );
    const ticketData = await ticketResponse.json() as any;

    if (ticketData.errcode !== 0) {
      const e: any = new Error(`获取微信 jsapi_ticket 失败: ${ticketData.errmsg}`);
      e.status = 400;
      throw e;
    }

    const crypto = await import("crypto");
    const nonceStr = Math.random().toString(36).substring(2, 15);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const signStr = `jsapi_ticket=${ticketData.ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash("sha1").update(signStr).digest("hex");

    return {
      appId: config.appId,
      timestamp,
      nonceStr,
      signature,
    };
  },

  /**
   * 更新三方资料
   */
  async updateProfile(userId: number | string, data: { nickname?: string; avatar?: string }) {
    const accountService = strapi.plugin("zhao-third").service("third-party-account");
    const accounts = await accountService.findByUser(userId);

    if (!accounts || (Array.isArray(accounts) && accounts.length === 0)) {
      const e: any = new Error("未找到绑定的三方账号");
      e.status = 404;
      throw e;
    }

    const account = Array.isArray(accounts) ? accounts[0] : accounts;
    const updateData: Record<string, any> = {};
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
  async wechatRedirectCallback(ctx: any) {
    const { code, state } = ctx.query;

    if (!code) {
      return this.handleAuthError(ctx, "缺少 code 参数");
    }

    const host = ctx.request.host;
    let siteId: string | undefined;

    try {
      const configService = strapi.plugin("zhao-common").service("config");
      if (configService) {
        const site = await configService.getSiteByDomain(host);
        if (site) {
          siteId = site.documentId;
        }
      }
    } catch (e) {
      strapi.log.warn(`[zhao-third] 无法根据域名 ${host} 获取站点配置: ${(e as Error).message}`);
    }

    try {
      const result = await this.handleCallback({
        platform: "wechat",
        appType: "official_account",
        code,
        siteId,
      });

      const redirectUrl = this.buildFrontendRedirectUrl(ctx, result, state);
      ctx.response.redirect(redirectUrl);
    } catch (e: any) {
      strapi.log.error(`[zhao-third] 微信中转回调处理失败: ${e.message}`);
      return this.handleAuthError(ctx, e.message);
    }
  },

  /**
   * 构建前端重定向 URL
   */
  buildFrontendRedirectUrl(ctx: any, result: any, state?: string): string {
    const protocol = ctx.request.protocol;
    const host = ctx.request.host;
    const queryParams: Record<string, string> = {};

    if (result.jwt) queryParams.token = result.jwt;
    if (result.user?.id) queryParams.userId = String(result.user.id);
    if (result.isNew !== undefined) queryParams.isNew = String(result.isNew);
    if (state) queryParams.state = state;

    const queryString = new URLSearchParams(queryParams).toString();
    const authCallbackPath = "/#/pages/auth-callback/auth-callback";

    return `${protocol}://${host}${authCallbackPath}${queryString ? `?${queryString}` : ""}`;
  },

  /**
   * 处理授权错误
   */
  handleAuthError(ctx: any, message: string): void {
    const protocol = ctx.request.protocol;
    const host = ctx.request.host;
    const errorUrl = `${protocol}://${host}/#/pages/auth-callback/auth-callback?error=${encodeURIComponent(message)}`;
    ctx.response.redirect(errorUrl);
  },
});

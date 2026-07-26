import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async authorize(ctx: any) {
    try {
      const { app_code, redirect_uri, response_type, state, channel_code } = ctx.query;

      if (!app_code || !redirect_uri || response_type !== "code") {
        ctx.status = 400; ctx.body = { error: "app_code, redirect_uri, response_type=code 必填" }; return;
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async token(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { grant_type, code, app_code, app_secret, redirect_uri } = body;

    if (grant_type === "authorization_code") {
      if (!code || !app_code || !app_secret || !redirect_uri) {
        ctx.status = 400; ctx.body = { error: "code, app_code, app_secret, redirect_uri 必填" }; return;
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
          channel: channelCode,
        });

        await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);

        ctx.body = tokenPair;
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }

    if (grant_type === "refresh_token") {
      const { refresh_token } = body;
      if (!refresh_token) { ctx.status = 400; ctx.body = { error: "refresh_token 必填" }; return; }

      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      try {
        const result = await authService.refreshToken(refresh_token);
        ctx.body = result;
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: "invalid_grant", error_description: e.message };
      }
      return;
    }

    ctx.status = 400; ctx.body = { error: "不支持的 grant_type" }; return;
  },

  async wechatRedirect(ctx: any) {
    let state: string | null = null;
    let redirectUri: string | undefined;
    try {
      const { app_code, redirect_uri, invite_code, channel_code, scope } = ctx.query;
      redirectUri = redirect_uri;
      if (!redirectUri) { ctx.status = 400; ctx.body = { error: "redirect_uri 必填" }; return; }

      // 按 User-Agent 判断 appType
      const userAgent = (ctx.request.headers["user-agent"] as string) || "";
      const appType = userAgent.includes("MicroMessenger") ? "official_account" : "open_platform";

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");

      // 校验 scope
      if (scope) {
        const loginConfig = await wechatService.getWechatLoginConfig(appType);
        const allowedScopes: string[] = loginConfig?.oauthScopes || [];
        if (allowedScopes.length > 0 && !allowedScopes.includes(scope)) {
          throw new Error(`不支持的 scope: ${scope}`);
        }
      }

      state = Buffer.from(JSON.stringify({
        app_code: app_code || "default",
        redirect_uri: redirectUri,
        invite_code: invite_code || "",
        channel_code: channel_code || "",
        app_type: appType,
        scope: scope || "",
      })).toString("base64url");

      // 构造 callbackUrl（优先取 X-Forwarded-* 反代头）
      const forwardedHost = ctx.request.headers["x-forwarded-host"];
      const forwardedProto = ctx.request.headers["x-forwarded-proto"];
      const host = forwardedHost || ctx.request.host;
      const protocol = forwardedProto || ctx.request.protocol;
      const callbackUrl = `${protocol}://${host}/api/zhao-sso/v1/auth/wechat/callback`;

      const url = await wechatService.getAuthorizeUrl(state, appType, scope, callbackUrl);
      ctx.redirect(url);
    } catch (e: any) {
      if (state && redirectUri) {
        const separator = redirectUri.includes("?") ? "&" : "?";
        ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
      } else {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    }
  },

  async wechatCallback(ctx: any) {
    const { code, state } = ctx.query;
    if (!code) { ctx.status = 400; ctx.body = { error: "微信授权码缺失" }; return; }

    let stateData: any = {};
    try { stateData = JSON.parse(Buffer.from(state, "base64url").toString()); } catch { /* ignore */ }

    const redirectUri = stateData.redirect_uri;
    if (!redirectUri) { ctx.status = 400; ctx.body = { error: "state 中 redirect_uri 缺失" }; return; }

    const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");

    try {
      const { userId } = await wechatService.handleCallback(code, stateData.app_type);

      // 建立 sso-user 分销关系（失败只 warn 不阻断）
      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, stateData.invite_code, stateData.channel_code);
        }
      } catch (ce: any) {
        strapi.log.warn(`[zhao-sso] 微信回调分销同步失败: ${ce.message}`);
      }

      const appCode = stateData.app_code || "default";

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
      });

      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
    }
  },

  async wechatMiniProgramLogin(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { code, appCode, inviteCode, channelCode } = body;
      if (!code || !appCode) {
        ctx.status = 400;
        ctx.body = { error: "invalid_request", error_description: "code 和 appCode 必填" };
        return;
      }

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId } = await wechatService.handleCallback(code, "mini_program");

      // 建立 sso-user 分销关系
      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, inviteCode, channelCode);
        }
      } catch (ce: any) {
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

      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      ctx.body = tokenPair;
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: "wechat_login_failed", error_description: e.message };
    }
  },

  async wechatAppLogin(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { code, appCode, inviteCode, channelCode } = body;
      if (!code || !appCode) {
        ctx.status = 400;
        ctx.body = { error: "invalid_request", error_description: "code 和 appCode 必填" };
        return;
      }

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId } = await wechatService.handleCallback(code, "app");

      // 建立 sso-user 分销关系
      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, inviteCode, channelCode);
        }
      } catch (ce: any) {
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

      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      ctx.body = tokenPair;
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: "wechat_login_failed", error_description: e.message };
    }
  },

  async jssdkSignature(ctx: any) {
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async wechatConfig(ctx: any) {
    try {
      const { appType } = ctx.query;
      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const config = await wechatService.getWechatLoginConfig(appType || "official_account");
      ctx.body = {
        enabled: config?.enabled ?? false,
        appType: appType || "official_account",
        oauthScopes: config?.oauthScopes || [],
        appId: config?.appId || null,
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async alipayRedirect(ctx: any) {
    try {
      const { app_code, channel_code, redirect_uri } = ctx.query;
      if (!redirect_uri) { ctx.status = 400; ctx.body = { error: "redirect_uri 必填" }; return; }
      const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
      const state = Buffer.from(JSON.stringify({
        app_code: app_code || "default",
        channel_code: channel_code || "",
        redirect_uri,
      })).toString("base64url");
      const url = await alipayService.getAuthorizeUrl(state);
      ctx.redirect(url);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async alipayCallback(ctx: any) {
    const { auth_code, state } = ctx.query;
    if (!auth_code) { ctx.status = 400; ctx.body = { error: "支付宝授权码缺失" }; return; }

    let stateData: any = {};
    try { stateData = JSON.parse(Buffer.from(state, "base64url").toString()); } catch { /* ignore */ }

    const redirectUri = stateData.redirect_uri;
    if (!redirectUri) { ctx.status = 400; ctx.body = { error: "state 中 redirect_uri 缺失" }; return; }

    const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");

    try {
      const { userId } = await alipayService.handleCallback(auth_code);
      const appCode = stateData.app_code || "default";

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
      });

      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: "alipay_oauth_failed", message: e.message };
    }
  },
});

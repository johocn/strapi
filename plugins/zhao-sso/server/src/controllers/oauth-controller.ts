import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async authorize(ctx: any) {
    try {
      // state 语义（Type B）：标准 OAuth2 透传 state，由调用方提供、SSO 原样回显，不做解析。
      // 与 wechatRedirect/alipayRedirect 中构造的 base64url JSON state（Type A）语义不同。
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

  /**
   * 标准 OAuth2 token 端点（RFC 6749）
   * 服务端到服务端调用，必须传 app_secret。
   * 支持 grant_type=authorization_code（换码）和 grant_type=refresh_token（刷新）。
   *
   * 与 exchange-token 的区别：本端点要求调用方持有 app_secret，适合后端直连；
   * exchange-token 是前端代理，不暴露 app_secret，仅支持 authorization_code。
   */
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
        const { userId, channelCode, isNew } = await oauthService.exchangeCode({ code, appCode: app_code, appSecret: app_secret, redirectUri: redirect_uri });

        const userService = strapi.plugin("zhao-sso").service("sso-user");
        const user = await userService.findById(userId);

        // 注入用户自有邀请码（与 exchangeToken 返回结构保持一致）
        const ownInviteCode = (await strapi.plugin("zhao-sso").service("sso-invite").ensureOwnInviteCode(user.id, app_code)) || "";
        user.inviteCode = ownInviteCode;
        user.ownInviteCode = ownInviteCode;

        await userService.updateLoginInfo(user.id, channelCode);
        const roles = await authService.getUserRoles(user.id, app_code);
        const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
          sub: user.uuid,
          app_code,
          roles,
          channel: channelCode,
        });

        await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);

        // 与 exchangeToken 返回结构保持一致：含 user + is_new
        ctx.body = { ...tokenPair, user, is_new: isNew };
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
  async exchangeToken(ctx: any) {
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
      // 1. 查应用获取 app_secret（前端不传）
      const app = await oauthService.findApp(app_code);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "应用不存在或已禁用" };
        return;
      }

      // 2. 校验 redirect_uri 是否在白名单
      if (!oauthService.validateRedirectUri(app, redirect_uri)) {
        ctx.status = 400;
        ctx.body = { error: "redirect_uri 不在白名单" };
        return;
      }

      // 3. 复用 exchangeCodeInternal 完成授权码校验与核销（不校验 app_secret）
      const { userId, channelCode, isNew } = await oauthService.exchangeCodeInternal({
        code,
        appCode: app_code,
        app,
        redirectUri: redirect_uri,
      });

      // 4. 签发 token 对
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findById(userId);

      // 注入用户自有邀请码：C 端 getInviteCode() 读 user.inviteCode，
      // 登录后即可用真实码分享（而非前端自造临时码）；幂等（有码返回无码生成）
      const ownInviteCode = (await strapi.plugin("zhao-sso").service("sso-invite").ensureOwnInviteCode(user.id, app_code)) || "";
      user.inviteCode = ownInviteCode;
      user.ownInviteCode = ownInviteCode;

      const roles = await authService.getUserRoles(user.id, app_code);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code,
        roles,
        channel: channelCode,
      });

      await authService.saveTokenRecord(user.id, app_code, tokenPair, channelCode);

      ctx.body = { ...tokenPair, user, is_new: isNew };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: "invalid_grant", error_description: e.message };
    }
  },

  async wechatRedirect(ctx: any) {
    let state: string | null = null;
    let redirectUri: string | undefined;
    try {
      const { app_code, redirect_uri, invite_code, channel_code, scope, app_type, debugWx } = ctx.query;
      redirectUri = redirect_uri;
      if (!redirectUri) { ctx.status = 400; ctx.body = { error: "redirect_uri 必填" }; return; }

      // 早期校验 app_code：避免后续 state 构造和微信请求都基于无效 app_code
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(app_code || "course");
      if (!app || !app.is_active) {
        ctx.status = 404; ctx.body = { error: "应用不存在或已禁用" }; return;
      }

      // appType 优先级：query.app_type > debugWx=1 强制 official_account > User-Agent 判断
      const userAgent = (ctx.request.headers["user-agent"] as string) || "";
      let appType: string;
      if (typeof app_type === "string" && app_type) {
        appType = app_type;
      } else if (debugWx === "1" || userAgent.includes("MicroMessenger")) {
        appType = "official_account";
      } else {
        appType = "open_platform";
      }

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");

      // 校验 scope
      if (scope) {
        const loginConfig = await wechatService.getWechatLoginConfig(appType);
        const allowedScopes: string[] = loginConfig?.oauthScopes || [];
        if (allowedScopes.length > 0 && !allowedScopes.includes(scope)) {
          throw new Error(`不支持的 scope: ${scope}`);
        }
      }

      // state 语义（Type A）：base64url 编码的 JSON 信封，承载 app_code/redirect_uri/invite_code/
      // channel_code/app_type/scope，由微信原样回显，callback 时解码恢复上下文。
      // 与 authorize/passwordAuthorize 的透传 state（Type B）语义不同。
      state = Buffer.from(JSON.stringify({
        app_code: app_code || "course",
        redirect_uri: redirectUri,
        invite_code: invite_code || "",
        channel_code: channel_code || "",
        app_type: appType,
        scope: scope || "",
      })).toString("base64url");

      // 构造 callbackUrl - 微信 OAuth 必须使用 HTTPS
      const forwardedHost = ctx.request.headers["x-forwarded-host"];
      const host = forwardedHost || ctx.request.host;
      const callbackUrl = `https://${host}/api/zhao-sso/v1/auth/wechat/callback`;
      // 验证 callbackUrl 域名是否与 SSO 服务域名一致（避免被 C 端域名劫持回调）
      // 微信回调必须回到 SSO 服务器（h.joho.cn），由 SSO 处理认证后再回跳 C 端
      const ssoHost = process.env.SSO_HOST || ctx.request.host;
      if (host !== ssoHost) {
        strapi.log.warn(`[zhao-sso] callbackUrl host 不匹配: ${host} != ${ssoHost}，微信回调将回 SSO 服务器`);
      }

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
      const { userId, isNew } = await wechatService.handleCallback(code, stateData.app_type);

      // 建立 sso 分销关系（用户邀请码 → sso_referral_relations / sso_invite_usages / use_count）
      // 注意：下方 syncUserInvite 仅同步渠道归属(zhao-channel)，sso 分销必须调用 buildReferralRelation
      if (stateData.invite_code) {
        try {
          const invRes = await strapi
            .plugin("zhao-sso")
            .service("sso-invite")
            .buildReferralRelation({
              inviteeId: userId,
              inviteCode: stateData.invite_code,
              appCode: stateData.app_code || "course",
              channelCode: stateData.channel_code,
            });
          if (invRes.skip) strapi.log.info(`[zhao-sso] 微信回调分销关系已存在，跳过: userId=${userId}`);
          else strapi.log.info(`[zhao-sso] 微信回调分销关系: ${invRes.message}`);
        } catch (ie: any) {
          strapi.log.warn(`[zhao-sso] 微信回调建立sso分销关系异常: ${ie.message}`);
        }
      }

      // 渠道归属同步（失败只 warn 不阻断）
      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, stateData.invite_code, stateData.channel_code);
        }
      } catch (ce: any) {
        strapi.log.warn(`[zhao-sso] 微信回调渠道同步失败: ${ce.message}`);
      }

      const appCode = stateData.app_code || "course";

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
        isNew,
      });

      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
    }
  },

  async passwordAuthorize(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    // state 语义（Type B）：标准 OAuth2 透传 state，原样回显，不解析（同 authorize）
    const { app_code, identifier, password, redirect_uri, state, invite_code, channel_code, scopes } = body;

    if (!app_code || !identifier || !password || !redirect_uri) {
      ctx.status = 400;
      ctx.body = { error: "app_code, identifier, password, redirect_uri 必填" };
      return;
    }

    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");

    try {
      // 1. 密码校验 + 邀请码分销双写
      const loginResult = await authService.login({
        type: "password",
        identifier,
        password,
        appCode: app_code,
        channelCode: channel_code,
        inviteCode: invite_code,
        ip: ctx.request.ip,
        userAgent: ctx.request.headers["user-agent"],
      });

      // 2. 校验 redirect_uri + 生成 OAuth code（含 invite_code 持久化）
      const code = await oauthService.generateAuthCode({
        userId: loginResult.user.id,
        appCode: app_code,
        redirectUri: redirect_uri,
        channelCode: channel_code,
        inviteCode: invite_code,
        scopes,
      });

      // 3. 返回 code（前端自行跳转 redirect_uri?code=xxx&state=xxx）
      ctx.body = { code, redirect_uri, state: state || "" };
    } catch (e: any) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
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

      // 校验 appCode 是否在 sso_apps 表中且启用，防止签发任意 app_code 的 JWT
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(appCode);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "app_not_found", error_description: "应用不存在或已禁用" };
        return;
      }

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId, isNew } = await wechatService.handleCallback(code, "mini_program");

      // 建立 sso 分销关系（用户邀请码 → sso_referral_relations / sso_invite_usages / use_count）
      if (inviteCode) {
        try {
          const invRes = await strapi
            .plugin("zhao-sso")
            .service("sso-invite")
            .buildReferralRelation({
              inviteeId: userId,
              inviteCode,
              appCode,
              channelCode,
            });
          if (invRes.skip) strapi.log.info(`[zhao-sso] 小程序登录分销关系已存在，跳过: userId=${userId}`);
          else strapi.log.info(`[zhao-sso] 小程序登录分销关系: ${invRes.message}`);
        } catch (ie: any) {
          strapi.log.warn(`[zhao-sso] 小程序登录建立sso分销关系异常: ${ie.message}`);
        }
      }

      // 渠道归属同步
      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, inviteCode, channelCode);
        }
      } catch (ce: any) {
        strapi.log.warn(`[zhao-sso] 小程序登录渠道同步失败: ${ce.message}`);
      }

      const authService = strapi.plugin("zhao-sso").service("sso-auth");
      const userService = strapi.plugin("zhao-sso").service("sso-user");
      const user = await userService.findById(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: "user_not_found", error_description: "用户不存在" };
        return;
      }

      // 与 token 接口保持一致：更新登录统计 + 记录登录日志
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
          success: true,
        });
      } catch (le: any) {
        strapi.log.warn(`[zhao-sso] 小程序登录日志写入失败: ${le.message}`);
      }

      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      ctx.body = { ...tokenPair, is_new: isNew };
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

      // 校验 appCode 是否在 sso_apps 表中且启用，防止签发任意 app_code 的 JWT
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(appCode);
      if (!app || !app.is_active) {
        ctx.status = 404;
        ctx.body = { error: "app_not_found", error_description: "应用不存在或已禁用" };
        return;
      }

      const wechatService = strapi.plugin("zhao-sso").service("sso-wechat");
      const { userId, isNew } = await wechatService.handleCallback(code, "app");

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

      // 与 token 接口保持一致：更新登录统计 + 记录登录日志
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
          success: true,
        });
      } catch (le: any) {
        strapi.log.warn(`[zhao-sso] App 登录日志写入失败: ${le.message}`);
      }

      const roles = await authService.getUserRoles(user.id, appCode);
      const tokenPair = await strapi.plugin("zhao-sso").service("sso-jwt").signTokenPair({
        sub: user.uuid,
        app_code: appCode,
        roles,
        channel: channelCode,
      });
      await authService.saveTokenRecord(user.id, appCode, tokenPair, channelCode);

      ctx.body = { ...tokenPair, is_new: isNew };
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
      const { app_code, channel_code, invite_code, redirect_uri } = ctx.query;
      if (!redirect_uri) { ctx.status = 400; ctx.body = { error: "redirect_uri 必填" }; return; }

      // 早期校验 app_code：避免后续 state 构造和支付宝请求都基于无效 app_code
      const oauthService = strapi.plugin("zhao-sso").service("sso-oauth");
      const app = await oauthService.findApp(app_code || "course");
      if (!app || !app.is_active) {
        ctx.status = 404; ctx.body = { error: "应用不存在或已禁用" }; return;
      }

      const alipayService = strapi.plugin("zhao-sso").service("sso-alipay");
      // state 语义（Type A）：base64url JSON 信封，同 wechatRedirect（字段较少，无 app_type/scope）
      const state = Buffer.from(JSON.stringify({
        app_code: app_code || "course",
        channel_code: channel_code || "",
        invite_code: invite_code || "",
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
      const { userId, isNew } = await alipayService.handleCallback(auth_code);
      const appCode = stateData.app_code || "course";

      // 建立分销关系（失败只 warn，不阻断登录，与微信路径保持一致）
      // 注意：channel-sync service 导出的是 { getSync() }，必须先调 getSync() 拿到实际服务
      if (stateData.invite_code) {
        try {
          const invRes = await strapi
            .plugin("zhao-sso")
            .service("sso-invite")
            .buildReferralRelation({
              inviteeId: userId,
              inviteCode: stateData.invite_code,
              appCode: stateData.app_code || "course",
              channelCode: stateData.channel_code,
            });
          if (invRes.skip) strapi.log.info(`[zhao-sso] alipay 分销关系已存在，跳过: userId=${userId}`);
          else strapi.log.info(`[zhao-sso] alipay 分销关系: ${invRes.message}`);
        } catch (ie: any) {
          strapi.log.warn(`[zhao-sso] alipay 建立sso分销关系异常: ${ie.message}`);
        }
      }

      try {
        const channelSync = strapi.plugin("zhao-sso").service("channel-sync").getSync();
        if (channelSync) {
          await channelSync.syncUserInvite(userId, stateData.invite_code || "", stateData.channel_code || "");
        }
      } catch (e: any) {
        strapi.log.warn(`[zhao-sso] alipay 渠道同步失败: ${e.message}`);
      }

      const authCode = await oauthService.generateAuthCode({
        userId,
        appCode,
        redirectUri,
        channelCode: stateData.channel_code,
        inviteCode: stateData.invite_code,
        isNew,
      });

      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}code=${authCode}&state=${state}`);
    } catch (e: any) {
      // 与 wechatCallback 保持一致：失败也 redirect 回业务方，由前端展示错误
      const separator = redirectUri.includes("?") ? "&" : "?";
      ctx.redirect(`${redirectUri}${separator}error=${encodeURIComponent(e.message)}`);
    }
  },
});

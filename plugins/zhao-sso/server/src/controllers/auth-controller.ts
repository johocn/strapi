import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async login(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { type, identifier, password, code, app_code, channel_code } = body;

    if (!type) { ctx.status = 400; ctx.body = { error: "type 必填" }; return; }
    if (!app_code) { ctx.status = 400; ctx.body = { error: "app_code 必填" }; return; }

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
        userAgent: ctx.request.headers["user-agent"],
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 401;
      ctx.body = { error: e.message };
    }
  },

  async sendSms(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { mobile, scene } = body;

    if (!mobile) { ctx.status = 400; ctx.body = { error: "mobile 必填" }; return; }

    const smsService = strapi.plugin("zhao-sso").service("sso-sms");
    try {
      const result = await smsService.sendCode(mobile, scene || "login", ctx.request.ip);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async register(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;

    if (!body.app_code) { ctx.status = 400; ctx.body = { error: "app_code 必填" }; return; }

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
        userAgent: ctx.request.headers["user-agent"],
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async verify(ctx: any) {
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
    } catch (e: any) {
      ctx.status = (e as any).status || 401;
      ctx.body = { valid: false, error: e.message };
    }
  },

  async refresh(ctx: any) {
    const body = ctx.request.body?.data || ctx.request.body;
    const { refresh_token } = body;
    if (!refresh_token) { ctx.status = 400; ctx.body = { error: "refresh_token 必填" }; return; }

    const authService = strapi.plugin("zhao-sso").service("sso-auth");
    try {
      const result = await authService.refreshToken(refresh_token);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 401;
      ctx.body = { error: e.message };
    }
  },

  async logout(ctx: any) {
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
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});

import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async authUrl(ctx: any) {
    try {
      const { platform, appType, redirectUrl, state } = ctx.request.body;

      if (!platform || !appType || !redirectUrl) {
        ctx.status = 400;
        ctx.body = { error: "请提供 platform, appType 和 redirectUrl" };
        return;
      }

      const siteDocId = ctx.state?.siteDocumentId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getAuthUrl(platform, appType, redirectUrl, siteDocId, state);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取授权URL失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async qrconnectUrl(ctx: any) {
    try {
      const { redirectUrl } = ctx.request.body;

      if (!redirectUrl) {
        ctx.status = 400;
        ctx.body = { error: "请提供 redirectUrl" };
        return;
      }

      const siteDocId = ctx.state?.siteDocumentId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getQrconnectUrl(redirectUrl, siteDocId);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取扫码登录URL失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async callback(ctx: any) {
    try {
      const { platform, appType, code, encryptedData, iv, inviteCode } = ctx.request.body;

      if (!platform || !appType || !code) {
        ctx.status = 400;
        ctx.body = { error: "请提供 platform, appType 和 code" };
        return;
      }

      const siteDocId = ctx.state?.siteDocumentId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.handleCallback({
        platform,
        appType,
        code,
        encryptedData,
        iv,
        inviteCode,
        siteId: siteDocId,
      });

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 三方登录回调失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async publicConfig(ctx: any) {
    try {
      const { platform, appType } = ctx.params;
      const siteDocId = ctx.state?.siteDocumentId;

      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getPublicConfig(platform, appType, siteDocId);

      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "未找到配置" };
        return;
      }

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取公开配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async updateProfile(ctx: any) {
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
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 更新三方资料失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async jssdkSignature(ctx: any) {
    try {
      const { url } = ctx.request.body;

      if (!url) {
        ctx.status = 400;
        ctx.body = { error: "请提供 url" };
        return;
      }

      const siteDocId = ctx.state?.siteDocumentId;
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      const result = await authService.getJssdkSignature(url, siteDocId);

      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取JS-SDK签名失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async wechatRedirectCallback(ctx: any) {
    try {
      const authService = strapi.plugin("zhao-third").service("third-party-auth");
      await authService.wechatRedirectCallback(ctx);
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 微信中转回调失败: ${error.message}`);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  },
});

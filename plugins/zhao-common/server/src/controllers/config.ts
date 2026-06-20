import type { Core } from "@strapi/strapi";

/**
 * 统一配置控制器
 * 提供所有配置的统一管理入口
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ========== 站点配置 ==========
  async getSite(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const siteConfig: any = await service.getSiteConfig() || {};
      const ec = siteConfig.extraConfig || {};

      // 合并返回：站点字段 + extraConfig 中的所有配置
      const data = {
        ...siteConfig,
        // 认证配置
        authMode: ec.authMode || "local",
        ssoEnabled: ec.ssoEnabled ?? false,
        ssoLoginUrl: ec.ssoLoginUrl || null,
        registerEnabled: ec.registerEnabled ?? true,
        inviteCodeRequired: ec.inviteCodeRequired ?? false,
        thirdPartyEnabled: ec.thirdPartyEnabled ?? false,
        wechatMiniProgramEnabled: ec.wechatMiniProgramEnabled ?? false,
        wechatOfficialAccountEnabled: ec.wechatOfficialAccountEnabled ?? false,
        alipayEnabled: ec.alipayEnabled ?? false,
        douyinEnabled: ec.douyinEnabled ?? false,
        // 功能开关
        pointsEnabled: ec.pointsEnabled ?? true,
        signInPoints: ec.signInPoints ?? 10,
        maxPointsPerDay: ec.maxPointsPerDay ?? 100,
        redemptionEnabled: ec.redemptionEnabled ?? false,
        coursePreviewEnabled: ec.coursePreviewEnabled ?? true,
        lessonProgressEnabled: ec.lessonProgressEnabled ?? true,
        courseEnrollEnabled: ec.courseEnrollEnabled ?? true,
        courseCommentEnabled: ec.courseCommentEnabled ?? false,
        courseRatingEnabled: ec.courseRatingEnabled ?? false,
        channelInviteEnabled: ec.channelInviteEnabled ?? true,
        allowCrossChannel: ec.allowCrossChannel ?? false,
        defaultChannelScope: ec.defaultChannelScope || "all",
        // 安全
        captchaEnabled: ec.captchaEnabled ?? false,
        rateLimitEnabled: ec.rateLimitEnabled ?? true,
        loginAttemptLimit: ec.loginAttemptLimit ?? 5,
        loginLockDuration: ec.loginLockDuration ?? 30,
        sessionTimeout: ec.sessionTimeout ?? 120,
        // 用户
        userAvatarRequired: ec.userAvatarRequired ?? false,
        userPhoneRequired: ec.userPhoneRequired ?? true,
        userEmailRequired: ec.userEmailRequired ?? false,
        // 支付/通知/维护
        paymentEnabled: ec.paymentEnabled ?? false,
        smsEnabled: ec.smsEnabled ?? false,
        emailEnabled: ec.emailEnabled ?? false,
        maintenanceMode: ec.maintenanceMode ?? false,
        debugMode: ec.debugMode ?? false,
      };

      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateSite(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");

      // site-config schema的字段（直接存到schema列）
      const SITE_FIELDS = new Set([
        "siteName", "siteDescription", "logo", "favicon", "icpNumber",
        "seoKeywords", "seoDescription", "tencentMapKey", "shareTitle",
        "shareDescription", "shareImage", "customerServiceUrl",
      ]);

      // 拆分数据
      const siteData: Record<string, any> = {};
      const extraData: Record<string, any> = {};
      for (const [key, value] of Object.entries(body)) {
        if (SITE_FIELDS.has(key)) {
          siteData[key] = value;
        } else {
          extraData[key] = value;
        }
      }

      // 读取当前 extraConfig，合并新值
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const currentConfig: any = await siteConfigService.getConfig();
      const mergedExtra = { ...(currentConfig?.extraConfig || {}), ...extraData };

      // 一次性保存：站点字段 + 合并后的 extraConfig
      const data = await service.updateSiteConfig({
        ...siteData,
        extraConfig: mergedExtra,
      });

      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== 三方配置 ==========
  async getThird(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getThirdPartyConfigs(ctx.query);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async getThirdOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getThirdPartyConfig(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async createThird(ctx: any) {
    try {
      const { data: body } = ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.createThirdPartyConfig(body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateThird(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const { data: body } = ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.updateThirdPartyConfig(documentId, body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async deleteThird(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.deleteThirdPartyConfig(documentId);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== 积分配置 ==========
  async getPoints(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getPointsConfig();
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updatePoints(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.updatePointsConfig(body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== OSS配置 ==========
  async getOss(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getOssConfig();
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateOss(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.updateOssConfig(body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== SSO应用 ==========
  async getSso(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getSsoApps(ctx.query);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async getSsoOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getSsoApp(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "SSO应用不存在" };
        return;
      }
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async createSso(ctx: any) {
    try {
      const { data: body } = ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.createSsoApp(body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateSso(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const { data: body } = ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.updateSsoApp(documentId, body);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async deleteSso(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.deleteSsoApp(documentId);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== 公开配置 ==========
  async getPublic(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getPublicConfig();
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },
});
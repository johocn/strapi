import type { Core } from "@strapi/strapi";

/**
 * 统一配置服务
 * 代理调用各插件的配置接口，提供统一的配置管理入口
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ========== 站点配置 ==========
  async getSiteConfig() {
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getConfig === "function") {
        return await service.getConfig();
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] getSiteConfig failed:", (error as Error).message);
      return null;
    }
  },

  async updateSiteConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.updateConfig === "function") {
        return await service.updateConfig(data);
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] updateSiteConfig failed:", (error as Error).message);
      return null;
    }
  },

  // ========== 三方配置（插件不存在时返回空） ==========
  async getThirdPartyConfigs(filters: Record<string, any> = {}) {
    try {
      const results = await strapi.documents("plugin::zhao-third.third-party-config").findMany({
        filters,
        populate: "*",
      });
      return results;
    } catch (error) {
      strapi.log.warn("[config] getThirdPartyConfigs: plugin not available");
      return [];
    }
  },

  async getThirdPartyConfig(documentId: string) {
    try {
      return await strapi.documents("plugin::zhao-third.third-party-config").findOne({ documentId });
    } catch (error) {
      strapi.log.warn("[config] getThirdPartyConfig: plugin not available");
      return null;
    }
  },

  async createThirdPartyConfig(data: any) {
    try {
      return await strapi.documents("plugin::zhao-third.third-party-config").create({ data });
    } catch (error) {
      strapi.log.warn("[config] createThirdPartyConfig: plugin not available");
      return null;
    }
  },

  async updateThirdPartyConfig(documentId: string, data: any) {
    try {
      return await strapi.documents("plugin::zhao-third.third-party-config").update({ documentId, data });
    } catch (error) {
      strapi.log.warn("[config] updateThirdPartyConfig: plugin not available");
      return null;
    }
  },

  async deleteThirdPartyConfig(documentId: string) {
    try {
      return await strapi.documents("plugin::zhao-third.third-party-config").delete({ documentId });
    } catch (error) {
      strapi.log.warn("[config] deleteThirdPartyConfig: plugin not available");
      return null;
    }
  },

  // ========== 积分配置 ==========
  async getPointsConfig() {
    try {
      const service = strapi.plugin("zhao-point")?.service("config-service");
      if (service && typeof service.getConfig === "function") {
        return await service.getConfig();
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] getPointsConfig failed:", (error as Error).message);
      return null;
    }
  },

  async updatePointsConfig(data: any) {
    try {
      const service = strapi.plugin("zhao-point")?.service("config-service");
      if (service && typeof service.updateConfig === "function") {
        return await service.updateConfig(data);
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] updatePointsConfig failed:", (error as Error).message);
      return null;
    }
  },

  // ========== OSS配置 ==========
  async getOssConfig() {
    try {
      const service = strapi.plugin("zhao-oss")?.service("provider-registry");
      if (service) {
        const activeProviders = service.getActiveProviders();
        const primaryProvider = service.getPrimaryProvider();
        return {
          activeProviders,
          primaryProvider: primaryProvider ? activeProviders[0] : null,
          providerTypes: service.getProviderTypes(),
        };
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] getOssConfig failed:", (error as Error).message);
      return null;
    }
  },

  async updateOssConfig(data: any) {
    // OSS配置通过插件配置文件管理，此方法预留
    strapi.log.warn("[config] updateOssConfig: OSS config managed via plugin config file");
    return null;
  },

  // ========== SSO应用（插件不存在时返回空） ==========
  async getSsoApps(filters: Record<string, any> = {}) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").findMany({
        filters,
        populate: "*",
      });
    } catch (error) {
      strapi.log.warn("[config] getSsoApps: plugin not available");
      return [];
    }
  },

  async getSsoApp(documentId: string) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").findOne({ documentId });
    } catch (error) {
      strapi.log.warn("[config] getSsoApp: plugin not available");
      return null;
    }
  },

  async createSsoApp(data: any) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").create({ data });
    } catch (error) {
      strapi.log.warn("[config] createSsoApp: plugin not available");
      return null;
    }
  },

  async updateSsoApp(documentId: string, data: any) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").update({ documentId, data });
    } catch (error) {
      strapi.log.warn("[config] updateSsoApp: plugin not available");
      return null;
    }
  },

  async deleteSsoApp(documentId: string) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").delete({ documentId });
    } catch (error) {
      strapi.log.warn("[config] deleteSsoApp: plugin not available");
      return null;
    }
  },

  // ========== 公开配置（只返回非敏感字段，统一从 extraConfig 读取） ==========
  async getPublicConfig() {
    const result: Record<string, any> = {};

    // 站点配置公开字段
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getPublicConfig === "function") {
        result.site = await service.getPublicConfig();
      }
    } catch (error) {
      strapi.log.warn("[config] getPublicConfig site failed:", (error as Error).message);
    }

    // 从 extraConfig 统一读取所有配置
    try {
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      if (siteConfigService) {
        const fullConfig: any = await siteConfigService.getConfig();
        const ec = fullConfig?.extraConfig || {};

        // 认证配置
        result.auth = {
          mode: ec.authMode || "local",
          methods: ["password", "sms"],
          wechatEnabled: ec.thirdPartyEnabled ?? ec.wechatMiniProgramEnabled ?? false,
          thirdPartyEnabled: ec.thirdPartyEnabled ?? false,
          ssoEnabled: ec.ssoEnabled ?? false,
          ssoLoginUrl: ec.ssoLoginUrl || null,
          registerEnabled: ec.registerEnabled ?? true,
          inviteCodeRequired: ec.inviteCodeRequired ?? false,
        };

        // 功能开关
        result.featureFlags = {
          pointsEnabled: ec.pointsEnabled ?? true,
          coursePreviewEnabled: ec.coursePreviewEnabled ?? true,
          lessonProgressEnabled: ec.lessonProgressEnabled ?? true,
          courseEnrollEnabled: ec.courseEnrollEnabled ?? true,
          channelInviteEnabled: ec.channelInviteEnabled ?? true,
          allowCrossChannel: ec.allowCrossChannel ?? false,
          redemptionEnabled: ec.redemptionEnabled ?? false,
          courseCommentEnabled: ec.courseCommentEnabled ?? false,
          courseRatingEnabled: ec.courseRatingEnabled ?? false,
          paymentEnabled: ec.paymentEnabled ?? false,
          smsEnabled: ec.smsEnabled ?? false,
          emailEnabled: ec.emailEnabled ?? false,
          captchaEnabled: ec.captchaEnabled ?? false,
          rateLimitEnabled: ec.rateLimitEnabled ?? true,
          maintenanceMode: ec.maintenanceMode ?? false,
          debugMode: ec.debugMode ?? false,
        };

        // 积分配置
        result.points = {
          moduleEnabled: ec.pointsEnabled ?? true,
          earnEnabled: true,
          redeemEnabled: ec.redemptionEnabled ?? false,
          signInEnabled: true,
          tasksEnabled: true,
          signInPoints: ec.signInPoints ?? 10,
          maxPointsPerDay: ec.maxPointsPerDay ?? 100,
        };
      }
    } catch (error) {
      strapi.log.warn("[config] getPublicConfig extraConfig failed:", (error as Error).message);
    }

    return result;
  },
});
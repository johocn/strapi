import type { Core } from "@strapi/strapi";

/**
 * 统一配置服务
 * 代理调用各插件的配置接口，提供统一的配置管理入口
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ========== 站点配置 ==========
  async getSiteConfig(siteId?: string) {
    try {
      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service && typeof service.getConfig === "function") {
        const siteConfig = await service.getConfig(siteId);
        // 合并模板预设值
        if (siteConfig) {
          const templateService = strapi.plugin("zhao-common")?.service("site-template");
          if (templateService && typeof templateService.getMergedConfig === "function") {
            const { config, meta } = await templateService.getMergedConfig(siteConfig);
            return {
              ...siteConfig,
              extraConfig: config,
              _meta: meta,
            };
          }
        }
        return siteConfig;
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] getSiteConfig failed:", (error as Error).message);
      return null;
    }
  },

  async updateSiteConfig(data: any, siteId?: string) {
    try {
      // 约束校验已移至 controller 层（对 extraData 校验，而非整个 data）

      const service = strapi.plugin("zhao-common")?.service("site-config");
      if (service) {
        if (data.documentId) {
          const { documentId, ...updateData } = data;
          if (typeof service.updateConfig === "function") {
            return await service.updateConfig(documentId, updateData);
          }
        } else {
          // 无 documentId，先查当前配置再更新
          const currentConfig: any = await service.getConfig(siteId);
          if (currentConfig?.documentId && typeof service.updateConfig === "function") {
            return await service.updateConfig(currentConfig.documentId, data);
          }
          if (typeof service.createConfig === "function") {
            return await service.createConfig(data);
          }
        }
      }
      return null;
    } catch (error) {
      strapi.log.warn("[config] updateSiteConfig failed:", (error as Error).message);
      throw error;
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
  async getPublicConfig(siteId?: string) {
    const result: Record<string, any> = {};

    try {
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const templateService = strapi.plugin("zhao-common")?.service("site-template");
      if (!siteConfigService) return result;

      // 一次查询获取完整站点配置
      const fullConfig: any = await siteConfigService.getConfig(siteId);

      // 站点公开字段
      const PUBLIC_FIELDS = [
        "siteName", "siteDescription", "seoKeywords", "seoDescription",
        "tencentMapKey", "shareTitle", "shareDescription", "icpNumber",
        "customerServiceUrl", "domain",
      ];
      const DEFAULT_CONFIG: Record<string, string> = {
        siteName: "", siteDescription: "", seoKeywords: "", seoDescription: "",
        tencentMapKey: "", shareTitle: "", shareDescription: "", icpNumber: "",
        customerServiceUrl: "", domain: "",
      };
      const sitePublic: Record<string, any> = {};
      for (const key of PUBLIC_FIELDS) {
        sitePublic[key] = fullConfig?.[key] ?? DEFAULT_CONFIG[key];
      }
      if (fullConfig?.logo) sitePublic.logo = fullConfig.logo;
      if (fullConfig?.favicon) sitePublic.favicon = fullConfig.favicon;
      if (fullConfig?.shareImage) sitePublic.shareImage = fullConfig.shareImage;
      result.site = sitePublic;

      // 合并模板预设值
      let ec: Record<string, any> = fullConfig?.extraConfig ?? {};
      if (templateService && typeof templateService.getMergedConfig === "function" && fullConfig) {
        const { config } = await templateService.getMergedConfig(fullConfig);
        ec = config ?? {};
      }

      // sharePath 在 extraConfig 中，合并后写入 site
      sitePublic.sharePath = ec.sharePath ?? "/pages/index/index";

      // 认证配置
      const authMode = ec.authMode ?? "local";
      const methods: string[] = ["password", "sms"];
      if (authMode === "third" || ec.thirdPartyEnabled || ec.wechatMiniProgramEnabled) {
        methods.push("wechat");
      }
      if (authMode === "sso" || ec.ssoEnabled) {
        methods.push("sso");
      }
      result.auth = {
        mode: authMode,
        methods,
        wechatEnabled: ec.thirdPartyEnabled ?? ec.wechatMiniProgramEnabled ?? false,
        thirdPartyEnabled: ec.thirdPartyEnabled ?? false,
        ssoEnabled: ec.ssoEnabled ?? false,
        ssoLoginUrl: ec.ssoLoginUrl ?? null,
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
        redemptionEnabled: ec.redemptionEnabled ?? true,
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
        redeemEnabled: ec.redemptionEnabled ?? true,
        signInEnabled: true,
        tasksEnabled: true,
        signInPoints: ec.signInPoints ?? 10,
        maxPointsPerDay: ec.maxPointsPerDay ?? 0,
      };
    } catch (error) {
      strapi.log.warn("[config] getPublicConfig failed:", (error as Error).message);
    }

    return result;
  },
});
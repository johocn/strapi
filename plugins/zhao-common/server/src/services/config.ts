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

  async getSiteConfigList(params: any = {}) {
    try {
      const { page = 1, pageSize = 20, filters = {}, sort } = params;
      const query: any = {
        filters,
        populate: ["channels", "template"],
      };
      if (sort) query.sort = sort;
      if (page && pageSize) {
        const [results, total] = await Promise.all([
          strapi.documents("plugin::zhao-common.site-config").findMany({
            ...query,
            page,
            pageSize,
          }),
          strapi.documents("plugin::zhao-common.site-config").count({ filters }),
        ]);
        return { results, pagination: { page, pageSize, total } };
      }
      const results = await strapi.documents("plugin::zhao-common.site-config").findMany(query);
      return { results, pagination: null };
    } catch (error) {
      strapi.log.warn("[config] getSiteConfigList failed:", (error as Error).message);
      return { results: [], pagination: null };
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
        populate: [],
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
          primaryProvider: primaryProvider ?? activeProviders[0] ?? null,
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
    const e: any = new Error("OSS配置更新功能未实现");
    e.status = 501;
    throw e;
  },

  // ========== SSO应用（插件不存在时返回空） ==========
  async getSsoApps(filters: Record<string, any> = {}) {
    try {
      return await strapi.documents("plugin::zhao-sso.sso-app").findMany({
        filters,
        populate: [],
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
  async getPublicConfig(siteId?: string, channelId?: string | number) {
    const result: Record<string, any> = {};

    try {
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const templateService = strapi.plugin("zhao-common")?.service("site-template");
      if (!siteConfigService) return result;

      // 一次查询获取完整站点配置
      const fullConfig: any = await siteConfigService.getConfig(siteId);

      // siteId 为 null（域名未匹配）时返回完整默认配置
      if (!fullConfig) {
        return {
          site: {
            siteName: "", siteDescription: "", logo: "", favicon: "",
            shareTitle: "", shareDescription: "", shareImage: "",
            sharePath: "/pages/index/index", domain: "",
          },
          auth: {
            mode: "local",
            methods: ["password", "sms"],
            thirdPartyEnabled: false,
            ssoEnabled: false,
            ssoLoginUrl: null,
            registerEnabled: true,
            inviteCodeRequired: false,
          },
          featureFlags: {
            sso: false, points: true, quiz: true, course: true,
            channel: true, thirdParty: true, oss: false,
            pointsEnabled: true, coursePreviewEnabled: true,
            lessonProgressEnabled: true, courseEnrollEnabled: true,
            channelInviteEnabled: true, allowCrossChannel: false,
            redemptionEnabled: true, courseCommentEnabled: false,
            courseRatingEnabled: false, paymentEnabled: false,
          },
          points: {
            moduleEnabled: true, earnEnabled: true, redeemEnabled: true,
            signInEnabled: true, tasksEnabled: true,
            signInPoints: 10, maxPointsPerDay: 0,
          },
          theme: {
            primaryColor: "#667eea", secondaryColor: "#f0f2f5",
            navStyle: "default", cardStyle: "default",
            tabBarColor: "#667eea", tabBarActiveColor: "#ffffff",
          },
        };
      }

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
      let ec: Record<string, any> = {};
      const rawEc = fullConfig?.extraConfig;
      if (rawEc && typeof rawEc === "object" && !Array.isArray(rawEc)) {
        ec = rawEc as Record<string, any>;
      } else if (typeof rawEc === "string" && rawEc.trim()) {
        try { ec = JSON.parse(rawEc); } catch { ec = {}; }
      }
      // 历史数据兼容：若 ec 自身又嵌套了 extraConfig 字段（旧保存逻辑 bug），提取内层
      if (ec.extraConfig && typeof ec.extraConfig === "object" && !Array.isArray(ec.extraConfig)) {
        ec = { ...ec, ...ec.extraConfig };
        delete ec.extraConfig;
      } else if (typeof ec.extraConfig === "string" && ec.extraConfig.trim()) {
        try {
          const inner = JSON.parse(ec.extraConfig);
          ec = { ...ec, ...inner };
          delete ec.extraConfig;
        } catch { /* ignore */ }
      }
      if (templateService && typeof templateService.getMergedConfig === "function" && fullConfig) {
        const { config } = await templateService.getMergedConfig(fullConfig);
        ec = config ?? {};
      }

      // 渠道级 extraConfig 覆盖（浅合并）
      if (channelId != null) {
        try {
          const isNumericId = typeof channelId === "number" || (typeof channelId === "string" && /^\d+$/.test(channelId));
          const channel = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: isNumericId ? { id: Number(channelId) } : { documentId: channelId },
            select: ["extraConfig"],
          });
          if (channel?.extraConfig) {
            let channelEc: Record<string, any> = {};
            if (typeof channel.extraConfig === "string") {
              try { channelEc = JSON.parse(channel.extraConfig); } catch { /* ignore */ }
            } else if (typeof channel.extraConfig === "object") {
              channelEc = channel.extraConfig;
            }
            ec = { ...ec, ...channelEc };
          }
        } catch (e) {
          strapi.log.warn("[config] channel extraConfig merge failed:", (e as Error).message);
        }
      }

      // sharePath 在 extraConfig 中，合并后写入 site
      sitePublic.sharePath = ec.sharePath ?? "/pages/index/index";

      // 认证配置
      const authMode = ec.authMode ?? "local";
      // 细分开关（任一 true 即视为启用三方登录）
      const wechatOfficialAccountEnabled = ec.wechatOfficialAccountEnabled === true;
      const wechatMiniProgramEnabled = ec.wechatMiniProgramEnabled === true;
      const wechatOpenPlatformEnabled = ec.wechatOpenPlatformEnabled === true;
      const alipayEnabled = ec.alipayEnabled === true;
      const douyinEnabled = ec.douyinEnabled === true;
      const thirdPartyEnabled =
        wechatOfficialAccountEnabled ||
        wechatMiniProgramEnabled ||
        wechatOpenPlatformEnabled ||
        alipayEnabled ||
        douyinEnabled;

      const methods: string[] = ["password", "sms"];
      if (authMode === "third" || thirdPartyEnabled) {
        methods.push("wechat");
      }
      if (authMode === "sso" || ec.ssoEnabled) {
        methods.push("sso");
      }
      result.auth = {
        mode: authMode,
        methods,
        wechatOfficialAccountEnabled,
        wechatMiniProgramEnabled,
        wechatOpenPlatformEnabled,
        alipayEnabled,
        douyinEnabled,
        thirdPartyEnabled,
        ssoEnabled: ec.ssoEnabled ?? false,
        ssoLoginUrl: ec.ssoLoginUrl ?? null,
        registerEnabled: ec.registerEnabled ?? false,
        inviteCodeRequired: ec.inviteCodeRequired ?? false,
      };

      // 功能开关（粗粒度模块总开关 + 细粒度）
      const siteFeatureFlags = fullConfig?.featureFlags || {};
      result.featureFlags = {
        // 粗粒度模块总开关（从 site-config.featureFlags 列读取）
        sso: siteFeatureFlags.sso ?? false,
        points: siteFeatureFlags.points ?? true,
        quiz: siteFeatureFlags.quiz ?? true,
        course: siteFeatureFlags.course ?? true,
        channel: siteFeatureFlags.channel ?? true,
        thirdParty: siteFeatureFlags.thirdParty ?? true,
        oss: siteFeatureFlags.oss ?? false,
        // 细粒度开关（从 extraConfig 合并后的 ec 读取）
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
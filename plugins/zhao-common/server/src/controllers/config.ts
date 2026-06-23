import type { Core } from "@strapi/strapi";

/**
 * 统一配置控制器
 * 提供所有配置的统一管理入口
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ========== 站点配置 ==========
  async getSite(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      if (!siteId) {
        ctx.status = 400;
        ctx.body = { error: "缺少站点标识" };
        return;
      }
      const service = strapi.plugin("zhao-common").service("config");
      const siteConfig: any = await service.getSiteConfig(siteId);
      if (!siteConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const ec = siteConfig.extraConfig ?? {};

      // 合并返回：站点字段（排除 extraConfig 嵌套） + extraConfig 展平到顶层 + _meta
      const { extraConfig, _meta, ...siteFields } = siteConfig;
      // 过滤 ec 中与 siteFields 同名的 key，防止 schema 列字段被 extraConfig 覆盖
      const safeEc: Record<string, any> = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        // 以下字段提供默认值（ec 中缺失时兜底）
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        // 将 _meta 嵌入 data 中，避免被 extractItem 丢弃
        _meta: _meta ?? null,
      };

      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async updateSite(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      if (!siteId) {
        ctx.status = 400;
        ctx.body = { error: "缺少站点标识" };
        return;
      }
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");

      // site-config schema的字段（直接存到schema列）
      const SITE_FIELDS = new Set([
        "siteName", "siteDescription", "logo", "favicon", "icpNumber",
        "seoKeywords", "seoDescription", "tencentMapKey", "shareTitle",
        "shareDescription", "shareImage", "customerServiceUrl",
      ]);

      // schema 列字段中允许设为 null 的（media 关系字段，null 表示移除关联）
      const NULLABLE_SITE_FIELDS = new Set([
        "logo", "favicon", "shareImage",
      ]);

      // 禁止写入 extraConfig 的字段（schema 关系字段和系统字段）
      const BLOCKED_FIELDS = new Set([
        "template", "domain", "channel", "documentId",
        "createdAt", "updatedAt", "createdBy", "updatedBy", "publishedAt",
        "_meta",
      ]);

      // 拆分数据
      const siteData: Record<string, any> = {};
      const extraData: Record<string, any> = {};
      const deleteKeys: string[] = []; // 值为 null 的字段表示删除
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue; // 丢弃禁止字段
        if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue; // 非媒体字段不允许设 null
          siteData[key] = value;
        } else if (value === null) {
          // null 表示删除此字段
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }

      // 模板约束校验：校验 extraData 和 siteData 中的配置项
      const templateService = strapi.plugin("zhao-common")?.service("site-template");
      if (templateService && typeof templateService.validateUpdate === "function") {
        const validation = await templateService.validateUpdate(siteId, { ...extraData, ...siteData });
        if (!validation.valid) {
          const e: any = new Error(validation.message);
          e.status = 403;
          e.deniedFields = validation.deniedFields;
          throw e;
        }
      }

      // 读取当前 extraConfig，合并新值
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const currentConfig: any = await siteConfigService.getConfig(siteId);
      if (!currentConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const safeCurrentExtra = (currentConfig?.extraConfig && typeof currentConfig.extraConfig === "object" && !Array.isArray(currentConfig.extraConfig))
        ? currentConfig.extraConfig : {};
      const mergedExtra = { ...safeCurrentExtra, ...extraData };
      // 删除标记为 null 的字段
      for (const key of deleteKeys) {
        delete mergedExtra[key];
      }

      // 差异存储：剔除与模板预设值相同的字段，只保留租户覆盖值
      if (templateService && typeof templateService.getTemplate === "function" && currentConfig) {
        const templateId = currentConfig.template?.documentId ?? currentConfig.template;
        if (templateId) {
          const template: any = await templateService.getTemplate(templateId);
          const presetConfig = template?.presetConfig;
          if (presetConfig && typeof presetConfig === "object" && !Array.isArray(presetConfig) && template?.enabled !== false) {
            for (const key of Object.keys(mergedExtra)) {
              if (key in presetConfig && mergedExtra[key] === presetConfig[key]) {
                delete mergedExtra[key];
              }
            }
          }
        }
      }

      // 一次性保存：站点字段 + 合并后的 extraConfig（仅租户差异值）
      const saved = await service.updateSiteConfig({
        ...siteData,
        extraConfig: mergedExtra,
        ...(currentConfig?.documentId ? { documentId: currentConfig.documentId } : {}),
      }, siteId);

      // 返回展平格式（与 getSite 一致，需合并模板预设值）
      const savedSiteConfig: any = await service.getSiteConfig(siteId);
      const fullEc = savedSiteConfig?.extraConfig ?? {};
      const { extraConfig: _ec, _meta: _m, ...savedFields } = savedSiteConfig ?? {};
      // 过滤 fullEc 中与 savedFields 同名的 key，防止 schema 列字段被覆盖
      const safeFullEc: Record<string, any> = {};
      for (const [key, value] of Object.entries(fullEc)) {
        if (!(key in savedFields)) {
          safeFullEc[key] = value;
        }
      }
      const data = {
        ...savedFields,
        ...safeFullEc,
        authMode: fullEc.authMode ?? "local",
        defaultChannelScope: fullEc.defaultChannelScope ?? "all",
        _meta: _m ?? null,
      };

      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message, deniedFields: error.deniedFields };
    }
  },

  // ========== 三方配置 ==========
  async getThird(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getThirdPartyConfigs(ctx.query);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
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
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== 公开配置 ==========
  async getPublic(ctx: any) {
    try {
      const siteId = ctx.state?.siteId;
      const service = strapi.plugin("zhao-common").service("config");
      const data = await service.getPublicConfig(siteId);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
});
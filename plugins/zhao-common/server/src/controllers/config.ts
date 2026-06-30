import type { Core } from "@strapi/strapi";

/**
 * 统一配置控制器
 * 提供所有配置的统一管理入口
 */

// 获取 channel-scope 服务的通用工具
function getChannelScopeService(strapi: Core.Strapi) {
  return strapi.plugin("zhao-auth")?.service("channel-scope");
}

// third-party-config 通过 site.channels 间接关联渠道
// list 过滤：构造 site.channels.id $in 条件
function buildThirdPartySiteFilter(strapi: Core.Strapi, ctx: any): Record<string, any> | null {
  const scope = ctx.state?.channelScope;
  const svc = getChannelScopeService(strapi);
  if (!svc) return null;
  // 复用通用工具构造 channels 过滤，再包一层 site
  const channelFilter = svc.buildChannelFilter(scope, "channels");
  if (!channelFilter) return null;
  return { site: channelFilter };
}

// third-party-config detail 校验：查 site.channels，用通用工具校验
async function assertThirdPartyInScope(strapi: Core.Strapi, ctx: any, record: any) {
  const scope = ctx.state?.channelScope;
  if (!scope || scope.all) return;
  if (!record?.site) return; // 无 site 关联的旧数据放行
  // 查询该 third-party-config 关联的 site 的 channels
  const site = await strapi
    .documents("plugin::zhao-common.site-config")
    .findOne({ documentId: record.site.documentId, populate: ["channels"] });
  if (!site) return; // site 不存在，放行
  // 用通用工具校验 site 记录的 channels 字段
  const svc = getChannelScopeService(strapi);
  if (svc?.assertRecordInScope) {
    svc.assertRecordInScope(scope, site, "channels");
  }
}

// 校验前端传入的 channels（documentId 数组）是否全部在用户 channelScope 内
// admin（scope.all === true）：不校验；非 admin：必选且每个 channel.id 必须在 scope.channelIds 内
async function validateChannelsAgainstScope(strapi: Core.Strapi, channelDocumentIds: any[], scope: any): Promise<void> {
  if (!scope || scope.all === true) return;
  if (channelDocumentIds.length === 0) {
    const e: any = new Error("请选择至少一个渠道");
    e.status = 400;
    throw e;
  }
  const allowedIds: number[] = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  if (allowedIds.length === 0) {
    const e: any = new Error("您没有任何渠道权限，无法创建租户");
    e.status = 400;
    throw e;
  }
  const selected = await strapi.db.query("plugin::zhao-channel.channel").findMany({
    where: { documentId: { $in: channelDocumentIds } },
    select: ["id", "documentId", "name"],
  });
  const invalid = (selected as any[]).find((ch) => !allowedIds.includes(ch.id));
  if (invalid) {
    const e: any = new Error(`无权操作渠道 ${invalid.name || invalid.documentId}`);
    e.status = 400;
    throw e;
  }
}

// 同步 site-config 与 channel 的 manyToMany 关联（直接写中间表）
// 背景：Strapi v5 Document Service 的 { set: [...] } 对 inverse side (mappedBy) 不生效，
// site-config.channels 是 inverse side，故绕过 Document Service 用 knex 直接写中间表。
async function syncChannelsForSite(strapi: Core.Strapi, siteConfigDocumentId: string, channelDocumentIds: any[]): Promise<void> {
  const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
    where: { documentId: siteConfigDocumentId },
    select: ["id"],
  });
  if (!siteConfig) return;

  // 查 channel id（channelDocumentIds 元素可能是 documentId 字符串或 id 数字）
  let channelIds: number[] = [];
  if (channelDocumentIds.length > 0) {
    // 分离数字 id 和字符串 documentId
    const numericIds: number[] = [];
    const docIds: string[] = [];
    for (const v of channelDocumentIds) {
      if (typeof v === "number" || /^\d+$/.test(String(v))) {
        numericIds.push(Number(v));
      } else {
        docIds.push(String(v));
      }
    }

    // 按 id 查
    if (numericIds.length > 0) {
      const byId = await strapi.db.query("plugin::zhao-channel.channel").findMany({
        where: { id: { $in: numericIds } },
        select: ["id"],
      });
      channelIds.push(...(byId as any[]).map((c) => c.id));
    }
    // 按 documentId 查
    if (docIds.length > 0) {
      const byDoc = await strapi.db.query("plugin::zhao-channel.channel").findMany({
        where: { documentId: { $in: docIds } },
        select: ["id"],
      });
      channelIds.push(...(byDoc as any[]).map((c) => c.id));
    }
    // 去重
    channelIds = Array.from(new Set(channelIds));
  }

  // 先删后插（事务保证一致性）
  const knex = strapi.db.connection;
  await knex.transaction(async (trx: any) => {
    await trx("zhao_channels_sites_lnk").where("site_config_id", siteConfig.id).del();
    if (channelIds.length > 0) {
      const rows = channelIds.map((cid: number) => ({ channel_id: cid, site_config_id: siteConfig.id }));
      await trx("zhao_channels_sites_lnk").insert(rows);
    }
  });
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ========== 站点配置 ==========
  async getSiteList(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const { page, pageSize, filters, sort } = ctx.query || {};
      const result = await service.getSiteConfigList({
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        filters,
        sort,
      });
      ctx.body = {
        data: result.results,
        meta: result.pagination || undefined,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

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

      const { extraConfig, _meta, ...siteFields } = siteConfig;
      const safeEc: Record<string, any> = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null,
      };

      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async getSiteOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("config");
      const siteConfig: any = await service.getSiteConfig(documentId);
      if (!siteConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const ec = siteConfig.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig;
      const safeEc: Record<string, any> = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null,
      };
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { error: error.message };
    }
  },

  async createSite(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      if (!siteConfigService || typeof siteConfigService.createConfig !== "function") {
        ctx.status = 500;
        ctx.body = { error: "站点配置服务不可用" };
        return;
      }

      // 拆分 schema 字段与 extraConfig
      const SITE_FIELDS = new Set([
        "siteName", "siteDescription", "logo", "favicon", "icpNumber",
        "seoKeywords", "seoDescription", "tencentMapKey", "shareTitle",
        "shareDescription", "shareImage", "customerServiceUrl",
        "featureFlags", "domain", "template",
      ]);
      const RELATION_FIELDS = new Set([]);
      const CHANNELS_FIELD = "channels";
      const BLOCKED_FIELDS = new Set([
        "documentId", "createdAt", "updatedAt", "createdBy", "updatedBy",
        "publishedAt", "_meta",
      ]);

      const siteData: Record<string, any> = {};
      const extraData: Record<string, any> = {};
      let channelIds: any[] = [];
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD && Array.isArray(value)) {
          channelIds = value.map((ch: any) =>
            typeof ch === "object" ? (ch.documentId || ch.id) : ch
          );
        } else if (SITE_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else {
          extraData[key] = value;
        }
      }

      await validateChannelsAgainstScope(strapi, channelIds, ctx.state?.channelScope);

      if (Object.keys(extraData).length > 0) {
        siteData.extraConfig = extraData;
      }

      const saved = await siteConfigService.createConfig(siteData);
      if (!saved) {
        ctx.status = 500;
        ctx.body = { error: "创建站点配置失败" };
        return;
      }

      // manyToMany: 直接写中间表（Strapi v5 set 语法对 inverse side 不生效）
      if (saved?.documentId) {
        await syncChannelsForSite(strapi, saved.documentId, channelIds);
      }
      if (!saved) {
        ctx.status = 500;
        ctx.body = { error: "创建站点配置失败" };
        return;
      }
      // 获取完整配置（含模板合并）
      const configService = strapi.plugin("zhao-common").service("config");
      const siteConfig: any = await configService.getSiteConfig(saved.documentId);
      const ec = siteConfig?.extraConfig ?? {};
      const { extraConfig, _meta, ...siteFields } = siteConfig ?? {};
      const safeEc: Record<string, any> = {};
      for (const [key, value] of Object.entries(ec)) {
        if (!(key in siteFields)) {
          safeEc[key] = value;
        }
      }
      const data = {
        ...siteFields,
        ...safeEc,
        documentId: saved.documentId,  // 确保 documentId 被返回
        authMode: ec.authMode ?? "local",
        defaultChannelScope: ec.defaultChannelScope ?? "all",
        _meta: _meta ?? null,
      };
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
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

      const SITE_FIELDS = new Set([
        "siteName", "siteDescription", "logo", "favicon", "icpNumber",
        "seoKeywords", "seoDescription", "tencentMapKey", "shareTitle",
        "shareDescription", "shareImage", "customerServiceUrl",
        "featureFlags", "domain", "template",
      ]);
      const RELATION_FIELDS = new Set([]);
      const CHANNELS_FIELD = "channels";

      const NULLABLE_SITE_FIELDS = new Set([
        "logo", "favicon", "shareImage",
      ]);

      const BLOCKED_FIELDS = new Set([
        "documentId",
        "createdAt", "updatedAt", "createdBy", "updatedBy", "publishedAt",
        "_meta",
      ]);

      const siteData: Record<string, any> = {};
      const extraData: Record<string, any> = {};
      const deleteKeys: string[] = [];
      let channelIds: any[] = [];
      let channelsTouched = false;
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }

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
      for (const key of deleteKeys) {
        delete mergedExtra[key];
      }

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

      const saveData: Record<string, any> = {
        ...siteData,
        extraConfig: mergedExtra,
        ...(currentConfig?.documentId ? { documentId: currentConfig.documentId } : {}),
      };
      const saved = await service.updateSiteConfig(saveData, siteId);

      // manyToMany: 直接写中间表（Strapi v5 set 语法对 inverse side 不生效）
      // 仅当前端显式传 channels 字段时才同步（空数组会清空关联）
      if (channelsTouched && saved?.documentId) {
        try {
          await syncChannelsForSite(strapi, saved.documentId, channelIds);
        } catch (e: any) {
          strapi.log.warn(`[config] 更新渠道关联失败: ${e.message}`);
        }
      }

      const savedSiteConfig: any = await service.getSiteConfig(siteId);
      const fullEc = savedSiteConfig?.extraConfig ?? {};
      const { extraConfig: _ec, _meta: _m, ...savedFields } = savedSiteConfig ?? {};
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

  async updateSiteById(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("config");

      const SITE_FIELDS = new Set([
        "siteName", "siteDescription", "logo", "favicon", "icpNumber",
        "seoKeywords", "seoDescription", "tencentMapKey", "shareTitle",
        "shareDescription", "shareImage", "customerServiceUrl",
        "featureFlags", "domain", "template",
      ]);
      const RELATION_FIELDS = new Set([]);
      const CHANNELS_FIELD = "channels";
      const NULLABLE_SITE_FIELDS = new Set(["logo", "favicon", "shareImage"]);
      const BLOCKED_FIELDS = new Set([
        "documentId",
        "createdAt", "updatedAt", "createdBy", "updatedBy", "publishedAt",
        "_meta",
      ]);

      const siteData: Record<string, any> = {};
      const extraData: Record<string, any> = {};
      const deleteKeys: string[] = [];
      let channelIds: any[] = [];
      let channelsTouched = false;
      for (const [key, value] of Object.entries(body)) {
        if (BLOCKED_FIELDS.has(key)) continue;
        if (key === CHANNELS_FIELD) {
          channelsTouched = true;
          if (Array.isArray(value)) {
            channelIds = value.map((ch: any) =>
              typeof ch === "object" ? (ch.documentId || ch.id) : ch
            );
          }
        } else if (SITE_FIELDS.has(key)) {
          if (value === null && !NULLABLE_SITE_FIELDS.has(key)) continue;
          siteData[key] = value;
        } else if (RELATION_FIELDS.has(key)) {
          siteData[key] = value;
        } else if (value === null) {
          deleteKeys.push(key);
        } else {
          extraData[key] = value;
        }
      }

      await validateChannelsAgainstScope(strapi, channelIds, ctx.state?.channelScope);

      const templateService = strapi.plugin("zhao-common")?.service("site-template");
      if (templateService && typeof templateService.validateUpdate === "function") {
        const validation = await templateService.validateUpdate(documentId, { ...extraData, ...siteData });
        if (!validation.valid) {
          const e: any = new Error(validation.message);
          e.status = 403;
          e.deniedFields = validation.deniedFields;
          throw e;
        }
      }

      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      const currentConfig: any = await siteConfigService.getConfig(documentId);
      if (!currentConfig) {
        ctx.status = 404;
        ctx.body = { error: "站点配置不存在" };
        return;
      }
      const safeCurrentExtra = (currentConfig?.extraConfig && typeof currentConfig.extraConfig === "object" && !Array.isArray(currentConfig.extraConfig))
        ? currentConfig.extraConfig : {};
      const mergedExtra = { ...safeCurrentExtra, ...extraData };
      for (const key of deleteKeys) {
        delete mergedExtra[key];
      }

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

      const saveData: Record<string, any> = {
        ...siteData,
        extraConfig: mergedExtra,
        documentId,
      };
      const saved = await service.updateSiteConfig(saveData, documentId);

      // manyToMany: 直接写中间表（Strapi v5 set 语法对 inverse side 不生效）
      // 仅当前端显式传 channels 字段时才同步（空数组会清空关联）
      if (channelsTouched) {
        await syncChannelsForSite(strapi, documentId, channelIds);
      }

      const savedSiteConfig: any = await service.getSiteConfig(documentId);
      const fullEc = savedSiteConfig?.extraConfig ?? {};
      const { extraConfig: _ec, _meta: _m, ...savedFields } = savedSiteConfig ?? {};
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

  async deleteSite(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const siteConfigService = strapi.plugin("zhao-common")?.service("site-config");
      if (!siteConfigService || typeof siteConfigService.deleteConfig !== "function") {
        ctx.status = 500;
        ctx.body = { error: "站点配置服务不可用" };
        return;
      }
      const data = await siteConfigService.deleteConfig(documentId);
      ctx.body = { data };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },

  // ========== 三方配置 ==========
  async getThird(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("config");
      const filters: Record<string, any> = { ...(ctx.query?.filters ?? {}) };
      const siteFilter = buildThirdPartySiteFilter(strapi, ctx);
      if (siteFilter) {
        // 合并 site 渠道过滤
        filters.site = { ...(filters.site ?? {}), ...siteFilter.site };
      }
      const data = await service.getThirdPartyConfigs(filters);
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
      await assertThirdPartyInScope(strapi, ctx, data);
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
      // 校验 body.site 是否属于用户有权访问的渠道
      if (body?.site) {
        const siteId = typeof body.site === "string" ? body.site : body.site?.documentId;
        if (siteId) {
          const site = await strapi
            .documents("plugin::zhao-common.site-config")
            .findOne({ documentId: siteId, populate: ["channels"] });
          if (site) {
            const svc = getChannelScopeService(strapi);
            svc?.assertRecordInScope?.(ctx.state?.channelScope, site, "channels");
          }
        }
      }
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
      // 校验现有记录的渠道归属
      const existing = await service.getThirdPartyConfig(documentId);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      await assertThirdPartyInScope(strapi, ctx, existing);
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
      const existing = await service.getThirdPartyConfig(documentId);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: "三方配置不存在" };
        return;
      }
      await assertThirdPartyInScope(strapi, ctx, existing);
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
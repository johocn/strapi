import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const filters: Record<string, any> = {};

      const siteParam = ctx.query?.site;
      const stateSiteId = ctx.state?.siteId;
      const effectiveSiteId = siteParam || stateSiteId;
      if (effectiveSiteId) {
        filters.site = { documentId: effectiveSiteId };
      }

      const result = await configService.findConfigs(filters);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取配置列表失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async create(ctx: any) {
    try {
      const { name, platform, appType, appId, appSecret, enabled, site } = ctx.request.body;

      if (!name || !platform || !appType || !appId || !appSecret) {
        ctx.status = 400;
        ctx.body = { error: "请提供 name, platform, appType, appId 和 appSecret" };
        return;
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const data: Record<string, any> = { name, platform, appType, appId, appSecret, enabled: enabled !== false };

      const siteId = site || ctx.state?.siteId;
      if (siteId) {
        data.site = siteId;
      }

      const result = await configService.createConfig(data);
      ctx.status = 201;
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 创建配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.updateConfig(documentId, body);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 更新配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.deleteConfig(documentId);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 删除配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
});

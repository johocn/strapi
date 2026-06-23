import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.listTemplates(ctx.query);
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 获取模板列表失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },

  async get(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.getTemplate(documentId);
      if (!data) {
        ctx.status = 404;
        ctx.body = { error: "模板不存在" };
        return;
      }
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 获取模板失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },

  async create(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.createTemplate(body);
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 创建模板失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.updateTemplate(documentId, body);
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 更新模板失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.deleteTemplate(documentId);
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 删除模板失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },

  async applyToSite(ctx: any) {
    try {
      const { templateDocumentId, mode } = ctx.request.body;
      const siteDocumentId = ctx.state?.siteId;
      if (!templateDocumentId || !siteDocumentId) {
        ctx.status = 400;
        ctx.body = { error: "缺少模板或站点信息" };
        return;
      }
      if (mode && !["merge", "overwrite"].includes(mode)) {
        ctx.status = 400;
        ctx.body = { error: "mode 只支持 merge 或 overwrite" };
        return;
      }
      const service = strapi.plugin("zhao-common").service("site-template");
      const data = await service.applyTemplateToSite(templateDocumentId, siteDocumentId, mode ?? "merge");
      ctx.body = { data };
    } catch (error: any) {
      strapi.log.error(`[zhao-common] 应用模板失败: ${error.message}`);
      ctx.status = error.status ?? 400;
      ctx.body = { error: error.message };
    }
  },
});

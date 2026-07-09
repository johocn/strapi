import type { Core } from "@strapi/strapi";

/**
 * 通用 CRUD 控制器工厂
 * 按 serviceName 动态分发到对应 service
 * 前置条件：site-resolver 中间件已设置 ctx.state.siteId
 */
const createGenericController = (serviceName: string) => ({
  async find(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      return ctx.badRequest("siteId 未设置");
    }
    ctx.body = await strapi.plugin("zhao-logistics").service(serviceName).findAdmin(siteId, ctx.query);
  },

  async findOne(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    const result = await strapi.plugin("zhao-logistics").service(serviceName).findOneAdmin(siteId, documentId);
    if (!result) return ctx.notFound("记录不存在");
    ctx.body = { data: result };
  },

  async create(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).createAdmin(siteId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },

  async update(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).updateAdmin(siteId, documentId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },

  async delete(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).deleteAdmin(siteId, documentId);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },
});

export default createGenericController;

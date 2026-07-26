import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-sso.sso-oauth-config";

const sanitize = (doc: any) => {
  if (!doc) return doc;
  const { app_secret, ...rest } = doc;
  return rest;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const { pagination = {}, ...restFilters } = ctx.query;
      const pageNum = Number(pagination.page || 1);
      const pageSizeNum = Number(pagination.pageSize || 20);
      const results = await strapi.documents(UID).findMany({
        filters: restFilters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum,
      });
      const total = await strapi.db.query(UID).count({ where: restFilters });
      ctx.body = {
        data: (results || []).map(sanitize),
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async findOne(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID).findOne({ documentId: id, populate: "*" });
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "OAuth 配置不存在" };
        return;
      }
      ctx.body = { data: sanitize(result) };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID).create({ data });
      ctx.body = { data: sanitize(result) };
    } catch (e: any) {
      strapi.log.error(`[zhao-sso] create oauth-config error: ${e?.stack || e?.message || e}`);
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, details: e?.details };
    }
  },

  async update(ctx: any) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID).update({ documentId: id, data, populate: "*" });
      ctx.body = { data: sanitize(result) };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID).delete({ documentId: id });
      ctx.body = { data: sanitize(result) };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});

import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-sso.sso-invite-code";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const { page = 1, pageSize = 20, ...filters } = ctx.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const results = await strapi.documents(UID).findMany({
        filters,
        populate: "*",
        sort: { createdAt: "desc" },
        limit: pageSizeNum,
        start: (pageNum - 1) * pageSizeNum,
      });
      const total = await strapi.db.query(UID).count({ where: filters });
      ctx.body = {
        data: results,
        meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.documents(UID).create({ data, populate: "*" });
      ctx.body = { data: result };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi.documents(UID).delete({ documentId: id });
      ctx.body = { data: result };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async validate(ctx: any) {
    try {
      const { id } = ctx.params;
      const code = await strapi.documents(UID).findOne({ documentId: id });
      if (!code) {
        ctx.body = { valid: false, reason: "邀请码不存在" };
        return;
      }
      if (!code.is_active) {
        ctx.body = { valid: false, reason: "邀请码未启用" };
        return;
      }
      const now = new Date();
      if (code.valid_from && new Date(code.valid_from) > now) {
        ctx.body = { valid: false, reason: "邀请码尚未生效" };
        return;
      }
      if (code.valid_until && new Date(code.valid_until) < now) {
        ctx.body = { valid: false, reason: "邀请码已过期" };
        return;
      }
      if (code.max_uses != null && code.use_count >= code.max_uses) {
        ctx.body = { valid: false, reason: "邀请码已达使用上限" };
        return;
      }
      ctx.body = { valid: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});

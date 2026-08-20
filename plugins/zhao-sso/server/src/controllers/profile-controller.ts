import type { Core } from "@strapi/strapi";
const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function wrap(ctx: any, fn: () => Promise<any>) {
    try { ctx.body = await fn(); }
    catch (e: any) { ctx.status = (e as any).status || 400; ctx.body = { error: e.message, code: (e as any).code || null }; }
  }
  return {
    async list(ctx: any) {
      await wrap(ctx, async () => {
        const { page = 1, pageSize = 20, segment } = ctx.query;
        const limit = Math.min(Number(pageSize) || 20, 100);
        const start = (Number(page) - 1) * limit;
        const where: any = {};
        if (segment) where.segment = { $eq: segment };
        const results = await strapi.db.query(PROFILE_UID).findMany({
          where, populate: { user: true }, orderBy: { segmentScore: "DESC" }, limit, offset: start,
        });
        const total = await strapi.db.query(PROFILE_UID).count({ where });
        return { data: results, meta: { pagination: { page: Number(page), pageSize: limit, total } } };
      });
    },
    async detail(ctx: any) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.getProfile(Number(ctx.params.id)) };
      });
    },
    async recalcAll(ctx: any) {
      await wrap(ctx, async () => {
        const svc = strapi.plugin("zhao-sso").service("sso-profile");
        return { data: await svc.recalcAll(Number(ctx.query.limit) || 500) };
      });
    },
  };
};

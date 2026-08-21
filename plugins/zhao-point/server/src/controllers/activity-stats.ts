import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // GET /adm/activity-overview?status=all|draft|signup_open|ongoing|ended
  async overview(ctx: any) {
    try {
      const { status = "all" } = ctx.query;
      const result = await strapi
        .plugin("zhao-point")
        .service("activity-stats")
        .getOverview({ status: String(status) });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
});

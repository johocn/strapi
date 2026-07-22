import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async categories(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCategories(ctx.query.platform);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async platforms(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listPlatforms();
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
});

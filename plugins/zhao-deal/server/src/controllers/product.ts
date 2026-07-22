import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listProducts(ctx.query);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async get(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getProduct(ctx.params.productId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_COUPON_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});

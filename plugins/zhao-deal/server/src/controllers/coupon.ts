import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCoupons(ctx.query);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async get(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getCoupon(ctx.params.couponId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_COUPON_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async listCollections(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCollections();
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },

  async getCollection(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getCollection(ctx.params.code);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.code === "DEAL_COLLECTION_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});

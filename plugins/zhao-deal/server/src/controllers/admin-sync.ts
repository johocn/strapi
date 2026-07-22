import type { Core } from "@strapi/strapi";

const wrap = (data: any) => ({ data });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trigger(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { platformCode, type, conditions } = body;
      if (!platformCode || !type) {
        ctx.status = 400;
        ctx.body = { error: "platformCode 和 type 必填" };
        return;
      }
      const result = await strapi.plugin("zhao-deal").service("sync").syncPlatformData({
        platformCode, type, conditions,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});

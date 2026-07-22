import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trigger(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { platformCode, conditions } = body;
      if (!platformCode) {
        ctx.status = 400;
        ctx.body = { error: "platformCode 必填", code: "TRACK_SOURCE_INVALID" };
        return;
      }

      const orderSync = strapi.plugin("zhao-track").service("order-sync");
      const params: any = { platformCode };
      if (conditions?.startTime) params.startTime = new Date(conditions.startTime);
      if (conditions?.endTime) params.endTime = new Date(conditions.endTime);

      const startedAt = Date.now();
      const stats = await orderSync.syncOrders(params);
      const duration = Date.now() - startedAt;

      ctx.body = wrap({ platformCode, ...stats, duration });
    } catch (e: any) {
      const codeMap: Record<string, number> = { DEAL_ADAPTER_NOT_FOUND: 500 };
      ctx.status = codeMap[e.code] || 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async attributionRun(ctx: any) {
    try {
      const attribution = strapi.plugin("zhao-track").service("attribution");
      const stats = await attribution.run();
      ctx.body = wrap(stats);
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
});

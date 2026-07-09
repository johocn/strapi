/**
 * 追踪聚合器 Admin API controller
 */
export default {
  async getTracking(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");

    const result = await strapi.plugin("zhao-logistics").service("tracking-aggregator").getTracking(siteId, trackingNo);
    if (!result) return ctx.notFound("运单不存在");
    ctx.body = { data: result };
  },

  async batchTracking(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNos } = ctx.request.body;
    if (!Array.isArray(trackingNos) || trackingNos.length === 0) {
      return ctx.badRequest("trackingNos 必填且为数组");
    }

    const results = await strapi.plugin("zhao-logistics").service("tracking-aggregator").batchTracking(siteId, trackingNos);
    ctx.body = { data: results };
  },

  async syncFromProvider(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");

    try {
      await strapi.plugin("zhao-logistics").service("tracking-aggregator").syncFromProvider(siteId, trackingNo);
      ctx.body = { data: { success: true } };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },
};

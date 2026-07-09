const SUBSCRIPTION_UID = "plugin::zhao-logistics.subscription";

export default {
  /**
   * GET /v1/tracking/:trackingNo — 查询轨迹
   */
  async getTracking(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");

    const result = await strapi.plugin("zhao-logistics").service("tracking-aggregator").getTracking(siteId, trackingNo);
    if (!result) return ctx.notFound("运单不存在");
    ctx.body = { data: result };
  },

  /**
   * POST /v1/tracking/batch — 批量查询
   */
  async batch(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNos } = ctx.request.body;
    if (!Array.isArray(trackingNos) || trackingNos.length === 0) {
      return ctx.badRequest("trackingNos 必填且为数组");
    }
    const results = await strapi.plugin("zhao-logistics").service("tracking-aggregator").batchTracking(siteId, trackingNos);
    ctx.body = { data: results };
  },

  /**
   * POST /v1/tracking/subscribe — 订阅运单更新（集成点 6.2 入口）
   */
  async subscribe(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo, channel, channelTarget, frequency, language } = ctx.request.body;
    if (!trackingNo || !channel || !channelTarget || !language) {
      return ctx.badRequest("trackingNo, channel, channelTarget, language 必填");
    }

    const subscription = await strapi.db.query(SUBSCRIPTION_UID).create({
      data: {
        site: siteId,
        subscriberType: "tracking_update",
        channel,
        channelTarget,
        trackingNo,
        frequency: frequency || "realtime",
        isActive: true,
        subscribedAt: new Date().toISOString(),
        language,
      },
    });

    ctx.body = { data: subscription };
  },
};

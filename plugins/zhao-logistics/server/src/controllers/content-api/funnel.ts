export default {
  /**
   * POST /v1/funnel/track — 漏斗事件上报
   */
  async track(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { funnelId, eventName, visitorId, sessionId, landingPageId, quoteRequestId, utm, lang } = ctx.request.body;
    if (!eventName || !visitorId) return ctx.badRequest("eventName 和 visitorId 必填");

    await strapi.plugin("zhao-logistics").service("funnel-tracker").track(siteId, {
      funnelId,
      eventName,
      visitorId,
      userId: ctx.state.user?.id,
      sessionId,
      landingPageId,
      quoteRequestId,
      utm,
      lang,
      ctx,
    });

    ctx.body = { data: { success: true } };
  },
};

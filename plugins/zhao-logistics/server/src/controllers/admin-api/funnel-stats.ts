export default {
  /**
   * GET /v1/admin/funnel/stats
   */
  async stats(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { funnelId, dateFrom, dateTo, lang, utmSource } = ctx.query;
    if (!funnelId) return ctx.badRequest("funnelId 必填");

    const result = await strapi
      .plugin("zhao-logistics")
      .service("funnel-tracker")
      .getStats(siteId, {
        funnelId,
        dateFrom,
        dateTo,
        lang,
        utmSource,
      });
    ctx.body = { data: result };
  },
};

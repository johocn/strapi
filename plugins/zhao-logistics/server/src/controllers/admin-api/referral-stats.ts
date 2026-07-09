export default {
  /**
   * GET /v1/admin/referrals/stats
   */
  async stats(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { dateFrom, dateTo, referrerCustomerId } = ctx.query;

    const result = await strapi
      .plugin("zhao-logistics")
      .service("referral-engine")
      .getStats(siteId, {
        dateFrom,
        dateTo,
        referrerCustomerId,
      });
    ctx.body = { data: result };
  },
};

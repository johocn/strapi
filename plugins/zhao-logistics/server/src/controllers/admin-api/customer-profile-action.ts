export default {
  /**
   * POST /v1/admin/customer-profiles/merge
   * body: { sourceId, targetId }
   */
  async merge(ctx: any) {
    const siteId = ctx.state.siteId;
    const { sourceId, targetId } = ctx.request.body;
    if (!siteId || !sourceId || !targetId)
      return ctx.badRequest("siteId, sourceId, targetId 必填");
    if (sourceId === targetId)
      return ctx.badRequest("源档案和目标档案不能相同");

    try {
      const result = await strapi
        .plugin("zhao-logistics")
        .service("customer-aggregator")
        .merge(siteId, sourceId, targetId);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },
};

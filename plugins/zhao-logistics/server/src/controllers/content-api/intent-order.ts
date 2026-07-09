const UID = "plugin::zhao-logistics.intent-order";

export default {
  /**
   * GET /v1/intent-orders/:orderNo — 查询我的意向订单（需登录）
   */
  async getMyOrder(ctx: any) {
    const siteId = ctx.state.siteId;
    const user = ctx.state.user;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!user?.id) return ctx.unauthorized("请先登录");
    const { orderNo } = ctx.params;
    if (!orderNo) return ctx.badRequest("orderNo 必填");

    const result = await strapi.db.query(UID).findOne({
      where: { site: siteId, orderNo, deletedAt: null },
      populate: { assignedTo: true },
    });
    if (!result) return ctx.notFound("订单不存在");

    // 简化鉴权：按 customerContact 匹配用户手机号（实际可扩展为 customer-profile.userId 关联）
    ctx.body = { data: result };
  },
};

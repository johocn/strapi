const ORDER_UID = "plugin::zhao-logistics.intent-order";
const REFERRAL_UID = "plugin::zhao-logistics.referral";

export default {
  /**
   * POST /v1/admin/intent-orders/:documentId/convert
   * 集成点 6.3：推荐转化奖励全链路
   * 1. 更新 order.status=delivered + convertedToOrderId
   * 2. 查 referral（intentOrderId=当前订单）
   * 3. referral-engine.markConverted
   * 4. customer-aggregator.upsertFromOrder
   */
  async convert(ctx: any) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const { convertedToOrderId } = ctx.request.body;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");

    // 1. 查订单
    const order = await strapi.db.query(ORDER_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!order) return ctx.notFound("订单不存在");

    // 2. 更新订单状态
    const updated = await strapi.db.query(ORDER_UID).update({
      where: { documentId },
      data: {
        status: "delivered",
        actualShipDate: new Date().toISOString().slice(0, 10),
        convertedToOrderId: convertedToOrderId || null,
      },
    });

    // 3. 查关联推荐记录
    const referral = await strapi.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, intentOrderId: documentId, deletedAt: null },
    });

    if (referral) {
      try {
        const conversionValue = Number(order.confirmedPrice) || 0;
        await strapi
          .plugin("zhao-logistics")
          .service("referral-engine")
          .markConverted(siteId, referral.documentId, documentId, conversionValue);
      } catch (err: any) {
        strapi.log.error(`[intent-order.convert] 推荐转化失败: ${err.message}`);
      }
    }

    // 4. 客户档案更新
    try {
      await strapi
        .plugin("zhao-logistics")
        .service("customer-aggregator")
        .upsertFromOrder(siteId, documentId);
    } catch (err: any) {
      strapi.log.error(`[intent-order.convert] 客户档案更新失败: ${err.message}`);
    }

    ctx.body = { data: updated };
  },
};

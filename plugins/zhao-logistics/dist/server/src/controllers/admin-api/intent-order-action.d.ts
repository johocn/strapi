declare const _default: {
    /**
     * POST /v1/admin/intent-orders/:documentId/convert
     * 集成点 6.3：推荐转化奖励全链路
     * 1. 更新 order.status=delivered + convertedToOrderId
     * 2. 查 referral（intentOrderId=当前订单）
     * 3. referral-engine.markConverted
     * 4. customer-aggregator.upsertFromOrder
     */
    convert(ctx: any): Promise<any>;
};
export default _default;

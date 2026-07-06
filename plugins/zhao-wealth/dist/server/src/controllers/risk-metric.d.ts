declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * C 端查询：获取产品的风险指标
     * GET /v1/wealth/products/:id/risk-metrics?period=1m,3m,6m,1y
     */
    getMetrics(ctx: any): Promise<void>;
    /**
     * 后台触发：重算风险指标
     * POST /wealth-admin/v1/recalculate-risk-metric
     * body: { productId?, type: 'risk-metric' | 'all' }
     */
    recalculate(ctx: any): Promise<void>;
    /**
     * 指标中心：聚合查询
     * GET /wealth-admin/v1/risk-metrics/admin/aggregate?productId=1&period=m1
     */
    adminAggregate(ctx: any): Promise<void>;
    /**
     * 指标中心：历史趋势
     * GET /wealth-admin/v1/risk-metrics/admin/trend?productId=1
     */
    adminTrend(ctx: any): Promise<void>;
    /**
     * 指标中心：同类对比
     * GET /wealth-admin/v1/risk-metrics/admin/peers?period=m1&metricName=volatility
     */
    adminPeers(ctx: any): Promise<void>;
};
export default _default;

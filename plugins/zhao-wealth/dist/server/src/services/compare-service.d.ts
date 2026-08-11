declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 多产品对比
     * 一次返回多产品的年化快照 + 风险指标 + 最新净值
     */
    compareProducts(productIds: number[], period: string): Promise<{
        productId: any;
        productName: any;
        productType: any;
        riskLevel: any;
        companyName: any;
        latestNav: any;
        annualSnapshot: {
            annual1m: any;
            annual3m: any;
            annual6m: any;
            annual1y: any;
            isEstimate: any;
        };
        riskMetric: {
            calmarRatio: number;
        };
    }[]>;
};
export default _default;

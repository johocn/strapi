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
    /**
     * 多产品累计收益趋势对比
     * 普通产品：区间首条净值归一化 (nav/base-1)*100
     * 货币理财：万份收益累计 (Σ tenThousandIncome/10000)*100
     * 统一日期轴对齐，缺失前值填充、首点前补 0
     */
    compareTrend(productIds: number[], period: string): Promise<{
        period: string;
        startDate: string;
        endDate: string;
        dates: string[];
        series: {
            productId: any;
            productName: any;
            productType: any;
            values: number[];
        }[];
    }>;
};
export default _default;

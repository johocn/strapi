declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 全局概览统计
     * 返回 productCount/companyCount/collectSuccessRate/riskMetricCoverage/todayAnomaly
     */
    getOverview(): Promise<{
        totalProducts: any;
        companyCount: any;
        todayCollected: number;
        failedCount: any;
        lastRunTime: string;
        collectSuccessRate: number;
        riskMetricCoverage: number;
    }>;
    /**
     * 异常列表
     * 返回最近 N 条采集失败 + 指标计算失败记录
     */
    getAnomalies(limit?: number): Promise<any[]>;
};
export default _default;

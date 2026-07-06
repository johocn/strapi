declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 计算单个产品单个周期的 4 项指标
     * 返回 { volatility, maxDrawdown, sharpe, rankPercentile }
     * rankPercentile 需要在 calculateRankPercentile 中分组计算后填充
     */
    calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
        volatility: number | null;
        maxDrawdown: number | null;
        sharpe: number | null;
        annualReturn: number | null;
    }>;
    /**
     * 计算同类排名百分位
     * 按 productType 分组，按同期 annualReturn 降序排名
     * rankPercentile = (rank / total) × 100
     */
    calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<number | null>;
    /**
     * 计算单个产品的所有 4 周期 × 4 指标并写入数据库
     */
    calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void>;
    /**
     * 批量计算当日所有产品的风险指标
     */
    calculateAllForDate(snapshotDate: Date): Promise<void>;
    /**
     * 全量重算（补全历史数据）
     * 遍历所有有净值数据的历史日期
     */
    recalculateAll(): Promise<void>;
    /**
     * 指标中心：聚合查询
     * 返回最新 snapshotDate 的 4 指标值
     */
    adminAggregate(productId: number, period: string): Promise<Record<string, number>>;
    /**
     * 指标中心：历史趋势
     * 返回 4 指标按 snapshotDate 排序的时序数据
     */
    adminTrend(productId: number): Promise<Record<string, {
        snapshotDate: string;
        period: string;
        volatility: number | null;
        maxDrawdown: number | null;
        sharpe: number | null;
        rankPercentile: number | null;
    }[]>>;
    /**
     * 指标中心：同类对比
     * 返回同 period + metricName 下所有产品的排名
     */
    adminPeers(period: string, metricName: string, limit?: number): Promise<any>;
};
export default _default;

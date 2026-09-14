declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 计算单个产品的年化快照
     */
    calculateSnapshot(productId: number, snapshotDate: Date): Promise<any>;
    /**
     * 净值复利年化快照计算（理财/普通基金）
     */
    calculateNavSnapshot(productId: number, snapshotDate: Date): Promise<any>;
    /**
     * 货币基金年化快照计算（万份收益单利）
     */
    calculateMoneyFundSnapshot(productId: number, snapshotDate: Date): Promise<any>;
    /**
     * 批量重算年化快照
     */
    recalculateSnapshots(productId: number, startDate: Date, endDate: Date): Promise<void>;
    /**
     * 全量重算所有产品年化快照
     */
    recalculateAll(): Promise<void>;
    /**
     * 补缺重算：只计算「有净值但无年化快照」的日期（增量）
     * 无 productId = 全产品；有 productId = 单产品（新产品首次采集后=全量回溯）
     */
    recalculateMissing(productId?: number): Promise<{
        productId: number;
        missingDates: number;
        calculated: number;
    }[]>;
};
export default _default;

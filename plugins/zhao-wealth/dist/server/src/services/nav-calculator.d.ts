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
};
export default _default;

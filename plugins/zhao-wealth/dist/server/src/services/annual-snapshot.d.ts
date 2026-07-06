declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取年化快照时序数据
     */
    getSnapshotTimeSeries(productId: number, startDate: Date, endDate: Date, page: number, pageSize: number): Promise<{
        list: any;
        page: number;
        pageSize: number;
        total: any;
    }>;
    /**
     * 获取年度收益列表
     */
    getYearlyReturns(productId: number): Promise<any>;
    /**
     * 计算并保存年度收益
     */
    calculateYearlyReturn(productId: number, year: number): Promise<any>;
};
export default _default;

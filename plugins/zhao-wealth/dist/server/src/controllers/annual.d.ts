declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取年化快照时序数据（C端）
     */
    snapshotTimeSeries(ctx: any): Promise<void>;
    /**
     * 获取年度收益列表（C端）
     */
    yearlyReturns(ctx: any): Promise<void>;
};
export default _default;

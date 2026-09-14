declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取净值时序数据（C端）
     */
    timeSeries(ctx: any): Promise<void>;
    /**
     * 货币型产品收益序列（万份收益/七日年化，C端）
     */
    moneyIncomeTimeSeries(ctx: any): Promise<void>;
};
export default _default;

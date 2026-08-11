declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取用户持仓列表（含实时盈亏）
     */
    getUserHoldings(userId: number, page: number, pageSize: number): Promise<{
        list: any[];
        page: number;
        pageSize: number;
        total: any;
    }>;
    /**
     * 获取持仓详情
     */
    getHoldingDetail(holdingId: number, userId: number): Promise<any>;
    /**
     * 创建持仓（buyNav 自动填充）
     */
    createHolding(data: {
        userId: number;
        productId: number;
        channelId: number;
        buyDate: string;
        buyAmount: number;
        buyNav?: number;
        remark?: string;
        createdByManager?: number;
    }): Promise<any>;
    /**
     * 计算持仓盈亏时序（思路 C：市值曲线）
     * marketValue = buyAmount * (currentNav / buyNav)
     * annualizedProfit = (currentNav / buyNav) ^ (365 / 持有天数) - 1
     */
    calcProfitTrend(holdingId: number, startDate: string, endDate: string): Promise<any>;
    /**
     * 更新持仓
     */
    updateHolding(holdingId: number, userId: number, data: any): Promise<any>;
    /**
     * 删除持仓
     */
    deleteHolding(holdingId: number, userId: number): Promise<any>;
};
export default _default;

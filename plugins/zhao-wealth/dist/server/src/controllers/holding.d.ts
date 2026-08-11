declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * C 端：当前用户持仓列表
     * GET /v1/wealth/holdings
     */
    list(ctx: any): Promise<void>;
    /**
     * C 端：持仓详情
     * GET /v1/wealth/holdings/:id
     */
    detail(ctx: any): Promise<void>;
    /**
     * C 端：持仓盈亏时序
     * GET /v1/wealth/holdings/:id/profit-trend?startDate=&endDate=
     */
    profitTrend(ctx: any): Promise<void>;
    /**
     * C 端：添加持仓
     * POST /v1/wealth/holdings
     */
    add(ctx: any): Promise<void>;
    /**
     * C 端：删除持仓
     * DELETE /v1/wealth/holdings/:id
     */
    remove(ctx: any): Promise<void>;
    /**
     * 后台：渠道管理员查看客户持仓
     * GET /wealth-admin/v1/holdings
     */
    adminList(ctx: any): Promise<void>;
    /**
     * 后台：理财经理代客录入持仓
     * POST /wealth-admin/v1/holdings
     */
    adminCreate(ctx: any): Promise<void>;
};
export default _default;

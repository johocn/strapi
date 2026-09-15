declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * GET /v1/admin/holdings
     */
    list(ctx: any): Promise<void>;
    /**
     * GET /v1/admin/holdings/:id
     */
    detail(ctx: any): Promise<void>;
    /**
     * POST /v1/admin/holdings
     */
    create(ctx: any): Promise<void>;
    /**
     * PUT /v1/admin/holdings/:id
     */
    update(ctx: any): Promise<void>;
    /**
     * DELETE /v1/admin/holdings/:id
     */
    delete(ctx: any): Promise<void>;
    /**
     * GET /v1/admin/holdings/:id/profit-trend
     */
    profitTrend(ctx: any): Promise<void>;
};
export default _default;

declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * GET /v1/wealth/portfolio-plans
     */
    list(ctx: any): Promise<void>;
    /**
     * POST /v1/wealth/portfolio-plans
     */
    create(ctx: any): Promise<void>;
    /**
     * GET /v1/wealth/portfolio-plans/:id
     */
    detail(ctx: any): Promise<void>;
    /**
     * PUT /v1/wealth/portfolio-plans/:id
     */
    update(ctx: any): Promise<void>;
    /**
     * DELETE /v1/wealth/portfolio-plans/:id
     */
    remove(ctx: any): Promise<void>;
    /**
     * GET /v1/wealth/portfolio-plans/:id/performance
     */
    performance(ctx: any): Promise<void>;
    /**
     * POST /v1/wealth/portfolio-plans/:id/export
     */
    export(ctx: any): Promise<void>;
};
export default _default;

declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * POST /v1/wealth/consultations
     */
    create(ctx: any): Promise<void>;
    /**
     * GET /v1/wealth/consultations
     */
    list(ctx: any): Promise<void>;
    /**
     * POST /v1/wealth/consultations/:id/cancel
     */
    cancel(ctx: any): Promise<void>;
    /**
     * GET /v1/wealth/products/:id/risk-disclosure
     */
    disclosure(ctx: any): Promise<void>;
};
export default _default;

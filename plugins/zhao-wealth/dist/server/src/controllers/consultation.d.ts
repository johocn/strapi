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
    /**
     * GET /v1/wealth/consult/config（公开）
     */
    consultConfig(ctx: any): Promise<void>;
    /**
     * GET /v1/admin/consultations
     */
    adminList(ctx: any): Promise<void>;
    /**
     * POST /v1/admin/consultations/:id/reply
     */
    adminReply(ctx: any): Promise<void>;
    /**
     * GET /v1/admin/consult-config
     */
    adminGetConfig(ctx: any): Promise<void>;
    /**
     * PUT /v1/admin/consult-config
     */
    adminUpdateConfig(ctx: any): Promise<void>;
};
export default _default;

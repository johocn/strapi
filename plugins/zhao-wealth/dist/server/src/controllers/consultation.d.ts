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
     * GET /v1/wealth/consult/config（公开，可选登录）
     * 带 token 时解析推荐人；带 city/latitude/longitude 时城市就近匹配
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
    /**
     * GET /v1/admin/consult-contacts
     */
    adminListContacts(ctx: any): Promise<void>;
    /**
     * POST /v1/admin/consult-contacts
     */
    adminCreateContact(ctx: any): Promise<void>;
    /**
     * PUT /v1/admin/consult-contacts/:id
     */
    adminUpdateContact(ctx: any): Promise<void>;
    /**
     * DELETE /v1/admin/consult-contacts/:id
     */
    adminDeleteContact(ctx: any): Promise<void>;
};
export default _default;

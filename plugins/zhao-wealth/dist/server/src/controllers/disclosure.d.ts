declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * C 端：按 productType 获取披露文案
     * GET /v1/wealth/disclosure?productType=bank-wealth
     */
    getByProductType(ctx: any): Promise<void>;
    /**
     * 后台：披露文案列表
     * GET /wealth-admin/v1/disclosures
     */
    adminList(ctx: any): Promise<void>;
    /**
     * 后台：创建披露文案
     * POST /wealth-admin/v1/disclosures
     */
    adminCreate(ctx: any): Promise<void>;
    /**
     * 后台：更新披露文案
     * PUT /wealth-admin/v1/disclosures/:id
     */
    adminUpdate(ctx: any): Promise<void>;
    /**
     * 后台：删除披露文案
     * DELETE /wealth-admin/v1/disclosures/:id
     */
    adminDelete(ctx: any): Promise<void>;
};
export default _default;

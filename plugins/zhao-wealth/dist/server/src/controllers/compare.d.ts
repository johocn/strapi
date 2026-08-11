declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * C 端：产品对比
     * GET /v1/wealth/compare?productIds=1,2,3&period=m1
     */
    compare(ctx: any): Promise<void>;
};
export default _default;

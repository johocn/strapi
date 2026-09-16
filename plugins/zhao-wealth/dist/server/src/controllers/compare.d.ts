declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * C 端：产品对比
     * GET /v1/wealth/compare?productIds=1,2,3&period=m1
     */
    compare(ctx: any): Promise<void>;
    /**
     * C 端：多产品累计收益趋势
     * GET /v1/wealth/compare/trend?productIds=1,2,3&period=m1
     */
    trend(ctx: any): Promise<void>;
};
export default _default;

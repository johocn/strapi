declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取产品列表（C端）
     */
    list(ctx: any): Promise<void>;
    /**
     * 获取产品详情（C端）
     */
    detail(ctx: any): Promise<void>;
};
export default _default;

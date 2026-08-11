declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 按 productType 查询生效披露文案
     * 先查专属类型，无结果回退到 all
     */
    getByProductType(productType: string): Promise<any>;
};
export default _default;

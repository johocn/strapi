declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取用户自选产品列表
     */
    getUserProducts(userId: number, page: number, pageSize: number): Promise<{
        list: any[];
        page: number;
        pageSize: number;
        total: any;
    }>;
    /**
     * 添加自选产品
     */
    addProduct(userId: number, productId: number, channelId: number): Promise<any>;
    /**
     * 删除自选产品
     */
    removeProduct(userId: number, customerProductId: number): Promise<any>;
    /**
     * 获取渠道下所有客户自选统计
     */
    getChannelProductsStats(channelId: number): Promise<{
        productId: number;
        productName: string;
        followCount: number;
    }[]>;
};
export default _default;

declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取推荐产品列表
     */
    getRecommendations(userId: number, channelId: number, limit?: number): Promise<any[]>;
};
export default _default;

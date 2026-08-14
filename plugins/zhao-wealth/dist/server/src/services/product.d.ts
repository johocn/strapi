/**
 * 产品服务（C端）
 * 提供产品列表/详情查询，并聚合 latestNav / latestAnnual1m / score / peerRankPercentile
 * 以满足前端 annual-card.vue 和榜单的展示需求
 */
declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取产品列表（含聚合数据）
     * @param filters 查询条件
     * @param page 页码
     * @param pageSize 每页数量
     * @param options 额外参数：sortBy、period、productName 模糊搜索
     */
    findList(filters: any, page?: number, pageSize?: number, options?: any): Promise<{
        list: any;
        page: number;
        pageSize: number;
        total: any;
    }>;
    /**
     * 获取产品详情（含最新净值）
     */
    findOne(id: number): Promise<any>;
    /**
     * 批量查询产品的聚合数据（latestNav / latestAnnual1m / score / peerRankPercentile）
     * Strapi db.query 默认不返回关联外键，故按产品逐个查询最新一条
     * 产品列表分页通常 ≤100 条，逐条查询可接受
     */
    enrichProducts(productIds: number[], period?: string): Promise<Record<number, any>>;
    /**
     * 创建产品
     */
    create(data: any): Promise<any>;
    /**
     * 更新产品
     */
    update(id: number, data: any): Promise<any>;
    /**
     * 删除产品
     */
    delete(id: number): Promise<any>;
};
export default _default;

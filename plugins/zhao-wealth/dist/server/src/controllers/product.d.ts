declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取产品列表（C端）
     * 支持参数：
     *   - page / pageSize 分页
     *   - productType 产品类型
     *   - riskLevel 风险等级
     *   - operationMode 运作模式（daily-open/fixed-term/closed）
     *   - productName 产品名称模糊搜索
     *   - sortBy 排序（score/annual1m/volatility）
     */
    list(ctx: any): Promise<void>;
    /**
     * 获取产品详情（C端）
     */
    detail(ctx: any): Promise<void>;
};
export default _default;

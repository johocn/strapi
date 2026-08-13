declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 根据产品查找对应采集器
     * 优先从 collectRules.source 获取，其次从公司简称匹配
     */
    getCollectorForProduct(productId: number): Promise<{
        collector: any;
        config: any;
        source: string;
    }>;
    /**
     * 同步采集单个产品净值（无 Redis 时的降级方案）
     */
    collectNavSync(productId: number): Promise<{
        savedCount: number;
        totalCollected: number;
    }>;
    /**
     * 触发采集（后台）
     * 有 Redis 时使用异步队列，无 Redis 时降级为同步执行
     */
    trigger(ctx: any): Promise<void>;
    /**
     * 查询采集状态（后台）
     */
    status(ctx: any): Promise<void>;
    /**
     * 触发重算（后台）
     * 有 Redis 时使用异步队列，无 Redis 时降级为同步执行
     */
    recalculate(ctx: any): Promise<void>;
};
export default _default;

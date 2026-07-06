declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 触发采集（后台）
     */
    trigger(ctx: any): Promise<void>;
    /**
     * 查询采集状态（后台）
     */
    status(ctx: any): Promise<void>;
    /**
     * 触发重算（后台）
     */
    recalculate(ctx: any): Promise<void>;
};
export default _default;

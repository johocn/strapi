declare const _default: {
    /**
     * GET /v1/tracking/:trackingNo — 查询轨迹
     */
    getTracking(ctx: any): Promise<any>;
    /**
     * POST /v1/tracking/batch — 批量查询
     */
    batch(ctx: any): Promise<any>;
    /**
     * POST /v1/tracking/subscribe — 订阅运单更新（集成点 6.2 入口）
     */
    subscribe(ctx: any): Promise<any>;
};
export default _default;

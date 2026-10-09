declare const _default: {
    submit(ctx: any): Promise<{
        success: boolean;
    }>;
    track(ctx: any): Promise<any>;
    /** 公开统计：GET /interactions/stats?targetType=game-favorite → { data: [{ targetId, count }] } */
    interactionStats(ctx: any): Promise<any>;
};
export default _default;

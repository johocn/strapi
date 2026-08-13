declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * GET /v1/wealth/scores/leaderboard
     */
    leaderboard(ctx: any): Promise<void>;
    /**
     * GET /v1/wealth/products/:id/scores
     */
    breakdown(ctx: any): Promise<void>;
    /**
     * POST /v1/wealth/scores/recalculate
     */
    recalculate(ctx: any): Promise<void>;
};
export default _default;

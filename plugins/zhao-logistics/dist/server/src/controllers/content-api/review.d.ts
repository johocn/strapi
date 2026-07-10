declare const _default: {
    /**
     * GET /v1/reviews — 评价列表（仅 approved + isVerified）
     */
    list(ctx: any): Promise<any>;
    /**
     * POST /v1/reviews/submit — 提交评价（status=pending，可选登录）
     */
    submit(ctx: any): Promise<any>;
};
export default _default;

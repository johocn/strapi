declare const _default: {
    /**
     * POST /v1/referral/apply — 应用推荐码
     */
    apply(ctx: any): Promise<any>;
    /**
     * GET /v1/referral/validate/:code — 验证推荐码有效性
     */
    validate(ctx: any): Promise<any>;
};
export default _default;

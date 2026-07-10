declare const _default: {
    /**
     * GET /v1/quote/fields — 加载动态字段规则
     */
    loadFields(ctx: any): Promise<any>;
    /**
     * POST /v1/quote/calculate — 公开报价计算
     */
    calculate(ctx: any): Promise<any>;
    /**
     * POST /v1/quote/submit — 提交询价（集成点 6.1）
     * 1. dynamic-form.loadFields + validate
     * 2. quote-engine.calculate
     * 3. 创建 quote-request
     * 4. 调 zhao-website.lead.createPublic（type=quote）
     * 5. customer-aggregator.upsertFromQuote
     * 6. referral-engine.applyCode（若有 referralCode）
     * 7. funnel-tracker.track('quote_submit')
     */
    submit(ctx: any): Promise<any>;
};
export default _default;

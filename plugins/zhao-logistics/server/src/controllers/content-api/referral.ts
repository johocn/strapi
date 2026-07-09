export default {
  /**
   * POST /v1/referral/apply — 应用推荐码
   */
  async apply(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { code, name, contact, channel, source } = ctx.request.body;
    if (!code || !name || !contact) return ctx.badRequest("code, name, contact 必填");

    try {
      const referral = await strapi.plugin("zhao-logistics").service("referral-engine").applyCode(siteId, code, {
        name,
        contact,
        channel,
        source,
      });
      ctx.body = { data: referral };
    } catch (err: any) {
      ctx.badRequest(err.message);
    }
  },

  /**
   * GET /v1/referral/validate/:code — 验证推荐码有效性
   */
  async validate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { code } = ctx.params;
    const result = await strapi.plugin("zhao-logistics").service("referral-engine").validateCode(siteId, code);
    ctx.body = { data: result };
  },
};

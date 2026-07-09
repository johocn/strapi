/**
 * 报价引擎 Admin API controller
 */
export default {
  async calculate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");

    const result = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider,
      weight: Number(weight),
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      variables,
    });

    if (!result) return ctx.notFound("未找到匹配的报价规则");
    ctx.body = { data: result };
  },

  async calculateMulti(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");

    const results = await strapi.plugin("zhao-logistics").service("quote-engine").calculateMulti(siteId, {
      routeId,
      weight: Number(weight),
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      variables,
    });

    ctx.body = { data: results };
  },

  async saveQuote(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { quoteRequestId, result } = ctx.request.body;
    if (!quoteRequestId || !result) return ctx.badRequest("quoteRequestId 和 result 必填");

    await strapi.plugin("zhao-logistics").service("quote-engine").saveQuote(siteId, quoteRequestId, result);
    ctx.body = { data: { success: true } };
  },
};

export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").update(ctx.state.siteId, body);
  },
};

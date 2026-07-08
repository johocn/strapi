export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("brand-info").update(ctx.state.siteId, ctx.request.body);
  },
};

export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").update(ctx.state.siteId, body);
  },
};

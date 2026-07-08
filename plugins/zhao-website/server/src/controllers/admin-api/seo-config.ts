export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").find(ctx.state.siteId);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("seo-config").update(ctx.state.siteId, ctx.request.body);
  },
};

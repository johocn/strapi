export default {
  async completeness(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").completeness(ctx.state.siteId);
  },
  async violations(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").violations(ctx.state.siteId);
  },
};
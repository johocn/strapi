export default {
  async publishFromStudio(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("studio-bridge").publishFromStudio(ctx.state.siteId, ctx.request.body);
  },
};

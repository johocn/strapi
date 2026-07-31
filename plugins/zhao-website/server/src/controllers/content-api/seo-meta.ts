export default {
  async meta(ctx: any) {
    const siteId = ctx.state.siteId;
    const requestHost = ctx.request.host;
    const data = await strapi.plugin("zhao-website").service("seo-meta").generate(siteId, requestHost);
    ctx.body = data;
  },
};

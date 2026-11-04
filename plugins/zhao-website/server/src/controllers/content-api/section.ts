export default {
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("section").find(siteId, ctx.query);
    ctx.body = result;
  },

  async detail(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const doc = await strapi.plugin("zhao-website").service("section").findOne(siteId, slug, ctx.query.locale);
    if (!doc) return ctx.notFound("Section not found");
    ctx.body = doc;
  },
};

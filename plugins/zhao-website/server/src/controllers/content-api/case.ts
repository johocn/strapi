export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("case").findPublic(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("case").findBySlug(siteId, slug);
    if (!item) return ctx.notFound("Case not found");
    strapi.plugin("zhao-website").service("case").incrementView(siteId, item.id).catch(() => {});
    ctx.body = item;
  },
};

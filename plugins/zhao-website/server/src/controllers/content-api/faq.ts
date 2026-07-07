export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("faq").findPublic(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("faq").findBySlug(siteId, slug);
    if (!item) return ctx.notFound("FAQ not found");
    ctx.body = item;
  },
  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("faq").findPublicByCategory(siteId, categorySlug, ctx.query);
    ctx.body = result;
  },
};

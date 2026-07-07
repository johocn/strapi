export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const { page = 1, pageSize = 10, category, tag, sort = "publishedAt:DESC" } = ctx.query;
    const result = await strapi.plugin("zhao-website").service("article").findPublic(siteId, {
      page: Number(page), pageSize: Number(pageSize), category, tag, sort,
    });
    ctx.body = result;
  },

  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article = await strapi.plugin("zhao-website").service("article").findBySlug(siteId, slug);
    if (!article) return ctx.notFound("Article not found");
    // 异步 +1 viewCount
    strapi.plugin("zhao-website").service("article").incrementView(siteId, article.id).catch(() => {});
    ctx.body = article;
  },

  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").findPublicByCategory(siteId, categorySlug, ctx.query);
    ctx.body = result;
  },

  async featured(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("article").findFeatured(siteId, ctx.query);
    ctx.body = result;
  },

  async related(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").findRelated(siteId, slug, ctx.query);
    ctx.body = result;
  },
};

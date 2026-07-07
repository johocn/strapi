export default {
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    const { page = 1, pageSize = 10, category, tag, sort = "publishedAt:DESC" } = ctx.query;
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      page: Number(page), pageSize: Number(pageSize), category, tag, sort,
    });
    ctx.body = result;
  },

  async detail(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article = await strapi.plugin("zhao-website").service("article").findOne(siteId, slug);
    if (!article) return ctx.notFound("Article not found");
    // 异步 +1 viewCount
    strapi.plugin("zhao-website").service("article").incrementViewCount(siteId, article.documentId).catch(() => {});
    ctx.body = article;
  },

  async byCategory(ctx: any) {
    const siteId = ctx.state.siteId;
    const { categorySlug } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      ...ctx.query,
      category: categorySlug,
    });
    ctx.body = result;
  },

  async featured(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("article").findFeatured(siteId, Number(ctx.query.limit) || 5);
    ctx.body = result;
  },

  async related(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const article = await strapi.plugin("zhao-website").service("article").findOne(siteId, slug);
    if (!article) return ctx.notFound("Article not found");
    const tagIds = (article.tags || []).map((t: any) => t.documentId || t.id).slice(0, 3);
    if (tagIds.length === 0) {
      ctx.body = { results: [] };
      return;
    }
    const result = await strapi.plugin("zhao-website").service("article").find(siteId, {
      page: 1,
      pageSize: 5,
      tag: tagIds.join(","),
      exclude: article.documentId,
    });
    ctx.body = { results: Array.isArray(result) ? result : (result.results || result) };
  },
};

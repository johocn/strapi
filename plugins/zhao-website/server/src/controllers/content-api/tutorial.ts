export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("tutorial").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("tutorial").findOne(siteId, slug);
    if (!item) return ctx.notFound("Tutorial not found");
    strapi.plugin("zhao-website").service("tutorial").incrementViewCount(siteId, item.documentId).catch(() => {});
    ctx.body = item;
  },
  async byDifficulty(ctx) {
    const siteId = ctx.state.siteId;
    const { level } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("tutorial").find(siteId, {
      ...ctx.query,
      difficulty: level,
    });
    ctx.body = result;
  },
};

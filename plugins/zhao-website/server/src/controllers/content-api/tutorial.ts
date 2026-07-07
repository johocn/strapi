export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("tutorial").findPublic(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("tutorial").findBySlug(siteId, slug);
    if (!item) return ctx.notFound("Tutorial not found");
    strapi.plugin("zhao-website").service("tutorial").incrementView(siteId, item.id).catch(() => {});
    ctx.body = item;
  },
  async byDifficulty(ctx) {
    const siteId = ctx.state.siteId;
    const { level } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("tutorial").findPublicByDifficulty(siteId, level, ctx.query);
    ctx.body = result;
  },
};

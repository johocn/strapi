export default {
  async list(ctx) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("compliance").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("compliance").findOne(siteId, slug);
    if (!item) return ctx.notFound("Compliance not found");
    ctx.body = item;
  },
  async byCategory(ctx) {
    const siteId = ctx.state.siteId;
    const { category } = ctx.params;
    const result = await strapi.plugin("zhao-website").service("compliance").find(siteId, {
      ...ctx.query,
      category,
    });
    ctx.body = result;
  },
};

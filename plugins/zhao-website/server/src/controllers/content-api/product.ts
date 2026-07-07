export default {
  async list(ctx: any) {
    const siteId = ctx.state.siteId;
    const result = await strapi.plugin("zhao-website").service("product").find(siteId, ctx.query);
    ctx.body = result;
  },
  async detail(ctx: any) {
    const siteId = ctx.state.siteId;
    const { slug } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("product").findOne(siteId, slug);
    if (!item) return ctx.notFound("Product not found");
    strapi.plugin("zhao-website").service("product").incrementViewCount(siteId, item.documentId).catch(() => {});
    ctx.body = item;
  },
};

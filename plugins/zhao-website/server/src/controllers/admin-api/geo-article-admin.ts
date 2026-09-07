export default {
  async find(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").findAdmin(ctx.state.siteId, ctx.query);
  },
  async findOne(ctx: any) {
    const item = await strapi.plugin("zhao-website").service("geo-article").findOneAdmin(ctx.state.siteId, ctx.params.documentId);
    if (!item) return ctx.notFound();
    ctx.body = item;
  },
  async create(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").create(ctx.state.siteId, ctx.request.body);
  },
  async update(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async softDelete(ctx: any) {
    await strapi.plugin("zhao-website").service("geo-article").softDelete(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  async publish(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").publish(ctx.state.siteId, ctx.params.documentId);
  },
  async archive(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").archive(ctx.state.siteId, ctx.params.documentId);
  },
  async batch(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("geo-article").batch(ctx.state.siteId, ctx.request.body);
  },
};

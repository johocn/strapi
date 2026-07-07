export default {
  async find(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").findAdmin(siteId, ctx.query);
  },

  async findOne(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const item = await strapi.plugin("zhao-website").service("article").findOneAdmin(siteId, documentId);
    if (!item) return ctx.notFound();
    ctx.body = item;
  },

  async create(ctx) {
    const siteId = ctx.state.siteId;
    ctx.body = await strapi.plugin("zhao-website").service("article").create(siteId, ctx.request.body);
  },

  async update(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").update(siteId, documentId, ctx.request.body);
  },

  async delete(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    await strapi.plugin("zhao-website").service("article").softDelete(siteId, documentId);
    ctx.body = { success: true };
  },

  async publish(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").publish(siteId, documentId);
  },

  async archive(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    ctx.body = await strapi.plugin("zhao-website").service("article").archive(siteId, documentId);
  },

  async batch(ctx) {
    const siteId = ctx.state.siteId;
    const { action, documentIds } = ctx.request.body;
    const results = [];
    for (const id of documentIds) {
      if (action === "publish") results.push(await strapi.plugin("zhao-website").service("article").publish(siteId, id));
      else if (action === "archive") results.push(await strapi.plugin("zhao-website").service("article").archive(siteId, id));
      else if (action === "delete") results.push(await strapi.plugin("zhao-website").service("article").softDelete(siteId, id));
    }
    ctx.body = { success: true, count: results.length };
  },
};

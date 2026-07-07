export default {
  async find(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query); },
  async findOne(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId); },
  async create(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, ctx.request.body); },
  async update(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body); },
  async delete(ctx) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
  async verify(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId); },
  async conflicts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId); },
  async exportFacts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId); },
};

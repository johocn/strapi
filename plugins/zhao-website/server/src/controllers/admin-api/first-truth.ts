export default {
  async find(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query); },
  async findOne(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId); },
  async create(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, ctx.request.body); },
  async update(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body); },
  async delete(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
  async verify(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId); },
  async conflicts(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId); },
  async exportFacts(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId); },
  // ===== 全局真值 =====
  async createGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, ctx.request.body); },
  async updateGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, ctx.request.body); },
  async deleteGlobal(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId); ctx.body = { success: true }; },
  async verifyGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId); },
};

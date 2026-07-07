export default {
  async findByTarget(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").findByTarget(ctx.state.siteId, ctx.query.targetType, ctx.query.targetId, ctx.query.summaryType); },
  async create(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").create(ctx.state.siteId, ctx.request.body); },
  async update(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").update(ctx.state.siteId, ctx.params.documentId, ctx.request.body); },
  async delete(ctx: any) { await strapi.plugin("zhao-website").service("ai-content-summary").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
  async regenerate(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").regenerate(ctx.state.siteId, ctx.params.documentId); },
};

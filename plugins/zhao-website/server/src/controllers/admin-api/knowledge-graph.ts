export default {
  // ===== 实体 =====
  async findEntities(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findEntities(ctx.state.siteId, ctx.query);
  },
  async createEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, ctx.request.body);
  },
  async updateEntity(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
  },
  async deleteEntity(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 关系 =====
  async findRelations(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findRelations(ctx.state.siteId, ctx.query);
  },
  async addRelation(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").addRelation({ siteId: ctx.state.siteId, ...ctx.request.body });
  },
  async deleteRelation(ctx) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteRelation(ctx.state.siteId, ctx.params.documentId);
    ctx.body = { success: true };
  },
  // ===== 消歧 =====
  async disambiguate(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").disambiguate(ctx.state.siteId, ctx.request.body);
  },
  // ===== 导出 =====
  async exportGraph(ctx) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(ctx.state.siteId);
  },
};

/** 从 ctx.state.user（is-authenticated 策略注入）取操作人快照 */
const actorOf = (ctx: any) => {
  const u = ctx.state.user;
  return u ? { id: u.id, label: u.username || u.email || String(u.id) } : null;
};

export default {
  // ===== 实体 =====
  async findEntities(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findEntities(ctx.state.siteId, ctx.query);
  },
  async createEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(ctx.state.siteId, ctx.request.body, actorOf(ctx));
  },
  async updateEntity(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(ctx.state.siteId, ctx.params.documentId, ctx.request.body, actorOf(ctx));
  },
  async deleteEntity(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
  // ===== 关系 =====
  async findRelations(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").findRelations(ctx.state.siteId, ctx.query);
  },
  async addRelation(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").addRelation({ siteId: ctx.state.siteId, ...body, actor: actorOf(ctx) });
  },
  async deleteRelation(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
  async updateRelation(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateRelation(ctx.state.siteId, ctx.params.documentId, body, actorOf(ctx));
  },
  // ===== 消歧 =====
  async disambiguate(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").disambiguate(ctx.state.siteId, ctx.request.body);
  },
  // ===== 导出 =====
  async exportGraph(ctx: any) {
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportGraph(ctx.state.siteId);
  },
  // ===== 全局实体 =====
  async createGlobalEntity(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").createEntity(null, body, actorOf(ctx));
  },
  async updateGlobalEntity(ctx: any) {
    const body = ctx.request.body?.data ?? ctx.request.body;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").updateEntity(null, ctx.params.documentId, body, actorOf(ctx));
  },
  async deleteGlobalEntity(ctx: any) {
    await strapi.plugin("zhao-website").service("knowledge-graph").deleteEntity(null, ctx.params.documentId, actorOf(ctx));
    ctx.body = { success: true };
  },
  // ===== 审核动作 =====
  async submitEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").submitEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approveEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").approveEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async rejectEntity(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").rejectEntity(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async submitRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").submitRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approveRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").approveRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async rejectRelation(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").rejectRelation(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  // ===== 流水查询 =====
  async findAuditLogs(ctx: any) {
    const { targetType, targetId, page, pageSize } = ctx.query;
    ctx.body = await strapi.plugin("zhao-website").service("knowledge-audit").findByTarget(
      ctx.state.siteId, targetType, targetId, { page, pageSize }
    );
  },
};

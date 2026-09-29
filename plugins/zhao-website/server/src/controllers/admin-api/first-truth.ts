/** 从 ctx.state.user（is-authenticated 策略注入）取操作人快照 */
const actorOf = (ctx: any) => {
  const u = ctx.state.user;
  return u ? { id: u.id, label: u.username || u.email || String(u.id) } : null;
};

export default {
  async find(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query); },
  async findOne(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId); },
  async create(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, body, actorOf(ctx)); },
  async update(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, body, actorOf(ctx)); },
  async delete(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
  async verify(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); },
  async conflicts(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId); },
  async exportFacts(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId); },
  // ===== 全局真值 =====
  async createGlobal(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, body, actorOf(ctx)); },
  async updateGlobal(ctx: any) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, body, actorOf(ctx)); },
  async deleteGlobal(ctx: any) { await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
  async verifyGlobal(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId, actorOf(ctx)); },
  async submit(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").submit(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async approve(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").approve(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
  async reject(ctx: any) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").reject(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
};

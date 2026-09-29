"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** 从 ctx.state.user（is-authenticated 策略注入）取操作人快照 */
const actorOf = (ctx) => {
    const u = ctx.state.user;
    return u ? { id: u.id, label: u.username || u.email || String(u.id) } : null;
};
exports.default = {
    async find(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").find(ctx.state.siteId, ctx.query); },
    async findOne(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").findOne(ctx.state.siteId, ctx.params.documentId); },
    async create(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(ctx.state.siteId, body, actorOf(ctx)); },
    async update(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(ctx.state.siteId, ctx.params.documentId, body, actorOf(ctx)); },
    async delete(ctx) { await strapi.plugin("zhao-website").service("first-truth").softDelete(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
    async verify(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(ctx.state.siteId, ctx.params.documentId, actorOf(ctx)); },
    async conflicts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").detectConflicts(ctx.state.siteId); },
    async exportFacts(ctx) { ctx.body = await strapi.plugin("zhao-website").service("knowledge-graph").exportFacts(ctx.state.siteId); },
    // ===== 全局真值 =====
    async createGlobal(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").create(null, body, actorOf(ctx)); },
    async updateGlobal(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("first-truth").update(null, ctx.params.documentId, body, actorOf(ctx)); },
    async deleteGlobal(ctx) { await strapi.plugin("zhao-website").service("first-truth").softDelete(null, ctx.params.documentId, actorOf(ctx)); ctx.body = { success: true }; },
    async verifyGlobal(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").verify(null, ctx.params.documentId, actorOf(ctx)); },
    async submit(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").submit(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
    async approve(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").approve(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
    async reject(ctx) { ctx.body = await strapi.plugin("zhao-website").service("first-truth").reject(ctx.state.siteId, ctx.params.documentId, actorOf(ctx), ctx.request.body?.reason); },
};
//# sourceMappingURL=first-truth.js.map
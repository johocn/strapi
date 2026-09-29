"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async findAdmin(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").findAdmin(ctx.state.siteId, ctx.query); },
    async findByTarget(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").findByTarget(ctx.state.siteId, ctx.query.targetType, ctx.query.targetId, ctx.query.summaryType); },
    async create(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").create(ctx.state.siteId, body); },
    async update(ctx) { const body = ctx.request.body?.data ?? ctx.request.body; ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").update(ctx.state.siteId, ctx.params.documentId, body); },
    async delete(ctx) { await strapi.plugin("zhao-website").service("ai-content-summary").softDelete(ctx.state.siteId, ctx.params.documentId); ctx.body = { success: true }; },
    async regenerate(ctx) { ctx.body = await strapi.plugin("zhao-website").service("ai-content-summary").regenerate(ctx.state.siteId, ctx.params.documentId); },
};
//# sourceMappingURL=ai-content-summary.js.map
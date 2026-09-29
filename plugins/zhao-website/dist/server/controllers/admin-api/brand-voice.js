"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // ===== 特殊操作 =====
    async resolve(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").resolveVariables(ctx.state.siteId, ctx.params.documentId, ctx.request.body.variables || {});
    },
    async listByCategory(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(ctx.state.siteId, ctx.params.category);
    },
    // ===== 全局话术 =====
    async createGlobal(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").create(null, body);
    },
    async updateGlobal(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").update(null, ctx.params.documentId, body);
    },
    async deleteGlobal(ctx) {
        await strapi.plugin("zhao-website").service("brand-voice").softDelete(null, ctx.params.documentId);
        ctx.body = { success: true };
    },
    // ===== 公开方法（GEO AI 读取） =====
    async publicList(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").listByCategory(ctx.state.siteId, ctx.query.category);
    },
    async publicByCategory(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("brand-voice").getRefContent(ctx.state.siteId, ctx.params.category);
    },
};
//# sourceMappingURL=brand-voice.js.map
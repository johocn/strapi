"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async find(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").findAdmin(ctx.state.siteId, ctx.query);
    },
    async findOne(ctx) {
        const item = await strapi.plugin("zhao-website").service("geo-article").findOneAdmin(ctx.state.siteId, ctx.params.documentId);
        if (!item)
            return ctx.notFound();
        ctx.body = item;
    },
    async create(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").create(ctx.state.siteId, body);
    },
    async update(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").update(ctx.state.siteId, ctx.params.documentId, body);
    },
    async softDelete(ctx) {
        await strapi.plugin("zhao-website").service("geo-article").softDelete(ctx.state.siteId, ctx.params.documentId);
        ctx.body = { success: true };
    },
    async publish(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").publish(ctx.state.siteId, ctx.params.documentId);
    },
    async archive(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").archive(ctx.state.siteId, ctx.params.documentId);
    },
    async batch(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("geo-article").batch(ctx.state.siteId, ctx.request.body);
    },
};
//# sourceMappingURL=geo-article-admin.js.map
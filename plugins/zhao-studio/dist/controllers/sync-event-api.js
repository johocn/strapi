"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async list(ctx) {
        ctx.body = await strapi.plugin("zhao-studio").service("sync-event").list(ctx.state.siteId, ctx.query);
    },
    async findOne(ctx) {
        ctx.body = await strapi.plugin("zhao-studio").service("sync-event").findOne(ctx.state.siteId, ctx.params.documentId);
    },
    async resolve(ctx) {
        ctx.body = await strapi.plugin("zhao-studio").service("sync-event").resolve(ctx.state.siteId, ctx.params.documentId, ctx.request.body);
    },
    async createFromWebhook(ctx) {
        ctx.body = await strapi.plugin("zhao-studio").service("sync-event").createFromWebhook(ctx.request.body);
    },
};
//# sourceMappingURL=sync-event-api.js.map
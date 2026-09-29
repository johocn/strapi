"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async find(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("brand-info").find(ctx.state.siteId);
    },
    async update(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("brand-info").update(ctx.state.siteId, body);
    },
};
//# sourceMappingURL=brand-info.js.map
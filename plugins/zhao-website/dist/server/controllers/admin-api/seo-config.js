"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async find(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("seo-config").find(ctx.state.siteId);
    },
    async update(ctx) {
        const body = ctx.request.body?.data ?? ctx.request.body;
        ctx.body = await strapi.plugin("zhao-website").service("seo-config").update(ctx.state.siteId, body);
    },
};
//# sourceMappingURL=seo-config.js.map
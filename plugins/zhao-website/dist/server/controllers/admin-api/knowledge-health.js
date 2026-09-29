"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async completeness(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").completeness(ctx.state.siteId);
    },
    async violations(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("knowledge-health").violations(ctx.state.siteId);
    },
};
//# sourceMappingURL=knowledge-health.js.map
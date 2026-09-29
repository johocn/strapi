"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async meta(ctx) {
        const siteId = ctx.state.siteId;
        const requestHost = ctx.request.host;
        const data = await strapi.plugin("zhao-website").service("seo-meta").generate(siteId, requestHost);
        ctx.body = data;
    },
};
//# sourceMappingURL=seo-meta.js.map
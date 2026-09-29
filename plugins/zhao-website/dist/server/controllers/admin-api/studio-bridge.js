"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async publishFromStudio(ctx) {
        ctx.body = await strapi.plugin("zhao-website").service("studio-bridge").publishFromStudio(ctx.state.siteId, ctx.request.body);
    },
};
//# sourceMappingURL=studio-bridge.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async list(ctx) {
        const siteId = ctx.state.siteId;
        const result = await strapi.plugin("zhao-website").service("geo-article").find(siteId, ctx.query);
        ctx.body = result;
    },
    async detail(ctx) {
        const siteId = ctx.state.siteId;
        const { slug } = ctx.params;
        const doc = await strapi.plugin("zhao-website").service("geo-article").findOne(siteId, slug, ctx.query.locale);
        if (!doc)
            return ctx.notFound("GeoArticle not found");
        ctx.body = doc;
    },
    async featured(ctx) {
        const siteId = ctx.state.siteId;
        const result = await strapi.plugin("zhao-website").service("geo-article").findFeatured(siteId, Number(ctx.query.limit) || 5, ctx.query.locale, ctx.query.type);
        ctx.body = result;
    },
};
//# sourceMappingURL=geo-article.js.map
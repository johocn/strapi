"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    // 从 zhao-studio article-draft 复制快照到 zhao-website article
    async publishFromStudio(siteId, params) {
        const draft = await strapi.db.query("plugin::zhao-studio.article-draft").findOne({
            where: { documentId: params.articleDraftDocumentId },
        });
        if (!draft) {
            const e = new Error("Article draft not found");
            e.status = 404;
            throw e;
        }
        // slug 冲突检测
        const slug = params.overrides?.slug || draft.slug;
        const existing = await strapi.db.query("plugin::zhao-website.article").findOne({
            where: { site: siteId, slug, deletedAt: null },
        });
        if (existing) {
            const e = new Error(`Slug "${slug}" 已存在`);
            e.status = 409;
            e.code = "SLUG_EXISTS";
            throw e;
        }
        const articleData = {
            site: siteId,
            title: params.overrides?.title || draft.title,
            slug,
            excerpt: params.overrides?.excerpt || draft.excerpt,
            content: params.overrides?.content || draft.content,
            coverImage: params.overrides?.coverImage || draft.coverImage,
            author: params.overrides?.author || draft.author,
            sourceType: "studio",
            sourceArticleDraft: draft.id,
            sourceUrl: draft.canonicalUrl,
            status: params.overrides?.status || "draft",
            publishedAt: params.overrides?.status === "published" ? new Date().toISOString() : null,
        };
        return strapi.db.query("plugin::zhao-website.article").create({ data: articleData });
    },
});
//# sourceMappingURL=studio-bridge.js.map
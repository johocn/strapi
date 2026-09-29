"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.ai-content-summary";
exports.default = ({ strapi }) => ({
    async findByTarget(siteId, targetType, targetId, summaryType) {
        const filters = { site: siteId, targetType, targetId, deletedAt: null, status: true };
        if (summaryType)
            filters.summaryType = summaryType;
        return strapi.db.query(UID).findMany({ where: filters });
    },
    async findPublic(siteId, query = {}) {
        const { targetType, targetId, summaryType } = query;
        return this.findByTarget(siteId, targetType, targetId, summaryType);
    },
    async findAdmin(siteId, query = {}) {
        // 剥离分页参数：前端传 pagination[page]/pagination[pageSize]，直接透传进 where 会把分页参数当成过滤条件导致 0 行
        const { pagination, ...filters } = query;
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null, ...filters },
            orderBy: { updatedAt: "DESC" },
        });
    },
    async create(siteId, data) {
        // 唯一约束：(site, targetType, targetId, summaryType, language)
        const existing = await strapi.db.query(UID).findOne({
            where: {
                site: siteId,
                targetType: data.targetType,
                targetId: data.targetId,
                summaryType: data.summaryType,
                language: data.language || "zh-CN",
                deletedAt: null,
            },
        });
        if (existing) {
            // version + 1
            return strapi.db.query(UID).update({
                where: { id: existing.id },
                data: { ...data, version: (existing.version || 0) + 1 },
            });
        }
        return strapi.db.query(UID).create({
            data: { ...data, site: siteId, language: data.language || "zh-CN", version: 1 },
        });
    },
    async update(siteId, documentId, data) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Summary not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { ...data, version: (existing.version || 1) + 1 },
        });
    },
    async regenerate(siteId, documentId) {
        // 一期桩：标记为 pending，实际生成由二期 AI 接入
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Summary not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: {
                verificationStatus: "pending",
                generatedAt: null,
            },
        });
    },
    async softDelete(siteId, documentId) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing)
            return null;
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { deletedAt: new Date().toISOString() },
        });
    },
});
//# sourceMappingURL=ai-content-summary.js.map
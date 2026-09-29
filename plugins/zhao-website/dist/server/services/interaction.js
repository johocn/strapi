"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.interaction";
exports.default = ({ strapi }) => ({
    async toggle(siteId, data) {
        // 查询是否已存在
        const existing = await strapi.db.query(UID).findOne({
            where: {
                site: siteId,
                type: data.type,
                targetType: data.targetType,
                targetId: data.targetId,
                visitorId: data.visitorId,
                deletedAt: null,
            },
        });
        if (existing) {
            // 已存在 → 取消（软删除）
            await strapi.db.query(UID).update({
                where: { id: existing.id },
                data: { deletedAt: new Date().toISOString() },
            });
            return { action: "removed" };
        }
        // 不存在 → 创建
        await strapi.db.query(UID).create({
            data: {
                site: siteId,
                type: data.type,
                targetType: data.targetType,
                targetId: data.targetId,
                visitorId: data.visitorId,
                userId: data.userId,
                ipAddress: data.ctx?.request?.ip,
                userAgent: data.ctx?.request?.headers?.["user-agent"],
            },
        });
        if (data.type === "like" || data.type === "comment") {
            strapi.plugin("zhao-website").service("eco-hook")?.send({
                action: data.type,
                ssoId: data.userId,
                targetId: data.targetId,
                extra: { targetType: data.targetType },
            });
        }
        return { action: "created" };
    },
    async check(siteId, params) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, deletedAt: null, ...params },
        });
        return { liked: !!existing };
    },
    async findAdmin(siteId, query = {}) {
        const { page = 1, pageSize = 20, type, targetType, targetId } = query;
        const filters = { site: siteId, deletedAt: null };
        if (type)
            filters.type = type;
        if (targetType)
            filters.targetType = targetType;
        if (targetId)
            filters.targetId = targetId;
        return strapi.db.query(UID).findMany({
            where: filters,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { createdAt: "DESC" },
        });
    },
    async stats(siteId, targetType, targetId) {
        const counts = {};
        for (const type of ["like", "collect", "share"]) {
            const items = await strapi.db.query(UID).findMany({
                where: { site: siteId, type, targetType, targetId, deletedAt: null },
            });
            counts[type] = items.length;
        }
        return counts;
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
//# sourceMappingURL=interaction.js.map
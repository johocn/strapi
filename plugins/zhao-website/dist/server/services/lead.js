"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.lead";
exports.default = ({ strapi }) => ({
    async createPublic(siteId, data, ctx) {
        // honeypot 字段非空 → 假装成功
        if (data.website) {
            return { success: true, fake: true };
        }
        const enriched = {
            ...data,
            site: siteId,
            ipAddress: ctx?.request?.ip,
            userAgent: ctx?.request?.headers?.["user-agent"],
            referrer: ctx?.request?.headers?.referer,
            status: "new",
        };
        delete enriched.website; // 删除 honeypot
        return strapi.db.query(UID).create({ data: enriched });
    },
    async findMine(siteId, userId, query = {}) {
        // 通过 contactEmail / contactPhone 匹配用户（简化）
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null },
            orderBy: { createdAt: "DESC" },
            limit: 50,
        });
    },
    async findAdmin(siteId, query = {}) {
        const { page = 1, pageSize = 20, status, type, assignedTo } = query;
        const filters = { site: siteId, deletedAt: null };
        if (status)
            filters.status = status;
        if (type)
            filters.type = type;
        if (assignedTo)
            filters.assignedTo = assignedTo;
        return strapi.db.query(UID).findMany({
            where: filters,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { createdAt: "DESC" },
        });
    },
    async findOneAdmin(siteId, documentId) {
        return strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
    },
    async update(siteId, documentId, data) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Lead not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data,
        });
    },
    async assign(siteId, documentId, assignedToId) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Lead not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { assignedTo: assignedToId },
        });
    },
    async followUp(siteId, documentId, record) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Lead not found");
            e.status = 404;
            throw e;
        }
        const followUpRecords = Array.isArray(existing.followUpRecords) ? existing.followUpRecords : [];
        followUpRecords.push({
            time: new Date().toISOString(),
            content: record.content,
            result: record.result,
        });
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { followUpRecords },
        });
    },
    async stats(siteId) {
        const all = await strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null },
        });
        const byStatus = all.reduce((acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1;
            return acc;
        }, {});
        const byType = all.reduce((acc, l) => {
            acc[l.type] = (acc[l.type] || 0) + 1;
            return acc;
        }, {});
        return { total: all.length, byStatus, byType };
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
//# sourceMappingURL=lead.js.map
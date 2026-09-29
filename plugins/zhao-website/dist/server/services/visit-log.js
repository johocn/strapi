"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async_writer_1 = require("./utils/async-writer");
const UID = "plugin::zhao-website.visit-log";
let writerInstance = null;
exports.default = ({ strapi }) => ({
    _getWriter() {
        if (!writerInstance) {
            writerInstance = new async_writer_1.AsyncWriter({
                strapi,
                ct: "visit-log",
                uid: "zhao_website_visit_logs",
                flushIntervalMs: 5000,
                flushThreshold: 100,
            });
            writerInstance.start();
        }
        return writerInstance;
    },
    async enqueueCreate(siteId, data) {
        this._getWriter().enqueue({ ...data, site_id: siteId, created_at: new Date() });
        if (data?.type === "article_view") {
            strapi.plugin("zhao-website").service("eco-hook")?.send({
                action: "view_article",
                ssoId: data.userId,
                targetId: data.targetId,
            });
        }
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
    async findMine(siteId, userId, query = {}) {
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null, userId },
            limit: 50,
            orderBy: { createdAt: "DESC" },
        });
    },
    async stats(siteId, days = 30) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const items = await strapi.db.query(UID).findMany({
            where: { site: siteId, createdAt: { $gte: since } },
        });
        const byType = items.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {});
        return { total: items.length, byType, days };
    },
    async purgeOlderThan(days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const deleted = await strapi.db.query(UID).deleteMany({
            where: { createdAt: { $lt: cutoff } },
        });
        return deleted?.count || 0;
    },
});
//# sourceMappingURL=visit-log.js.map
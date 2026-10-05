"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/controllers/browser-log.ts — fixed: extract records array from findMany return
exports.default = ({ strapi }) => ({
    async list(ctx) {
        // 透传完整 Strapi ctx.query，同时兼容老的顶层参数写法（?eventType=xxx）
        const query = { ...ctx.query };
        const topLevelFilters = {};
        if (ctx.query.eventType)
            topLevelFilters.eventType = ctx.query.eventType;
        if (ctx.query.deviceType)
            topLevelFilters.deviceType = ctx.query.deviceType;
        if (ctx.query.city)
            topLevelFilters.city = ctx.query.city;
        if (ctx.query.sessionId)
            topLevelFilters.sessionId = ctx.query.sessionId;
        if (Object.keys(topLevelFilters).length > 0) {
            query.filters = { ...(query.filters || {}), ...topLevelFilters };
        }
        const page = Number(query.pagination?.page) || 1;
        const pageSize = Number(query.pagination?.pageSize) || 10;
        // Strapi 5 documents.findMany 带 pagination 时返回 { records, meta }
        // 不带 pagination 时返回数组。统一两种情况。
        const findManyRes = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({ ...query, pagination: { page, pageSize } });
        const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);
        const total = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .count({ filters: query.filters || {} });
        ctx.body = {
            data: records,
            meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
        };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        const record = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findOne({ documentId: id });
        ctx.body = { data: record };
    },
});
//# sourceMappingURL=browser-log.js.map
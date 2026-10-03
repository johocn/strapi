"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const { summaryType, date } = ctx.query;
        const filters = {};
        if (summaryType)
            filters.summaryType = summaryType;
        if (date)
            filters.date = date;
        const results = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({ filters });
        ctx.body = { data: results };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        const record = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findOne({ documentId: id });
        ctx.body = { data: record };
    },
});
//# sourceMappingURL=stat-summary.js.map
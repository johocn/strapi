"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const { eventType, deviceType, city, sessionId } = ctx.query;
        const filters = {};
        if (eventType)
            filters.eventType = eventType;
        if (deviceType)
            filters.deviceType = deviceType;
        if (city)
            filters.city = city;
        if (sessionId)
            filters.sessionId = sessionId;
        const results = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({ filters });
        ctx.body = { data: results };
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async getChannelReport(ctx) {
        const service = strapi.plugin('zhao-studio').service('channel-report');
        const { channelCode, startDate, endDate, groupBy } = ctx.query;
        const result = await service.getChannelReport({ channelCode, startDate, endDate, groupBy });
        ctx.body = { data: result };
    },
});
//# sourceMappingURL=channel-report.js.map
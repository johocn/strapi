"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const { page = 1, pageSize = 10, channelId, campaignId, status } = ctx.query;
        const result = await service.listExperiments({
            page: Number(page), pageSize: Number(pageSize), channelId, campaignId, status,
        });
        ctx.body = { data: result };
    },
    async findOne(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const result = await service.getExperiment(ctx.params.id);
        ctx.body = { data: result };
    },
    async create(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const result = await service.createExperiment(ctx.request.body.data);
        ctx.body = { data: result };
    },
    async start(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const result = await service.startExperiment(ctx.params.id);
        ctx.body = { data: result };
    },
    async stop(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const result = await service.stopExperiment(ctx.params.id);
        ctx.body = { data: result };
    },
    async report(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const { startDate, endDate } = ctx.query;
        const result = await service.getExperimentReport(ctx.params.id, { startDate, endDate });
        ctx.body = { data: result };
    },
    async pickVariant(ctx) {
        const service = strapi.plugin('zhao-studio').service('ab-test');
        const { sourceTagId, campaignId } = ctx.query;
        let channelId;
        if (sourceTagId) {
            try {
                const tags = await strapi.documents('plugin::zhao-track.source-tag').findMany({
                    filters: { tagId: sourceTagId },
                    populate: { promoCampaign: { populate: { channel: true } } },
                    limit: 1,
                });
                if (tags && tags.length > 0) {
                    channelId = tags[0].promoCampaign?.channel?.documentId;
                }
            }
            catch (err) {
                strapi.log.warn(`[ab-test] pickVariant sourceTag lookup failed: ${err.message}`);
            }
        }
        const result = await service.pickVariant({ channelId, campaignId });
        ctx.body = { data: result };
    },
});
//# sourceMappingURL=ab-test.js.map
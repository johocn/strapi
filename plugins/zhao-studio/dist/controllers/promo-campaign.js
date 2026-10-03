"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const service = strapi.plugin('zhao-studio').service('promo-campaign');
        const { page = 1, pageSize = 10, channelId, status } = ctx.query;
        const result = await service.listCampaigns({
            page: Number(page), pageSize: Number(pageSize),
            channelId, status: status !== undefined ? status === 'true' : undefined,
        });
        ctx.body = { data: result };
    },
    async findOne(ctx) {
        const service = strapi.plugin('zhao-studio').service('promo-campaign');
        const result = await service.getCampaign(ctx.params.id);
        ctx.body = { data: result };
    },
    async create(ctx) {
        const service = strapi.plugin('zhao-studio').service('promo-campaign');
        const result = await service.createCampaign(ctx.request.body.data);
        ctx.body = { data: result };
    },
    async update(ctx) {
        const service = strapi.plugin('zhao-studio').service('promo-campaign');
        const result = await service.updateCampaign(ctx.params.id, ctx.request.body.data);
        ctx.body = { data: result };
    },
    async delete(ctx) {
        const service = strapi.plugin('zhao-studio').service('promo-campaign');
        await service.deleteCampaign(ctx.params.id);
        ctx.body = { data: { success: true } };
    },
});
//# sourceMappingURL=promo-campaign.js.map
"use strict";
// server/src/controllers/analytics.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async trackPageView(ctx) {
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const log = await analyticsService.trackPageView(data);
        ctx.body = { data: log };
    },
    async trackAdClick(ctx) {
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const log = await analyticsService.trackAdClick(data);
        ctx.body = { data: log };
    },
    async trackReadBehavior(ctx) {
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const log = await analyticsService.trackReadBehavior(data);
        ctx.body = { data: log };
    },
    async trackUserRegister(ctx) {
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const log = await analyticsService.trackUserRegister(data);
        ctx.body = { data: log };
    },
    async listAdSlots(ctx) {
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const adSlots = await analyticsService.listAdSlots();
        ctx.body = { data: adSlots };
    },
    async createAdSlot(ctx) {
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const adSlot = await analyticsService.createAdSlot(data);
        ctx.body = { data: adSlot };
    },
    async updateAdSlot(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const adSlot = await analyticsService.updateAdSlot(id, data);
        ctx.body = { data: adSlot };
    },
    async deleteAdSlot(ctx) {
        const { id } = ctx.params;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        await analyticsService.deleteAdSlot(id);
        ctx.body = { data: { success: true } };
    },
    async getOverview(ctx) {
        const { startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const overview = await analyticsService.getOverview({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: overview };
    },
    async getArticleStats(ctx) {
        const { articleId, startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const stats = await analyticsService.getArticleStats({
            articleId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: stats };
    },
    async getAdSlotStats(ctx) {
        const { adSlotId, startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const stats = await analyticsService.getAdSlotStats({
            adSlotId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: stats };
    },
    async getDeviceStats(ctx) {
        const { startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const stats = await analyticsService.getDeviceStats({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: stats };
    },
    async getRegionStats(ctx) {
        const { startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const stats = await analyticsService.getRegionStats({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: stats };
    },
    async getUserStats(ctx) {
        const { startDate, endDate } = ctx.query;
        const analyticsService = strapi.plugin('zhao-studio').service('analytics');
        const stats = await analyticsService.getUserStats({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        ctx.body = { data: stats };
    },
    async findOneAdSlot(ctx) {
        const slot = await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .findOne({ documentId: ctx.params.id });
        ctx.body = { data: slot };
    },
});
//# sourceMappingURL=analytics.js.map
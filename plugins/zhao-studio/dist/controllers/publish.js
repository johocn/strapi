"use strict";
// server/src/controllers/publish.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async listPlatforms(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const platforms = await publishService.listPlatforms();
        ctx.body = { data: platforms };
    },
    async createPlatform(ctx) {
        const { data } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const platform = await publishService.createPlatform(data);
        ctx.body = { data: platform };
    },
    async updatePlatform(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const platform = await publishService.updatePlatform(id, data);
        ctx.body = { data: platform };
    },
    async deletePlatform(ctx) {
        const { id } = ctx.params;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        await publishService.deletePlatform(id);
        ctx.body = { data: { success: true } };
    },
    async listAccounts(ctx) {
        const { platformId } = ctx.query;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const accounts = await publishService.listAccounts(platformId);
        ctx.body = { data: accounts };
    },
    async createAccount(ctx) {
        const { data } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const account = await publishService.createAccount(data);
        ctx.body = { data: account };
    },
    async updateAccount(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const account = await publishService.updateAccount(id, data);
        ctx.body = { data: account };
    },
    async deleteAccount(ctx) {
        const { id } = ctx.params;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        await publishService.deleteAccount(id);
        ctx.body = { data: { success: true } };
    },
    async publishArticle(ctx) {
        const { articleId } = ctx.params;
        const { accountIds } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const results = await publishService.publishArticle(articleId, accountIds);
        ctx.body = { data: results };
    },
    async listRecords(ctx) {
        const { articleId, platformId, accountId } = ctx.query;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const records = await publishService.listRecords({ articleId, platformId, accountId });
        ctx.body = { data: records };
    },
    async retryPublish(ctx) {
        const { recordId } = ctx.params;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.retryPublish(recordId);
        ctx.body = { data: result };
    },
    async syncStatus(ctx) {
        const { articleId } = ctx.params;
        const statusSync = strapi.plugin('zhao-studio').service('status-sync');
        await statusSync.syncPublishStatus(articleId);
        ctx.body = { data: { success: true } };
    },
    async findOne(ctx) {
        const record = await strapi
            .documents('plugin::zhao-studio.publish-record')
            .findOne({ documentId: ctx.params.id });
        ctx.body = { data: record };
    },
    async findOnePlatform(ctx) {
        const platform = await strapi
            .documents('plugin::zhao-studio.publish-platform')
            .findOne({ documentId: ctx.params.id });
        ctx.body = { data: platform };
    },
    async findOneAccount(ctx) {
        const account = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .findOne({ documentId: ctx.params.id });
        ctx.body = { data: account };
    },
    // ============ P2 定时发布 ============
    async createSchedule(ctx) {
        const { articleId, accountIds, scheduledAt, name } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.createSchedule({ articleId, accountIds, scheduledAt, name });
        ctx.body = { data: result };
    },
    async listSchedules(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const schedules = await publishService.listSchedules();
        ctx.body = { data: schedules };
    },
    async findOneSchedule(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const schedule = await publishService.findOneSchedule(ctx.params.id);
        ctx.body = { data: schedule };
    },
    async cancelSchedule(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const schedule = await publishService.cancelSchedule(ctx.params.id);
        ctx.body = { data: schedule };
    },
    // ============ P3 基础补齐 ============
    async getDouyinSchema(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.getDouyinSchema(ctx.params.recordId);
        ctx.body = { data: result };
    },
    async previewPublish(ctx) {
        const { articleId, accountIds } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.previewPublish(articleId, accountIds);
        ctx.body = { data: result };
    },
});
//# sourceMappingURL=publish.js.map
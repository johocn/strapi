"use strict";
// server/src/controllers/publish.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async listPlatforms(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.listPlatforms(ctx.query);
        ctx.body = { data: result.records, meta: { pagination: result.pagination } };
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
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.listAccounts(ctx.query);
        ctx.body = { data: result.records, meta: { pagination: result.pagination } };
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
    async publishVideo(ctx) {
        const { videoId } = ctx.params;
        const { accountIds } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const results = await publishService.publishContent({ type: 'video', contentId: videoId, accountIds });
        ctx.body = { data: results };
    },
    async publishGallery(ctx) {
        const { galleryId } = ctx.params;
        const { accountIds } = ctx.request.body;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const results = await publishService.publishContent({ type: 'gallery', contentId: galleryId, accountIds });
        ctx.body = { data: results };
    },
    async publishContent(ctx) {
        const { type, contentId, accountIds } = ctx.request.body;
        if (!['article', 'video', 'gallery'].includes(type)) {
            return ctx.throw(400, `不支持的 type: ${type}`);
        }
        if (!contentId)
            return ctx.throw(400, 'contentId 必填');
        if (!Array.isArray(accountIds) || accountIds.length === 0) {
            return ctx.throw(400, 'accountIds 必须是非空数组');
        }
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const results = await publishService.publishContent({ type, contentId, accountIds });
        ctx.body = { data: results };
    },
    async listRecords(ctx) {
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const result = await publishService.listRecords(ctx.query);
        ctx.body = { data: result.records, meta: { pagination: result.pagination } };
    },
    async getRecordDetail(ctx) {
        const { recordId } = ctx.params;
        const publishService = strapi.plugin('zhao-studio').service('publish');
        const record = await publishService.getRecordDetail(recordId);
        if (!record)
            return ctx.throw(404, '发布记录不存在');
        ctx.body = { data: record };
    },
    async retryPublish(ctx) {
        const { recordId } = ctx.params;
        try {
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const result = await publishService.retryPublish(recordId);
            ctx.body = { data: result };
        }
        catch (e) {
            ctx.throw(400, e.message);
        }
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
            .findOne({
            documentId: ctx.params.id,
            populate: { account: { populate: { platform: true } }, article: true, video: true, gallery: true },
        });
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
        try {
            const { articleId, videoId, galleryId, accountIds, scheduledAt, name } = ctx.request.body;
            if (!scheduledAt) {
                ctx.throw(400, 'scheduledAt 必填');
                return;
            }
            if (!articleId && !videoId && !galleryId) {
                ctx.throw(400, '必须提供 articleId / videoId / galleryId 之一');
                return;
            }
            const schedTime = new Date(scheduledAt).getTime();
            if (isNaN(schedTime)) {
                ctx.throw(400, 'scheduledAt 格式无效');
                return;
            }
            if (schedTime <= Date.now()) {
                ctx.throw(400, 'scheduledAt 必须晚于当前时间');
                return;
            }
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const result = await publishService.createSchedule({ articleId, videoId, galleryId, accountIds, scheduledAt, name });
            ctx.body = { data: result };
        }
        catch (e) {
            ctx.throw(400, e.message);
        }
    },
    async listSchedules(ctx) {
        try {
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const result = await publishService.listSchedules(ctx.query);
            ctx.body = { data: result.list, meta: { pagination: result.pagination } };
        }
        catch (e) {
            ctx.throw(500, e.message);
        }
    },
    async findOneSchedule(ctx) {
        try {
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const schedule = await publishService.findOneSchedule(ctx.params.id, ctx.query.populate);
            if (!schedule)
                return ctx.throw(404, '定时任务不存在');
            ctx.body = { data: schedule };
        }
        catch (e) {
            ctx.throw(400, e.message);
        }
    },
    async cancelSchedule(ctx) {
        try {
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const schedule = await publishService.cancelSchedule(ctx.params.id);
            ctx.body = { data: schedule };
        }
        catch (e) {
            ctx.throw(400, e.message);
        }
    },
    // ============ P3 基础补齐 ============
    async getDouyinSchema(ctx) {
        try {
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const result = await publishService.getDouyinSchema(ctx.params.recordId);
            ctx.body = { data: result };
        }
        catch (e) {
            if (e.message?.includes('不存在'))
                return ctx.throw(404, e.message);
            ctx.throw(400, e.message);
        }
    },
    async previewPublish(ctx) {
        try {
            const { articleId, accountIds } = ctx.request.body;
            const publishService = strapi.plugin('zhao-studio').service('publish');
            const result = await publishService.previewPublish(articleId, accountIds);
            ctx.body = { data: result };
        }
        catch (e) {
            if (e.message?.includes('不存在'))
                return ctx.throw(404, e.message);
            ctx.throw(400, e.message);
        }
    },
});
//# sourceMappingURL=publish.js.map
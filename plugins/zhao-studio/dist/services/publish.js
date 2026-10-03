"use strict";
// server/src/services/publish.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async publishArticle(articleId, accountIds, opts) {
        const article = await strapi
            .documents('plugin::zhao-studio.article-draft')
            .findOne({ documentId: articleId });
        if (!article)
            throw new Error('文章不存在');
        if (article.status !== 'ready')
            throw new Error('文章未准备好发布，请先完成编辑');
        const accounts = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .findMany({
            filters: {
                documentId: { $in: accountIds },
                isActive: true,
            },
        });
        if (accounts.length === 0)
            throw new Error('未找到有效的发布账号');
        // 定时发布 → 创建 publish-schedule，由 scheduler 触发
        if (opts?.scheduledAt) {
            const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').create({
                data: {
                    name: `定时发布 ${article.title || article.documentId} @ ${opts.scheduledAt.toISOString()}`,
                    article: article.documentId,
                    accountIds: accounts.map((a) => a.documentId || a.id),
                    scheduledAt: opts.scheduledAt,
                    status: 'scheduled',
                },
            });
            return [{ trigger: 'scheduled', scheduleId: schedule.documentId, accountCount: accounts.length }];
        }
        // 立即发布 → 入 studio-publish 队列
        const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
        const results = [];
        for (const account of accounts) {
            const accDocId = account.documentId || account.id;
            const record = await strapi
                .documents('plugin::zhao-studio.publish-record')
                .create({ data: { article: articleId, account: accDocId, status: 'queued' } });
            try {
                await publishQueue.enqueuePublish({
                    articleId,
                    accountId: accDocId,
                    publishRecordId: record.documentId,
                    triggerSource: 'manual',
                });
                results.push({
                    accountId: accDocId,
                    accountName: account.name,
                    platform: account.platform?.type,
                    success: true,
                    queued: true,
                    recordId: record.documentId,
                });
            }
            catch (err) {
                // 队列不可用 → 降级同步发布
                strapi.log.warn(`[zhao-studio] queue unavailable, sync fallback for account=${accDocId}`);
                try {
                    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
                    const adapted = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');
                    const syncResult = await channelAdapter.publish(adapted, account);
                    await strapi.documents('plugin::zhao-studio.publish-record').update({
                        documentId: record.documentId,
                        data: {
                            status: syncResult.success ? 'success' : 'failed',
                            externalId: syncResult.externalId || syncResult.publishId,
                            error: syncResult.error,
                            finishedAt: new Date(),
                        },
                    });
                    results.push({
                        accountId: accDocId,
                        accountName: account.name,
                        platform: account.platform?.type,
                        success: syncResult.success,
                        externalId: syncResult.externalId || syncResult.publishId,
                        error: syncResult.error,
                        recordId: record.documentId,
                    });
                }
                catch (syncErr) {
                    await strapi.documents('plugin::zhao-studio.publish-record').update({
                        documentId: record.documentId,
                        data: { status: 'failed', error: syncErr.message, finishedAt: new Date() },
                    });
                    results.push({
                        accountId: accDocId,
                        accountName: account.name,
                        platform: account.platform?.type,
                        success: false,
                        error: syncErr.message,
                        recordId: record.documentId,
                    });
                }
            }
        }
        return results;
    },
    async listPlatforms() {
        const platforms = await strapi
            .documents('plugin::zhao-studio.publish-platform')
            .findMany({
            filters: { isActive: true },
        });
        return platforms;
    },
    async createPlatform(data) {
        const platform = await strapi
            .documents('plugin::zhao-studio.publish-platform')
            .create({ data });
        return platform;
    },
    async updatePlatform(platformId, data) {
        const platform = await strapi
            .documents('plugin::zhao-studio.publish-platform')
            .update({
            documentId: platformId,
            data,
        });
        return platform;
    },
    async deletePlatform(platformId) {
        await strapi
            .documents('plugin::zhao-studio.publish-platform')
            .delete({ documentId: platformId });
    },
    async listAccounts(platformId) {
        const filters = { isActive: true };
        if (platformId) {
            filters.platform = platformId;
        }
        const accounts = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .findMany({ filters });
        return accounts;
    },
    async createAccount(data) {
        const account = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .create({ data });
        return account;
    },
    async updateAccount(accountId, data) {
        const account = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .update({
            documentId: accountId,
            data,
        });
        return account;
    },
    async deleteAccount(accountId) {
        await strapi
            .documents('plugin::zhao-studio.publish-account')
            .delete({ documentId: accountId });
    },
    async listRecords(filters = {}) {
        const { articleId, platformId, accountId } = filters;
        const queryFilters = {};
        if (articleId) {
            queryFilters.article = articleId;
        }
        if (platformId) {
            queryFilters.platform = platformId;
        }
        if (accountId) {
            queryFilters.account = accountId;
        }
        const records = await strapi
            .documents('plugin::zhao-studio.publish-record')
            .findMany({
            filters: queryFilters,
            sort: 'publishedAt:desc',
        });
        return records;
    },
    async retryPublish(recordId) {
        const record = await strapi
            .documents('plugin::zhao-studio.publish-record')
            .findOne({ documentId: recordId });
        if (!record || record.status !== 'failed') {
            throw new Error('只能重试失败的发布记录');
        }
        const articleId = String(record.article?.documentId || record.article);
        const accountId = String(record.account?.documentId || record.account);
        // 队列可用 → 入队重试
        try {
            const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
            await strapi.documents('plugin::zhao-studio.publish-record').update({
                documentId: recordId,
                data: { status: 'queued', error: null, retryCount: (record.retryCount || 0) + 1 },
            });
            await publishQueue.enqueuePublish({
                articleId,
                accountId,
                publishRecordId: recordId,
                triggerSource: 'retry',
            });
            return { success: true, queued: true, recordId };
        }
        catch {
            // 队列不可用 → 降级同步
            const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
            const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
            if (!article || !account)
                throw new Error('文章或账号不存在');
            const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
            const adaptedContent = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');
            const result = await channelAdapter.publish(adaptedContent, account);
            await strapi.documents('plugin::zhao-studio.publish-record').update({
                documentId: recordId,
                data: {
                    status: result.success ? 'success' : 'failed',
                    externalId: result.externalId,
                    error: result.error,
                    retryCount: (record.retryCount || 0) + 1,
                    finishedAt: new Date(),
                },
            });
            return result;
        }
    },
    // ============ 定时发布（P2 新增） ============
    async createSchedule(data) {
        return this.publishArticle(data.articleId, data.accountIds, { scheduledAt: new Date(data.scheduledAt) });
    },
    async listSchedules(filters = {}) {
        return strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
            filters: { ...filters },
            sort: 'scheduledAt:desc',
        });
    },
    async findOneSchedule(id) {
        return strapi.documents('plugin::zhao-studio.publish-schedule').findOne({ documentId: id });
    },
    async cancelSchedule(id) {
        const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').findOne({ documentId: id });
        if (!schedule)
            throw new Error('定时任务不存在');
        if (schedule.status !== 'scheduled') {
            throw new Error(`只能取消 scheduled 状态的任务（当前状态: ${schedule.status}）`);
        }
        return strapi.documents('plugin::zhao-studio.publish-schedule').update({
            documentId: id,
            data: { status: 'cancelled' },
        });
    },
    async getDouyinSchema(recordId) {
        const record = await strapi.documents('plugin::zhao-studio.publish-record').findOne({ documentId: recordId });
        if (!record)
            throw new Error('发布记录不存在');
        let schema = null;
        const err = record.error;
        if (err && typeof err === 'string') {
            try {
                const parsed = JSON.parse(err);
                if (parsed.platform === 'douyin' && parsed.schema)
                    schema = parsed.schema;
            }
            catch { /* ignore */ }
        }
        if (!schema) {
            throw new Error('该发布记录不是 douyin h5_share 模式或已过期');
        }
        return { recordId, schema };
    },
    async previewPublish(articleId, accountIds) {
        const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
        if (!article)
            throw new Error('文章不存在');
        const accounts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
            filters: { documentId: { $in: accountIds }, isActive: true },
        });
        if (accounts.length === 0)
            throw new Error('未找到有效账号');
        const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
        const results = [];
        for (const account of accounts) {
            const platformType = account.platform?.type || 'custom';
            try {
                const adapted = await channelAdapter.adaptContent(article, platformType);
                results.push({
                    accountId: account.documentId,
                    accountName: account.name,
                    platform: platformType,
                    adaptedTitle: adapted.title,
                    adaptedContentPreview: String(adapted.content || '').substring(0, 500),
                    contentLength: String(adapted.content || '').length,
                });
            }
            catch (err) {
                results.push({
                    accountId: account.documentId,
                    accountName: account.name,
                    platform: platformType,
                    error: err.message,
                });
            }
        }
        return { articleId, articleTitle: article.title, results };
    },
});
//# sourceMappingURL=publish.js.map
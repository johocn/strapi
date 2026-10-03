"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../utils/queue");
exports.default = ({ strapi }) => ({
    registerSchedulers() {
        const queue = (0, queue_1.getSchedulerQueue)();
        if (!queue)
            return;
        queue.add('scan-and-trigger', { type: 'scan' }, {
            repeat: { cron: '* * * * *' },
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 20,
            removeOnFail: 10,
        });
        queue.process('scan-and-trigger', async () => {
            await this.scanAndTriggerSchedules();
            await this.refreshExpiringTokens();
            return { ok: true };
        });
    },
    async scanAndTriggerSchedules() {
        const now = new Date();
        const pending = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
            filters: {
                status: 'scheduled',
                scheduledAt: { $lte: now },
            },
        });
        for (const schedule of pending) {
            try {
                // accountIds 是 JSON 数组存 documentId
                const accountIds = Array.isArray(schedule.accountIds) ? schedule.accountIds : [];
                for (const accId of accountIds) {
                    const record = await strapi.documents('plugin::zhao-studio.publish-record').create({
                        data: {
                            article: schedule.article?.documentId || schedule.article,
                            account: accId,
                            status: 'queued',
                            scheduledAt: schedule.scheduledAt,
                        },
                    });
                    const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
                    await publishQueue.enqueuePublish({
                        articleId: String(schedule.article?.documentId || schedule.article),
                        accountId: accId,
                        publishRecordId: record.documentId,
                        triggerSource: 'schedule',
                    });
                }
                await strapi.documents('plugin::zhao-studio.publish-schedule').update({
                    documentId: schedule.documentId,
                    data: { status: 'triggered', triggeredAt: new Date() },
                });
            }
            catch (err) {
                strapi.log.error(`[zhao-studio] schedule trigger failed schedule=${schedule.documentId}: ${err.message}`);
            }
        }
        // 过期 24h 未触发 → 标记 expired
        const expired = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
            filters: {
                status: 'scheduled',
                scheduledAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
        });
        for (const s of expired) {
            await strapi.documents('plugin::zhao-studio.publish-schedule').update({
                documentId: s.documentId,
                data: { status: 'expired' },
            });
        }
    },
    async refreshExpiringTokens() {
        const soon = new Date(Date.now() + 10 * 60 * 1000);
        const accounts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
            filters: {
                oauthExpiresAt: { $lt: soon.toISOString() },
                oauthState: 'authorized',
            },
        });
        const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
        for (const acc of accounts) {
            try {
                await oauthManager.ensureValidToken(acc.documentId);
            }
            catch (err) {
                strapi.log.warn(`[zhao-studio] auto refresh token failed account=${acc.documentId}: ${err.message}`);
                await strapi.documents('plugin::zhao-studio.publish-account').update({
                    documentId: acc.documentId,
                    data: { oauthState: 'expired' },
                });
            }
        }
    },
});
//# sourceMappingURL=scheduler.js.map
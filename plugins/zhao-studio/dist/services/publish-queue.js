"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAGES = void 0;
const queue_1 = require("../utils/queue");
exports.STAGES = {
    VALIDATE: 'validateContent',
    ENSURE_TOKEN: 'ensureOAuthToken',
    ADAPT: 'adaptContent',
    PUBLISH: 'publish',
    CHECK_STATUS: 'checkStatus',
    FINALIZE: 'finalize',
};
const STAGE_TO_STATUS = {
    [exports.STAGES.VALIDATE]: 'validating',
    [exports.STAGES.ENSURE_TOKEN]: 'validating',
    [exports.STAGES.ADAPT]: 'validating',
    [exports.STAGES.PUBLISH]: 'publishing',
    [exports.STAGES.CHECK_STATUS]: 'checking_status',
    [exports.STAGES.FINALIZE]: 'success',
};
exports.default = ({ strapi }) => ({
    async enqueuePublish(data) {
        const queue = (0, queue_1.getPublishQueue)();
        if (!queue) {
            throw new Error('发布队列不可用，请检查 Redis 连接');
        }
        const job = await queue.add('publish-job', data, {
            jobId: data.publishRecordId,
        });
        await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: data.publishRecordId,
            data: { jobId: String(job.id), status: 'queued', queueStage: exports.STAGES.VALIDATE },
        }).catch(() => { });
        return String(job.id);
    },
    registerProcessors() {
        const queue = (0, queue_1.getPublishQueue)();
        if (!queue)
            return;
        queue.process('publish-job', 5, async (job) => {
            const data = job.data;
            const stages = [
                exports.STAGES.VALIDATE,
                exports.STAGES.ENSURE_TOKEN,
                exports.STAGES.ADAPT,
                exports.STAGES.PUBLISH,
                exports.STAGES.CHECK_STATUS,
                exports.STAGES.FINALIZE,
            ];
            let result = {};
            let errorMsg = null;
            for (const stage of stages) {
                try {
                    await strapi.documents('plugin::zhao-studio.publish-record').update({
                        documentId: data.publishRecordId,
                        data: { queueStage: stage, status: STAGE_TO_STATUS[stage] },
                    }).catch(() => { });
                    result = await this.runStage(stage, data, result);
                }
                catch (err) {
                    errorMsg = err.message || String(err);
                    strapi.log.error(`[zhao-studio] publish stage ${stage} failed: ${errorMsg}`);
                    break;
                }
            }
            if (errorMsg) {
                await strapi.documents('plugin::zhao-studio.publish-record').update({
                    documentId: data.publishRecordId,
                    data: { status: 'failed', error: errorMsg, finishedAt: new Date() },
                }).catch(() => { });
                throw new Error(errorMsg);
            }
            await strapi.documents('plugin::zhao-studio.publish-record').update({
                documentId: data.publishRecordId,
                data: {
                    status: result.publish_mode === 'h5_share' ? 'queued' : 'success',
                    externalId: result.externalId || result.publishId,
                    url: result.url,
                    finishedAt: new Date(),
                    error: result.publish_mode === 'h5_share'
                        ? JSON.stringify({ platform: 'douyin', phase: 'h5_share', schema: result.schema })
                        : undefined,
                },
            }).catch(() => { });
            return result;
        });
    },
    async runStage(stage, data, prev) {
        const { articleId, accountId, publishRecordId } = data;
        const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
        const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
        if (!article || !account)
            throw new Error(`文章或账号不存在 article=${articleId} account=${accountId}`);
        const platformType = account.platform?.type || 'custom';
        const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
        if (stage === exports.STAGES.VALIDATE) {
            await strapi.documents('plugin::zhao-studio.publish-record').update({
                documentId: publishRecordId,
                data: { startedAt: new Date() },
            }).catch(() => { });
        }
        switch (stage) {
            case exports.STAGES.VALIDATE:
                return { ...prev };
            case exports.STAGES.ENSURE_TOKEN: {
                const oauthPlatforms = ['wechat', 'douyin'];
                if (oauthPlatforms.includes(platformType)) {
                    const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
                    const token = await oauthManager.ensureValidToken(accountId);
                    return { ...prev, accessToken: token };
                }
                return { ...prev };
            }
            case exports.STAGES.ADAPT: {
                const adapted = await channelAdapter.adaptContent(article, platformType);
                return { ...prev, adaptedContent: adapted };
            }
            case exports.STAGES.PUBLISH: {
                const publishResult = await channelAdapter.publish(prev.adaptedContent, account);
                return { ...prev, ...publishResult };
            }
            case exports.STAGES.CHECK_STATUS: {
                if (platformType === 'wechat' && prev.publishId) {
                    const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat');
                    if (ssoWx?.getAccessToken) {
                        const wxToken = await ssoWx.getAccessToken('official_account');
                        const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
                        const MAX_POLL = 10;
                        const POLL_MS = 5000;
                        let finalData = null;
                        for (let i = 0; i < MAX_POLL; i++) {
                            await new Promise(r => setTimeout(r, POLL_MS));
                            try {
                                const resp = await axios.post(`https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${wxToken}`, { publish_id: prev.publishId }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
                                finalData = resp.data;
                                if (finalData.publish_status === 0) {
                                    const articleUrl = finalData.article_detail?.item?.[0]?.article_url;
                                    const articleId = finalData.article_id;
                                    return { ...prev, externalId: articleId, url: articleUrl };
                                }
                                else if (finalData.publish_status === 2) {
                                    throw new Error(`平台审核拒绝 (freepublish_status=2): ${JSON.stringify(finalData)}`);
                                }
                            }
                            catch (err) {
                                if (err.message.includes('审核拒绝'))
                                    throw err;
                                continue;
                            }
                        }
                        strapi.log.warn(`[zhao-studio] wechat freepublish poll timeout for publishId=${prev.publishId}`);
                        return { ...prev, externalId: prev.publishId, error: '发布已提交但轮询超时' };
                    }
                }
                return { ...prev };
            }
            case exports.STAGES.FINALIZE:
                return prev;
            default:
                throw new Error(`未知 stage: ${stage}`);
        }
    },
});
//# sourceMappingURL=publish-queue.js.map
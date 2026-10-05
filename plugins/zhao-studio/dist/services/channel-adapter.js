"use strict";
// server/src/services/channel-adapter.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const platformAdapters_1 = require("../utils/platformAdapters");
const publish_adapter_1 = require("../utils/publish-adapter");
const publishErrors_1 = require("../utils/publishErrors");
const CONTENT_UID = {
    article: 'plugin::zhao-studio.article-draft',
    video: 'plugin::zhao-studio.publish-video',
    gallery: 'plugin::zhao-studio.publish-gallery',
};
exports.default = ({ strapi }) => ({
    async publish(content, account, contentType) {
        const resolvedType = contentType || (0, publish_adapter_1.detectContentType)(content);
        const platformType = account.platform?.type || 'custom';
        // 1. 验证内容适配性（用 publish-adapter 的新签名，支持 video/gallery）
        const validation = (0, publish_adapter_1.validateContentForPlatform)(content, resolvedType, platformType);
        if (!validation.valid) {
            throw new Error(validation.errors.join('; '));
        }
        // 2. 准备发布凭证：OAuth 平台走 oauth-manager.ensureValidToken
        //    internal/custom/toutiao/xiaohongshu 用 account.config.apiKey（兼容旧逻辑）
        let accessToken;
        const oauthPlatforms = ['wechat', 'douyin'];
        if (oauthPlatforms.includes(platformType)) {
            try {
                const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
                accessToken = await oauthManager.ensureValidToken(account.documentId || account.id);
            }
            catch (err) {
                throw new Error(`平台 ${platformType} 需要 OAuth 授权，请在账号管理页完成授权后重试（${err.message}）`);
            }
        }
        try {
            switch (platformType) {
                case 'toutiao': return await this.publishToToutiao(content, account, resolvedType, accessToken);
                case 'xiaohongshu': return await this.publishToXiaohongshu(content, account, resolvedType, accessToken);
                case 'wechat': return await this.publishToWechat(content, account, resolvedType, accessToken);
                case 'douyin': return await this.publishToDouyin(content, account, resolvedType, accessToken);
                case 'internal': return await this.publishToInternal(content, account, resolvedType);
                case 'custom': return await this.publishToCustom(content, account, resolvedType, accessToken);
                case 'bilibili': return await this.publishToBilibili(content, account, resolvedType);
                default: throw new Error(`暂不支持的平台类型: ${platformType}`);
            }
        }
        catch (error) {
            const publishError = (0, publishErrors_1.identifyPublishError)(error, platformType);
            throw new Error(publishError.message);
        }
    },
    async publishToToutiao(content, account, contentType, _accessToken) {
        if (contentType !== 'article') {
            throw new Error(`头条 RPA 暂只支持 article 类型，当前 contentType=${contentType}`);
        }
        const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
        const res = await rpaClient.publishViaRPA({
            platform: 'toutiao',
            accountId: account.documentId || account.id || account._id,
            title: content.title || '',
            content: content.content || content.aiSummary || '',
            coverImage: account.config?.coverImage || undefined,
            images: Array.isArray(account.config?.images) ? account.config.images : undefined,
        });
        if (!res.success) {
            throw new Error(res.error || '头条 RPA 发布失败');
        }
        return { success: true, ...res, contentType };
    },
    async publishToXiaohongshu(content, account, contentType, _accessToken) {
        if (contentType !== 'article') {
            throw new Error(`小红书 RPA 暂只支持 article 类型，当前 contentType=${contentType}`);
        }
        const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
        const res = await rpaClient.publishViaRPA({
            platform: 'xiaohongshu',
            accountId: account.documentId || account.id || account._id,
            title: content.title || '',
            content: content.content || content.aiSummary || '',
            coverImage: account.config?.coverImage || undefined,
            images: Array.isArray(account.config?.images) ? account.config.images : undefined,
        });
        if (!res.success) {
            throw new Error(res.error || '小红书 RPA 发布失败');
        }
        return { success: true, ...res, contentType };
    },
    async publishToBilibili(content, account, contentType, _accessToken) {
        if (contentType === 'gallery') {
            throw new Error(`bilibili RPA 暂不支持 gallery 类型，当前 contentType=${contentType}`);
        }
        const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
        const res = await rpaClient.publishViaRPA({
            platform: 'bilibili',
            accountId: account.documentId || account.id || account._id,
            title: content.title || '',
            content: content.content || content.aiSummary || '',
            coverImage: account.config?.coverImage || content.coverImage || undefined,
            images: Array.isArray(account.config?.images) ? account.config.images : undefined,
            videoUrl: contentType === 'video' ? content.videoUrl : undefined,
        });
        if (!res.success) {
            throw new Error(res.error || 'bilibili RPA 发布失败');
        }
        return { success: true, ...res, contentType };
    },
    async publishToWechat(content, account, contentType, _accessToken) {
        if (contentType !== 'article') {
            throw new Error(`公众号 freepublish 暂只支持 article 类型，当前 contentType=${contentType}`);
        }
        const ssoArticle = strapi.plugin('zhao-sso')?.service('sso-wx-article');
        const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat');
        if (!ssoArticle?.create || !ssoWx?.getAccessToken) {
            throw new Error('公众号协议执行器不可用：请确认已启用 zhao-sso 插件');
        }
        // Step A: 建草稿（委托 zhao-sso）
        const draft = await ssoArticle.create({
            title: content.title,
            author: content.author || content.sourceAuthor || '',
            digest: content.aiSummary || String(content.content || '').substring(0, 100),
            content: content.content || '',
            thumb_media_id: account.config?.mediaId || '',
            content_source_url: content.sourceUrl || '',
        });
        const draftMediaId = draft.draft_id;
        if (!draftMediaId) {
            return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但无法自动发布（需人工确认 media_id）', contentType };
        }
        // Step B: 获取公众号级 access_token（zhao-sso 的 sso-wechat.getAccessToken，不走 OAuth）
        const wxToken = await ssoWx.getAccessToken('official_account');
        if (!wxToken) {
            return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但 access_token 不可用，无法自动发布', contentType };
        }
        // Step C: freepublish/submit 提交发布
        let submitRes;
        try {
            const resp = await axios_1.default.post(`https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${wxToken}`, { media_id: draftMediaId }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
            submitRes = resp.data;
        }
        catch (err) {
            return { success: true, createdDraft: true, draftId: draftMediaId, error: `草稿已建立但提交发布失败: ${err.message}`, contentType };
        }
        if (submitRes.errcode !== 0) {
            return { success: true, createdDraft: true, draftId: draftMediaId, error: `freepublish/submit 失败 errcode=${submitRes.errcode} errmsg=${submitRes.errmsg}`, contentType };
        }
        const publishId = submitRes.publish_id;
        // Step D: 不再同步轮询 — 交给 Bull Flow checkStatus 阶段
        return {
            success: true,
            externalId: publishId,
            publishId,
            contentType,
        };
    },
    async publishToInternal(content, account, contentType) {
        // 内部渠道发布：直接更新对应内容状态为已发布
        const channelCode = account.config?.channelCode;
        const uid = CONTENT_UID[contentType];
        if (!uid) {
            throw new Error(`未知 contentType=${contentType}，无法映射 UID`);
        }
        await strapi.documents(uid).update({
            documentId: content.documentId,
            data: {
                status: 'published',
                publishedAt: new Date(),
            },
        });
        let accessUrl;
        switch (contentType) {
            case 'article':
                accessUrl = `/api/zhao-studio/articles/${content.documentId}`;
                break;
            case 'video':
                accessUrl = content.videoUrl || `/api/zhao-studio/videos/${content.documentId}`;
                break;
            case 'gallery':
                accessUrl = `/api/zhao-studio/galleries/${content.documentId}`;
                break;
            default:
                accessUrl = '';
        }
        return {
            success: true,
            externalId: content.documentId,
            accessUrl,
            channelCode,
            contentType,
        };
    },
    async publishToCustom(content, account, contentType, _accessToken) {
        if (contentType === 'video') {
            // video: 不调外部 API，记录 externalId + 更新状态（与 internal 行为一致）
            const uid = CONTENT_UID.video;
            await strapi.documents(uid).update({
                documentId: content.documentId,
                data: { status: 'published', publishedAt: new Date() },
            });
            return {
                success: true,
                externalId: content.documentId,
                accessUrl: content.videoUrl,
                contentType,
                custom: true,
            };
        }
        if (contentType === 'gallery') {
            const uid = CONTENT_UID.gallery;
            await strapi.documents(uid).update({
                documentId: content.documentId,
                data: { status: 'published', publishedAt: new Date() },
            });
            return {
                success: true,
                externalId: content.documentId,
                accessUrl: `/api/zhao-studio/galleries/${content.documentId}`,
                contentType,
                custom: true,
            };
        }
        // article: 保持原 HTTP POST 逻辑
        const endpoint = account.config?.endpoint;
        if (!endpoint) {
            throw new Error('自定义渠道未配置endpoint');
        }
        const response = await axios_1.default.post(endpoint, {
            title: content.title,
            content: content.content,
            sourceUrl: content.sourceUrl,
            author: content.author,
            publishedAt: new Date(),
        }, {
            headers: {
                'Authorization': `Bearer ${account.config?.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        return {
            success: response.data.success || response.data.code === 0,
            externalId: response.data.id || response.data.externalId,
            error: response.data.message || response.data.error,
            contentType,
        };
    },
    generateDouyinShareSchema({ clientKey, ticket, videoPath, title, customCoverImageUrl, }) {
        const nonceStr = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const kv = {
            ticket,
            timestamp,
            nonce_str: nonceStr,
        };
        const sortedKeys = Object.keys(kv).sort();
        const queryStr = sortedKeys.map(k => `${k}=${kv[k]}`).join('&');
        const signature = crypto.createHash('md5').update(queryStr).digest('hex');
        const params = new URLSearchParams({
            share_type: 'h5',
            client_key: clientKey,
            nonce_str: nonceStr,
            timestamp,
            signature,
            title,
        });
        if (videoPath)
            params.set('video_path', videoPath);
        if (customCoverImageUrl)
            params.set('custom_cover_image_url', customCoverImageUrl);
        return `snssdk1128://openplatform/share?${params.toString()}`;
    },
    async getDouyinTicket(clientKey, clientSecret) {
        const tokenResp = await axios_1.default.post('https://open.douyin.com/oauth/client_token/', { client_key: clientKey, client_secret: clientSecret, grant_type: 'client_credential' }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
        const clientToken = tokenResp.data?.data?.access_token;
        if (!clientToken)
            throw new Error(`douyin client_token 获取失败: ${JSON.stringify(tokenResp.data)}`);
        const ticketResp = await axios_1.default.get('https://open.douyin.com/open/getticket/', {
            headers: { 'access-token': clientToken },
            timeout: 10000,
        });
        const ticket = ticketResp.data?.data?.ticket;
        if (!ticket)
            throw new Error(`douyin open_ticket 获取失败: ${JSON.stringify(ticketResp.data)}`);
        return ticket;
    },
    async publishToDouyin(content, account, contentType, _accessToken) {
        if (contentType !== 'article') {
            throw new Error(`douyin H5 分享 schema 暂只支持 article 类型，当前 contentType=${contentType}`);
        }
        // 抖音服务端 API (video.create.bind) 仅对党政/事业单位开放
        // 普通企业主体降级方案：生成 H5 分享 schema URL，由用户在前端扫码唤起抖音 App 发布
        const cfg = strapi.plugin('zhao-studio').config()?.publish?.platforms?.douyin || {};
        const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
        const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
        if (!clientKey || !clientSecret) {
            throw new Error('未配置抖音 clientKey/clientSecret，无法生成分享 schema');
        }
        const ticket = await this.getDouyinTicket(clientKey, clientSecret);
        const videoPath = content.videoPath || content.videoUrl || content.coverImage;
        const schema = this.generateDouyinShareSchema({
            clientKey,
            ticket,
            videoPath,
            title: content.title || '',
            customCoverImageUrl: content.coverImage,
        });
        return {
            success: true,
            publish_mode: 'h5_share',
            schema,
            contentType,
        };
    },
    async adaptContent(content, platformType) {
        const adapter = (0, platformAdapters_1.getPlatformAdapter)(platformType);
        if (!adapter) {
            return content;
        }
        // 适配标题长度
        let adaptedTitle = content.title;
        if (adaptedTitle && adaptedTitle.length > adapter.maxTitleLength) {
            adaptedTitle = adaptedTitle.substring(0, adapter.maxTitleLength);
        }
        // 适配内容长度
        let adaptedContent = content.content;
        if (adaptedContent && adaptedContent.length > adapter.maxContentLength) {
            adaptedContent = adaptedContent.substring(0, adapter.maxContentLength);
        }
        return {
            ...content,
            title: adaptedTitle,
            content: adaptedContent,
        };
    },
    async checkExternalStatus(record) {
        const account = await strapi
            .documents('plugin::zhao-studio.publish-account')
            .findOne({ documentId: record.account?.documentId || record.account });
        if (!account || account.platform?.type === 'internal') {
            return { deleted: false };
        }
        // 简化实现：默认返回未删除状态
        // 实际需要调用各平台API检查文章状态
        return { deleted: false, status: 'published' };
    },
});
//# sourceMappingURL=channel-adapter.js.map
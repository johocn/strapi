"use strict";
// server/src/utils/publishErrors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishErrors = void 0;
exports.identifyPublishError = identifyPublishError;
exports.PublishErrors = {
    ARTICLE_NOT_READY: {
        code: 'PUB_001',
        message: '文章未准备好发布，请先完成编辑',
    },
    ACCOUNT_NOT_FOUND: {
        code: 'PUB_002',
        message: '发布账号不存在或已禁用',
    },
    PLATFORM_NOT_SUPPORTED: {
        code: 'PUB_003',
        message: '该平台类型暂不支持发布',
    },
    API_ERROR: {
        code: 'PUB_004',
        message: '外部平台API调用失败',
    },
    AUTH_ERROR: {
        code: 'PUB_005',
        message: 'API密钥无效或已过期',
    },
    CONTENT_TOO_LONG: {
        code: 'PUB_006',
        message: '内容长度超过平台限制',
    },
    IMAGE_ERROR: {
        code: 'PUB_007',
        message: '图片上传失败',
    },
    NETWORK_ERROR: {
        code: 'PUB_008',
        message: '网络连接失败，请稍后重试',
    },
    OAUTH_TOKEN_EXPIRED: {
        code: 'PUB_009',
        message: '账号授权已失效，请重新授权',
    },
    OAUTH_REFRESH_FAILED: {
        code: 'PUB_010',
        message: 'OAuth token 续期失败',
    },
    PLATFORM_RATE_LIMITED: {
        code: 'PUB_011',
        message: '平台限流，请稍后再试',
    },
    PLATFORM_REJECTED: {
        code: 'PUB_012',
        message: '平台审核拒绝',
    },
};
function identifyPublishError(error, platform) {
    if (error.message?.includes('not ready') || error.message?.includes('未准备好')) {
        return exports.PublishErrors.ARTICLE_NOT_READY;
    }
    if (error.message?.includes('account') || error.message?.includes('账号')) {
        return exports.PublishErrors.ACCOUNT_NOT_FOUND;
    }
    if (error.message?.includes('platform') || error.message?.includes('平台')) {
        return { ...exports.PublishErrors.PLATFORM_NOT_SUPPORTED, platform };
    }
    if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
        return { ...exports.PublishErrors.AUTH_ERROR, platform };
    }
    if (error.message?.includes('length') || error.message?.includes('长度')) {
        return { ...exports.PublishErrors.CONTENT_TOO_LONG, platform };
    }
    if (error.message?.includes('image') || error.message?.includes('图片')) {
        return { ...exports.PublishErrors.IMAGE_ERROR, platform };
    }
    if (error.message?.includes('network') || error.message?.includes('网络') || error.message?.includes('timeout')) {
        return exports.PublishErrors.NETWORK_ERROR;
    }
    if (error.message?.includes('oauth') || error.message?.includes('token') || error.message?.includes('授权')) {
        return { ...exports.PublishErrors.OAUTH_TOKEN_EXPIRED, platform };
    }
    if (error.message?.includes('refresh')) {
        return { ...exports.PublishErrors.OAUTH_REFRESH_FAILED, platform };
    }
    if (error.message?.includes('429') || error.message?.includes('rate') || error.message?.includes('限流')) {
        return { ...exports.PublishErrors.PLATFORM_RATE_LIMITED, platform };
    }
    if (error.message?.includes('审核') || error.message?.includes('review') || error.message?.includes('audit')) {
        return { ...exports.PublishErrors.PLATFORM_REJECTED, platform };
    }
    return { ...exports.PublishErrors.API_ERROR, platform };
}
//# sourceMappingURL=publishErrors.js.map
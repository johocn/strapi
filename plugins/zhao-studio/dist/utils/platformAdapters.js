"use strict";
// server/src/utils/platformAdapters.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformAdapters = void 0;
exports.getPlatformAdapter = getPlatformAdapter;
exports.getAllPlatformAdapters = getAllPlatformAdapters;
exports.validateContentForPlatform = validateContentForPlatform;
exports.platformAdapters = {
    toutiao: {
        type: 'toutiao',
        displayName: '头条',
        maxTitleLength: 30,
        maxContentLength: 20000,
        supportsImage: true,
        supportsVideo: true,
        requiresCover: false,
        endpointTemplate: 'https://open.toutiao.com/api/v1/article/create',
    },
    xiaohongshu: {
        type: 'xiaohongshu',
        displayName: '小红书',
        maxTitleLength: 20,
        maxContentLength: 1000,
        supportsImage: true,
        supportsVideo: false,
        requiresCover: true,
        endpointTemplate: 'https://api.xiaohongshu.com/v1/note/create',
    },
    wechat: {
        type: 'wechat',
        displayName: '公众号',
        maxTitleLength: 64,
        maxContentLength: 20000,
        supportsImage: true,
        supportsVideo: true,
        requiresCover: true,
        // 微信图文协议（draft/add、freepublish/submit）由 zhao-sso 执行，此处不再配置 endpoint
    },
    internal: {
        type: 'internal',
        displayName: '内部渠道',
        maxTitleLength: 100,
        maxContentLength: 50000,
        supportsImage: true,
        supportsVideo: true,
        requiresCover: false,
    },
    custom: {
        type: 'custom',
        displayName: '自定义渠道',
        maxTitleLength: 100,
        maxContentLength: 50000,
        supportsImage: true,
        supportsVideo: true,
        requiresCover: false,
    },
};
function getPlatformAdapter(type) {
    return exports.platformAdapters[type];
}
function getAllPlatformAdapters() {
    return Object.values(exports.platformAdapters);
}
function validateContentForPlatform(content, title, type) {
    const adapter = getPlatformAdapter(type);
    if (!adapter) {
        return { valid: false, errors: ['未知的平台类型'] };
    }
    const errors = [];
    if (title.length > adapter.maxTitleLength) {
        errors.push(`标题长度超过限制（最大${adapter.maxTitleLength}字）`);
    }
    if (content.length > adapter.maxContentLength) {
        errors.push(`内容长度超过限制（最大${adapter.maxContentLength}字）`);
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=platformAdapters.js.map
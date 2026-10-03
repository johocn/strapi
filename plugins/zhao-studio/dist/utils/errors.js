"use strict";
// server/src/utils/errors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectErrors = void 0;
exports.identifyErrorType = identifyErrorType;
exports.CollectErrors = {
    NETWORK_ERROR: {
        code: 'COLLECT_001',
        message: '网络连接失败，请检查URL是否正确',
        retry: true,
        maxRetries: 3,
    },
    SELECTOR_ERROR: {
        code: 'COLLECT_002',
        message: 'CSS选择器无效，请检查选择器配置',
        retry: false,
    },
    CONTENT_ERROR: {
        code: 'COLLECT_003',
        message: '内容质量不符合要求',
        retry: false,
        warning: true,
    },
    PERMISSION_ERROR: {
        code: 'COLLECT_004',
        message: '目标网站禁止抓取',
        retry: false,
    },
};
function identifyErrorType(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return exports.CollectErrors.NETWORK_ERROR;
    }
    if (error.message?.includes('selector')) {
        return exports.CollectErrors.SELECTOR_ERROR;
    }
    if (error.message?.includes('permission') || error.message?.includes('403')) {
        return exports.CollectErrors.PERMISSION_ERROR;
    }
    return exports.CollectErrors.CONTENT_ERROR;
}
//# sourceMappingURL=errors.js.map
"use strict";
// server/src/utils/aiErrors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIErrors = void 0;
exports.identifyAIErrorType = identifyAIErrorType;
exports.AIErrors = {
    API_ERROR: {
        code: 'AI_001',
        message: 'AI服务调用失败，请检查API配置',
        fallback: '人工编辑',
    },
    TOKEN_ERROR: {
        code: 'AI_002',
        message: '内容长度超过限制，请减少内容长度',
        fallback: '分段处理',
    },
    RESPONSE_ERROR: {
        code: 'AI_003',
        message: 'AI响应格式不正确',
        fallback: '人工编辑',
    },
    CONFIG_ERROR: {
        code: 'AI_004',
        message: 'AI功能未启用或配置无效',
        fallback: '人工编辑',
    },
};
function identifyAIErrorType(error) {
    if (error.message?.includes('API') || error.message?.includes('401') || error.message?.includes('403')) {
        return exports.AIErrors.API_ERROR;
    }
    if (error.message?.includes('token') || error.message?.includes('length')) {
        return exports.AIErrors.TOKEN_ERROR;
    }
    if (error.message?.includes('response') || error.message?.includes('format')) {
        return exports.AIErrors.RESPONSE_ERROR;
    }
    return exports.AIErrors.CONFIG_ERROR;
}
//# sourceMappingURL=aiErrors.js.map
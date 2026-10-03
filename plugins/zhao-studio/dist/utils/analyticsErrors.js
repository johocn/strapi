"use strict";
// server/src/utils/analyticsErrors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsErrors = void 0;
exports.identifyAnalyticsError = identifyAnalyticsError;
exports.AnalyticsErrors = {
    INVALID_DATA: {
        code: 'ANALYTICS_001',
        message: '上报数据格式无效',
    },
    MISSING_SESSION: {
        code: 'ANALYTICS_002',
        message: '缺少 sessionId',
    },
    INVALID_AD_SLOT: {
        code: 'ANALYTICS_003',
        message: '广告位不存在或已禁用',
    },
    INVALID_ARTICLE: {
        code: 'ANALYTICS_004',
        message: '文章不存在',
    },
    IP_PARSE_ERROR: {
        code: 'ANALYTICS_005',
        message: 'IP地理位置解析失败',
    },
    AGGREGATION_ERROR: {
        code: 'ANALYTICS_006',
        message: '数据聚合失败',
        retry: true,
        maxRetries: 3,
    },
};
function identifyAnalyticsError(error) {
    if (error.message?.includes('sessionId') || error.message?.includes('缺少')) {
        return exports.AnalyticsErrors.MISSING_SESSION;
    }
    if (error.message?.includes('ad-slot') || error.message?.includes('广告位')) {
        return exports.AnalyticsErrors.INVALID_AD_SLOT;
    }
    if (error.message?.includes('article') || error.message?.includes('文章')) {
        return exports.AnalyticsErrors.INVALID_ARTICLE;
    }
    if (error.message?.includes('IP') || error.message?.includes('ip')) {
        return exports.AnalyticsErrors.IP_PARSE_ERROR;
    }
    if (error.message?.includes('aggregation') || error.message?.includes('聚合')) {
        return exports.AnalyticsErrors.AGGREGATION_ERROR;
    }
    return exports.AnalyticsErrors.INVALID_DATA;
}
//# sourceMappingURL=analyticsErrors.js.map
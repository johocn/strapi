// server/src/utils/analyticsErrors.ts

export interface AnalyticsError {
  code: string;
  message: string;
  retry?: boolean;
  maxRetries?: number;
}

export const AnalyticsErrors = {
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

export function identifyAnalyticsError(error: any): AnalyticsError {
  if (error.message?.includes('sessionId') || error.message?.includes('缺少')) {
    return AnalyticsErrors.MISSING_SESSION;
  }

  if (error.message?.includes('ad-slot') || error.message?.includes('广告位')) {
    return AnalyticsErrors.INVALID_AD_SLOT;
  }

  if (error.message?.includes('article') || error.message?.includes('文章')) {
    return AnalyticsErrors.INVALID_ARTICLE;
  }

  if (error.message?.includes('IP') || error.message?.includes('ip')) {
    return AnalyticsErrors.IP_PARSE_ERROR;
  }

  if (error.message?.includes('aggregation') || error.message?.includes('聚合')) {
    return AnalyticsErrors.AGGREGATION_ERROR;
  }

  return AnalyticsErrors.INVALID_DATA;
}
// server/src/utils/publishErrors.ts

export interface PublishError {
  code: string;
  message: string;
  platform?: string;
  accountId?: string;
}

export const PublishErrors = {
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
};

export function identifyPublishError(error: any, platform?: string): PublishError {
  if (error.message?.includes('not ready') || error.message?.includes('未准备好')) {
    return PublishErrors.ARTICLE_NOT_READY;
  }

  if (error.message?.includes('account') || error.message?.includes('账号')) {
    return PublishErrors.ACCOUNT_NOT_FOUND;
  }

  if (error.message?.includes('platform') || error.message?.includes('平台')) {
    return { ...PublishErrors.PLATFORM_NOT_SUPPORTED, platform };
  }

  if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
    return { ...PublishErrors.AUTH_ERROR, platform };
  }

  if (error.message?.includes('length') || error.message?.includes('长度')) {
    return { ...PublishErrors.CONTENT_TOO_LONG, platform };
  }

  if (error.message?.includes('image') || error.message?.includes('图片')) {
    return { ...PublishErrors.IMAGE_ERROR, platform };
  }

  if (error.message?.includes('network') || error.message?.includes('网络') || error.message?.includes('timeout')) {
    return PublishErrors.NETWORK_ERROR;
  }

  return { ...PublishErrors.API_ERROR, platform };
}
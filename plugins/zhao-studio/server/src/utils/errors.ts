// server/src/utils/errors.ts

export interface CollectError {
  code: string;
  message: string;
  retry: boolean;
  maxRetries?: number;
  warning?: boolean;
}

export const CollectErrors = {
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

export function identifyErrorType(error: any): CollectError {
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return CollectErrors.NETWORK_ERROR;
  }

  if (error.message?.includes('selector')) {
    return CollectErrors.SELECTOR_ERROR;
  }

  if (error.message?.includes('permission') || error.message?.includes('403')) {
    return CollectErrors.PERMISSION_ERROR;
  }

  return CollectErrors.CONTENT_ERROR;
}
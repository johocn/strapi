// server/src/utils/platformAdapters.ts

export interface PlatformAdapter {
  type: string;
  displayName: string;
  maxTitleLength: number;
  maxContentLength: number;
  supportsImage: boolean;
  supportsVideo: boolean;
  requiresCover: boolean;
  endpointTemplate?: string;
}

export const platformAdapters: Record<string, PlatformAdapter> = {
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
    requiresCover: false,
    endpointTemplate: 'https://api.weixin.qq.com/cgi-bin/material/add_material',
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

export function getPlatformAdapter(type: string): PlatformAdapter | undefined {
  return platformAdapters[type];
}

export function getAllPlatformAdapters(): PlatformAdapter[] {
  return Object.values(platformAdapters);
}

export function validateContentForPlatform(content: string, title: string, type: string): { valid: boolean; errors: string[] } {
  const adapter = getPlatformAdapter(type);
  if (!adapter) {
    return { valid: false, errors: ['未知的平台类型'] };
  }

  const errors: string[] = [];

  if (title.length > adapter.maxTitleLength) {
    errors.push(`标题长度超过限制（最大${adapter.maxTitleLength}字）`);
  }

  if (content.length > adapter.maxContentLength) {
    errors.push(`内容长度超过限制（最大${adapter.maxContentLength}字）`);
  }

  return { valid: errors.length === 0, errors };
}
// admin/src/utils/platformTypes.ts

export interface PlatformType {
  type: string;
  displayName: string;
  maxTitleLength: number;
  maxContentLength: number;
  supportsImage: boolean;
  supportsVideo: boolean;
  requiresCover: boolean;
}

export const platformTypes: Record<string, PlatformType> = {
  toutiao: {
    type: 'toutiao',
    displayName: '头条',
    maxTitleLength: 30,
    maxContentLength: 20000,
    supportsImage: true,
    supportsVideo: true,
    requiresCover: false,
  },
  xiaohongshu: {
    type: 'xiaohongshu',
    displayName: '小红书',
    maxTitleLength: 20,
    maxContentLength: 1000,
    supportsImage: true,
    supportsVideo: false,
    requiresCover: true,
  },
  wechat: {
    type: 'wechat',
    displayName: '公众号',
    maxTitleLength: 64,
    maxContentLength: 20000,
    supportsImage: true,
    supportsVideo: true,
    requiresCover: false,
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

export function getPlatformType(type: string): PlatformType | undefined {
  return platformTypes[type];
}

export function getAllPlatformTypes(): PlatformType[] {
  return Object.values(platformTypes);
}
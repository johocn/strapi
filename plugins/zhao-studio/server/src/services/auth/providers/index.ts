// server/src/services/auth/providers/index.ts
import wechatProvider from './wechat';
import douyinProvider from './douyin';
import xiaohongshuProvider from './xiaohongshu';

export function getProvider(strapi: any, platformType: string) {
  const providers: Record<string, any> = {
    wechat: wechatProvider({ strapi }),
    douyin: douyinProvider({ strapi }),
    xiaohongshu: xiaohongshuProvider({ strapi }),
  };
  return providers[platformType] || null;
}

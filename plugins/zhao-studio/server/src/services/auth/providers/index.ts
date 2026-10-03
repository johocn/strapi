// server/src/services/auth/providers/index.ts
import wechatProvider from './wechat';
// douyin 和 xiaohongshu 在 Task 5 创建后再 import

export function getProvider(strapi: any, platformType: string) {
  // 动态 require，避免 Task 5 之前编译报错
  const wechat = wechatProvider({ strapi });

  let douyin: any = null;
  let xiaohongshu: any = null;
  try {
    douyin = require('./douyin').default({ strapi });
  } catch { /* Task 5 才创建 */ }
  try {
    xiaohongshu = require('./xiaohongshu').default({ strapi });
  } catch { /* Task 5 才创建 */ }

  const providers: Record<string, any> = { wechat, douyin, xiaohongshu };
  return providers[platformType] || null;
}

// server/src/services/rpa/bilibili.ts
// bilibili RPA driver — 图文专栏 + 视频投稿
// ⚠️ 选择器未在真实浏览器环境实测，当前阶段标记为不可用，调用直接 throw。
//    真机调试入口：server 装 playwright + chromium 后，用 rpa-client.openLoginSession 扫码登录，
//    对照 member.bilibili.com 真实 DOM 填写 SELECTORS，然后去掉下方 USE_REAL_DRIVER = false 守卫。

import type { RpaDriver, RpaPublishInput, RpaPublishOutput } from './types';

// TODO: 真机实测后改为 true
const USE_REAL_DRIVER = false;

export const bilibili: RpaDriver = {
  platform: 'bilibili',

  async publish(page: any, input: RpaPublishInput, workDir: string): Promise<RpaPublishOutput> {
    if (!USE_REAL_DRIVER) {
      throw new Error('bilibili RPA 驱动尚未在真实浏览器验证（选择器 TODO），暂不可用');
    }
    const hasVideo = !!input.videoUrl;
    if (hasVideo) {
      return await this.publishVideo!(page, input, workDir);
    } else {
      return await this.publishArticle!(page, input);
    }
  },

  async publishVideo(_page: any, _input: RpaPublishInput, _workDir: string): Promise<RpaPublishOutput> {
    throw new Error('bilibili RPA publishVideo 选择器待实测');
  },

  async publishArticle(_page: any, _input: RpaPublishInput, _workDir?: string): Promise<RpaPublishOutput> {
    throw new Error('bilibili RPA publishArticle 选择器待实测');
  },
};

export default bilibili;

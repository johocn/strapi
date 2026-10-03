// server/src/services/channel-adapter.ts

import axios from 'axios';
import * as crypto from 'crypto';
import { getPlatformAdapter, validateContentForPlatform } from '../utils/platformAdapters';
import { identifyPublishError } from '../utils/publishErrors';
import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publish(article: any, account: any) {
    const platformType = account.platform?.type || 'custom';

    // 1. 验证内容适配性
    const validation = validateContentForPlatform(article.content, article.title, platformType);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }

    // 2. 准备发布凭证：OAuth 平台走 oauth-manager.ensureValidToken
    //    internal/custom/toutiao/xiaohongshu 用 account.config.apiKey（兼容旧逻辑）
    let accessToken: string | undefined;
    const oauthPlatforms = ['wechat', 'douyin'];
    if (oauthPlatforms.includes(platformType)) {
      try {
        const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
        accessToken = await oauthManager.ensureValidToken(account.documentId || account.id);
      } catch (err: any) {
        throw new Error(`平台 ${platformType} 需要 OAuth 授权，请在账号管理页完成授权后重试（${err.message}）`);
      }
    }

    try {
      switch (platformType) {
        case 'toutiao': return await this.publishToToutiao(article, account, accessToken);
        case 'xiaohongshu': return await this.publishToXiaohongshu(article, account, accessToken);
        case 'wechat': return await this.publishToWechat(article, account, accessToken);
        case 'douyin': return await this.publishToDouyin(article, account, accessToken);
        case 'internal': return await this.publishToInternal(article, account);
        case 'custom': return await this.publishToCustom(article, account, accessToken);
        case 'bilibili': throw new Error('bilibili 服务端发布 API 暂未接入，需调研 bilibili 开放平台能力');
        default: throw new Error(`暂不支持的平台类型: ${platformType}`);
      }
    } catch (error: any) {
      const publishError = identifyPublishError(error, platformType);
      throw new Error(publishError.message);
    }
  },

  async publishToToutiao(article: any, account: any, _accessToken?: string) {
    // 头条内容发布 API 属于巨量引擎开放平台 (open.oceanengine.com) 的广告投放域，
    // 不是内容开放平台；头条的内容侧发布能力暂未向第三方开放。
    throw new Error('头条发布 API 暂未对外开放，需等待巨量引擎内容侧开放或采用 RPA 方案');
  },

  async publishToXiaohongshu(article: any, account: any, _accessToken?: string) {
    // 小红书开放平台 (open.xiaohongshu.com) 目前只开放电商/商品/订单接口，
    // 发布笔记 API 未开放，后续需采用 RPA (Appium 云手机) 方案。
    throw new Error('小红书发布笔记 API 暂未对外开放，后续需 RPA 方案');
  },

  async publishToWechat(article: any, account: any, _accessToken?: string) {
    const ssoArticle = strapi.plugin('zhao-sso')?.service('sso-wx-article') as any;
    const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat') as any;
    if (!ssoArticle?.create || !ssoWx?.getAccessToken) {
      throw new Error('公众号协议执行器不可用：请确认已启用 zhao-sso 插件');
    }

    // Step A: 建草稿（委托 zhao-sso）
    const draft = await ssoArticle.create({
      title: article.title,
      author: article.author || article.sourceAuthor || '',
      digest: article.aiSummary || String(article.content || '').substring(0, 100),
      content: article.content || '',
      thumb_media_id: account.config?.mediaId || '',
      content_source_url: article.sourceUrl || '',
    });

    const draftMediaId = draft.draft_id;
    if (!draftMediaId) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但无法自动发布（需人工确认 media_id）' };
    }

    // Step B: 获取公众号级 access_token（zhao-sso 的 sso-wechat.getAccessToken，不走 OAuth）
    const wxToken = await ssoWx.getAccessToken('official_account');
    if (!wxToken) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但 access_token 不可用，无法自动发布' };
    }

    // Step C: freepublish/submit 提交发布
    let submitRes: any;
    try {
      const resp = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${wxToken}`,
        { media_id: draftMediaId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      submitRes = resp.data;
    } catch (err: any) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `草稿已建立但提交发布失败: ${err.message}` };
    }

    if (submitRes.errcode !== 0) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `freepublish/submit 失败 errcode=${submitRes.errcode} errmsg=${submitRes.errmsg}` };
    }

    const publishId = submitRes.publish_id;

    // Step D: 不再同步轮询 — 交给 Bull Flow checkStatus 阶段
    return {
      success: true,
      externalId: publishId,
      publishId,
    };
  },

  async publishToInternal(article: any, account: any) {
    // 内部渠道发布：直接更新文章状态并关联渠道
    const channelCode = account.config?.channelCode;

    // 更新文章状态为已发布
    await strapi.documents('plugin::zhao-studio.article-draft').update({
      documentId: article.documentId,
      data: {
        status: 'published',
        publishedAt: new Date(),
      } as any,
    });

    return {
      success: true,
      externalId: article.documentId,
      accessUrl: `/api/zhao-studio/articles/${article.documentId}`,
      channelCode,
    };
  },

  async publishToCustom(article: any, account: any, _accessToken?: string) {
    const endpoint = account.config?.endpoint;
    if (!endpoint) {
      throw new Error('自定义渠道未配置endpoint');
    }

    const response = await axios.post(
      endpoint,
      {
        title: article.title,
        content: article.content,
        sourceUrl: article.sourceUrl,
        author: article.author,
        publishedAt: new Date(),
      },
      {
        headers: {
          'Authorization': `Bearer ${account.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return {
      success: response.data.success || response.data.code === 0,
      externalId: response.data.id || response.data.externalId,
      error: response.data.message || response.data.error,
    };
  },

  generateDouyinShareSchema({
    clientKey,
    ticket,
    videoPath,
    title,
    customCoverImageUrl,
  }: {
    clientKey: string;
    ticket: string;
    videoPath?: string;
    title: string;
    customCoverImageUrl?: string;
  }): string {
    const nonceStr = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const kv: Record<string, string> = {
      ticket,
      timestamp,
      nonce_str: nonceStr,
    };
    const sortedKeys = Object.keys(kv).sort();
    const queryStr = sortedKeys.map(k => `${k}=${kv[k]}`).join('&');
    const signature = crypto.createHash('md5').update(queryStr).digest('hex');

    const params = new URLSearchParams({
      share_type: 'h5',
      client_key: clientKey,
      nonce_str: nonceStr,
      timestamp,
      signature,
      title,
    });
    if (videoPath) params.set('video_path', videoPath);
    if (customCoverImageUrl) params.set('custom_cover_image_url', customCoverImageUrl);

    return `snssdk1128://openplatform/share?${params.toString()}`;
  },

  async getDouyinTicket(clientKey: string, clientSecret: string): Promise<string> {
    const tokenResp = await axios.post(
      'https://open.douyin.com/oauth/client_token/',
      { client_key: clientKey, client_secret: clientSecret, grant_type: 'client_credential' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    const clientToken = tokenResp.data?.data?.access_token;
    if (!clientToken) throw new Error(`douyin client_token 获取失败: ${JSON.stringify(tokenResp.data)}`);

    const ticketResp = await axios.get('https://open.douyin.com/open/getticket/', {
      headers: { 'access-token': clientToken },
      timeout: 10000,
    });
    const ticket = ticketResp.data?.data?.ticket;
    if (!ticket) throw new Error(`douyin open_ticket 获取失败: ${JSON.stringify(ticketResp.data)}`);
    return ticket;
  },

  async publishToDouyin(article: any, account: any, _accessToken?: string) {
    // 抖音服务端 API (video.create.bind) 仅对党政/事业单位开放
    // 普通企业主体降级方案：生成 H5 分享 schema URL，由用户在前端扫码唤起抖音 App 发布
    const cfg = ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error('未配置抖音 clientKey/clientSecret，无法生成分享 schema');
    }

    const ticket = await this.getDouyinTicket(clientKey, clientSecret);
    const videoPath = article.videoPath || article.videoUrl || article.coverImage;
    const schema = this.generateDouyinShareSchema({
      clientKey,
      ticket,
      videoPath,
      title: article.title || '',
      customCoverImageUrl: article.coverImage,
    });

    return {
      success: true,
      publish_mode: 'h5_share',
      schema,
    };
  },

  async adaptContent(content: any, platformType: string): Promise<any> {
    const adapter = getPlatformAdapter(platformType);
    if (!adapter) {
      return content;
    }

    // 适配标题长度
    let adaptedTitle = content.title;
    if (content.title.length > adapter.maxTitleLength) {
      adaptedTitle = content.title.substring(0, adapter.maxTitleLength);
    }

    // 适配内容长度
    let adaptedContent = content.content;
    if (content.content.length > adapter.maxContentLength) {
      adaptedContent = content.content.substring(0, adapter.maxContentLength);
    }

    return {
      ...content,
      title: adaptedTitle,
      content: adaptedContent,
    };
  },

  async checkExternalStatus(record: any): Promise<{ deleted: boolean; status?: string }> {
    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findOne({ documentId: record.account?.documentId || record.account });

    if (!account || account.platform?.type === 'internal') {
      return { deleted: false };
    }

    // 简化实现：默认返回未删除状态
    // 实际需要调用各平台API检查文章状态
    return { deleted: false, status: 'published' };
  },
});

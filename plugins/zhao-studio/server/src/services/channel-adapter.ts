// server/src/services/channel-adapter.ts

import axios from 'axios';
import * as crypto from 'crypto';
import { getPlatformAdapter } from '../utils/platformAdapters';
import { detectContentType, validateContentForPlatform } from '../utils/publish-adapter';
import { identifyPublishError } from '../utils/publishErrors';
import type { Core } from '@strapi/strapi';

type ContentType = 'article' | 'video' | 'gallery';

const CONTENT_UID = {
  article: 'plugin::zhao-studio.article-draft',
  video: 'plugin::zhao-studio.publish-video',
  gallery: 'plugin::zhao-studio.publish-gallery',
} as const satisfies Record<ContentType, string>;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publish(content: any, account: any, contentType?: ContentType) {
    const resolvedType: ContentType = contentType || detectContentType(content);
    const platformType = account.platform?.type || 'custom';

    // 1. 验证内容适配性（用 publish-adapter 的新签名，支持 video/gallery）
    const validation = validateContentForPlatform(content, resolvedType, platformType);
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
        case 'toutiao': return await this.publishToToutiao(content, account, resolvedType, accessToken);
        case 'xiaohongshu': return await this.publishToXiaohongshu(content, account, resolvedType, accessToken);
        case 'wechat': return await this.publishToWechat(content, account, resolvedType, accessToken);
        case 'douyin': return await this.publishToDouyin(content, account, resolvedType, accessToken);
        case 'internal': return await this.publishToInternal(content, account, resolvedType);
        case 'custom': return await this.publishToCustom(content, account, resolvedType, accessToken);
        case 'bilibili': return await this.publishToBilibili(content, account, resolvedType);
        default: throw new Error(`暂不支持的平台类型: ${platformType}`);
      }
    } catch (error: any) {
      const publishError = identifyPublishError(error, platformType);
      throw new Error(publishError.message);
    }
  },

  async publishToToutiao(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType !== 'article') {
      throw new Error(`头条 RPA 暂只支持 article 类型，当前 contentType=${contentType}`);
    }
    const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
    const res = await rpaClient.publishViaRPA({
      platform: 'toutiao',
      accountId: account.documentId || account.id || account._id,
      title: content.title || '',
      content: content.content || content.aiSummary || '',
      coverImage: account.config?.coverImage || undefined,
      images: Array.isArray(account.config?.images) ? account.config.images : undefined,
    });
    if (!res.success) {
      throw new Error(res.error || '头条 RPA 发布失败');
    }
    return { success: true, ...res, contentType };
  },

  async publishToXiaohongshu(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType !== 'article') {
      throw new Error(`小红书 RPA 暂只支持 article 类型，当前 contentType=${contentType}`);
    }
    const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
    const res = await rpaClient.publishViaRPA({
      platform: 'xiaohongshu',
      accountId: account.documentId || account.id || account._id,
      title: content.title || '',
      content: content.content || content.aiSummary || '',
      coverImage: account.config?.coverImage || undefined,
      images: Array.isArray(account.config?.images) ? account.config.images : undefined,
    });
    if (!res.success) {
      throw new Error(res.error || '小红书 RPA 发布失败');
    }
    return { success: true, ...res, contentType };
  },

  async publishToBilibili(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType === 'gallery') {
      throw new Error(`bilibili RPA 暂不支持 gallery 类型，当前 contentType=${contentType}`);
    }
    const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
    const res = await rpaClient.publishViaRPA({
      platform: 'bilibili',
      accountId: account.documentId || account.id || account._id,
      title: content.title || '',
      content: content.content || content.aiSummary || '',
      coverImage: account.config?.coverImage || content.coverImage || undefined,
      images: Array.isArray(account.config?.images) ? account.config.images : undefined,
      videoUrl: contentType === 'video' ? content.videoUrl : undefined,
    });
    if (!res.success) {
      throw new Error(res.error || 'bilibili RPA 发布失败');
    }
    return { success: true, ...res, contentType };
  },

  async publishToWechat(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType !== 'article') {
      throw new Error(`公众号 freepublish 暂只支持 article 类型，当前 contentType=${contentType}`);
    }
    const ssoArticle = strapi.plugin('zhao-sso')?.service('sso-wx-article') as any;
    const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat') as any;
    if (!ssoArticle?.create || !ssoWx?.getAccessToken) {
      throw new Error('公众号协议执行器不可用：请确认已启用 zhao-sso 插件');
    }

    // Step A: 建草稿（委托 zhao-sso）
    const draft = await ssoArticle.create({
      title: content.title,
      author: content.author || content.sourceAuthor || '',
      digest: content.aiSummary || String(content.content || '').substring(0, 100),
      content: content.content || '',
      thumb_media_id: account.config?.mediaId || '',
      content_source_url: content.sourceUrl || '',
    });

    const draftMediaId = draft.draft_id;
    if (!draftMediaId) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但无法自动发布（需人工确认 media_id）', contentType };
    }

    // Step B: 获取公众号级 access_token（zhao-sso 的 sso-wechat.getAccessToken，不走 OAuth）
    const wxToken = await ssoWx.getAccessToken('official_account');
    if (!wxToken) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: '草稿已建立但 access_token 不可用，无法自动发布', contentType };
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
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `草稿已建立但提交发布失败: ${err.message}`, contentType };
    }

    if (submitRes.errcode !== 0) {
      return { success: true, createdDraft: true, draftId: draftMediaId, error: `freepublish/submit 失败 errcode=${submitRes.errcode} errmsg=${submitRes.errmsg}`, contentType };
    }

    const publishId = submitRes.publish_id;

    // Step D: 不再同步轮询 — 交给 Bull Flow checkStatus 阶段
    return {
      success: true,
      externalId: publishId,
      publishId,
      contentType,
    };
  },

  async publishToInternal(content: any, account: any, contentType: ContentType) {
    // 内部渠道发布：直接更新对应内容状态为已发布
    const channelCode = account.config?.channelCode;

    const uid = CONTENT_UID[contentType];
    if (!uid) {
      throw new Error(`未知 contentType=${contentType}，无法映射 UID`);
    }

    await strapi.documents(uid).update({
      documentId: content.documentId,
      data: {
        status: 'published',
        publishedAt: new Date(),
      } as any,
    });

    let accessUrl: string;
    switch (contentType) {
      case 'article':
        accessUrl = `/api/zhao-studio/articles/${content.documentId}`;
        break;
      case 'video':
        accessUrl = content.videoUrl || `/api/zhao-studio/videos/${content.documentId}`;
        break;
      case 'gallery':
        accessUrl = `/api/zhao-studio/galleries/${content.documentId}`;
        break;
      default:
        accessUrl = '';
    }

    return {
      success: true,
      externalId: content.documentId,
      accessUrl,
      channelCode,
      contentType,
    };
  },

  async publishToCustom(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType === 'video') {
      // video: 不调外部 API，记录 externalId + 更新状态（与 internal 行为一致）
      const uid = CONTENT_UID.video;
      await strapi.documents(uid).update({
        documentId: content.documentId,
        data: { status: 'published', publishedAt: new Date() } as any,
      });
      return {
        success: true,
        externalId: content.documentId,
        accessUrl: content.videoUrl,
        contentType,
        custom: true,
      };
    }
    if (contentType === 'gallery') {
      const uid = CONTENT_UID.gallery;
      await strapi.documents(uid).update({
        documentId: content.documentId,
        data: { status: 'published', publishedAt: new Date() } as any,
      });
      return {
        success: true,
        externalId: content.documentId,
        accessUrl: `/api/zhao-studio/galleries/${content.documentId}`,
        contentType,
        custom: true,
      };
    }

    // article: 保持原 HTTP POST 逻辑
    const endpoint = account.config?.endpoint;
    if (!endpoint) {
      throw new Error('自定义渠道未配置endpoint');
    }

    const response = await axios.post(
      endpoint,
      {
        title: content.title,
        content: content.content,
        sourceUrl: content.sourceUrl,
        author: content.author,
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
      contentType,
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

  async publishToDouyin(content: any, account: any, contentType: ContentType, _accessToken?: string) {
    if (contentType !== 'article') {
      throw new Error(`douyin H5 分享 schema 暂只支持 article 类型，当前 contentType=${contentType}`);
    }
    // 抖音服务端 API (video.create.bind) 仅对党政/事业单位开放
    // 普通企业主体降级方案：生成 H5 分享 schema URL，由用户在前端扫码唤起抖音 App 发布
    const cfg = ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.douyin || {};
    const clientKey = cfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = cfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) {
      throw new Error('未配置抖音 clientKey/clientSecret，无法生成分享 schema');
    }

    const ticket = await this.getDouyinTicket(clientKey, clientSecret);
    const videoPath = content.videoPath || content.videoUrl || content.coverImage;
    const schema = this.generateDouyinShareSchema({
      clientKey,
      ticket,
      videoPath,
      title: content.title || '',
      customCoverImageUrl: content.coverImage,
    });

    return {
      success: true,
      publish_mode: 'h5_share',
      schema,
      contentType,
    };
  },

  async adaptContent(content: any, platformType: string): Promise<any> {
    const adapter = getPlatformAdapter(platformType);
    if (!adapter) {
      return content;
    }

    // 适配标题长度
    let adaptedTitle = content.title;
    if (adaptedTitle && adaptedTitle.length > adapter.maxTitleLength) {
      adaptedTitle = adaptedTitle.substring(0, adapter.maxTitleLength);
    }

    // 适配内容长度
    let adaptedContent = content.content;
    if (adaptedContent && adaptedContent.length > adapter.maxContentLength) {
      adaptedContent = adaptedContent.substring(0, adapter.maxContentLength);
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
      .findOne({ documentId: record.account?.documentId || record.account, populate: { platform: true } });

    if (!account) return { deleted: false };

    const platformType = account.platform?.type;
    if (!platformType || platformType === 'internal' || platformType === 'custom') {
      return { deleted: false };
    }

    // ============ wechat: freepublish/getarticle 按 article_id 查 ============
    if (platformType === 'wechat' && record.externalId) {
      try {
        const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat') as any;
        if (!ssoWx?.getAccessToken) {
          strapi.log.warn('[zhao-studio] checkExternalStatus wechat: zhao-sso 不可用，跳过');
          return { deleted: false };
        }
        const wxToken = await ssoWx.getAccessToken('official_account');
        if (!wxToken) return { deleted: false };

        const resp = await axios.get(
          `https://api.weixin.qq.com/cgi-bin/freepublish/getarticle`,
          { params: { access_token: wxToken, article_id: record.externalId }, timeout: 15000 }
        );
        const data = resp.data;
        // errcode 40007 = invalid article_id（文章不存在/被删）
        if (data.errcode === 40007) {
          return { deleted: true, status: 'wechat_article_deleted' };
        }
        if (data.errcode && data.errcode !== 0) {
          strapi.log.warn(`[zhao-studio] checkExternalStatus wechat: errcode=${data.errcode} errmsg=${data.errmsg}`);
          return { deleted: false };
        }
        // 返回正常 article JSON → 未删除
        return { deleted: false, status: 'published' };
      } catch (err: any) {
        strapi.log.warn(`[zhao-studio] checkExternalStatus wechat: ${err.message}`);
        return { deleted: false };
      }
    }

    // ============ RPA 平台 + douyin: 无可用定期复查 API ============
    // 头条/小红书/bilibili 需登录态+页面 DOM 解析，RPA 成本太高暂不实现
    // douyin 是 H5 share schema，没有外部可查状态
    return { deleted: false };
  },
});

// server/src/services/channel-adapter.ts

import axios from 'axios';
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
        default: throw new Error(`暂不支持的平台类型: ${platformType}`);
      }
    } catch (error: any) {
      const publishError = identifyPublishError(error, platformType);
      throw new Error(publishError.message);
    }
  },

  async publishToToutiao(article: any, account: any, _accessToken?: string) {
    const adapter = getPlatformAdapter('toutiao');
    const endpoint = account.config?.endpoint || adapter?.endpointTemplate;

    const response = await axios.post(
      endpoint,
      {
        title: article.title,
        content: article.content,
        cover_image: article.coverImage,
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
      externalId: response.data.data?.article_id || response.data.article_id,
      error: response.data.message || response.data.error,
    };
  },

  async publishToXiaohongshu(article: any, account: any, _accessToken?: string) {
    const adapter = getPlatformAdapter('xiaohongshu');
    const endpoint = account.config?.endpoint || adapter?.endpointTemplate;

    const response = await axios.post(
      endpoint,
      {
        title: article.title.substring(0, 20),
        desc: article.content.substring(0, 1000),
        images: article.images || [],
        cover: article.coverImage,
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
      externalId: response.data.data?.note_id || response.data.note_id,
      error: response.data.message || response.data.error,
    };
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

    // Step D: 轮询 freepublish/get（最多 10 次，每次 5 秒）
    const MAX_POLL = 10;
    const POLL_INTERVAL_MS = 5000;
    let finalResult: any = null;

    for (let i = 0; i < MAX_POLL; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      try {
        const getResp = await axios.post(
          `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${wxToken}`,
          { publish_id: publishId },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        const data = getResp.data;

        if (data.publish_status === 0) {
          const articleUrl = data.article_detail?.item?.[0]?.article_url;
          const articleId = data.article_id;
          return {
            success: true,
            externalId: articleId,
            url: articleUrl,
            publishId,
          };
        } else if (data.publish_status === 2) {
          return {
            success: false,
            error: `平台审核拒绝（freepublish_status=2）: ${JSON.stringify(data)}`,
            publishId,
          };
        }
        finalResult = data;
      } catch (err: any) {
        continue;
      }
    }

    return {
      success: true,
      externalId: publishId,
      error: '发布已提交但轮询超时，需后续确认',
      publishId,
      finalPollStatus: finalResult?.publish_status,
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

  async publishToDouyin(article: any, account: any, _accessToken?: string) {
    // 占位实现：P1 Task3 补 H5 schema 降级方案
    throw new Error('publishToDouyin 待实现');
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

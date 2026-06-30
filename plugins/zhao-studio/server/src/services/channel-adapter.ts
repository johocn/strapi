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

    // 2. 根据平台类型调用对应发布方法
    try {
      switch (platformType) {
        case 'toutiao':
          return await this.publishToToutiao(article, account);
        case 'xiaohongshu':
          return await this.publishToXiaohongshu(article, account);
        case 'wechat':
          return await this.publishToWechat(article, account);
        case 'internal':
          return await this.publishToInternal(article, account);
        case 'custom':
          return await this.publishToCustom(article, account);
        default:
          throw new Error('未知的渠道类型');
      }
    } catch (error: any) {
      const publishError = identifyPublishError(error, platformType);
      throw new Error(publishError.message);
    }
  },

  async publishToToutiao(article: any, account: any) {
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

  async publishToXiaohongshu(article: any, account: any) {
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

  async publishToWechat(article: any, account: any) {
    const adapter = getPlatformAdapter('wechat');
    const endpoint = account.config?.endpoint || adapter?.endpointTemplate;

    const response = await axios.post(
      endpoint,
      {
        articles: [{
          title: article.title,
          content: article.content,
          thumb_media_id: account.config?.mediaId,
          author: article.author,
          digest: article.aiSummary || article.content.substring(0, 100),
        }],
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
      success: response.data.errcode === 0,
      externalId: response.data.media_id,
      error: response.data.errmsg,
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

  async publishToCustom(article: any, account: any) {
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
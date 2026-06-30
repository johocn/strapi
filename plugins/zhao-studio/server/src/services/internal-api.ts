// server/src/services/internal-api.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listArticles(filters: any): Promise<any[]> {
    const { channel, category, tag, page = 1, pageSize = 20 } = filters;

    // 基础查询条件：已发布状态
    const baseFilters: any = { status: 'published' };

    // 1. 根据分类过滤
    if (category) {
      baseFilters.category = category;
    }

    // 2. 根据渠道过滤（内部渠道）
    if (channel) {
      // 查询该渠道的发布记录
      const channelRecords = await strapi
        .documents('plugin::zhao-studio.publish-record')
        .findMany({
          filters: {
            status: 'success',
          },
        });

      // 获取关联的账号，筛选出指定渠道的账号
      const accountIds = [];
      for (const record of channelRecords) {
        const account = await strapi
          .documents('plugin::zhao-studio.publish-account')
          .findOne({ documentId: record.account?.documentId || record.account });

        if (account && account.config?.channelCode === channel) {
          accountIds.push(record.article?.documentId || record.article);
        }
      }

      if (accountIds.length > 0) {
        baseFilters.documentId = { $in: accountIds };
      } else {
        return [];
      }
    }

    // 3. 根据标签过滤（使用zhao-tag）
    if (tag) {
      try {
        const tagIndices = await strapi
          .plugin('zhao-tag')
          .service('tag-index')
          .searchByTag(tag, 'article-draft');

        const taggedArticleIds = tagIndices.map((index: any) => index.targetId);

        if (taggedArticleIds.length > 0) {
          if (baseFilters.documentId) {
            // 合并条件
            baseFilters.documentId = {
              $in: baseFilters.documentId.$in.filter((id: string) => taggedArticleIds.includes(id)),
            };
          } else {
            baseFilters.documentId = { $in: taggedArticleIds };
          }
        } else {
          return [];
        }
      } catch (error) {
        // zhao-tag插件未安装或不可用，忽略标签过滤
      }
    }

    // 4. 执行查询
    const articles = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findMany({
        filters: baseFilters,
        page,
        pageSize,
        sort: 'publishedAt:desc',
      });

    return articles;
  },

  async getArticle(articleId: string): Promise<any> {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article || article.status !== 'published') {
      throw new Error('文章不存在或未发布');
    }

    // 获取文章的发布记录
    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters: {
          article: articleId,
          status: 'success',
        },
      });

    // 获取关联的账号信息
    const publishAccounts = [];
    for (const record of records) {
      const account = await strapi
        .documents('plugin::zhao-studio.publish-account')
        .findOne({ documentId: record.account?.documentId || record.account });

      if (account) {
        publishAccounts.push({
          platform: account.platform?.type,
          accountName: account.name,
          externalId: record.externalId,
        });
      }
    }

    return {
      ...article,
      publishAccounts,
    };
  },

  async searchArticles(query: string, filters: any): Promise<any[]> {
    const { page = 1, pageSize = 20 } = filters;

    // 搜索标题或内容
    const articles = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findMany({
        filters: {
          status: 'published',
          $or: [
            { title: { $contains: query } },
            { content: { $contains: query } },
          ],
        },
        page,
        pageSize,
        sort: 'publishedAt:desc',
      });

    return articles;
  },

  async getCategories(): Promise<string[]> {
    // 获取所有已发布文章的分类列表
    const articles = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findMany({
        filters: { status: 'published' },
      });

    const categories = articles
      .map((article: any) => article.category)
      .filter((category: string) => category && category.trim() !== '');

    // 去重
    return [...new Set(categories)];
  },

  async getChannels(): Promise<string[]> {
    // 获取所有内部渠道编码列表
    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany({
        filters: {
          isActive: true,
          platform: { type: 'internal' },
        },
      });

    const channels = accounts
      .map((account: any) => account.config?.channelCode)
      .filter((channel: string) => channel && channel.trim() !== '');

    // 去重
    return [...new Set(channels)];
  },
});
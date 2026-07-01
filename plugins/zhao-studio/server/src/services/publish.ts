// server/src/services/publish.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishArticle(articleId: string, accountIds: string[]): Promise<any[]> {
    // 1. 获取文章
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    // 2. 验证文章状态
    if (article.status !== 'ready') {
      throw new Error('文章未准备好发布，请先完成编辑');
    }

    // 3. 获取账号列表
    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany({
        filters: {
          documentId: { $in: accountIds },
          isActive: true,
        },
      });

    if (accounts.length === 0) {
      throw new Error('未找到有效的发布账号');
    }

    // 4. 执行发布（支持多账号）
    const results = [];
    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');

    for (const account of accounts) {
      try {
        // 适配内容
        const adaptedContent = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');

        // 发布到账号
        const result = await channelAdapter.publish(adaptedContent, account);

        // 记录发布结果
        const record = await strapi
          .documents('plugin::zhao-studio.publish-record')
          .create({
            data: {
              article: articleId,
              account: account.documentId,
              externalId: result.externalId,
              status: result.success ? 'success' : 'failed',
              error: result.error,
              publishedAt: new Date(),
            },
          });

        results.push({
          accountId: account.documentId,
          accountName: account.name,
          platform: account.platform?.type,
          success: result.success,
          externalId: result.externalId,
          recordId: record.documentId,
          error: result.error,
        });
      } catch (error: any) {
        // 记录失败
        const record = await strapi
          .documents('plugin::zhao-studio.publish-record')
          .create({
            data: {
              article: articleId,
              account: account.documentId,
              status: 'failed',
              error: error.message,
              retryCount: 0,
            },
          });

        results.push({
          accountId: account.documentId,
          accountName: account.name,
          platform: account.platform?.type,
          success: false,
          recordId: record.documentId,
          error: error.message,
        });
      }
    }

    // 5. 更新文章状态
    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      await strapi.documents('plugin::zhao-studio.article-draft').update({
        documentId: articleId,
        data: {
          status: 'published',
          publishedAt: new Date(),
        } as any,
      });
    }

    return results;
  },

  async listPlatforms() {
    const platforms = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .findMany({
        filters: { isActive: true },
      });

    return platforms;
  },

  async createPlatform(data: any) {
    const platform = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .create({ data });

    return platform;
  },

  async updatePlatform(platformId: string, data: any) {
    const platform = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .update({
        documentId: platformId,
        data,
      });

    return platform;
  },

  async deletePlatform(platformId: string) {
    await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .delete({ documentId: platformId });
  },

  async listAccounts(platformId?: string) {
    const filters: any = { isActive: true };
    if (platformId) {
      filters.platform = platformId;
    }

    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany({ filters });

    return accounts;
  },

  async createAccount(data: any) {
    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .create({ data });

    return account;
  },

  async updateAccount(accountId: string, data: any) {
    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .update({
        documentId: accountId,
        data,
      });

    return account;
  },

  async deleteAccount(accountId: string) {
    await strapi
      .documents('plugin::zhao-studio.publish-account')
      .delete({ documentId: accountId });
  },

  async listRecords(filters: { articleId?: string; platformId?: string; accountId?: string } = {}) {
    const { articleId, platformId, accountId } = filters;
    const queryFilters: any = {};
    if (articleId) {
      queryFilters.article = articleId;
    }
    if (platformId) {
      queryFilters.platform = platformId;
    }
    if (accountId) {
      queryFilters.account = accountId;
    }

    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters: queryFilters,
        sort: 'publishedAt:desc',
      });

    return records;
  },

  async retryPublish(recordId: string) {
    const record = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findOne({ documentId: recordId });

    if (!record || record.status !== 'failed') {
      throw new Error('只能重试失败的发布记录');
    }

    // 获取文章和账号
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: record.article?.documentId || record.article });

    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findOne({ documentId: record.account?.documentId || record.account });

    if (!article || !account) {
      throw new Error('文章或账号不存在');
    }

    // 重试发布
    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
    const adaptedContent = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');
    const result = await channelAdapter.publish(adaptedContent, account);

    // 更新发布记录
    await strapi.documents('plugin::zhao-studio.publish-record').update({
      documentId: recordId,
      data: {
        status: result.success ? 'success' : 'failed',
        externalId: result.externalId,
        error: result.error,
        retryCount: (record.retryCount || 0) + 1,
        publishedAt: new Date(),
      } as any,
    });

    return result;
  },
});
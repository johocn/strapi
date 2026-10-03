// server/src/services/publish.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishArticle(articleId: string, accountIds: string[], opts?: { scheduledAt?: Date }): Promise<any[]> {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) throw new Error('文章不存在');
    if (article.status !== 'ready') throw new Error('文章未准备好发布，请先完成编辑');

    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany({
        filters: {
          documentId: { $in: accountIds },
          isActive: true,
        },
      });

    if (accounts.length === 0) throw new Error('未找到有效的发布账号');

    // 定时发布 → 创建 publish-schedule，由 scheduler 触发
    if (opts?.scheduledAt) {
      const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').create({
        data: {
          name: `定时发布 ${article.title || article.documentId} @ ${opts.scheduledAt.toISOString()}`,
          article: article.documentId,
          accountIds: accounts.map((a: any) => a.documentId || a.id),
          scheduledAt: opts.scheduledAt,
          status: 'scheduled',
        },
      });
      return [{ trigger: 'scheduled', scheduleId: schedule.documentId, accountCount: accounts.length }];
    }

    // 立即发布 → 入 studio-publish 队列
    const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
    const results = [];

    for (const account of accounts) {
      const accDocId = (account as any).documentId || (account as any).id;
      const record = await strapi
        .documents('plugin::zhao-studio.publish-record')
        .create({ data: { article: articleId, account: accDocId, status: 'queued' } });

      try {
        await publishQueue.enqueuePublish({
          articleId,
          accountId: accDocId,
          publishRecordId: record.documentId,
          triggerSource: 'manual',
        });
        results.push({
          accountId: accDocId,
          accountName: (account as any).name,
          platform: (account as any).platform?.type,
          success: true,
          queued: true,
          recordId: record.documentId,
        });
      } catch (err: any) {
        // 队列不可用 → 降级同步发布
        strapi.log.warn(`[zhao-studio] queue unavailable, sync fallback for account=${accDocId}`);
        try {
          const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
          const adapted = await channelAdapter.adaptContent(article, (account as any).platform?.type || 'custom');
          const syncResult = await channelAdapter.publish(adapted, account);
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: record.documentId,
            data: {
              status: syncResult.success ? 'success' : 'failed',
              externalId: syncResult.externalId || syncResult.publishId,
              error: syncResult.error,
              finishedAt: new Date(),
            } as any,
          });
          results.push({
            accountId: accDocId,
            accountName: (account as any).name,
            platform: (account as any).platform?.type,
            success: syncResult.success,
            externalId: syncResult.externalId || syncResult.publishId,
            error: syncResult.error,
            recordId: record.documentId,
          });
        } catch (syncErr: any) {
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: record.documentId,
            data: { status: 'failed', error: syncErr.message, finishedAt: new Date() } as any,
          });
          results.push({
            accountId: accDocId,
            accountName: (account as any).name,
            platform: (account as any).platform?.type,
            success: false,
            error: syncErr.message,
            recordId: record.documentId,
          });
        }
      }
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

    const articleId = String(record.article?.documentId || record.article);
    const accountId = String(record.account?.documentId || record.account);

    // 队列可用 → 入队重试
    try {
      const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: recordId,
        data: { status: 'queued', error: null, retryCount: (record.retryCount || 0) + 1 } as any,
      });
      await publishQueue.enqueuePublish({
        articleId,
        accountId,
        publishRecordId: recordId,
        triggerSource: 'retry',
      });
      return { success: true, queued: true, recordId };
    } catch {
      // 队列不可用 → 降级同步
      const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
      const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
      if (!article || !account) throw new Error('文章或账号不存在');

      const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
      const adaptedContent = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');
      const result = await channelAdapter.publish(adaptedContent, account);

      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: recordId,
        data: {
          status: result.success ? 'success' : 'failed',
          externalId: result.externalId,
          error: result.error,
          retryCount: (record.retryCount || 0) + 1,
          finishedAt: new Date(),
        } as any,
      });
      return result;
    }
  },

  // ============ 定时发布（P2 新增） ============
  async createSchedule(data: {
    articleId: string;
    accountIds: string[];
    scheduledAt: string;
    name?: string;
  }) {
    return this.publishArticle(data.articleId, data.accountIds, { scheduledAt: new Date(data.scheduledAt) });
  },

  async listSchedules(filters: any = {}) {
    return strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters: { ...filters },
      sort: 'scheduledAt:desc',
    });
  },

  async findOneSchedule(id: string) {
    return strapi.documents('plugin::zhao-studio.publish-schedule').findOne({ documentId: id });
  },

  async cancelSchedule(id: string) {
    const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').findOne({ documentId: id });
    if (!schedule) throw new Error('定时任务不存在');
    if ((schedule as any).status !== 'scheduled') {
      throw new Error(`只能取消 scheduled 状态的任务（当前状态: ${(schedule as any).status}）`);
    }
    return strapi.documents('plugin::zhao-studio.publish-schedule').update({
      documentId: id,
      data: { status: 'cancelled' } as any,
    });
  },

  async getDouyinSchema(recordId: string) {
    const record = await strapi.documents('plugin::zhao-studio.publish-record').findOne({ documentId: recordId });
    if (!record) throw new Error('发布记录不存在');

    let schema: string | null = null;
    const err = (record as any).error;
    if (err && typeof err === 'string') {
      try {
        const parsed = JSON.parse(err);
        if (parsed.platform === 'douyin' && parsed.schema) schema = parsed.schema;
      } catch { /* ignore */ }
    }

    if (!schema) {
      throw new Error('该发布记录不是 douyin h5_share 模式或已过期');
    }
    return { recordId, schema };
  },

  async previewPublish(articleId: string, accountIds: string[]) {
    const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
    if (!article) throw new Error('文章不存在');

    const accounts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
      filters: { documentId: { $in: accountIds }, isActive: true },
    });
    if (accounts.length === 0) throw new Error('未找到有效账号');

    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
    const results = [];

    for (const account of accounts) {
      const platformType = (account as any).platform?.type || 'custom';
      try {
        const adapted = await channelAdapter.adaptContent(article, platformType);
        results.push({
          accountId: (account as any).documentId,
          accountName: (account as any).name,
          platform: platformType,
          adaptedTitle: adapted.title,
          adaptedContentPreview: String(adapted.content || '').substring(0, 500),
          contentLength: String(adapted.content || '').length,
        });
      } catch (err: any) {
        results.push({
          accountId: (account as any).documentId,
          accountName: (account as any).name,
          platform: platformType,
          error: err.message,
        });
      }
    }

    return { articleId, articleTitle: (article as any).title, results };
  },
});
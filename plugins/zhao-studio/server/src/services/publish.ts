// server/src/services/publish.ts

import type { Core } from '@strapi/strapi';
import {
  CONTENT_UID,
  insertScheduleLnk,
  createPublishRecord,
  inferContentTypeFromLnk,
  resolveContentFromLnk,
  type ContentType,
} from '../utils/publish-helpers';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async publishContent({ type, contentId, accountIds, scheduledAt }: {
    type: ContentType; contentId: string; accountIds: string[]; scheduledAt?: Date;
  }): Promise<any[]> {
    const content: any = await strapi
      // @ts-expect-error Strapi Core types: documents(uid: string) works at runtime
      .documents(CONTENT_UID[type])
      .findOne({ documentId: contentId });
    if (!content) throw new Error(`${type} 内容不存在: ${contentId}`);

    // 内容必须已准备好发布（对齐 publishArticle 的 status 校验）
    if (type !== 'article' && content.status && content.status !== 'ready') {
      throw new Error(`${type === 'video' ? '视频' : '图集'}状态为「${content.status}」，仅 ready 状态可发布`);
    }

    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany({
        filters: { documentId: { $in: accountIds }, isActive: true },
      });
    if (accounts.length === 0) throw new Error('未找到有效的发布账号');

    // 定时发布 → 创建 publish-schedule，关联对应内容列
    if (scheduledAt) {
      const scheduleData: any = {
        name: `${content.title || contentId} @ ${scheduledAt.toISOString()}`,
        accountIds: accounts.map((a: any) => a.documentId || a.id),
        scheduledAt,
        status: 'scheduled',
      };
      scheduleData[type] = { connect: [{ documentId: contentId }] };
      const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').create({ data: scheduleData });
      await insertScheduleLnk(strapi, type, schedule.id, content.id);
      return [{ trigger: 'scheduled', scheduleId: schedule.documentId, accountCount: accounts.length, contentType: type }];
    }

    // 立即发布 → 入队 + sync fallback
    const results = [];
    const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');

    for (const account of accounts) {
      const accDocId = (account as any).documentId;
      const record: any = await createPublishRecord(
        strapi,
        type,
        contentId,
        content.id,
        accDocId,
        (account as any).id,
      );

      try {
        await publishQueue.enqueuePublish({
          contentType: type,
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
          contentType: type,
        });
      } catch (err: any) {
        strapi.log.warn(`[zhao-studio] queue unavailable (${err?.message || err}), sync fallback for content=${type} account=${accDocId}`);
        try {
          const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
          const syncResult = await channelAdapter.publish(content, account, type);
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: record.documentId,
            data: { status: 'success', externalId: syncResult?.externalId || syncResult?.publishId, url: syncResult?.url || null } as any,
          });
          results.push({
            accountId: accDocId,
            accountName: (account as any).name,
            platform: (account as any).platform?.type,
            success: true,
            sync: true,
            recordId: record.documentId,
            contentType: type,
          });
        } catch (syncErr: any) {
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: record.documentId,
            data: { status: 'failed', error: syncErr.message } as any,
          });
          results.push({
            accountId: accDocId,
            accountName: (account as any).name,
            platform: (account as any).platform?.type,
            success: false,
            error: syncErr.message,
            recordId: record.documentId,
            contentType: type,
          });
        }
      }
    }
    return results;
  },

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
          article: { connect: [{ documentId: article.documentId }] },
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
        .create({ data: { article: { connect: [{ documentId: articleId }] }, account: { connect: [{ documentId: accDocId }] }, status: 'queued' } });

      try {
        await publishQueue.enqueuePublish({
          articleId,
          accountId: accDocId,
          publishRecordId: record.documentId,
          triggerSource: 'manual',
          contentType: 'article',
        });
        results.push({
          accountId: accDocId,
          accountName: (account as any).name,
          platform: (account as any).platform?.type,
          success: true,
          queued: true,
          recordId: record.documentId,
          contentType: 'article',
        });
      } catch (err: any) {
        // 队列不可用 → 降级同步发布
        strapi.log.warn(`[zhao-studio] queue unavailable (${err?.message || err}), sync fallback for account=${accDocId}`);
        try {
          const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
          const adapted = await channelAdapter.adaptContent(article, (account as any).platform?.type || 'custom');
          const syncResult = await channelAdapter.publish(adapted, account, 'article');
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

  async listPlatforms(query: any = {}) {
    // Strapi 标准 pagination 解析
    const page = parseInt(query.pagination?.page) || 1;
    const pageSize = parseInt(query.pagination?.pageSize) || 10;

    // 合并默认 filters（isActive 默认 true，但前端显式传 filters 时不强制覆盖）
    const mergedFilters: any = query.filters ? { ...query.filters } : { isActive: true };

    const findQuery: any = {
      filters: mergedFilters,
      pagination: { page, pageSize },
      populate: query.populate || null,
      sort: query.sort || 'createdAt:desc',
    };
    // 移除 null 值
    Object.keys(findQuery).forEach(k => findQuery[k] == null && delete findQuery[k]);

    const platforms = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .findMany(findQuery);

    const total = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .count({ filters: mergedFilters });

    return {
      records: platforms,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
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

  async listAccounts(query: any = {}) {
    const page = parseInt(query.pagination?.page) || 1;
    const pageSize = parseInt(query.pagination?.pageSize) || 10;

    // 合并 filters：默认 isActive=true + 前端标准 filters + 兼容老的 platformId 裸参数
    const mergedFilters: any = {};
    // 老的 platformId 兼容（query 顶层字段） → 转为关系过滤
    if (query.platformId) {
      mergedFilters.platform = { documentId: query.platformId };
    }
    // 前端显式传的 filters（Strapi 标准）覆盖/补充
    if (query.filters) {
      Object.assign(mergedFilters, query.filters);
    }
    // 默认 isActive=true，但前端显式传了 isActive 就用前端的值
    if (mergedFilters.isActive === undefined) {
      mergedFilters.isActive = true;
    }

    const populate = query.populate || { platform: true };

    const findQuery: any = {
      filters: mergedFilters,
      pagination: { page, pageSize },
      populate,
      sort: query.sort || 'createdAt:desc',
    };

    const accounts = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findMany(findQuery);

    const total = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .count({ filters: mergedFilters });

    return {
      records: accounts,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
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

  async listRecords(query: any = {}) {
    const page = parseInt(query.pagination?.page) || 1;
    const pageSize = parseInt(query.pagination?.pageSize) || 10;

    // 合并 filters：老的顶层参数 + 前端 Strapi 标准 filters
    const mergedFilters: any = {};

    // 老的 articleId / accountId 兼容 → 转为关系过滤
    if (query.articleId) {
      mergedFilters.article = { documentId: query.articleId };
    }
    if (query.accountId) {
      mergedFilters.account = { documentId: query.accountId };
    }

    // 新的 Strapi 标准 filters（前端发的 filters[status] / filters[externalId][$contains] / filters[account.documentId] 等）
    if (query.filters) {
      Object.assign(mergedFilters, query.filters);
    }

    // platformId 特殊处理：publish-record 没有 platform 字段，必须先查 account 再绕一层
    // 兼容两种写法：query.platformId（老）或 mergedFilters.account.platform.documentId（新 Strapi 标准）
    let platformId: string | undefined;
    if (query.platformId) {
      platformId = query.platformId;
    } else if (mergedFilters.account?.platform?.documentId) {
      platformId = mergedFilters.account.platform.documentId;
      // 从 filters 里剔掉这个，避免 Strapi 尝试直接查不存在的 platform 字段导致 400
      delete mergedFilters.account.platform;
      if (Object.keys(mergedFilters.account).length === 0) {
        delete mergedFilters.account;
      }
    }
    if (platformId) {
      const accounts = await strapi
        .documents('plugin::zhao-studio.publish-account')
        .findMany({ filters: { platform: { documentId: platformId } } });
      const accountDocIds = accounts.map((a: any) => a.documentId);
      if (accountDocIds.length === 0) {
        // 没有匹配账号 → 直接返回空（不是空数组 findMany 会报 pagination 问题）
        return { records: [], pagination: { page, pageSize, total: 0, pageCount: 0 } };
      }
      // accountId 已有则取交集（$in 先合并）
      const existingAccountFilter = mergedFilters.account?.documentId;
      if (existingAccountFilter?.$in) {
        const intersected = accountDocIds.filter(id => existingAccountFilter.$in.includes(id));
        mergedFilters.account = { documentId: { $in: intersected } };
      } else if (existingAccountFilter) {
        // 已有单 accountId，检查是否在 platform 下
        if (!accountDocIds.includes(existingAccountFilter)) {
          return { records: [], pagination: { page, pageSize, total: 0, pageCount: 0 } };
        }
        mergedFilters.account = { documentId: existingAccountFilter };
      } else {
        mergedFilters.account = { documentId: { $in: accountDocIds } };
      }
    }

    const populate = query.populate || {
      account: { populate: { platform: true } },
      video: true,
      gallery: true,
      article: true,
    };

    const findQuery: any = {
      filters: mergedFilters,
      pagination: { page, pageSize },
      populate,
      sort: query.sort || 'publishedAt:desc',
    };

    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany(findQuery);

    // contentType 手动 filter（Strapi relation $ne null 语法不稳）
    const contentType = query.contentType || query['filters[contentType]'];
    let filteredRecords = records;
    if (contentType === 'video') filteredRecords = records.filter((r: any) => !!r.video);
    else if (contentType === 'gallery') filteredRecords = records.filter((r: any) => !!r.gallery);
    else if (contentType === 'article') filteredRecords = records.filter((r: any) => !!r.article);

    const total = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .count({ filters: mergedFilters });

    return {
      records: filteredRecords,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async getRecordDetail(recordId: string) {
    return strapi.documents('plugin::zhao-studio.publish-record').findOne({
      documentId: recordId,
      populate: {
        account: { populate: { platform: true } },
        video: true,
        gallery: true,
        article: true,
      },
    });
  },

  async retryPublish(recordId: string) {
    const record = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findOne({ documentId: recordId });

    if (!record) throw new Error('发布记录不存在');
    const RETRYABLE = new Set(['failed', 'rejected', 'partial_success']);
    if (!RETRYABLE.has(record.status)) {
      throw new Error(`当前状态 ${record.status} 不可重试，仅 failed/rejected/partial_success 可重试`);
    }

    // 从 record 三列推断 contentType（带 DB lnk fallback）
    let contentType: ContentType | null =
      record.video?.documentId || record.video ? 'video'
      : record.gallery?.documentId || record.gallery ? 'gallery'
      : record.article?.documentId || record.article ? 'article'
      : null;
    if (!contentType) {
      contentType = await inferContentTypeFromLnk(strapi, record.id);
    }
    if (!contentType) {
      throw new Error(`publish-record ${record.documentId} 无法推断 contentType（populate 和 lnk 表都无关联）`);
    }

    let contentId = String((record as any)[contentType]?.documentId || (record as any)[contentType] || '');
    if (!contentId) {
      const lnkRef = await resolveContentFromLnk(strapi, contentType, record.id);
      contentId = lnkRef?.contentDocumentId || '';
    }
    const accountId = String(record.account?.documentId || record.account);

    // 队列可用 → 入队重试
    try {
      const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: recordId,
        data: { status: 'queued', error: null, retryCount: (record.retryCount || 0) + 1 } as any,
      });
      await publishQueue.enqueuePublish({
        articleId: contentType === 'article' ? contentId : undefined,
        accountId,
        publishRecordId: recordId,
        triggerSource: 'retry',
        contentType,
      });
      return { success: true, queued: true, recordId, contentType };
    } catch {
      // 队列不可用 → 降级同步
      // @ts-expect-error Strapi Core types
      const content = await strapi.documents(CONTENT_UID[contentType]).findOne({ documentId: contentId });
      const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
      if (!content || !account) throw new Error('内容或账号不存在');

      const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
      const adaptedContent = await channelAdapter.adaptContent(content, account.platform?.type || 'custom');
      const result = await channelAdapter.publish(adaptedContent, account, contentType);

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

  // ============ 定时发布 ============
  async createSchedule(data: {
    articleId?: string;
    videoId?: string;
    galleryId?: string;
    accountIds: string[];
    scheduledAt: string;
    name?: string;
  }) {
    // 推断 contentType + contentId
    const { contentType, contentId } = (() => {
      if (data.articleId) return { contentType: 'article' as const, contentId: data.articleId };
      if (data.videoId) return { contentType: 'video' as const, contentId: data.videoId };
      if (data.galleryId) return { contentType: 'gallery' as const, contentId: data.galleryId };
      throw new Error('必须提供 articleId / videoId / galleryId 之一');
    })();
    return this.publishContent({ type: contentType, contentId, accountIds: data.accountIds, scheduledAt: new Date(data.scheduledAt) });
  },

  async listSchedules(query: any = {}) {
    const page = parseInt(query.pagination?.page || query['pagination[page]']) || 1;
    const pageSize = parseInt(query.pagination?.pageSize || query['pagination[pageSize]']) || 10;
    const filters: any = {};
    if (query.status || query['filters[status]']) {
      filters.status = query.status || query['filters[status]'];
    }
    const list = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters,
      sort: 'scheduledAt:desc',
      populate: ['video', 'gallery', 'article'],
      pagination: { page, pageSize },
    });
    const total = await strapi.documents('plugin::zhao-studio.publish-schedule').count({ filters });
    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async findOneSchedule(id: string, populate?: any) {
    const defaultPopulate = ['video', 'gallery', 'article'];
    return strapi.documents('plugin::zhao-studio.publish-schedule').findOne({
      documentId: id,
      populate: populate || defaultPopulate,
    });
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
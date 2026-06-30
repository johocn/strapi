// server/src/services/status-sync.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async syncPublishStatus(articleId: string): Promise<void> {
    // 1. 获取文章的所有发布记录
    const records = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters: { article: articleId },
      });

    if (records.length === 0) {
      return;
    }

    // 2. 检查各渠道发布状态
    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
    let successCount = 0;
    let failedCount = 0;

    for (const record of records) {
      if (record.status === 'success') {
        // 检查外部平台状态
        const externalStatus = await channelAdapter.checkExternalStatus(record);

        if (externalStatus.deleted) {
          // 更新为失败状态
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: record.documentId,
            data: {
              status: 'failed',
              error: '外部平台文章已删除',
            } as any,
          });
          failedCount++;
        } else {
          successCount++;
        }
      } else if (record.status === 'failed') {
        failedCount++;
      } else {
        // pending状态，计入待处理
      }
    }

    // 3. 更新文章状态
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (article) {
      let newStatus = article.status;

      if (successCount > 0 && failedCount === 0) {
        newStatus = 'published';
      } else if (successCount > 0 && failedCount > 0) {
        newStatus = 'published'; // 部分成功仍视为已发布
      } else if (failedCount === records.length) {
        newStatus = 'ready'; // 全部失败，回退到准备状态
      }

      await strapi.documents('plugin::zhao-studio.article-draft').update({
        documentId: articleId,
        data: { status: newStatus } as any,
      });
    }
  },

  async syncAllPendingRecords(): Promise<{ synced: number; failed: number }> {
    // 获取所有待处理状态的发布记录
    const pendingRecords = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters: { status: 'pending' },
      });

    let synced = 0;
    let failed = 0;

    for (const record of pendingRecords) {
      try {
        // 尝试重新发布
        const publishService = strapi.plugin('zhao-studio').service('publish');
        await publishService.retryPublish(record.documentId);
        synced++;
      } catch (error) {
        failed++;
      }
    }

    return { synced, failed };
  },

  async cleanupOldRecords(days: number): Promise<{ deleted: number }> {
    // 清理指定天数前的失败记录
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldRecords = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findMany({
        filters: {
          status: 'failed',
          publishedAt: { $lt: cutoffDate },
        },
      });

    let deleted = 0;

    for (const record of oldRecords) {
      await strapi
        .documents('plugin::zhao-studio.publish-record')
        .delete({ documentId: record.documentId });
      deleted++;
    }

    return { deleted };
  },
});
import type { Core } from '@strapi/strapi';
import { Worker } from 'bullmq';
import { getSchedulerQueue, getRedis, registerWorker } from '../utils/queue';
import {
  detectContentType,
  CONTENT_UID,
  createPublishRecord,
  inferContentTypeFromScheduleLnk,
  type ContentType,
} from '../utils/publish-helpers';

let worker: Worker | null = null;
let scanJobRegistered = false;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async registerSchedulers() {
    const queue = getSchedulerQueue();
    const redis = getRedis();
    if (!queue || !redis) return;

    // BullMQ: 先清理旧的 scan-and-trigger repeatable（防重复注册）
    try {
      const existing = await queue.getRepeatableJobs();
      for (const j of existing) {
        if (j.id === 'scan-and-trigger') {
          await queue.removeRepeatableByKey(j.key);
        }
      }
    } catch { /* ignore */ }

    await queue.add('scan-and-trigger', { type: 'scan' }, {
      jobId: 'scan-and-trigger',
      repeat: { cron: '* * * * *' },
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 20,
      removeOnFail: 10,
    });

    if (!worker) {
      worker = new Worker('studio-scheduler', async () => {
        await this.scanAndTriggerSchedules();
        await this.refreshExpiringTokens();
        return { ok: true };
      }, { connection: redis, concurrency: 1 });
      registerWorker(worker);
      strapi.log.info('[zhao-studio] BullMQ scheduler worker registered (cron=* * * * *)');
    }

    scanJobRegistered = true;
  },

  async closeWorker() {
    if (worker) {
      try { await worker.close(); } catch { /* ignore */ }
      worker = null;
    }
    scanJobRegistered = false;
  },

  async scanAndTriggerSchedules() {
    const now = new Date();
    const pending = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters: {
        status: 'scheduled',
        scheduledAt: { $lte: now },
      },
      populate: ['video', 'gallery', 'article'],
    });

    for (const schedule of pending) {
      try {
        // 1. 动态推断 contentType（populate 拿不到时 fallback schedule lnk 表）
        let contentType: ContentType | null = detectContentType(schedule);
        if (!contentType) {
          contentType = await inferContentTypeFromScheduleLnk(strapi, (schedule as any).id);
        }
        if (!contentType) {
          strapi.log.error(`[zhao-studio] schedule ${schedule.documentId} 未关联任何内容（populate 和 lnk 表都无），跳过`);
          continue;
        }

        // 2. 读取内容 documentId（populate 拿不到时 fallback schedule lnk 表直接查 content）
        let contentDocumentId: string | undefined;
        const contentRel: any = (schedule as any)[contentType];
        if (contentRel) {
          contentDocumentId = typeof contentRel === 'string' ? contentRel : contentRel?.documentId;
        }
        if (!contentDocumentId) {
          const lnkCol = contentType === 'article' ? 'article_draft_id' : `publish_${contentType}_id`;
          const lnkTable = `zhao_publish_schedules_${contentType}_lnk`;
          const contentTable = contentType === 'article' ? 'zhao_article_drafts' : `zhao_publish_${contentType}s`;
          const rows: any[] = await strapi.db.connection.query(
            `SELECT c.document_id FROM ${lnkTable} lnk JOIN ${contentTable} c ON c.id = lnk.${lnkCol} WHERE lnk.publish_schedule_id = $1 LIMIT 1`,
            [(schedule as any).id],
          ).catch(() => []);
          contentDocumentId = rows[0]?.document_id;
        }
        if (!contentDocumentId) {
          strapi.log.error(`[zhao-studio] schedule ${schedule.documentId} ${contentType} documentId 缺失（populate 和 lnk 表都查不到）`);
          continue;
        }
        const content: any = await strapi.documents(CONTENT_UID[contentType]).findOne({ documentId: contentDocumentId });
        if (!content) {
          strapi.log.error(`[zhao-studio] schedule ${schedule.documentId} ${contentType} ${contentDocumentId} 不存在`);
          continue;
        }

        const accountIds: string[] = Array.isArray((schedule as any).accountIds) ? (schedule as any).accountIds : [];
        const accounts = await strapi
          .documents('plugin::zhao-studio.publish-account')
          .findMany({
            filters: { documentId: { $in: accountIds }, isActive: true },
          });
        const accountMap = new Map(accounts.map((a: any) => [a.documentId, a]));

        // 3. 遍历账号：创建 record → 插 lnk → enqueue
        for (const accId of accountIds) {
          try {
            const account: any = accountMap.get(accId);
            if (!account) {
              strapi.log.warn(`[zhao-studio] schedule ${schedule.documentId} account ${accId} 不存在，跳过`);
              continue;
            }

            const record: any = await createPublishRecord(
              strapi,
              contentType,
              content.documentId,
              content.id,
              account.documentId,
              account.id,
              { scheduledAt: (schedule as any).scheduledAt },
            );

            const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
            await publishQueue.enqueuePublish({
              contentType,
              articleId: contentType === 'article' ? content.documentId : undefined,
              accountId: account.documentId,
              publishRecordId: record.documentId,
              triggerSource: 'schedule',
            });
          } catch (err: any) {
            strapi.log.warn(`[zhao-studio] schedule ${schedule.documentId} account ${accId} enqueue failed: ${err.message}`);
          }
        }

        await strapi.documents('plugin::zhao-studio.publish-schedule').update({
          documentId: schedule.documentId,
          data: { status: 'triggered', triggeredAt: new Date() } as any,
        });
        strapi.log.info(`[zhao-studio] schedule ${schedule.documentId} triggered (${contentType}, ${accountIds.length} accounts)`);
      } catch (err: any) {
        strapi.log.error(`[zhao-studio] schedule trigger failed schedule=${schedule.documentId}: ${err.message}`);
      }
    }

    // 过期 24h 未触发 → 标记 expired
    const expired = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters: {
        status: 'scheduled',
        scheduledAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    for (const s of expired) {
      await strapi.documents('plugin::zhao-studio.publish-schedule').update({
        documentId: s.documentId,
        data: { status: 'expired' } as any,
      });
    }
  },

  async refreshExpiringTokens() {
    const soon = new Date(Date.now() + 10 * 60 * 1000);
    const accounts = await strapi.documents('plugin::zhao-studio.publish-account').findMany({
      filters: {
        oauthExpiresAt: { $lt: soon.toISOString() },
        oauthState: 'authorized',
      },
    });
    const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
    for (const acc of accounts) {
      try {
        await oauthManager.ensureValidToken(acc.documentId);
      } catch (err: any) {
        strapi.log.warn(`[zhao-studio] auto refresh token failed account=${acc.documentId}: ${err.message}`);
        await strapi.documents('plugin::zhao-studio.publish-account').update({
          documentId: acc.documentId,
          data: { oauthState: 'expired' } as any,
        });
      }
    }
  },
});

import type { Core } from '@strapi/strapi';
import { Worker } from 'bullmq';
import { getPublishQueue, getRedis, registerWorker, type PublishJobData, type ContentType } from '../utils/queue';
import { identifyPublishError } from '../utils/publishErrors';
import { inferContentTypeFromLnk, resolveContentFromLnk } from '../utils/publish-helpers';

const CONTENT_UID = {
  article: 'plugin::zhao-studio.article-draft',
  video: 'plugin::zhao-studio.publish-video',
  gallery: 'plugin::zhao-studio.publish-gallery',
} as const satisfies Record<ContentType, string>;

export const STAGES = {
  VALIDATE: 'validateContent',
  ENSURE_TOKEN: 'ensureOAuthToken',
  ADAPT: 'adaptContent',
  PUBLISH: 'publish',
  CHECK_STATUS: 'checkStatus',
  FINALIZE: 'finalize',
} as const;

type Stage = typeof STAGES[keyof typeof STAGES];

const STAGE_TO_STATUS: Record<Stage, string> = {
  [STAGES.VALIDATE]: 'validating',
  [STAGES.ENSURE_TOKEN]: 'validating',
  [STAGES.ADAPT]: 'validating',
  [STAGES.PUBLISH]: 'publishing',
  [STAGES.CHECK_STATUS]: 'checking_status',
  [STAGES.FINALIZE]: 'success',
};

let worker: Worker | null = null;

/** 从 publish-record 三列推断 contentType */
export function inferContentTypeFromRecord(record: any): ContentType {
  if (record?.video?.documentId || record?.video) return 'video';
  if (record?.gallery?.documentId || record?.gallery) return 'gallery';
  if (record?.article?.documentId || record?.article) return 'article';
  throw new Error('publish-record 未关联任何内容（article / video / gallery），无法推断 contentType');
}

/** 构建幂等查询过滤条件：按 contentType 选对应的关系列 */
export function buildIdempotentFilter(contentType: ContentType, contentDocumentId: string, accountDocumentId: string) {
  const relField = contentType;
  return {
    [relField]: { documentId: contentDocumentId },
    account: { documentId: accountDocumentId },
    status: { $in: ['pending', 'queued', 'validating', 'uploading_media', 'publishing', 'checking_status'] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async enqueuePublish(data: PublishJobData): Promise<string | null> {
    let queue = getPublishQueue();
    if (!queue) {
      // bootstrap 可能因 module scope 问题没初始化成功，主动重试一次
      strapi.log.warn('[zhao-studio] getPublishQueue() is null, retrying initStudioQueues()');
      const { initStudioQueues } = await import('../utils/queue');
      const { publish } = await initStudioQueues();
      queue = publish || getPublishQueue();
      if (!queue) {
        throw new Error('发布队列不可用，请检查 Redis 连接');
      }
      // 确保 Worker 也启动
      if (typeof worker === 'undefined' || !worker) {
        this.registerProcessors();
      }
    }

    // 先拿 publish-record 推断 contentType（payload 里可能带，也可能没带——record 一定有）
    const record: any = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findOne({ documentId: data.publishRecordId, populate: ['video', 'gallery', 'article', 'account'] });
    if (!record) {
      throw new Error(`publish-record 不存在: ${data.publishRecordId}`);
    }

    // contentType 推断：优先 job payload → populate 关系 → lnk 表直接查
    let contentType: ContentType | null = data.contentType || null;
    if (!contentType) {
      try { contentType = inferContentTypeFromRecord(record); } catch {
        contentType = await inferContentTypeFromLnk(strapi, record.id);
      }
    }
    if (!contentType) {
      throw new Error(`publish-record ${data.publishRecordId} 无法推断 contentType（populate 和 lnk 表都无关联）`);
    }

    // contentId 解析：优先 populate → articleId payload → lnk 表直接查
    let contentId: string = String(
      (record[contentType]?.documentId) || (record[contentType]) ||
      (contentType === 'article' ? data.articleId : undefined) || ''
    );
    if (!contentId) {
      const lnkRef = await resolveContentFromLnk(strapi, contentType, record.id);
      contentId = lnkRef?.contentDocumentId || '';
    }
    if (!contentId) {
      throw new Error(`publish-record ${data.publishRecordId} 未关联 ${contentType} 内容（populate 和 lnk 表都查不到）`);
    }

    // 幂等保护：同 content + account 在 24h 内已有 pending/queued/validating record → 拒绝
    // 排除自身（createPublishRecord 已先创建了 status=queued 的当前 record）
    const inFlight = await strapi.documents('plugin::zhao-studio.publish-record').findMany({
      filters: {
        $and: [
          buildIdempotentFilter(contentType, contentId, data.accountId),
          { documentId: { $ne: data.publishRecordId } },
        ],
      },
      limit: 1,
      sort: { createdAt: 'desc' },
    });
    if (inFlight.length > 0) {
      const existing = inFlight[0];
      const ageMin = (Date.now() - new Date(existing.createdAt).getTime()) / 60000;
      if (ageMin > 30) {
        // 僵尸 record（超过 30min 还卡在进行中）→ 强制标记 failed，放行新发布
        strapi.log.warn(`[zhao-studio] 发现超时僵尸 record=${existing.documentId} (${ageMin.toFixed(0)}min), 标记 failed 放行`);
        await strapi.documents('plugin::zhao-studio.publish-record').update({
          documentId: existing.documentId,
          data: { status: 'failed', error: '超时自动清理（超过30分钟未完成）' } as any,
        }).catch(() => {});
      } else {
        throw new Error(`该${contentType}在24小时内已在此账号上有进行中的发布任务 (record=${existing.documentId})`);
      }
    }

    // 把 contentType 回填进 job payload，让 worker 无需再查 record
    const jobData: PublishJobData = { ...data, contentType };

    const job = await queue.add('publish-job', jobData, {
      jobId: data.publishRecordId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    strapi.log.info(`[zhao-studio] enqueuePublish OK queue=studio-publish jobId=${job.id} record=${data.publishRecordId}`);

    await strapi.documents('plugin::zhao-studio.publish-record').update({
      documentId: data.publishRecordId,
      data: { jobId: String(job.id), status: 'queued', queueStage: STAGES.VALIDATE } as any,
    }).catch(() => {});

    return String(job.id);
  },

  registerProcessors() {
    if (worker) return;
    const redis = getRedis();
    if (!redis) return;

    const processor = async (job: any) => {
      const data: PublishJobData = job.data;
      strapi.log.info(`[zhao-studio] Worker processing job name=${job.name} id=${job.id} record=${data.publishRecordId} contentType=${data.contentType}`);
      const stages: Stage[] = [
        STAGES.VALIDATE,
        STAGES.ENSURE_TOKEN,
        STAGES.ADAPT,
        STAGES.PUBLISH,
        STAGES.CHECK_STATUS,
        STAGES.FINALIZE,
      ];

      let result: any = {};
      let errorMsg: string | null = null;

      for (const stage of stages) {
        try {
          strapi.log.info(`[zhao-studio] → stage=${stage} updating queueStage...`);
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: data.publishRecordId,
            data: { queueStage: stage, status: STAGE_TO_STATUS[stage] } as any,
          }).catch(() => {});

          strapi.log.info(`[zhao-studio] → stage=${stage} calling runStage...`);
          result = await this.runStage(stage, data, result);
          strapi.log.info(`[zhao-studio] ✓ stage=${stage} ok`);
        } catch (err: any) {
          errorMsg = err.message || String(err);
          const platformType = result.account?.platform?.type || 'custom';
          const classified = identifyPublishError(err, platformType);
          console.error(`[WORKER-RAW] stage ${stage} failed:`, err);
          strapi.log.error(`[zhao-studio] publish stage ${stage} failed [${classified.code}]: ${errorMsg} ${err?.stack || ''}`);

          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: data.publishRecordId,
            data: {
              status: classified.code === 'PUB_012' ? 'rejected' : 'failed',
              errorCode: classified.code,
              error: errorMsg,
              finishedAt: new Date(),
            } as any,
          }).catch(() => {});

          if (classified.code === 'PUB_009') {
            try {
              const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
              await oauthManager.revoke(data.accountId);
            } catch { /* ignore revoke fail */ }
          }
          break;
        }
      }

      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: data.publishRecordId,
        data: {
          status: result.publish_mode === 'h5_share' ? 'queued' : 'success',
          externalId: result.externalId || result.publishId,
          url: result.url || result.accessUrl,
          finishedAt: new Date(),
          error: result.publish_mode === 'h5_share'
            ? JSON.stringify({ platform: 'douyin', phase: 'h5_share', schema: result.schema })
            : undefined,
        } as any,
      }).catch(() => {});

      return result;
    };

    worker = new Worker('studio-publish', processor, { connection: redis, concurrency: 5 });
    registerWorker(worker);
    strapi.log.info('[zhao-studio] BullMQ publish worker registered (concurrency=5)');
  },

  async closeWorker() {
    if (worker) {
      try { await worker.close(); } catch { /* ignore */ }
      worker = null;
    }
  },

  async runStage(stage: Stage, data: PublishJobData, prev: any): Promise<any> {
    const { accountId, publishRecordId } = data;
    strapi.log.info(`[zhao-studio] runStage ENTER stage=${stage} record=${publishRecordId} account=${accountId} contentType=${data.contentType}`);

    // 1. 查 publish-record → 推断 contentType（带 DB lnk fallback）
    const record: any = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findOne({ documentId: publishRecordId, populate: ['video', 'gallery', 'article', 'account'] });
    if (!record) throw new Error(`publish-record 不存在: ${publishRecordId}`);

    let contentType: ContentType | null = data.contentType || null;
    if (!contentType) {
      try { contentType = inferContentTypeFromRecord(record); } catch {
        contentType = await inferContentTypeFromLnk(strapi, record.id);
      }
    }
    if (!contentType) throw new Error(`publish-record ${publishRecordId} 无法推断 contentType（populate 和 lnk 表都无关联）`);

    let contentId: string = String(record[contentType]?.documentId || record[contentType] || '');
    if (!contentId) {
      const lnkRef = await resolveContentFromLnk(strapi, contentType, record.id);
      contentId = lnkRef?.contentDocumentId || '';
    }
    if (!contentId) throw new Error(`publish-record ${publishRecordId} 未关联 ${contentType} 内容（populate 和 lnk 表都查不到）`);

    // 2. 查对应内容
    const content = await strapi.documents(CONTENT_UID[contentType]).findOne({ documentId: contentId });
    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findOne({ documentId: accountId, populate: { platform: true } });
    if (!content || !account) throw new Error(`内容或账号不存在 content=${contentId} contentType=${contentType} account=${accountId}`);

    const platformType = account.platform?.type || 'custom';
    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');

    if (stage === STAGES.VALIDATE) {
      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: publishRecordId,
        data: { startedAt: new Date() } as any,
      }).catch(() => {});
    }

    switch (stage) {
      case STAGES.VALIDATE:
        return { ...prev, contentType, content, account, platformType };

      case STAGES.ENSURE_TOKEN: {
        const oauthPlatforms = ['wechat', 'douyin'];
        if (oauthPlatforms.includes(platformType)) {
          const oauthManager = strapi.plugin('zhao-studio').service('oauth-manager');
          const token = await oauthManager.ensureValidToken(accountId);
          return { ...prev, accessToken: token };
        }
        return { ...prev };
      }

      case STAGES.ADAPT: {
        const adapted = await channelAdapter.adaptContent(content, platformType);
        return { ...prev, adaptedContent: adapted };
      }

      case STAGES.PUBLISH: {
        const publishResult = await channelAdapter.publish(prev.adaptedContent, account, contentType);
        return { ...prev, ...publishResult };
      }

      case STAGES.CHECK_STATUS: {
        if (platformType === 'wechat' && prev.publishId) {
          const ssoWx = strapi.plugin('zhao-sso')?.service('sso-wechat') as any;
          if (ssoWx?.getAccessToken) {
            const wxToken = await ssoWx.getAccessToken('official_account');
            const { default: axios } = await import('axios');

            const MAX_POLL = 10;
            const POLL_MS = 5000;

            for (let i = 0; i < MAX_POLL; i++) {
              await new Promise(r => setTimeout(r, POLL_MS));
              try {
                const resp = await axios.post(
                  `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${wxToken}`,
                  { publish_id: prev.publishId },
                  { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                );
                const finalData = resp.data;
                if (finalData.publish_status === 0) {
                  const articleUrl = finalData.article_detail?.item?.[0]?.article_url;
                  const articleId = finalData.article_id;
                  return { ...prev, externalId: articleId, url: articleUrl };
                } else if (finalData.publish_status === 2) {
                  throw new Error(`平台审核拒绝 (freepublish_status=2): ${JSON.stringify(finalData)}`);
                }
              } catch (err: any) {
                if (err.message.includes('审核拒绝')) throw err;
                continue;
              }
            }
            strapi.log.warn(`[zhao-studio] wechat freepublish poll timeout for publishId=${prev.publishId}`);
            return { ...prev, externalId: prev.publishId, error: '发布已提交但轮询超时' };
          }
        }
        return { ...prev };
      }

      case STAGES.FINALIZE: {
        const { externalId, url, error } = prev;
        await strapi.documents('plugin::zhao-studio.publish-record').update({
          documentId: publishRecordId,
          data: { externalId, url, error: error || null } as any,
        }).catch((e: any) => {
          strapi.log.warn(`[zhao-studio] FINALIZE 回写 publish-record 失败: ${e?.message}`);
        });
        return prev;
      }

      default:
        throw new Error(`未知 stage: ${stage}`);
    }
  },
});

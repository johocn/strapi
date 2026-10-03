import type { Core } from '@strapi/strapi';
import { getPublishQueue, type PublishJobData } from '../utils/queue';

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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async enqueuePublish(data: PublishJobData): Promise<string | null> {
    const queue = getPublishQueue();
    if (!queue) {
      throw new Error('发布队列不可用，请检查 Redis 连接');
    }

    const job = await queue.add('publish-job', data, {
      jobId: data.publishRecordId,
    });

    await strapi.documents('plugin::zhao-studio.publish-record').update({
      documentId: data.publishRecordId,
      data: { jobId: String(job.id), status: 'queued', queueStage: STAGES.VALIDATE } as any,
    }).catch(() => {});

    return String(job.id);
  },

  registerProcessors() {
    const queue = getPublishQueue();
    if (!queue) return;

    queue.process('publish-job', 5, async (job) => {
      const data: PublishJobData = job.data;
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
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: data.publishRecordId,
            data: { queueStage: stage, status: STAGE_TO_STATUS[stage] } as any,
          }).catch(() => {});

          result = await this.runStage(stage, data, result);
        } catch (err: any) {
          errorMsg = err.message || String(err);
          strapi.log.error(`[zhao-studio] publish stage ${stage} failed: ${errorMsg}`);
          break;
        }
      }

      if (errorMsg) {
        await strapi.documents('plugin::zhao-studio.publish-record').update({
          documentId: data.publishRecordId,
          data: { status: 'failed', error: errorMsg, finishedAt: new Date() } as any,
        }).catch(() => {});
        throw new Error(errorMsg);
      }

      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: data.publishRecordId,
        data: {
          status: result.publish_mode === 'h5_share' ? 'queued' : 'success',
          externalId: result.externalId || result.publishId,
          url: result.url,
          finishedAt: new Date(),
          error: result.publish_mode === 'h5_share'
            ? JSON.stringify({ platform: 'douyin', phase: 'h5_share', schema: result.schema })
            : undefined,
        } as any,
      }).catch(() => {});

      return result;
    });
  },

  async runStage(stage: Stage, data: PublishJobData, prev: any): Promise<any> {
    const { articleId, accountId, publishRecordId } = data;
    const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
    const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
    if (!article || !account) throw new Error(`文章或账号不存在 article=${articleId} account=${accountId}`);

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
        return { ...prev };

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
        const adapted = await channelAdapter.adaptContent(article, platformType);
        return { ...prev, adaptedContent: adapted };
      }

      case STAGES.PUBLISH: {
        const publishResult = await channelAdapter.publish(prev.adaptedContent, account);
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
            let finalData: any = null;

            for (let i = 0; i < MAX_POLL; i++) {
              await new Promise(r => setTimeout(r, POLL_MS));
              try {
                const resp = await axios.post(
                  `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${wxToken}`,
                  { publish_id: prev.publishId },
                  { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                );
                finalData = resp.data;
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

      case STAGES.FINALIZE:
        return prev;

      default:
        throw new Error(`未知 stage: ${stage}`);
    }
  },
});

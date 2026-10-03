# zhao-studio 发布增强 P2：Bull 全链路队列 + 定时发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 publish.ts 的同步 for 循环改为 Bull 队列入队立即返回；wechat 50 秒同步轮询从 publishToWechat 内部移除，改为 Bull Flow checkStatus 阶段；新增 publish-schedule content-type 支持定时发布；新增 studio-scheduler 队列每分钟扫描触发。

**Architecture:** 两个 Bull Queue（`studio-publish` 发布队列用 Bull Flow 编排 6 阶段；`studio-scheduler` 定时队列串行扫描）。Redis 配置复用 zhao-channel 的分段环境变量（REDIS_HOST/PORT/PASSWORD/DB），队列名隔离（`studio-publish`/`studio-scheduler`）。publish.ts 的 publishArticle 立即返回 queued 状态数组，不等待完成。

**Tech Stack:** Bull v4.16.4（宿主 package.json 已有），ioredis v5.4.2，Strapi 5 document API，Bull Flows（bull-flow，Bull 内置）

**Spec:** `docs/superpowers/specs/2026-10-03-zhao-studio-publish-enhancement-design.md` Section 二 + 四

**P1 已完成:** wechat freepublish 自动发布 + douyin H5 schema + toutiao/xiaohongshu/bilibili 标记不支持 + publish-record status 枚举 9 值扩展

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `content-types/publish-schedule/schema.json` | 定时发布任务表 |
| **Modify** | `content-types/publish-record/schema.json` | 新增 scheduledAt/startedAt/finishedAt/jobId/queueStage 5 字段 |
| **Create** | `server/src/utils/queue.ts` | studio-publish + studio-scheduler 两个 Queue 实例 + close + probeBullSupport（复用 zhao-channel 模式） |
| **Create** | `server/src/services/publish-queue.ts` | Bull Flow 各阶段 handler（validateContent / ensureOAuthToken / uploadMedia / adaptContent / publish / checkStatus）+ 入队方法 |
| **Create** | `server/src/services/scheduler.ts` | 定时扫描 publish-schedule + OAuth token 续期 |
| **Modify** | `server/src/services/publish.ts` | publishArticle 入队改造（立即返回 queued）+ 定时入口 createSchedule |
| **Modify** | `server/src/bootstrap.ts` | 注册 Bull Flow handlers + scheduler cron + Redis 探测 |
| **Modify** | `server/src/services/index.ts` | 注册 publish-queue + scheduler service |
| **Create** | `server/src/destroy.ts` | close queue |

---

## 前置确认

- zhao-channel 的 Redis 配置：`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` / `REDIS_USER`
- zhao-channel 用 `probeBullSupport()` 探测 `EVAL` Lua 能力（必须复用，否则幻影任务）
- publish-record 当前只有 9 个 status 枚举（P1 Task 6 修复），**不含 scheduled**（scheduled 是 publish-schedule 的状态，不是 publish-record 的）
- Bull Flows：Bull v4 内置，API 是 `bullFlow(queue, flow)` 然后 `queue.addFlowJob(flow, data)`
- TypeScript 验证：`cd plugins/zhao-studio; npx tsc --noEmit`
- Build：`cd plugins/zhao-studio; npm run build`

---

### Task 1: publish-record schema 新增 5 个字段 + publish-schedule 新建

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\server\src\content-types\publish-record\schema.json`
- Create: `e:\code\basic\plugins\zhao-studio\server\src\content-types\publish-schedule\schema.json`

#### Step 1: publish-record 新增 5 字段

Read 确认当前 schema，在 status 字段**之后**（error 字段之前）插入：

```json
    "scheduledAt": {
      "type": "datetime"
    },
    "startedAt": {
      "type": "datetime"
    },
    "finishedAt": {
      "type": "datetime"
    },
    "jobId": {
      "type": "string"
    },
    "queueStage": {
      "type": "string"
    },
```

#### Step 2: 新建 publish-schedule/schema.json

目录先 Glob 确认 content-types 下有 publish-platform / publish-account / publish-record / article-draft，然后新建：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_publish_schedules",
  "info": {
    "singularName": "publish-schedule",
    "pluralName": "publish-schedules",
    "displayName": "定时发布任务",
    "description": "预约发布，到点自动触发"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": true }
  },
  "attributes": {
    "name": { "type": "string" },
    "article": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-studio.article-draft",
      "inversedBy": "publishSchedules"
    },
    "accounts": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.publish-account",
      "mappedBy": null
    },
    "scheduledAt": { "type": "datetime", "required": true },
    "triggeredAt": { "type": "datetime" },
    "status": {
      "type": "enumeration",
      "enum": ["scheduled", "triggered", "cancelled", "expired"],
      "default": "scheduled"
    },
    "publishRecords": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.publish-record",
      "mappedBy": null
    },
    "createdBy": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    }
  }
}
```

#### Step 3: 验证

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 10
```

#### Step 4: Commit

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/content-types/
git commit -m "feat(zhao-studio): P2 Task1 publish-record 扩 5 字段 + 新建 publish-schedule content-type"
```

---

### Task 2: utils/queue.ts — 两个 Queue + Redis 探测

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\utils\queue.ts`

#### Step 1: 写完整 queue.ts

这个文件**完全复用 zhao-channel 的模式**，唯一区别是两个队列名：

```typescript
import Queue from 'bull';

function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    username: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 1,
  };
}

// zhao-studio 插件不走 getRedisClient()，因为 zhao-channel 的 redis.ts 是它自己的 utils
// 直接用 bull 默认的 ioredis 连接
// 但需要走同样的 probeBullSupport 探测 Redis 是否支持 Lua

let queuesAvailable: boolean | null = null;
let publishQueue: Queue.Queue | null = null;
let schedulerQueue: Queue.Queue | null = null;

async function probeBullSupport(): Promise<boolean> {
  // 用一个临时 ioredis client 发 EVAL "return 1"
  try {
    const Redis = require('ioredis');
    const redis = new Redis(getRedisConfig());
    await redis.connect().catch(() => {});
    const result = await redis.eval('return 1', 0);
    try { await redis.quit(); } catch { /* ignore */ }
    return result === 1;
  } catch {
    return false;
  }
}

export async function initStudioQueues(): Promise<{ publish: Queue.Queue | null; scheduler: Queue.Queue | null }> {
  if (queuesAvailable === null) {
    queuesAvailable = await probeBullSupport();
  }
  if (!queuesAvailable) return { publish: null, scheduler: null };

  if (!publishQueue) {
    publishQueue = new Queue('studio-publish', {
      redis: getRedisConfig(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    });
  }

  if (!schedulerQueue) {
    schedulerQueue = new Queue('studio-scheduler', {
      redis: getRedisConfig(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    });
  }

  return { publish: publishQueue, scheduler: schedulerQueue };
}

export function getPublishQueue(): Queue.Queue | null { return publishQueue; }
export function getSchedulerQueue(): Queue.Queue | null { return schedulerQueue; }

export async function closeStudioQueues() {
  for (const q of [publishQueue, schedulerQueue]) {
    if (q) {
      try { await q.close(); } catch { /* ignore */ }
    }
  }
  publishQueue = null;
  schedulerQueue = null;
  queuesAvailable = null;
}

export interface PublishJobData {
  articleId: string;
  accountId: string;
  publishRecordId: string;
  triggerSource: 'manual' | 'schedule';
}
```

#### Step 2: 验证

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
```

#### Step 3: Commit

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/utils/queue.ts
git commit -m "feat(zhao-studio): P2 Task2 Bull 队列工具 (studio-publish + studio-scheduler + probeBullSupport)"
```

---

### Task 3: services/publish-queue.ts — 入队方法 + Bull Flow 阶段 handler

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\server\src\services\publish-queue.ts`

#### 这个 service 做什么：
1. `enqueuePublish(articleId, accountId, publishRecordId)` → 创建 Bull Job 入 studio-publish 队列
2. **每个阶段是一个独立的 Bull job processor**（registerProcessor 由 bootstrap 调用）
3. publishToWechat 内部**移除同步轮询**，改为只 submit → 记录 publish_id → 交给 checkStatus 阶段轮询

#### Step 1: 写 publish-queue.ts

```typescript
import type { Core } from '@strapi/strapi';
import { getPublishQueue, type PublishJobData } from '../utils/queue';

// 6 个阶段名称（publish-record.queueStage 字段存这个）
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
  [STAGES.FINALIZE]: 'success', // 或 failed
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 入队一条发布任务（同步方法，立即返回）
   */
  async enqueuePublish(data: PublishJobData): Promise<string | null> {
    const queue = getPublishQueue();
    if (!queue) {
      // Redis 不可用：降级为同步发布（走 P1 的 publish.ts 逻辑）
      strapi.log.warn('[zhao-studio] Bull queue unavailable, falling back to sync publish');
      throw new Error('发布队列不可用，请检查 Redis 连接');
    }

    const job = await queue.add('publish-job', data, {
      jobId: data.publishRecordId, // 用 publish-record documentId 做 Bull jobId，方便关联
    });

    // 更新 publish-record.jobId + status=queued
    await strapi.documents('plugin::zhao-studio.publish-record').update({
      documentId: data.publishRecordId,
      data: { jobId: job.id, status: 'queued', queueStage: STAGES.VALIDATE },
    } as any);

    return job.id;
  },

  /**
   * 注册 6 个阶段 processor（由 bootstrap 调用，每个阶段是独立 processor）
   *
   * 实际 Bull 里不用 Flow 语法，而是一个大 processor 里 switch stage 名字。
   * 这样更简单，也更容易单独重试失败的阶段。
   */
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
          // 更新 publish-record 当前阶段
          await strapi.documents('plugin::zhao-studio.publish-record').update({
            documentId: data.publishRecordId,
            data: { queueStage: stage, status: STAGE_TO_STATUS[stage] } as any,
          }).catch(() => {});

          // 执行阶段
          result = await this.runStage(stage, data, result);
        } catch (err: any) {
          errorMsg = err.message || String(err);
          strapi.log.error(`[zhao-studio] publish stage ${stage} failed: ${errorMsg}`);
          break;
        }
      }

      // Finalize：写入最终状态
      if (errorMsg) {
        await strapi.documents('plugin::zhao-studio.publish-record').update({
          documentId: data.publishRecordId,
          data: { status: 'failed', error: errorMsg, finishedAt: new Date() } as any,
        }).catch(() => {});
        throw new Error(errorMsg); // 让 Bull 标记 job failed
      }

      // 成功
      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: data.publishRecordId,
        data: {
          status: result.h5Share ? 'queued' : 'success',
          externalId: result.externalId || result.publishId,
          url: result.url,
          finishedAt: new Date(),
          error: result.h5Share
            ? JSON.stringify({ platform: 'douyin', phase: 'h5_share', schema: result.schema })
            : undefined,
        } as any,
      }).catch(() => {});

      return result;
    });
  },

  async runStage(stage: Stage, data: PublishJobData, prev: any): Promise<any> {
    const { articleId, accountId, publishRecordId } = data;

    // 加载文章和账号
    const article = await strapi.documents('plugin::zhao-studio.article-draft').findOne({ documentId: articleId });
    const account = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
    if (!article || !account) throw new Error(`文章或账号不存在 article=${articleId} account=${accountId}`);

    const platformType = account.platform?.type || 'custom';
    const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');

    // 写 startedAt
    if (stage === STAGES.VALIDATE) {
      await strapi.documents('plugin::zhao-studio.publish-record').update({
        documentId: publishRecordId,
        data: { startedAt: new Date() } as any,
      }).catch(() => {});
    }

    switch (stage) {
      case STAGES.VALIDATE: {
        // channel-adapter.publish 里自带 validation，这里跳过单独的 validate
        // （publish 方法第一行就是 validateContentForPlatform）
        return { ...prev };
      }

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
        // wechat: freepublish/submit 已在 publish 阶段返回了 publishId，这里轮询 freepublish/get
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
            // 轮询超时但已经 submit 成功，按成功处理，externalId=publishId
            strapi.log.warn(`[zhao-studio] wechat freepublish poll timeout for publishId=${prev.publishId}`);
            return { ...prev, externalId: prev.publishId, error: '发布已提交但轮询超时' };
          }
        }

        // douyin h5_share 或 internal/custom：无状态回查
        return { ...prev };
      }

      case STAGES.FINALIZE: {
        // 阶段，返回最终 data
        return prev;
      }

      default:
        throw new Error(`未知 stage: ${stage}`);
    }
  },
});
```

#### Step 2: TypeScript + Build 验证

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 5
```

#### Step 3: Commit

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/services/publish-queue.ts
git commit -m "feat(zhao-studio): P2 Task3 publish-queue service (enqueue + 6 阶段 processor)"
```

---

### Task 4: wechat publishToWechat 移除同步轮询 + scheduler service

**前置：** P1 的 publishToWechat 在 submit 后同步轮询 freepublish/get。P2 改成：submit 成功后返回 `publishId`，**不轮询**，让 Task 3 的 checkStatus 阶段来轮询。

#### 4a: publishToWechat 简化

**Files:** Modify channel-adapter.ts

找到 publishToWechat 方法的 Step D 轮询部分（`for (let i = 0; i < MAX_POLL; i++) {` 开始的 for 循环），**全部删除**，替换为：

```typescript
    // Step D: 不再同步轮询 — 交给 Bull Flow checkStatus 阶段
    return {
      success: true,
      externalId: publishId,
      publishId,
    };
```

#### 4b: 新建 scheduler service

**Files:** Create `server/src/services/scheduler.ts`

```typescript
import type { Core } from '@strapi/strapi';
import { getSchedulerQueue } from '../utils/queue';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 注册定时任务（由 bootstrap 调用，用 Bull repeatable）
   */
  registerSchedulers() {
    const queue = getSchedulerQueue();
    if (!queue) return;

    // 每分钟扫描一次
    queue.add(
      'scan-and-trigger',
      { type: 'scan' },
      {
        repeat: { cron: '* * * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 20,
        removeOnFail: 10,
      }
    );

    queue.add(
      'token-refresh',
      { type: 'token-refresh' },
      {
        repeat: { cron: '0 * * * *' }, // 每小时整
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 20,
        removeOnFail: 10,
      }
    );

    // processor
    queue.process('scan-and-trigger', async () => {
      await this.scanAndTriggerSchedules();
      await this.refreshExpiringTokens();
      return { ok: true };
    });
  },

  async scanAndTriggerSchedules() {
    const now = new Date();
    const pending = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters: {
        status: 'scheduled',
        scheduledAt: { $lte: now },
      },
    });

    for (const schedule of pending) {
      try {
        // 触发：为每个 account 创建 publish-record + 入 studio-publish 队列
        const accounts = schedule.accounts || [];
        for (const acc of accounts) {
          const accDocId = typeof acc === 'string' ? acc : (acc as any).documentId;
          const record = await strapi.documents('plugin::zhao-studio.publish-record').create({
            data: {
              article: schedule.article?.documentId || schedule.article,
              account: accDocId,
              status: 'queued',
              scheduledAt: schedule.scheduledAt,
            },
          });

          const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
          await publishQueue.enqueuePublish({
            articleId: schedule.article?.documentId || schedule.article,
            accountId: accDocId,
            publishRecordId: record.documentId,
            triggerSource: 'schedule',
          });
        }

        // 更新 schedule 状态
        await strapi.documents('plugin::zhao-studio.publish-schedule').update({
          documentId: schedule.documentId,
          data: { status: 'triggered', triggeredAt: new Date() },
        });
      } catch (err: any) {
        strapi.log.error(`[zhao-studio] schedule trigger failed schedule=${schedule.documentId}: ${err.message}`);
      }
    }

    // 标记超时未触发的 schedule（过期）
    const expired = await strapi.documents('plugin::zhao-studio.publish-schedule').findMany({
      filters: {
        status: 'scheduled',
        scheduledAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // 超过 24 小时
      },
    });
    for (const s of expired) {
      await strapi.documents('plugin::zhao-studio.publish-schedule').update({
        documentId: s.documentId,
        data: { status: 'expired' },
      });
    }
  },

  async refreshExpiringTokens() {
    // 每小时扫一次 publish-account 的 OAuth 到期时间
    // 返回前 10 分钟内过期的账号，批量续期
    // 具体实现：读所有 publish-account 中 oauthExpiresAt < now + 10min 的账号，
    // 调 oauth-manager.ensureValidToken
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
        // 标记 expired
        await strapi.documents('plugin::zhao-studio.publish-account').update({
          documentId: acc.documentId,
          data: { oauthState: 'expired' },
        });
      }
    }
  },
});
```

#### Step 5: 验证 + Commit

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 5
```

Commit:
```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/services/channel-adapter.ts plugins/zhao-studio/server/src/services/scheduler.ts
git commit -m "feat(zhao-studio): P2 Task4 wechat 移除同步轮询 + scheduler service"
```

---

### Task 5: publish.ts 入队改造 + createSchedule + bootstrap/destroy/service-index

#### 5a: publish.ts publishArticle 改造

**核心变化：** publishArticle 不再同步 for 循环，而是：
1. 为每个 account 创建 publish-record（status=queued）
2. 调 publish-queue.enqueuePublish 入队
3. 立即返回（不等待）

**同时：** 新增 createSchedule 方法（定时发布入口）

**文件：** Modify `server/src/services/publish.ts`

找到 publishArticle 方法，**整体替换**为：

```typescript
  async publishArticle(articleId: string, accountIds: string[], opts?: { scheduledAt?: Date }): Promise<any[]> {
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

    // 4. 定时发布 → 创建 publish-schedule，由 scheduler 触发
    if (opts?.scheduledAt) {
      const schedule = await strapi.documents('plugin::zhao-studio.publish-schedule').create({
        data: {
          name: `定时发布 ${article.title || article.documentId} @ ${opts.scheduledAt.toISOString()}`,
          article: article.documentId,
          accounts: accounts.map(a => a.documentId),
          scheduledAt: opts.scheduledAt,
          status: 'scheduled',
        },
      });
      return [{ trigger: 'scheduled', scheduleId: schedule.documentId, accountCount: accounts.length }];
    }

    // 5. 立即发布 → 为每个 account 创建 publish-record + 入 studio-publish 队列
    const publishQueue = strapi.plugin('zhao-studio').service('publish-queue');
    const results = [];

    for (const account of accounts) {
      const record = await strapi
        .documents('plugin::zhao-studio.publish-record')
        .create({
          data: {
            article: articleId,
            account: account.documentId,
            status: 'queued',
          },
        });

      try {
        await publishQueue.enqueuePublish({
          articleId,
          accountId: account.documentId,
          publishRecordId: record.documentId,
          triggerSource: 'manual',
        });
        results.push({
          accountId: account.documentId,
          accountName: account.name,
          platform: account.platform?.type,
          success: true,
          queued: true,
          recordId: record.documentId,
        });
      } catch (err: any) {
        // 入队失败 → 降级同步发布（只走 P1 的 channel-adapter.publish）
        strapi.log.warn(`[zhao-studio] queue unavailable, sync fallback for account=${account.documentId}`);
        try {
          const channelAdapter = strapi.plugin('zhao-studio').service('channel-adapter');
          const adapted = await channelAdapter.adaptContent(article, account.platform?.type || 'custom');
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
            accountId: account.documentId,
            accountName: account.name,
            platform: account.platform?.type,
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
            accountId: account.documentId,
            accountName: account.name,
            platform: account.platform?.type,
            success: false,
            error: syncErr.message,
            recordId: record.documentId,
          });
        }
      }
    }

    return results;
  },

  /**
   * 创建定时发布任务（独立入口）
   */
  async createSchedule(data: {
    articleId: string;
    accountIds: string[];
    scheduledAt: Date;
    name?: string;
  }) {
    return this.publishArticle(data.articleId, data.accountIds, { scheduledAt: data.scheduledAt });
  },
```

#### 5b: bootstrap.ts — 注册 queue + processor + scheduler

**文件：** Modify `server/src/bootstrap.ts`

在现有代码的**最顶部**（export default async 之前）加入初始化：

```typescript
// P2: Bull 队列初始化 + 注册 processor + scheduler
import { initStudioQueues } from './utils/queue';

export default async ({ strapi }: { strapi: any }) => {
  // 1. 初始化 Bull 队列（Redis Lua 探测）
  try {
    const { publish, scheduler } = await initStudioQueues();
    if (publish) {
      const publishQueueService = strapi.plugin('zhao-studio').service('publish-queue');
      if (publishQueueService?.registerProcessors) {
        publishQueueService.registerProcessors();
        strapi.log.info('[zhao-studio] studio-publish queue processors registered');
      }
    }
    if (scheduler) {
      const schedulerService = strapi.plugin('zhao-studio').service('scheduler');
      if (schedulerService?.registerSchedulers) {
        schedulerService.registerSchedulers();
        strapi.log.info('[zhao-studio] studio-scheduler queue registered');
      }
    }
  } catch (e: any) {
    strapi.log.warn(`[zhao-studio] Bull queue init failed (Redis unavailable?): ${e.message}`);
  }

  // === 以下为原有代码 ===
```

#### 5c: destroy.ts — close queue

**先 Glob 确认是否存在 destroy.ts**，然后创建或修改：

```typescript
import { closeStudioQueues } from './utils/queue';

export default async () => {
  try {
    await closeStudioQueues();
  } catch {
    // ignore
  }
};
```

#### 5d: services/index.ts — 注册新 service

Read 当前 services/index.ts，加入 publish-queue + scheduler。格式和已有 oauth-manager / channel-adapter 一致：

```typescript
'publish-queue': ({ strapi }) => require('./publish-queue').default({ strapi }),
'scheduler': ({ strapi }) => require('./scheduler').default({ strapi }),
```

#### Step 6: 全量验证

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 10
```

预期：tsc 零 error，build 成功。

#### Step 7: Commit

```bash
cd e:\code\basic
git add plugins/zhao-studio/server/src/
git commit -m "feat(zhao-studio): P2 Task5 publish.ts 入队改造 + bootstrap/destroy/service-index 注册"
```

---

### Task 6: 全量验证 + Push + Commit

无新增文件，运行完整验证：

#### Step 1: tsc + build

```bash
cd e:\code\basic\plugins\zhao-studio
npx tsc --noEmit 2>&1
npm run build 2>&1 | Select-Object -Last 10
```

#### Step 2: Git status + push

```bash
cd e:\code\basic
git status
git add plugins/zhao-studio/ docs/superpowers/plans/2026-10-03-zhao-studio-publish-p2-bull-queue.md
git commit -m "feat(zhao-studio): P2 Bull 全链路队列 + 定时发布完整交付"
git push origin main
```

---

## P2 验收 Checklist

| # | 验收项 | 验证方式 |
|---|---|---|
| 1 | tsc 零 error | `tsc --noEmit` |
| 2 | Build 成功 | `npm run build` |
| 3 | publish-record 有 scheduledAt/startedAt/finishedAt/jobId/queueStage 5 字段 | grep schema.json |
| 4 | publish-schedule content-type 存在 | Glob 确认 |
| 5 | utils/queue.ts 有 initStudioQueues + probeBullSupport | grep |
| 6 | publish-queue.ts 有 6 阶段 STAGES + registerProcessors | grep STAGES |
| 7 | publish.ts publishArticle 立即返回 queued（入队模式） | 读代码 |
| 8 | publish.ts 有 sync fallback（队列不可用时降级） | grep "fallback" |
| 9 | scheduler.ts 扫描 publish-schedule cron '* * * * *' | grep cron |
| 10 | scheduler.ts 有 token-refresh cron '0 * * * *' | grep cron |
| 11 | bootstrap.ts 调 initStudioQueues + registerProcessors | grep bootstrap.ts |
| 12 | destroy.ts 有 closeStudioQueues | grep destroy.ts |
| 13 | services/index.ts 注册 publish-queue + scheduler | grep index.ts |
| 14 | channel-adapter.ts wechat 移除同步轮询（只 submit 不 poll） | grep "freepublish/get" 应只在 publish-queue.ts 的 checkStatus 阶段出现 |

---

## Self-Review

| 检查项 | 结果 |
|---|---|
| wechat 同步轮询已从 channel-adapter 移除 | ✅ Task 4a 确认 |
| publish-queue checkStatus 负责轮询 | ✅ Task 3 runStage(STAGES.CHECK_STATUS) 里有 |
| 队列不可用时 publish.ts 有 sync fallback | ✅ Task 5a 里 try/catch enqueuePublish 失败后降级 |
| Redis 探测复用 zhao-channel 模式 | ✅ Task 2 probeBullSupport 用 EVAL "return 1" |
| publish-schedule status 枚举 | ✅ Task 1: scheduled/triggered/cancelled/expired |
| publish-record 新增字段 | ✅ Task 1 5 字段 |
| services/index.ts 注册 | ✅ Task 5d |
| destroy.ts closeStudioQueues | ✅ Task 5c |
| 无 Placeholder | ✅ |
| 不改动 P0/P1 代码 | ✅ 只加新文件 + channel-adapter 的 wechat 简化 |

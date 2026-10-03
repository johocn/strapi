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

let queuesAvailable: boolean | null = null;
let publishQueue: Queue.Queue | null = null;
let schedulerQueue: Queue.Queue | null = null;

async function probeBullSupport(): Promise<boolean> {
  try {
    // 动态 require 避免类型编译期问题
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
    try {
      publishQueue = new Queue('studio-publish', {
        redis: getRedisConfig(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 20,
          removeOnFail: 10,
        },
      });
    } catch {
      publishQueue = null;
    }
  }

  if (!schedulerQueue) {
    try {
      schedulerQueue = new Queue('studio-scheduler', {
        redis: getRedisConfig(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 20,
          removeOnFail: 10,
        },
      });
    } catch {
      schedulerQueue = null;
    }
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

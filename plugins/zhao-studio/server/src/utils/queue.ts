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
    const cfg = getRedisConfig();
    // password 为空时不传 undefined
    const cleanCfg: any = { host: cfg.host, port: cfg.port, db: cfg.db, maxRetriesPerRequest: 1 };
    if (cfg.username) cleanCfg.username = cfg.username;
    if (cfg.password) cleanCfg.password = cfg.password;
    const Redis = require('ioredis');
    const redis = new Redis(cleanCfg);
    await redis.connect().catch(() => {});
    const result = await redis.eval('return 1', 0);
    try { await redis.quit(); } catch { /* ignore */ }
    return result === 1;
  } catch {
    return false;
  }
}

function getCleanRedisConfig(): any {
  const cfg = getRedisConfig();
  const clean: any = { host: cfg.host, port: cfg.port, db: cfg.db, maxRetriesPerRequest: 1 };
  if (cfg.username) clean.username = cfg.username;
  if (cfg.password) clean.password = cfg.password;
  return clean;
}

export async function initStudioQueues(): Promise<{ publish: Queue.Queue | null; scheduler: Queue.Queue | null }> {
  try {
    if (queuesAvailable === null) {
      queuesAvailable = await probeBullSupport();
    }
    if (!queuesAvailable) return { publish: null, scheduler: null };

    const redisCfg = getCleanRedisConfig();

    if (!publishQueue) {
      try {
        publishQueue = new Queue('studio-publish', {
          redis: redisCfg,
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
          redis: redisCfg,
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
  } catch {
    return { publish: null, scheduler: null };
  }
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

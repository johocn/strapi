import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

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

function getCleanRedisConfig(): any {
  const cfg = getRedisConfig();
  const clean: any = { host: cfg.host, port: cfg.port, db: cfg.db, maxRetriesPerRequest: 1 };
  if (cfg.username) clean.username = cfg.username;
  if (cfg.password) clean.password = cfg.password;
  return clean;
}

let redisClient: Redis | null = null;
let queuesAvailable: boolean | null = null;
let publishQueue: Queue | null = null;
let schedulerQueue: Queue | null = null;
const registeredWorkers: { close: () => Promise<void> }[] = [];

export async function initStudioQueues(): Promise<{ publish: Queue | null; scheduler: Queue | null }> {
  if (queuesAvailable === false) {
    return { publish: null, scheduler: null };
  }

  try {
    const cfg = getCleanRedisConfig();
    redisClient = new Redis(cfg);
    await redisClient.ping();
    queuesAvailable = true;

    publishQueue = new Queue('studio-publish', { connection: redisClient });
    schedulerQueue = new Queue('studio-scheduler', { connection: redisClient });

    return { publish: publishQueue, scheduler: schedulerQueue };
  } catch (err: any) {
    queuesAvailable = false;
    return { publish: null, scheduler: null };
  }
}

export function getRedis() { return redisClient; }
export function getPublishQueue(): Queue | null { return publishQueue; }
export function getSchedulerQueue(): Queue | null { return schedulerQueue; }

export function registerWorker(w: { close: () => Promise<void> }) {
  registeredWorkers.push(w);
}

export async function closeStudioQueues() {
  for (const w of registeredWorkers) { try { await w.close(); } catch { /* ignore */ } }
  registeredWorkers.length = 0;
  if (publishQueue) { try { await publishQueue.close(); } catch { /* ignore */ } }
  if (schedulerQueue) { try { await schedulerQueue.close(); } catch { /* ignore */ } }
  if (redisClient) { try { await redisClient.quit(); } catch { /* ignore */ } }
  publishQueue = null; schedulerQueue = null; redisClient = null; queuesAvailable = null;
}

export interface PublishJobData {
  articleId: string;
  accountId: string;
  publishRecordId: string;
  triggerSource: 'manual' | 'schedule';
}

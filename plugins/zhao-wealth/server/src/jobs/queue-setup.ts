'use strict';

import Queue from 'bull';
import { markRedisUnavailable } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;
let queueSetupFailed = false;

export function setupQueues(strapi: any) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    collectQueue = new Queue('wealth-collect', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    calculateQueue = new Queue('wealth-calculate', redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    recalculateQueue = new Queue('wealth-recalculate', redisUrl, {
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    strapi.log.info('[zhao-wealth] Bull队列初始化完成');
  } catch (error) {
    queueSetupFailed = true;
    markRedisUnavailable();
    strapi.log.warn(`[zhao-wealth] Bull队列初始化失败，队列功能将不可用: ${error.message}`);
  }
}

export function getCollectQueue(): Queue.Queue | null {
  return collectQueue;
}

export function getCalculateQueue(): Queue.Queue | null {
  return calculateQueue;
}

export function getRecalculateQueue(): Queue.Queue | null {
  return recalculateQueue;
}

export function isQueueAvailable(): boolean {
  return !queueSetupFailed && collectQueue !== null;
}

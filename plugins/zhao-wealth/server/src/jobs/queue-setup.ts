'use strict';

import Queue from 'bull';
import { getRedisClient } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;

export function setupQueues(strapi: any) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

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
}

export function getCollectQueue(): Queue.Queue {
  return collectQueue!;
}

export function getCalculateQueue(): Queue.Queue {
  return calculateQueue!;
}

export function getRecalculateQueue(): Queue.Queue {
  return recalculateQueue!;
}
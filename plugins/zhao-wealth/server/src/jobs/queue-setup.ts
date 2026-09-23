'use strict';

import Queue from 'bull';
import { markRedisUnavailable, ensureRedisAvailable, getRedisClient } from '../utils';

let collectQueue: Queue.Queue | null = null;
let calculateQueue: Queue.Queue | null = null;
let recalculateQueue: Queue.Queue | null = null;
let queueSetupFailed = false;

/**
 * 探测 Redis 是否具备 Bull 所需的 Lua 能力。
 * Bull 的任务流转全部依赖 EVAL/EVALSHA，仅 PING 通过不足以证明可用：
 * 若 6379 被不支持 EVAL 的兼容实现占用（如游戏服开发用的 mock-redis 对未知命令
 * 统一回 +OK），Bull 会把该回复当作 [jobData, jobId] 解析，凭空造出
 * name=__default__ 的幻影任务；因无对应处理器，handleFailed → moveToFailed
 * 同样拿到 +OK → 再造幻影任务，形成无限失败循环：单核 CPU 打满、事件循环饿死
 * （表现为全站请求卡 60s 整数倍、Strapi 启动耗时 900s+）。
 */
async function probeBullSupport(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    return (await redis.eval('return 1', 0)) === 1;
  } catch {
    return false;
  }
}

export async function setupQueues(strapi: any) {
  // 读取分段环境变量（避免密码含 @ 等 URL 特殊字符的编码问题）
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    username: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 1,
  };

  // 预探测 Redis 可用性，不可用则直接跳过队列创建（避免 Bull 内部 ioredis 崩溃进程）
  const available = await ensureRedisAvailable();
  if (!available) {
    queueSetupFailed = true;
    markRedisUnavailable();
    strapi.log.warn('[zhao-wealth] Redis 不可用，队列功能降级（API 与手动操作仍可用）');
    return;
  }

  // 再探测 Lua 能力：PING 通过但 EVAL 不支持的 Redis（mock/代理）会让 Bull 无限自旋
  if (!(await probeBullSupport())) {
    queueSetupFailed = true;
    strapi.log.warn(
      '[zhao-wealth] Redis 不支持 Bull 所需的 Lua 脚本，队列功能降级（API 与手动操作仍可用）'
    );
    return;
  }

  try {
    collectQueue = new Queue('wealth-collect', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    calculateQueue = new Queue('wealth-calculate', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1 * 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    recalculateQueue = new Queue('wealth-recalculate', {
      redis: redisConfig,
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

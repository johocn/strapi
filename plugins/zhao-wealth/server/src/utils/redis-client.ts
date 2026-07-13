'use strict';

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client: Redis | null = null;
let redisAvailable: boolean | null = null; // null = 未检测, true = 可用, false = 不可用

/**
 * 获取 Redis 客户端（不可用时返回 null）
 */
export function getRedisClient(): Redis | null {
  if (redisAvailable === false) return null;
  if (!client) {
    try {
      client = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // 不自动重试
      });
      // 必须监听 error 事件，否则连接失败时 ioredis 抛出
      // "Unhandled error event" 导致 Node 进程崩溃
      client.on('error', () => {
        redisAvailable = false;
      });
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return client;
}

/**
 * 检测 Redis 是否可用（ping 失败时标记为不可用）
 */
export async function ensureRedisAvailable(): Promise<boolean> {
  if (redisAvailable === false) return false;
  const redis = getRedisClient();
  if (!redis) {
    redisAvailable = false;
    return false;
  }
  try {
    if (redis.status === 'wait' || redis.status === 'connect') {
      await redis.connect();
    }
    await redis.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

/**
 * 显式标记 Redis 不可用（用于队列初始化失败场景）
 */
export function markRedisUnavailable(): void {
  redisAvailable = false;
}

/**
 * 关闭 Redis 客户端
 */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      // 忽略关闭错误
    }
    client = null;
  }
  redisAvailable = null;
}

/**
 * 分布式锁获取（Redis 不可用时返回 false）
 */
export async function acquireLock(key: string, ttl: number): Promise<boolean> {
  if (!(await ensureRedisAvailable())) return false;
  try {
    const redis = client!;
    const result = await redis.set(key, 'locked', 'PX', ttl * 1000, 'NX');
    return result === 'OK';
  } catch {
    redisAvailable = false;
    return false;
  }
}

/**
 * 分布式锁释放（Redis 不可用时静默跳过）
 */
export async function releaseLock(key: string): Promise<void> {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}

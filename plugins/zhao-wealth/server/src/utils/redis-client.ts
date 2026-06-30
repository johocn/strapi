'use strict';

import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * 获取Redis客户端（复用现有配置）
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * 分布式锁获取
 */
export async function acquireLock(key: string, ttl: number): Promise<boolean> {
  const client = getRedisClient();
  const result = await client.set(key, 'locked', 'PX', ttl * 1000, 'NX');
  return result === 'OK';
}

/**
 * 分布式锁释放
 */
export async function releaseLock(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}
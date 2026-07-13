import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: Redis | null = null;
let redisAvailable: boolean | null = null; // null = unchecked, true = available, false = unavailable

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
      client.on("error", () => {
        redisAvailable = false;
      });
      // 不在这里连接，由各函数延迟触发连接，连接失败时标记为不可用
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return client;
}

/**
 * 尝试连接 Redis 并标记状态
 */
async function ensureRedisAvailable(): Promise<boolean> {
  if (redisAvailable === false) return false;
  const redis = getRedisClient();
  if (!redis) {
    redisAvailable = false;
    return false;
  }
  try {
    if (redis.status === "wait" || redis.status === "connect") {
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

export async function closeRedisClient() {
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

export async function setUserChannelCache(userId: number, channelIds: number[]) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `user:${userId}:channels`;
    await redis.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}

export async function getUserChannelCache(userId: number): Promise<number[] | null> {
  if (!(await ensureRedisAvailable())) return null;
  try {
    const redis = client!;
    const key = `user:${userId}:channels`;
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function deleteUserChannelCache(userId: number) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `user:${userId}:channels`;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}

export async function setRoleChannelCache(roleId: number | string, channelIds: number[]) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `role:${roleId}:channels`;
    await redis.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}

export async function getRoleChannelCache(roleId: number): Promise<number[] | null> {
  if (!(await ensureRedisAvailable())) return null;
  try {
    const redis = client!;
    const key = `role:${roleId}:channels`;
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function deleteRoleChannelCache(roleId: number | string) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `role:${roleId}:channels`;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}

export async function deleteUserAllChannelsCache(userId: number) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `user:${userId}:allChannels`;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}

export async function setUserAllChannelsCache(userId: number, channelIds: number[]) {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const key = `user:${userId}:allChannels`;
    await redis.set(key, JSON.stringify(channelIds), "EX", 3600);
  } catch {
    redisAvailable = false;
  }
}

export async function getUserAllChannelsCache(userId: number): Promise<number[] | null> {
  if (!(await ensureRedisAvailable())) return null;
  try {
    const redis = client!;
    const key = `user:${userId}:allChannels`;
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
  } catch {
    redisAvailable = false;
    return null;
  }
}

export async function clearAllChannelCache() {
  if (!(await ensureRedisAvailable())) return;
  try {
    const redis = client!;
    const keys = await redis.keys("user:*:channels");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    const allChannelKeys = await redis.keys("user:*:allChannels");
    if (allChannelKeys.length > 0) {
      await redis.del(...allChannelKeys);
    }
    const roleKeys = await redis.keys("role:*:channels");
    if (roleKeys.length > 0) {
      await redis.del(...roleKeys);
    }
  } catch {
    redisAvailable = false;
  }
}

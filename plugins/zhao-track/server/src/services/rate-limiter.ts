import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const memoryMap = new Map<string, { count: number; expiresAt: number }>();
  const MAX_ENTRIES = 10000;
  const TTL_SECONDS = 60;

  const getRedis = () => {
    try {
      const redis = (strapi as any).redis || (global as any).redis;
      return redis && typeof redis.get === "function" && typeof redis.set === "function" ? redis : null;
    } catch {
      return null;
    }
  };

  const evictIfNeeded = () => {
    if (memoryMap.size <= MAX_ENTRIES) return;
    const now = Date.now();
    for (const [key, val] of memoryMap) {
      if (val.expiresAt < now) memoryMap.delete(key);
    }
    if (memoryMap.size > MAX_ENTRIES) {
      const keys = Array.from(memoryMap.keys()).slice(0, 1000);
      keys.forEach((k) => memoryMap.delete(k));
    }
  };

  return {
    async checkAndRecord(deviceFingerprint: string, couponId: string): Promise<{ allowed: boolean }> {
      const key = `click_rate:${deviceFingerprint}:${couponId}`;
      const redis = getRedis();

      if (redis) {
        try {
          const existing = await redis.get(key);
          if (existing) {
            return { allowed: false };
          }
          await redis.set(key, "1", "EX", TTL_SECONDS);
          return { allowed: true };
        } catch (err: any) {
          strapi.log.warn(`[zhao-track] Redis 不可用，降级内存: ${err.message}`);
        }
      }

      const now = Date.now();
      const existing = memoryMap.get(key);
      if (existing && existing.expiresAt > now) {
        return { allowed: false };
      }
      evictIfNeeded();
      memoryMap.set(key, { count: 1, expiresAt: now + TTL_SECONDS * 1000 });
      return { allowed: true };
    },

    _resetMemory() {
      memoryMap.clear();
    },
  };
};

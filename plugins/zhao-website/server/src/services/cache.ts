import type { Core } from "@strapi/strapi";

const cache = new Map<string, { data: string; expiresAt: number }>();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(key: string, ttl: number, generator: () => Promise<string>): Promise<string> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await generator();
    cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
    return data;
  },

  invalidate(key?: string) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  },
});
import type { Core } from "@strapi/strapi";

const cache = new Map<string, { data: string; expiresAt: number }>();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(key: string, ttl: number, generator: () => Promise<string>): Promise<string> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await generator();
    cache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
    return data;
  },

  invalidate(key?: string) {

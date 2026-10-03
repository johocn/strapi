// server/src/services/auth/utils.ts

import { REDIS_NONCE_PREFIX, NONCE_TTL_SECONDS } from './types';

/**
 * 编码 state: "accountId:nonce"
 */
export function encodeState(accountId: string, nonce: string): string {
  return `${accountId}:${nonce}`;
}

/**
 * 解析 state，返回 { accountId, nonce }；格式不对返回 null
 */
export function decodeState(state: string): { accountId: string; nonce: string } | null {
  if (!state || typeof state !== 'string') return null;
  const idx = state.indexOf(':');
  if (idx < 0) return null;
  return { accountId: state.slice(0, idx), nonce: state.slice(idx + 1) };
}

/**
 * 生成 32 位随机 nonce
 */
export function generateNonce(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  ).slice(0, 32);
}

/**
 * 校验 nonce：已用过或过期返回 false
 * 使用宿主 Redis 存储（REDIS_URL 环境变量）
 */
export async function validateAndConsumeNonce(
  strapi: any,
  nonce: string
): Promise<boolean> {
  try {
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(url, { lazyConnect: true });
    await redis.connect();
    const key = `${REDIS_NONCE_PREFIX}${nonce}`;
    const exists = await redis.exists(key);
    if (exists) {
      await redis.quit();
      return false;
    }
    await redis.set(key, '1', 'EX', NONCE_TTL_SECONDS);
    await redis.quit();
    return true;
  } catch {
    strapi?.log?.warn?.('[zhao-studio] OAuth nonce 校验跳过（Redis 不可用）');
    return true;
  }
}

/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
export function computeExpiresAt(expiresInSeconds: number): Date {
  return new Date(Date.now() + (expiresInSeconds - 60) * 1000);
}

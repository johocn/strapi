// server/src/services/auth/utils.ts

import { REDIS_NONCE_PREFIX, NONCE_TTL_SECONDS } from './types';
import { getRedisOptions } from '../../utils/redis';

/** 建一次性 Redis 客户端：必须挂 error 监听，否则连接失败时 ioredis 会持续输出 "Unhandled error event" */
function createRedis() {
  const Redis = require('ioredis');
  const redis = new Redis(getRedisOptions());
  redis.on('error', () => { /* 由调用方按可用性降级处理，此处仅避免未捕获错误刷屏 */ });
  return redis;
}

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
 * 登记 nonce（授权阶段调用）：写入 Redis 并带 TTL。
 * 与 consumeNonce 分开是必须的 —— 授权阶段只是「发放」，回调阶段才「消费」；
 * 若授权阶段就当成消费，回调时同一 nonce 必然被判为已用过。
 */
export async function issueNonce(strapi: any, nonce: string): Promise<void> {
  const redis = createRedis();
  try {
    await redis.connect();
    await redis.set(`${REDIS_NONCE_PREFIX}${nonce}`, '1', 'EX', NONCE_TTL_SECONDS);
  } catch {
    strapi?.log?.warn?.('[zhao-studio] OAuth nonce 登记跳过（Redis 不可用）');
  } finally {
    redis.disconnect(); // 用 disconnect 而非 quit：失败态下 quit 会挂住
  }
}

/**
 * 校验并消费 nonce（回调阶段调用）：存在则删除并返回 true；不存在（过期/重放）返回 false。
 * Redis 不可用时返回 true（fail-open，保持原行为：不因缓存故障阻塞授权流程）。
 */
export async function consumeNonce(
  strapi: any,
  nonce: string
): Promise<boolean> {
  const redis = createRedis();
  try {
    await redis.connect();
    const key = `${REDIS_NONCE_PREFIX}${nonce}`;
    const exists = await redis.exists(key);
    if (!exists) return false;
    await redis.del(key);
    return true;
  } catch {
    strapi?.log?.warn?.('[zhao-studio] OAuth nonce 校验跳过（Redis 不可用）');
    return true;
  } finally {
    redis.disconnect();
  }
}

/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
export function computeExpiresAt(expiresInSeconds: number): Date {
  return new Date(Date.now() + (expiresInSeconds - 60) * 1000);
}

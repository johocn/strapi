/**
 * 本地登录限速：IP + 账号，15 分钟内最多 5 次尝试，第 6 次直接拒绝（429）。
 * 仅使用 Date.now() 的毫秒差判断窗口，不涉及墙上时间/时区换算。
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_BUCKETS = 10000;

const buckets = new Map<string, number[]>();

export const clientIp = (ctx: any): string =>
  String(ctx?.request?.ip || ctx?.ip || ctx?.["ips"]?.[0] || "unknown");

const bucketKey = (ip: string, identifier: string): string =>
  `${ip}|${String(identifier || "").trim().toLowerCase()}`;

const prune = (now: number): void => {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, timestamps] of buckets) {
    if (timestamps.every((at) => now - at >= WINDOW_MS)) buckets.delete(key);
  }
};

export const isLoginRateLimited = (ip: string, identifier: string): boolean => {
  const now = Date.now();
  const key = bucketKey(ip, identifier);
  const recent = (buckets.get(key) || []).filter((at) => now - at < WINDOW_MS);
  buckets.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
};

export const recordLoginAttempt = (ip: string, identifier: string): void => {
  const now = Date.now();
  const key = bucketKey(ip, identifier);
  const recent = (buckets.get(key) || []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  prune(now);
};

export const loginRateLimitBody = {
  code: "RATE_LIMITED",
  error: "登录尝试过于频繁，请 15 分钟后再试",
};

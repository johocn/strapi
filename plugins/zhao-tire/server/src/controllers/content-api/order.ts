import { createHash } from "crypto";
import { sendError } from "../../utils/errors";
import { normalizeDate, todayDateString } from "../../services/order";

const orderService = () => strapi.plugin("zhao-tire").service("order");

const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failureBuckets = new Map<string, { count: number; resetAt: number }>();

const clientIp = (ctx: any): string =>
  String(ctx.request?.ip || ctx.ip || "unknown");
const ipDigest = (ip: string): string =>
  createHash("sha256").update(`zhao-tire|${ip}`).digest("hex").slice(0, 12);
const bucketKey = (ip: string, orderNo: string) => `${ip}|${orderNo}`;

const isBlocked = (key: string): boolean => {
  const bucket = failureBuckets.get(key);
  if (!bucket) return false;
  if (Date.now() >= bucket.resetAt) {
    failureBuckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_FAILURES;
};

const recordFailure = (key: string) => {
  const now = Date.now();
  const bucket = failureBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (failureBuckets.size > 10000) {
      failureBuckets.forEach((value, mapKey) => {
        if (now >= value.resetAt) failureBuckets.delete(mapKey);
      });
    }
    failureBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  bucket.count += 1;
};

const rateLimited = (ctx: any) => {
  ctx.status = 429;
  ctx.body = { code: "RATE_LIMITED", message: "操作过于频繁，请稍后再试" };
};

// 公开下单限速：单 IP 10 分钟内最多 10 单，只用 Date.now() 毫秒差
const CREATE_WINDOW_MS = 10 * 60 * 1000;
const CREATE_MAX = 10;
const createBuckets = new Map<string, number[]>();

const isCreateLimited = (ip: string): boolean => {
  const now = Date.now();
  const recent = (createBuckets.get(ip) || []).filter(
    (at) => now - at < CREATE_WINDOW_MS
  );
  createBuckets.set(ip, recent);
  if (recent.length >= CREATE_MAX) return true;
  recent.push(now);
  if (createBuckets.size > 10000) {
    createBuckets.forEach((list, key) => {
      if (list.every((at) => now - at >= CREATE_WINDOW_MS)) {
        createBuckets.delete(key);
      }
    });
  }
  return false;
};

export default {
  async slots(ctx: any) {
    try {
      const requested = ctx.query?.date;
      const date = normalizeDate(requested) || todayDateString();
      const slotService: any = strapi.plugin("zhao-tire").service("slot");
      const [morning, afternoon] = await Promise.all([
        slotService.usage(date, "morning"),
        slotService.usage(date, "afternoon"),
      ]);
      ctx.body = { date, morning, afternoon };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async create(ctx: any) {
    const ip = clientIp(ctx);
    if (isCreateLimited(ip)) return rateLimited(ctx);
    try {
      const result = await orderService().create(ctx.request.body || {});
      ctx.body = result;
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async detail(ctx: any) {
    try {
      ctx.body = await orderService().detail(
        ctx.params.orderNo,
        ctx.query?.phone
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async renew(ctx: any) {
    const ip = clientIp(ctx);
    const key = bucketKey(ip, ctx.params.orderNo);
    if (isBlocked(key)) return rateLimited(ctx);
    try {
      const body = ctx.request.body || {};
      const result = await orderService().renew(
        ctx.params.orderNo,
        body.months,
        body.paymentMethod,
        { phone: body.phone, ipHash: ipDigest(ip) }
      );
      strapi.log.info(
        `[zhao-tire] renew order=${ctx.params.orderNo} source=anonymous ipHash=${ipDigest(ip)} status=pending`
      );
      ctx.body = result;
    } catch (error) {
      if (Number((error as any)?.status) === 403) recordFailure(key);
      sendError(ctx, error);
    }
  },

  async requestOutbound(ctx: any) {
    const ip = clientIp(ctx);
    const key = bucketKey(ip, ctx.params.orderNo);
    if (isBlocked(key)) return rateLimited(ctx);
    try {
      const body = ctx.request.body || {};
      const result = await orderService().requestOutbound(
        ctx.params.orderNo,
        body.note,
        { phone: body.phone, ipHash: ipDigest(ip) }
      );
      strapi.log.info(
        `[zhao-tire] outbound order=${ctx.params.orderNo} source=anonymous ipHash=${ipDigest(ip)}`
      );
      ctx.body = result;
    } catch (error) {
      if (Number((error as any)?.status) === 403) recordFailure(key);
      sendError(ctx, error);
    }
  },
};

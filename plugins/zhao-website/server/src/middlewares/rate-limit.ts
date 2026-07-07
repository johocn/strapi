const buckets = new Map<string, number[]>();

export default (config: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  const { windowMs, max, message = "请求过于频繁，请稍后再试" } = config;
  return async (ctx: any, next: any) => {
    const ip = ctx.request.ip || ctx.ips?.[0] || "unknown";
    const key = `${ip}:${ctx.path}`;
    const now = Date.now();
    const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= max) {
      return ctx.throw(429, message);
    }
    timestamps.push(now);
    buckets.set(key, timestamps);
    await next();
  };
};

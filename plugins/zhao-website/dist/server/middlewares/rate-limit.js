"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buckets = new Map();
exports.default = (config) => {
    const { windowMs, max, message = "请求过于频繁，请稍后再试" } = config;
    return async (ctx, next) => {
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
//# sourceMappingURL=rate-limit.js.map
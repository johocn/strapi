"use strict";
// server/src/utils/redis.ts
// Redis 连接配置统一入口。
// 与 zhao-channel 同约定：优先分段环境变量（REDIS_HOST/PORT/USER/PASSWORD/DB），
// 不用 REDIS_URL —— 密码含 @ 等字符时 URL 需编码，易踩坑且本项目 .env 用的是分段变量。
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConnection = getRedisConnection;
exports.getRedisOptions = getRedisOptions;
function getRedisConnection() {
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        username: process.env.REDIS_USER || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
    };
}
/**
 * 短连接场景用：惰性连接 + 不自动重连。
 * retryStrategy 返回 null 是关键 —— 否则连接失败（如 NOAUTH）时 ioredis 会无限重连，
 * 且未挂 error 监听时会以 "Unhandled error event" 持续刷屏。
 */
function getRedisOptions() {
    return {
        ...getRedisConnection(),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
    };
}
//# sourceMappingURL=redis.js.map
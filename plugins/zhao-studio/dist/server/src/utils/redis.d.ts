import { RedisOptions } from 'ioredis';
export interface RedisConnection {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db: number;
}
export declare function getRedisConnection(): RedisConnection;
/**
 * 短连接场景用：惰性连接 + 不自动重连。
 * retryStrategy 返回 null 是关键 —— 否则连接失败（如 NOAUTH）时 ioredis 会无限重连，
 * 且未挂 error 监听时会以 "Unhandled error event" 持续刷屏。
 */
export declare function getRedisOptions(): RedisOptions;
//# sourceMappingURL=redis.d.ts.map
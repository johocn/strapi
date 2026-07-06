import { default as Redis } from 'ioredis';
/**
 * 获取 Redis 客户端（不可用时返回 null）
 */
export declare function getRedisClient(): Redis | null;
/**
 * 检测 Redis 是否可用（ping 失败时标记为不可用）
 */
export declare function ensureRedisAvailable(): Promise<boolean>;
/**
 * 显式标记 Redis 不可用（用于队列初始化失败场景）
 */
export declare function markRedisUnavailable(): void;
/**
 * 关闭 Redis 客户端
 */
export declare function closeRedisClient(): Promise<void>;
/**
 * 分布式锁获取（Redis 不可用时返回 false）
 */
export declare function acquireLock(key: string, ttl: number): Promise<boolean>;
/**
 * 分布式锁释放（Redis 不可用时静默跳过）
 */
export declare function releaseLock(key: string): Promise<void>;

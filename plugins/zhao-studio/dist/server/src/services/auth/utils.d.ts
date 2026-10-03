/**
 * 编码 state: "accountId:nonce"
 */
export declare function encodeState(accountId: string, nonce: string): string;
/**
 * 解析 state，返回 { accountId, nonce }；格式不对返回 null
 */
export declare function decodeState(state: string): {
    accountId: string;
    nonce: string;
} | null;
/**
 * 生成 32 位随机 nonce
 */
export declare function generateNonce(): string;
/**
 * 校验 nonce：已用过或过期返回 false
 * 使用宿主 Redis 存储（REDIS_URL 环境变量）
 */
export declare function validateAndConsumeNonce(strapi: any, nonce: string): Promise<boolean>;
/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
export declare function computeExpiresAt(expiresInSeconds: number): Date;
//# sourceMappingURL=utils.d.ts.map
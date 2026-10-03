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
 * 登记 nonce（授权阶段调用）：写入 Redis 并带 TTL。
 * 与 consumeNonce 分开是必须的 —— 授权阶段只是「发放」，回调阶段才「消费」；
 * 若授权阶段就当成消费，回调时同一 nonce 必然被判为已用过。
 */
export declare function issueNonce(strapi: any, nonce: string): Promise<void>;
/**
 * 校验并消费 nonce（回调阶段调用）：存在则删除并返回 true；不存在（过期/重放）返回 false。
 * Redis 不可用时返回 true（fail-open，保持原行为：不因缓存故障阻塞授权流程）。
 */
export declare function consumeNonce(strapi: any, nonce: string): Promise<boolean>;
/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
export declare function computeExpiresAt(expiresInSeconds: number): Date;
//# sourceMappingURL=utils.d.ts.map
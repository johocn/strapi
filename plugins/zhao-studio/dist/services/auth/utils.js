"use strict";
// server/src/services/auth/utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeState = encodeState;
exports.decodeState = decodeState;
exports.generateNonce = generateNonce;
exports.issueNonce = issueNonce;
exports.consumeNonce = consumeNonce;
exports.computeExpiresAt = computeExpiresAt;
exports.getAccountConfig = getAccountConfig;
const types_1 = require("./types");
const redis_1 = require("../../utils/redis");
/** 建一次性 Redis 客户端：必须挂 error 监听，否则连接失败时 ioredis 会持续输出 "Unhandled error event" */
function createRedis() {
    const Redis = require('ioredis');
    const redis = new Redis((0, redis_1.getRedisOptions)());
    redis.on('error', () => { });
    return redis;
}
/**
 * 编码 state: "accountId:nonce"
 */
function encodeState(accountId, nonce) {
    return `${accountId}:${nonce}`;
}
/**
 * 解析 state，返回 { accountId, nonce }；格式不对返回 null
 */
function decodeState(state) {
    if (!state || typeof state !== 'string')
        return null;
    const idx = state.indexOf(':');
    if (idx < 0)
        return null;
    return { accountId: state.slice(0, idx), nonce: state.slice(idx + 1) };
}
/**
 * 生成 32 位随机 nonce
 */
function generateNonce() {
    return (Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36)).slice(0, 32);
}
/**
 * 登记 nonce（授权阶段调用）：写入 Redis 并带 TTL。
 * 与 consumeNonce 分开是必须的 —— 授权阶段只是「发放」，回调阶段才「消费」；
 * 若授权阶段就当成消费，回调时同一 nonce 必然被判为已用过。
 */
async function issueNonce(strapi, nonce) {
    const redis = createRedis();
    try {
        await redis.connect();
        await redis.set(`${types_1.REDIS_NONCE_PREFIX}${nonce}`, '1', 'EX', types_1.NONCE_TTL_SECONDS);
    }
    catch {
        strapi?.log?.warn?.('[zhao-studio] OAuth nonce 登记跳过（Redis 不可用）');
    }
    finally {
        redis.disconnect(); // 用 disconnect 而非 quit：失败态下 quit 会挂住
    }
}
/**
 * 校验并消费 nonce（回调阶段调用）：存在则删除并返回 true；不存在（过期/重放）返回 false。
 * Redis 不可用时返回 true（fail-open，保持原行为：不因缓存故障阻塞授权流程）。
 */
async function consumeNonce(strapi, nonce) {
    const redis = createRedis();
    try {
        await redis.connect();
        const key = `${types_1.REDIS_NONCE_PREFIX}${nonce}`;
        const exists = await redis.exists(key);
        if (!exists)
            return false;
        await redis.del(key);
        return true;
    }
    catch {
        strapi?.log?.warn?.('[zhao-studio] OAuth nonce 校验跳过（Redis 不可用）');
        return true;
    }
    finally {
        redis.disconnect();
    }
}
/**
 * 计算 access_token 过期时间（秒数 → Date）
 */
function computeExpiresAt(expiresInSeconds) {
    return new Date(Date.now() + (expiresInSeconds - 60) * 1000);
}
/**
 * 从 account 读取 config（支持 provider 从 per-account 配置取凭证）。
 * account.config 在后端 json 类型字段里已是对象，不是 string。
 */
async function getAccountConfig(strapi, accountId) {
    const account = await strapi.documents('plugin::zhao-studio.publish-account')
        .findOne({ documentId: accountId });
    return account?.config || {};
}
//# sourceMappingURL=utils.js.map
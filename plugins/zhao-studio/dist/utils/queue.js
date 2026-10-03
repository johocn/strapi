"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStudioQueues = initStudioQueues;
exports.getPublishQueue = getPublishQueue;
exports.getSchedulerQueue = getSchedulerQueue;
exports.closeStudioQueues = closeStudioQueues;
const bull_1 = __importDefault(require("bull"));
function getRedisConfig() {
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        username: process.env.REDIS_USER || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: 1,
    };
}
let queuesAvailable = null;
let publishQueue = null;
let schedulerQueue = null;
async function probeBullSupport() {
    try {
        // 动态 require 避免类型编译期问题
        const Redis = require('ioredis');
        const redis = new Redis(getRedisConfig());
        await redis.connect().catch(() => { });
        const result = await redis.eval('return 1', 0);
        try {
            await redis.quit();
        }
        catch { /* ignore */ }
        return result === 1;
    }
    catch {
        return false;
    }
}
async function initStudioQueues() {
    if (queuesAvailable === null) {
        queuesAvailable = await probeBullSupport();
    }
    if (!queuesAvailable)
        return { publish: null, scheduler: null };
    if (!publishQueue) {
        try {
            publishQueue = new bull_1.default('studio-publish', {
                redis: getRedisConfig(),
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: 20,
                    removeOnFail: 10,
                },
            });
        }
        catch {
            publishQueue = null;
        }
    }
    if (!schedulerQueue) {
        try {
            schedulerQueue = new bull_1.default('studio-scheduler', {
                redis: getRedisConfig(),
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                    removeOnComplete: 20,
                    removeOnFail: 10,
                },
            });
        }
        catch {
            schedulerQueue = null;
        }
    }
    return { publish: publishQueue, scheduler: schedulerQueue };
}
function getPublishQueue() { return publishQueue; }
function getSchedulerQueue() { return schedulerQueue; }
async function closeStudioQueues() {
    for (const q of [publishQueue, schedulerQueue]) {
        if (q) {
            try {
                await q.close();
            }
            catch { /* ignore */ }
        }
    }
    publishQueue = null;
    schedulerQueue = null;
    queuesAvailable = null;
}
//# sourceMappingURL=queue.js.map
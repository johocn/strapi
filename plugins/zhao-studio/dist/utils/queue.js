"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStudioQueues = initStudioQueues;
exports.getRedis = getRedis;
exports.getPublishQueue = getPublishQueue;
exports.getSchedulerQueue = getSchedulerQueue;
exports.registerWorker = registerWorker;
exports.closeStudioQueues = closeStudioQueues;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_1 = require("./redis");
function getCleanRedisConfig() {
    const cfg = (0, redis_1.getRedisConnection)();
    const clean = { host: cfg.host, port: cfg.port, db: cfg.db };
    // BullMQ requires maxRetriesPerRequest=null (Bull v4 default was 20)
    clean.maxRetriesPerRequest = null;
    if (cfg.username)
        clean.username = cfg.username;
    if (cfg.password)
        clean.password = cfg.password;
    return clean;
}
let redisClient = null;
let queuesAvailable = null;
let publishQueue = null;
let schedulerQueue = null;
const registeredWorkers = [];
async function initStudioQueues() {
    if (queuesAvailable === false) {
        return { publish: null, scheduler: null };
    }
    try {
        const cfg = getCleanRedisConfig();
        redisClient = new ioredis_1.default(cfg);
        // 必须监听 error，否则连接失败时 ioredis 抛出 "Unhandled error event" 并持续重连刷屏
        redisClient.on('error', () => { queuesAvailable = false; });
        await redisClient.ping();
        queuesAvailable = true;
        publishQueue = new bullmq_1.Queue('studio-publish', { connection: redisClient });
        schedulerQueue = new bullmq_1.Queue('studio-scheduler', { connection: redisClient });
        return { publish: publishQueue, scheduler: schedulerQueue };
    }
    catch (err) {
        queuesAvailable = false;
        return { publish: null, scheduler: null };
    }
}
function getRedis() { return redisClient; }
function getPublishQueue() { return publishQueue; }
function getSchedulerQueue() { return schedulerQueue; }
function registerWorker(w) {
    registeredWorkers.push(w);
}
async function closeStudioQueues() {
    for (const w of registeredWorkers) {
        try {
            await w.close();
        }
        catch { /* ignore */ }
    }
    registeredWorkers.length = 0;
    if (publishQueue) {
        try {
            await publishQueue.close();
        }
        catch { /* ignore */ }
    }
    if (schedulerQueue) {
        try {
            await schedulerQueue.close();
        }
        catch { /* ignore */ }
    }
    if (redisClient) {
        try {
            await redisClient.quit();
        }
        catch { /* ignore */ }
    }
    publishQueue = null;
    schedulerQueue = null;
    redisClient = null;
    queuesAvailable = null;
}
//# sourceMappingURL=queue.js.map
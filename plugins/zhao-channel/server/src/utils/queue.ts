import Queue from "bull";
import { getRedisClient } from "./redis";

// 读取分段环境变量（避免密码含 @ 等 URL 特殊字符的编码问题）
function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    maxRetriesPerRequest: 1,
  };
}

let queueInstance: Queue.Queue | null = null;
// null = 未探测（按不可用处理），true = 可用，false = 不可用
let queueAvailable: boolean | null = null;

/**
 * 探测 Redis 是否具备 Bull 所需的 Lua 能力。
 * Bull 的任务流转全部依赖 EVAL/EVALSHA，仅 PING 通过不足以证明可用：
 * 若 6379 被不支持 EVAL 的兼容实现占用（如游戏服开发用的 mock-redis 对未知命令
 * 统一回 +OK），Bull 会把该回复当作 [jobData, jobId] 解析（"O" 当任务 JSON、
 * "K" 当 jobId），凭空造出 name=__default__ 的幻影任务；因无对应处理器，
 * handleFailed → moveToFailed 同样拿到 +OK → 再造幻影任务，形成无限失败循环：
 * 单核 CPU 打满、事件循环饿死（表现为全站请求卡 60s 整数倍、启动耗时 900s+）。
 */
async function probeBullSupport(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    if (redis.status === "wait" || redis.status === "connect") {
      await redis.connect();
    }
    return (await redis.eval("return 1", 0)) === 1;
  } catch {
    return false;
  }
}

/**
 * 探测通过后才允许创建队列，由 bootstrap 调用一次。
 * 未探测或探测失败时队列一律不可用，调用方自行降级。
 */
export async function initBatchGrantQueue(): Promise<Queue.Queue | null> {
  if (queueAvailable === null) {
    queueAvailable = await probeBullSupport();
  }
  return queueAvailable ? getQueue() : null;
}

function getQueue(): Queue.Queue | null {
  // 未探测或探测失败一律不提供队列：宁可不排队（调用方降级），
  // 也不能让 Bull 连到不支持 Lua 的 Redis 上自旋
  if (queueAvailable !== true) return null;
  if (!queueInstance) {
    try {
      queueInstance = new Queue("channel-batch-grant", {
        redis: getRedisConfig(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      });
      queueInstance.on("error", () => {
        queueAvailable = false;
      });
    } catch {
      queueAvailable = false;
      return null;
    }
  }
  return queueInstance;
}

export interface BatchGrantJobData {
  type: "user" | "role";
  targetId: number | string;
  channelIds: number[];
  grantedBy: number;
}

export function addBatchGrantJob(data: BatchGrantJobData) {
  const q = getQueue();
  if (!q) return Promise.resolve(null);
  return q.add("batch-grant", data);
}

export function getQueueStatus() {
  const q = getQueue();
  if (!q) {
    return Promise.resolve({ waiting: 0, active: 0, completed: 0, failed: 0 });
  }
  return Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ]).then(([waiting, active, completed, failed]) => ({
    waiting,
    active,
    completed,
    failed,
  }));
}

export function getBatchGrantQueue(): Queue.Queue | null {
  return getQueue();
}

export async function closeBatchGrantQueue() {
  if (queueInstance) {
    try {
      await queueInstance.close();
    } catch {
      // ignore
    }
    queueInstance = null;
  }
  queueAvailable = null;
}

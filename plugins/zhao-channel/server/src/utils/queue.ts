import Queue from "bull";

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
let queueAvailable: boolean | null = null;

function getQueue(): Queue.Queue | null {
  if (queueAvailable === false) return null;
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
      queueAvailable = true;
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

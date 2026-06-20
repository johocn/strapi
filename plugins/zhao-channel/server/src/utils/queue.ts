import Queue from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let queueInstance: Queue.Queue | null = null;
let queueAvailable: boolean | null = null;

function getQueue(): Queue.Queue | null {
  if (queueAvailable === false) return null;
  if (!queueInstance) {
    try {
      queueInstance = new Queue("channel-batch-grant", REDIS_URL, {
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

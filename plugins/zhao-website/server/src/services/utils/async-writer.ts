import type { Core } from "@strapi/strapi";

interface QueueItem {
  ct: string;
  data: any;
}

const DEAD_LETTER_UID = "plugin::zhao-website.search-log"; // 复用 search-log 表存死信（简化）

export class AsyncWriter {
  private strapi: Core.Strapi;
  private ct: string;
  private queue: QueueItem[] = [];
  private maxQueueSize = 10000;
  private flushIntervalMs: number;
  private flushThreshold: number;
  private timer: NodeJS.Timeout | null = null;
  private uid: string;

  constructor(opts: {
    strapi: Core.Strapi;
    ct: string;
    uid: string;
    flushIntervalMs: number;
    flushThreshold: number;
  }) {
    this.strapi = opts.strapi;
    this.ct = opts.ct;
    this.uid = opts.uid;
    this.flushIntervalMs = opts.flushIntervalMs;
    this.flushThreshold = opts.flushThreshold;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        this.strapi.log.error(`[async-writer:${this.ct}] flush failed`, err);
      });
    }, this.flushIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  enqueue(data: any): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.strapi.log.warn(`[async-writer:${this.ct}] queue overflow, dropping oldest`);
      this.queue.shift();
    }
    this.queue.push({ ct: this.ct, data });
    if (this.queue.length >= this.flushThreshold) {
      setImmediate(() => {
        this.flush().catch(() => {});
      });
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      // 批量 insert
      const rows = batch.map((item) => item.data);
      await this.strapi.db.connection(this.uid).insert(rows);
    } catch (err) {
      // 重试 1 次
      try {
        for (const item of batch) {
          await this.strapi.db.connection(this.uid).insert(item.data);
        }
      } catch (err2) {
        // 写入死信表（简化：记日志）
        this.strapi.log.error(`[async-writer:${this.ct}] dead letter`, {
          count: batch.length,
          error: (err2 as Error).message,
        });
      }
    }
  }
}

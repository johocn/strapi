import { Queue } from 'bullmq';
import { default as Redis } from 'ioredis';
export declare function initStudioQueues(): Promise<{
    publish: Queue | null;
    scheduler: Queue | null;
}>;
export declare function getRedis(): Redis | null;
export declare function getPublishQueue(): Queue | null;
export declare function getSchedulerQueue(): Queue | null;
export declare function registerWorker(w: {
    close: () => Promise<void>;
}): void;
export declare function closeStudioQueues(): Promise<void>;
export interface PublishJobData {
    articleId: string;
    accountId: string;
    publishRecordId: string;
    triggerSource: 'manual' | 'schedule';
}
//# sourceMappingURL=queue.d.ts.map
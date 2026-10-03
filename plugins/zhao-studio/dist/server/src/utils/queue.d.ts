import { default as Queue } from 'bull';
export declare function initStudioQueues(): Promise<{
    publish: Queue.Queue | null;
    scheduler: Queue.Queue | null;
}>;
export declare function getPublishQueue(): Queue.Queue | null;
export declare function getSchedulerQueue(): Queue.Queue | null;
export declare function closeStudioQueues(): Promise<void>;
export interface PublishJobData {
    articleId: string;
    accountId: string;
    publishRecordId: string;
    triggerSource: 'manual' | 'schedule';
}
//# sourceMappingURL=queue.d.ts.map
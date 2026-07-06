import { default as Queue } from 'bull';
export interface BatchGrantJobData {
    type: "user" | "role";
    targetId: number | string;
    channelIds: number[];
    grantedBy: number;
}
export declare function addBatchGrantJob(data: BatchGrantJobData): Promise<any>;
export declare function getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}>;
export declare function getBatchGrantQueue(): Queue.Queue | null;
export declare function closeBatchGrantQueue(): Promise<void>;

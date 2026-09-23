import { default as Queue } from 'bull';
/**
 * 探测通过后才允许创建队列，由 bootstrap 调用一次。
 * 未探测或探测失败时队列一律不可用，调用方自行降级。
 */
export declare function initBatchGrantQueue(): Promise<Queue.Queue | null>;
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

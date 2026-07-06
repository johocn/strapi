import { default as Queue } from 'bull';
export declare function setupQueues(strapi: any): Promise<void>;
export declare function getCollectQueue(): Queue.Queue | null;
export declare function getCalculateQueue(): Queue.Queue | null;
export declare function getRecalculateQueue(): Queue.Queue | null;
export declare function isQueueAvailable(): boolean;

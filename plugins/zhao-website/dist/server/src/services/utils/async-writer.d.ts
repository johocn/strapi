import { Core } from '@strapi/strapi';
export declare class AsyncWriter {
    private strapi;
    private ct;
    private queue;
    private maxQueueSize;
    private flushIntervalMs;
    private flushThreshold;
    private timer;
    private uid;
    constructor(opts: {
        strapi: Core.Strapi;
        ct: string;
        uid: string;
        flushIntervalMs: number;
        flushThreshold: number;
    });
    start(): void;
    stop(): Promise<void>;
    enqueue(data: any): void;
    private flush;
}

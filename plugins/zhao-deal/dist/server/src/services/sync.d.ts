import { Core } from '@strapi/strapi';
export declare const resolveTimeRange: (timeRange: string, customStart?: string, customEnd?: string) => {
    startTime: Date;
    endTime: Date;
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    syncPlatformData(opts: {
        platformCode: string;
        type: "coupons" | "products";
        conditions?: any;
    }): Promise<{
        platformCode: string;
        type: "coupons" | "products";
        fetched: number;
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
        duration: number;
    }>;
};
export default _default;

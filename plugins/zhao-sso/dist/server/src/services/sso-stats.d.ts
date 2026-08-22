import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getSopStats(opts: {
        from?: string;
        to?: string;
        scene?: string;
    }): Promise<{
        from: string;
        to: string;
        summary: {
            sceneCount: number;
            total: number;
            sent: number;
            failed: number;
            quotaLimited: number;
            pending: number;
            sentRate: number;
        };
        rows: any[];
    }>;
    getRepurchaseStats(opts: {
        from?: string;
        to?: string;
    }): Promise<{
        from: string;
        to: string;
        windowDays: number;
        summary: {
            sent: number;
            convertedUsers: number;
            conversions: number;
            conversionRate: number;
        };
    }>;
    getCourseD7Stats(opts: {
        from?: string;
        to?: string;
    }): Promise<{
        from: string;
        to: string;
        windowDays: number;
        summary: {
            sent: number;
            convertedUsers: number;
            conversions: number;
            conversionRate: number;
        };
    }>;
    getCourseCompletionStats(opts: {
        from?: string;
        to?: string;
    }): Promise<{
        from: string;
        to: string;
        windowDays: number;
        summary: {
            sent: number;
            convertedUsers: number;
            conversions: number;
            conversionRate: number;
        };
    }>;
    getRepurchaseLeads(opts: {
        from?: string;
        to?: string;
        page?: number;
        pageSize?: number;
        status?: string;
    }): Promise<{
        from: string;
        to: string;
        windowDays: number;
        summary: {
            total: number;
            followed: number;
            deal: number;
        };
        pagination: {};
        rows: any[];
    }>;
    updateRepurchaseFollow({ jobId, status, remark }: {
        jobId: number;
        status: string;
        remark?: string;
    }): Promise<any>;
};
export default _default;

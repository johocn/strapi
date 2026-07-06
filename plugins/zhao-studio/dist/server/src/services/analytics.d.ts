import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    trackPageView(data: {
        articleId: string;
        sessionId: string;
        userId?: string;
        userAgent: string;
        ip: string;
        referrer: string;
        screen: {
            width: number;
            height: number;
        };
        language: string;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    trackAdClick(data: {
        adSlotId: string;
        articleId?: string;
        sessionId: string;
        userId?: string;
        userAgent: string;
        ip: string;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    trackReadBehavior(data: {
        articleId: string;
        sessionId: string;
        readDuration: number;
        scrollDepth: number;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    trackUserRegister(data: {
        sessionId: string;
        userId: string;
        registeredAt: Date;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    listAdSlots(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createAdSlot(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateAdSlot(id: string, data: any): Promise<any>;
    deleteAdSlot(id: string): Promise<void>;
    getOverview(params: {
        startDate: Date;
        endDate: Date;
    }): Promise<{
        pv: number;
        uv: number;
        clickCount: number;
        clickRate: number;
        avgReadDuration: number;
    }>;
    getArticleStats(params: {
        articleId?: string;
        startDate: Date;
        endDate: Date;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getAdSlotStats(params: {
        adSlotId?: string;
        startDate: Date;
        endDate: Date;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getDeviceStats(params: {
        startDate: Date;
        endDate: Date;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getRegionStats(params: {
        startDate: Date;
        endDate: Date;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    getUserStats(params: {
        startDate: Date;
        endDate: Date;
    }): Promise<{
        registerCount: number;
        registeredRatio: number;
    }>;
    cleanupOldLogs(days: number): Promise<{
        deleted: number;
    }>;
};
export default _default;
//# sourceMappingURL=analytics.d.ts.map
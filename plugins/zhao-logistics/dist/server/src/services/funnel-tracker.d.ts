import { Core } from '@strapi/strapi';
export interface FunnelStats {
    steps: {
        step: number;
        name: string;
        eventName: string;
        count: number;
        conversionRate: number;
        overallRate: number;
        avgTimeFromPrevious: number | null;
    }[];
    totalVisitors: number;
    totalConverted: number;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 记录漏斗事件（同步写入，保证统计实时性）
     */
    track(siteId: number, event: {
        funnelId?: string;
        eventName: string;
        visitorId: string;
        userId?: number;
        sessionId?: string;
        landingPageId?: string;
        quoteRequestId?: string;
        utm?: {
            source?: string;
            medium?: string;
            campaign?: string;
        };
        lang?: string;
        ctx?: any;
    }): Promise<void>;
    /**
     * 查询漏斗转化率统计
     */
    getStats(siteId: number, params: {
        funnelId: string;
        dateFrom?: string;
        dateTo?: string;
        lang?: string;
        utmSource?: string;
    }): Promise<FunnelStats>;
};
export default _default;

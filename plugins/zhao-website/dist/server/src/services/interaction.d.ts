import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    toggle(siteId: number, data: {
        type: string;
        targetType: string;
        targetId: string;
        visitorId: string;
        userId?: number;
        ctx?: any;
    }): Promise<{
        action: string;
    }>;
    check(siteId: number, params: {
        type: string;
        targetType: string;
        targetId: string;
        visitorId: string;
    }): Promise<{
        liked: boolean;
    }>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    /**
     * 排行榜聚合：同 targetType 下按 targetId 分组计数（供公开统计接口使用）
     * - 只统计 deletedAt: null（取消是软删除，不过滤会票数虚高）
     * - 按 visitorId 去重（前端清缓存换新 id 后可能产生重复行，兜底防御）
     */
    ranking(siteId: number, targetType: string, type?: string): Promise<{
        targetId: string;
        count: number;
    }[]>;
    stats(siteId: number, targetType: string, targetId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
};
export default _default;

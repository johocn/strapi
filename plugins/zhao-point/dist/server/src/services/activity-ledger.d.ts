import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 计算一场活动的四项对账数值 + 明细。自动触发与手动触发共用。
     * @param activityId activity 的 documentId
     * @param source 'auto' | 'manual'
     */
    generate(activityId: string, source?: "auto" | "manual"): Promise<any>;
    /** 管理端列表：按活动列示全部快照（generatedAt desc）；可传 activityDocumentId 过滤状态（ended） */
    list(params?: {
        activityDocumentId?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        list: any[];
        pagination: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        };
    }>;
    /** 手动重归档：总是新增一张来源=manual 的快照 */
    regenerate(activityId: string): Promise<any>;
    /** 自动生成：活动无 auto 快照才生成（幂等），供 closeActivity 调用 */
    generateAutoIfAbsent(activityId: string): Promise<any>;
    /** 管理端标记快照已结算/回退未结（幂等） */
    settle(ledgerDocumentId: string, body?: {
        settleStatus?: string;
    }): Promise<any>;
};
export default _default;

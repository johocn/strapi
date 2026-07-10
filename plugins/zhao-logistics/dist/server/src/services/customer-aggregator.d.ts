import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 按 phone/email 匹配现有档案，存在则更新，不存在则创建
     */
    upsert(siteId: number, info: {
        name: string;
        contactPhone?: string;
        contactEmail?: string;
        customerType?: string;
        country?: string;
        sourceChannel?: string;
        utmSource?: string;
    }): Promise<any>;
    /**
     * 从 lead 创建/更新客户档案，并关联 leadId
     */
    upsertFromLead(siteId: number, leadId: string): Promise<any>;
    /**
     * 询价提交时更新档案：累计询价数 + 关联 quoteRequestId
     */
    upsertFromQuote(siteId: number, quoteRequestId: string): Promise<any>;
    /**
     * 订单成交时更新档案：累计订单数 + 成交额 + 关联 orderId
     */
    upsertFromOrder(siteId: number, intentOrderId: string): Promise<any>;
    /**
     * 聚合查询客户档案详情（含关联 lead/quote/order 列表）
     */
    getProfile(siteId: number, profileId: string): Promise<any>;
    /**
     * 合并重复客户档案（把 source 的关联记录转移到 target，软删 source）
     */
    merge(siteId: number, sourceId: string, targetId: string): Promise<any>;
    _extractPhone(contactStr: string): string;
    _computeStage(quoteCount: number, orderCount: number): string;
    _laterTime(a: string | null, b: string | null): string | null;
};
export default _default;

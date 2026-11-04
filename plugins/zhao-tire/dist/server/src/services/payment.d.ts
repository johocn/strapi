import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findOrder(orderNo: string): Promise<any>;
    outstandingOf(order: any): number;
    /** 创建 pending 流水（幂等键已存在则直接返回原流水） */
    ensurePending(params: {
        order: any;
        amount: number;
        channel: string;
        idempotencyKey: string;
        provider?: string;
        externalNo?: string;
        raw?: any;
        note?: string;
    }): Promise<any>;
    /**
     * 把流水置为 paid 并同步订单累计金额
     * - 幂等：已 paid 的流水直接返回 duplicated
     * - 金额上限：流水金额不得超过订单未结金额
     */
    settle(paymentNo: string, options?: {
        externalNo?: string;
        raw?: any;
    }): Promise<{
        duplicated: boolean;
        payment: any;
        order?: undefined;
    } | {
        duplicated: boolean;
        payment: any;
        order: {
            orderNo: any;
            paidAmount: any;
            paymentStatus: string;
        };
    }>;
    /** 人工收款登记（门店收银 / 取货付款 / 后台确认到账） */
    recordManual(params: {
        order: any;
        amount: number;
        channel: string;
        idempotencyKey?: string;
        operatorId?: number | string;
        operatorName?: string;
        note?: string;
        status?: "pending" | "paid";
    }): Promise<{
        duplicated: boolean;
        payment: any;
        order?: undefined;
    } | {
        duplicated: boolean;
        payment: any;
        order: {
            orderNo: any;
            paidAmount: any;
            paymentStatus: string;
        };
    } | {
        duplicated: boolean;
        payment: any;
        pending: boolean;
    }>;
    list(query: {
        page?: number;
        pageSize?: number;
        status?: string;
        orderNo?: string;
        channel?: string;
    }): Promise<{
        data: any[];
        meta: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /** 退款：回滚累计金额，整单退清时回滚邀请与奖励 */
    refund(params: {
        order: any;
        amount: number;
        operatorId?: number | string;
        operatorName?: string;
        note?: string;
    }): Promise<{
        payment: any;
        order: {
            orderNo: any;
            paidAmount: number;
            paymentStatus: string;
        };
        rollback: any;
    }>;
};
export default _default;

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
        payerOpenid?: string;
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
    /**
     * 退款：回滚订单累计金额与来源流水，整单退清时回滚邀请有效计数与奖励券。
     * - 幂等：同一 idempotencyKey / refundNo 重复请求直接返回原流水，不重复扣减；
     * - 超额：退款总额不得超过订单已收金额，指定来源流水时还不得超过该笔可退余额；
     * - 部分退款后来源流水保持 paid，退满后置为 refunded。
     */
    refund(params: {
        order: any;
        amount: number;
        sourcePaymentNo?: string;
        refundNo?: string;
        idempotencyKey?: string;
        provider?: string;
        operatorId?: number | string;
        operatorName?: string;
        note?: string;
    }): Promise<{
        duplicated: boolean;
        payment: any;
        order: {
            orderNo: any;
            paidAmount: number;
            paymentStatus: any;
        };
        rollback: any;
        sourcePayment?: undefined;
    } | {
        duplicated: boolean;
        payment: any;
        sourcePayment: {
            paymentNo: any;
            refundedAmount: number;
            status: string;
        };
        order: {
            orderNo: any;
            paidAmount: number;
            paymentStatus: string;
        };
        rollback: any;
    }>;
};
export default _default;

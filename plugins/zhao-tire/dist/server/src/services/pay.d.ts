import { Core } from '@strapi/strapi';
/** 递归按键名排序后的稳定 JSON 序列化 */
export declare function canonicalize(value: any): string;
export declare function signMockPayload(payload: any, secret: string): string;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    provider(): "mock" | "wechat";
    mockSecret(): string;
    publicBase(): string;
    /** 下单支付：创建 pending 流水并返回 mock 收银台地址 */
    prepay(payload: any): Promise<{
        paid: boolean;
        paymentNo: any;
        amount: any;
        provider?: undefined;
        mock?: undefined;
        payUrl?: undefined;
        orderNo?: undefined;
    } | {
        paymentNo: any;
        amount: any;
        provider: "mock";
        mock: boolean;
        payUrl: string;
        orderNo: any;
        paid?: undefined;
    }>;
    /** mock 异步回调：HMAC-SHA256 校验通过后才置 paid，重放幂等 */
    notify(payload: any, signature: string): Promise<{
        ok: boolean;
        duplicated: any;
        paidAmount: any;
    }>;
    /** H5 mock 收银台确认支付（仅 PAY_PROVIDER=mock 时可用） */
    mockPay(paymentNo: string): Promise<{
        ok: boolean;
        duplicated: any;
        paidAmount: any;
    }>;
};
export default _default;

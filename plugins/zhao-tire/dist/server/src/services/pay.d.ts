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
    /** 下单支付：创建 pending 流水并返回收银台参数（mock 或微信 JSAPI） */
    prepay(payload: any): Promise<any>;
    /** 支付异步回调：mock 用 HMAC，微信走 APIv3 验签/解密；失败均不改单 */
    notify(payload: any, signature: string, rawBody?: string, headers?: any): Promise<any>;
    /** H5 mock 收银台确认支付（仅 PAY_PROVIDER=mock 时可用） */
    mockPay(paymentNo: string): Promise<{
        ok: boolean;
        duplicated: any;
        paidAmount: any;
    }>;
};
export default _default;

import { Core } from '@strapi/strapi';
/** 环境变量键名（只读取，不落库、不打印值） */
export declare const WECHAT_PAY_ENV: {
    readonly appId: "WECHAT_PAY_APPID";
    readonly mchId: "WECHAT_PAY_MCHID";
    readonly apiV3Key: "WECHAT_PAY_API_V3_KEY";
    readonly mchSerialNo: "WECHAT_PAY_MCH_SERIAL_NO";
    readonly privateKey: "WECHAT_PAY_PRIVATE_KEY";
    readonly platformPublicKey: "WECHAT_PAY_PLATFORM_PUBLIC_KEY";
    readonly notifyUrl: "WECHAT_PAY_NOTIFY_URL";
    readonly apiBase: "WECHAT_PAY_API_BASE";
};
export type WechatPayScope = "prepay" | "notify" | "refund";
export interface WechatPayConfig {
    appId: string;
    mchId: string;
    apiV3Key: string;
    mchSerialNo: string;
    privateKey: string;
    platformPublicKey: string;
    notifyUrl: string;
    apiBase: string;
}
export declare function readWechatPayConfig(env?: NodeJS.ProcessEnv): WechatPayConfig;
/** 返回缺失的环境变量名（只返回键名，便于运维补齐，不暴露值） */
export declare function missingWechatPayKeys(config: WechatPayConfig, scope?: WechatPayScope): string[];
/** openid 掩码，仅用于日志与流水备注 */
export declare function maskOpenid(openid: string): string;
/** APIv3 签名串：method\npath\ntimestamp\nnonce\nbody\n */
export declare function buildSignMessage(method: string, urlPath: string, timestamp: string, nonce: string, body: string): string;
/** 商户私钥 RSA-SHA256 签名（base64） */
export declare function signWithPrivateKey(message: string, privateKey: string): string;
/** 构造微信支付 APIv3 Authorization 头 */
export declare function buildAuthorizationHeader(config: WechatPayConfig, method: string, urlPath: string, body: string, timestamp?: string, nonce?: string): string;
/** 回调验签：timestamp\nnonce\nrawBody\n 与 wechatpay-signature 比对 */
export declare function verifyWechatNotifySignature(config: WechatPayConfig, params: {
    timestamp: string;
    nonce: string;
    rawBody: string;
    signature: string;
}): boolean;
/** 解密回调 resource（AEAD_AES_256_GCM） */
export declare function decryptWechatNotifyResource(config: WechatPayConfig, resource: any): any;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    readConfig(): WechatPayConfig;
    missingKeys(scope?: WechatPayScope): string[];
    /** 密钥缺失时返回可读错误，调用方在任何落库前调用 */
    assertConfigured(scope?: WechatPayScope): WechatPayConfig;
    buildJsapiPayParams(prepayId: string, config: WechatPayConfig): {
        appId: string;
        timeStamp: string;
        nonceStr: string;
        package: string;
        signType: string;
        paySign: string;
    };
    /** 调用 /v3/pay/transactions/jsapi；测试可覆盖本方法，避免真实网络请求 */
    createJsapiTransaction(params: {
        config: WechatPayConfig;
        order: any;
        payment: any;
        amount: number;
        openid: string;
    }): Promise<string>;
    /**
     * 微信 JSAPI 下单：
     * - 未配置 / 未绑定 openid 时在任何落库前报可读错误；
     * - 成功后创建/复用 pending 流水（同一幂等键不重复下单）；
     * - 流水 externalNo 存 prepay_id，便于重复点击复用。
     */
    prepay(params: {
        order: any;
        amount: number;
        openid?: string;
        idempotencyKey?: string;
    }): Promise<{
        paid: boolean;
        paymentNo: any;
        amount: any;
        provider?: undefined;
        mock?: undefined;
        orderNo?: undefined;
        openidMasked?: undefined;
        payParams?: undefined;
    } | {
        paymentNo: any;
        amount: number;
        provider: string;
        mock: boolean;
        orderNo: any;
        openidMasked: string;
        payParams: {
            appId: string;
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: string;
        };
        paid?: undefined;
    }>;
    /** 微信支付异步回调：验签 + 解密 + 幂等 settle；任一步失败都不改单 */
    notify(params: {
        headers: any;
        rawBody: string;
        body: any;
    }): Promise<{
        ok: boolean;
        ignored: boolean;
        tradeState: string;
        duplicated?: undefined;
        paidAmount?: undefined;
    } | {
        ok: boolean;
        duplicated: any;
        paidAmount: any;
        ignored?: undefined;
        tradeState?: undefined;
    }>;
    verifySignature(params: {
        config: WechatPayConfig;
        timestamp: string;
        nonce: string;
        rawBody: string;
        signature: string;
    }): boolean;
    decryptResource(config: WechatPayConfig, resource: any): any;
    /**
     * 微信退款骨架：只发起 APIv3 退款受理，不直接改订单状态。
     * 订单状态回滚仍交由 paymentService.refund 串联（下一轮接入）。
     */
    refund(params: {
        order: any;
        amount: number;
        paymentNo: string;
        reason?: string;
    }): Promise<{
        refundNo: string;
        paymentNo: any;
        amount: number;
        status: string;
        orderNo: any;
    }>;
};
export default _default;

import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 发送验证码
     * - SMS_PROVIDER=mock(默认):固定 1234,仅写入 DB
     * - SMS_PROVIDER=aliyun:对接阿里云 dysmsapi
     * - SMS_PROVIDER=tencent:对接腾讯云 sms
     */
    sendCode(mobile: string, scene?: string, ip?: string): Promise<{
        sent: boolean;
        provider: string;
        ttlMinutes: number;
        error?: undefined;
    } | {
        sent: boolean;
        provider: string;
        error: any;
        ttlMinutes: number;
    }>;
    /**
     * 校验验证码(校验成功后标记 used=true)
     */
    verifyCode(mobile: string, code: string, scene?: string): Promise<boolean>;
    /**
     * 阿里云 SMS 发送(HMAC-SHA1 签名,GET 请求)
     * 环境变量:SMS_ALIYUN_ACCESS_KEY_ID / SMS_ALIYUN_ACCESS_KEY_SECRET / SMS_ALIYUN_SIGN_NAME / SMS_ALIYUN_TEMPLATE_CODE
     */
    sendViaAliyun(mobile: string, code: string): Promise<any>;
    /**
     * 腾讯云 SMS 发送(TC3-HMAC-SHA256 签名,POST 请求)
     * 环境变量:SMS_TENCENT_SECRET_ID / SMS_TENCENT_SECRET_KEY / SMS_TENCENT_SDK_APP_ID / SMS_TENCENT_SIGN_NAME / SMS_TENCENT_TEMPLATE_ID
     */
    sendViaTencent(mobile: string, code: string): Promise<any>;
};
export default _default;

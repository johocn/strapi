import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 发送验证码
     * - SMS_PROVIDER=mock(默认):固定 1234,仅写入 DB
     * - SMS_PROVIDER=aliyun/tencent:预留接口,未对接真实 SDK
     */
    sendCode(mobile: string, scene?: string, ip?: string): Promise<{
        sent: boolean;
        provider: string;
        ttlMinutes: number;
    }>;
    /**
     * 校验验证码(校验成功后标记 used=true)
     */
    verifyCode(mobile: string, code: string, scene?: string): Promise<boolean>;
    /**
     * 预留:阿里云 SMS 发送接口
     */
    sendViaAliyun(_mobile: string, _code: string, _scene: string): Promise<never>;
    /**
     * 预留:腾讯云 SMS 发送接口
     */
    sendViaTencent(_mobile: string, _code: string, _scene: string): Promise<never>;
};
export default _default;

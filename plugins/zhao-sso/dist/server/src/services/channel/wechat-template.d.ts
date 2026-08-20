import { Core } from '@strapi/strapi';
/**
 * 微信公众号模板消息通道
 * 依赖 sso-oauth-config 中 provider=wechat, app_type=official_account 配置获取 access_token。
 * 支持 mock 模式(MSG_WECHAT_PROVIDER=mock)：不真正调微信，直接返回成功，便于本地联调。
 */
export declare function createWechatTemplateChannel({ strapi }: {
    strapi: Core.Strapi;
}): {
    provider: string;
    /**
     * 发送模板消息
     * @param opts { openid, templateId, url, data }  data 为 {字段名:{value}}，调用方已按模板字段映射
     * @returns { msgId, raw }  微信返回 msgid + 原始数据
     */
    send(opts: {
        openid: string;
        templateId: string;
        url?: string;
        data: Record<string, {
            value: string;
        }>;
    }): Promise<{
        msgId: any;
        raw: any;
    }>;
};

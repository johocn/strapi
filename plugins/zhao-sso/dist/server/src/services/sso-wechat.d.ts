import { Core } from '@strapi/strapi';
type WechatAppType = "official_account" | "open_platform" | "mini_program" | "app";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getAuthorizeUrl(state: string, appType: WechatAppType, scope?: string, callbackUrl?: string): Promise<string>;
    handleCallback(code: string, appType: WechatAppType): Promise<{
        userId: any;
        isNew: boolean;
    }>;
    getJssdkSignature(url: string, appType: WechatAppType): Promise<{
        appId: any;
        timestamp: string;
        nonceStr: string;
        signature: string;
    }>;
    getWechatLoginConfig(appType: WechatAppType): Promise<{
        enabled: boolean;
        appType: WechatAppType;
        oauthScopes: any;
        appId: any;
    }>;
};
export default _default;

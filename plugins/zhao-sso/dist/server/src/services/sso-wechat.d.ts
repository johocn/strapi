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
    /**
     * 查询用户是否关注公众号(subscribe)
     * 调 cgi-bin/user/info + 全局 access_token，返回 subscribe(1关注/0未关注)
     */
    querySubscribe(openid: string, provider?: string, appType?: WechatAppType): Promise<0 | 1>;
};
export default _default;

import { Core } from '@strapi/strapi';
type WechatAppType = "official_account" | "open_platform" | "mini_program" | "app";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 公开获取已缓存/刷新后的全局 access_token（复用闭包 tokenCache），供二维码/菜单等调用
     */
    getAccessToken(appType?: WechatAppType): Promise<string>;
    /**
     * 使用调用方提供的 appId/appSecret 换取全局 access_token（复用 tokenCache）。
     * 供公众号动作从外部账号体系（如 zhao-studio publish-account.config）拿凭据时使用。
     */
    getAccessTokenByConfig(config: {
        appId: string;
        appSecret: string;
    }): Promise<string>;
    getAuthorizeUrl(state: string, appType: WechatAppType, scope?: string, callbackUrl?: string): Promise<string>;
    handleCallback(code: string, appType: WechatAppType): Promise<{
        userId: any;
        isNew: boolean;
        ownInviteCode: any;
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

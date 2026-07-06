import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取三方授权 URL
     */
    getAuthUrl(platform: string, appType: string, redirectUrl: string, siteId?: string): Promise<{
        authUrl: any;
        state: string | null;
        appId: any;
    }>;
    /**
     * 获取微信开放平台扫码登录 URL（内嵌二维码 + 跳转模式）
     */
    getQrconnectUrl(redirectUrl: string, siteId?: string): Promise<{
        qrconnectUrl: string;
        redirectAuthUrl: string;
        state: string;
        appId: any;
    }>;
    /**
     * 三方登录回调：换取 token + openId，绑定或创建用户
     */
    handleCallback(params: {
        platform: string;
        appType: string;
        code: string;
        encryptedData?: string;
        iv?: string;
        inviteCode?: string;
        siteId?: string;
    }): Promise<{
        jwt: any;
        user: {
            id: any;
            username: any;
            email: any;
        };
        isNew: boolean;
    }>;
    /**
     * 换取三方 access_token
     */
    exchangeToken(platform: string, appType: string, code: string, config: any, encryptedData?: string, iv?: string): Promise<Record<string, any> | {
        accessToken: any;
        openId: any;
        unionId: any;
        sessionKey: null;
        nickname: null;
        avatar: null;
    }>;
    exchangeWechatToken(appType: string, code: string, config: any, encryptedData?: string, iv?: string): Promise<Record<string, any>>;
    exchangeAlipayToken(code: string, config: any): Promise<{
        accessToken: any;
        openId: any;
        unionId: any;
        sessionKey: null;
        nickname: null;
        avatar: null;
    }>;
    exchangeDouyinToken(code: string, config: any): Promise<{
        accessToken: any;
        openId: any;
        unionId: null;
        sessionKey: null;
        nickname: null;
        avatar: null;
    }>;
    /**
     * 创建用户（三方登录自动注册）
     */
    createUserFromThirdParty(platform: string, tokenResult: any, inviteCode?: string): Promise<any>;
    /**
     * 获取三方公开配置
     */
    getPublicConfig(platform: string, appType: string, siteId?: string): Promise<{
        platform: any;
        appType: any;
        appId: any;
        enabled: any;
        authMode: string | null;
    } | null>;
    /**
     * 微信 JS-SDK 签名
     * 公众号网页优先用 official_account 配置(公众号 appId/secret 也能调用 JS-SDK)
     * fallback 到 open_platform(开放平台)
     */
    getJssdkSignature(url: string, siteId?: string): Promise<{
        appId: any;
        timestamp: string;
        nonceStr: string;
        signature: string;
    }>;
    /**
     * 更新三方资料
     */
    updateProfile(userId: number | string, data: {
        nickname?: string;
        avatar?: string;
    }): Promise<{
        success: boolean;
    }>;
    /**
     * 微信授权中转回调
     * 接收微信回调的 code，完成 token 交换后 302 重定向到前端页面
     * @param ctx - Koa context，包含 code、state、host
     */
    wechatRedirectCallback(ctx: any): Promise<void>;
    /**
     * 构建前端重定向 URL
     */
    buildFrontendRedirectUrl(ctx: any, result: any, state?: string): string;
    /**
     * 处理授权错误
     */
    handleAuthError(ctx: any, message: string): void;
};
export default _default;
//# sourceMappingURL=third-party-auth.d.ts.map
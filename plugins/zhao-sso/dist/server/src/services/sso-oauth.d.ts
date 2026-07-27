import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generateAuthCode(params: {
        userId: number;
        appCode: string;
        redirectUri: string;
        channelCode?: string;
        inviteCode?: string;
        scopes?: string[];
    }): Promise<string>;
    exchangeCode(params: {
        code: string;
        appCode: string;
        appSecret: string;
        redirectUri: string;
    }): Promise<{
        userId: any;
        channelCode: any;
        inviteCode: any;
        scopes: any;
    }>;
    /**
     * 内部方法：校验并核销授权码，不校验 app_secret
     * 用于服务端内部调用（如 exchange-token 代理接口，app_secret 由后端自查）
     */
    exchangeCodeInternal(params: {
        code: string;
        appCode: string;
        app: any;
        redirectUri: string;
    }): Promise<{
        userId: any;
        channelCode: any;
        inviteCode: any;
        scopes: any;
    }>;
    findApp(appCode: string): Promise<any>;
    validateRedirectUri(app: any, redirectUri: string): boolean;
};
export default _default;

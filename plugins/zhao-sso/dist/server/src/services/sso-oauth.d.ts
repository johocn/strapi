import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generateAuthCode(params: {
        userId: number;
        appCode: string;
        redirectUri: string;
        channelCode?: string;
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
        scopes: any;
    }>;
    findApp(appCode: string): Promise<any>;
    validateRedirectUri(app: any, redirectUri: string): boolean;
};
export default _default;

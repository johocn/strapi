import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getAuthorizeUrl(state: string): Promise<string>;
    handleCallback(code: string): Promise<{
        userId: any;
        isNew: boolean;
    }>;
    requestToken(appId: string, privateKey: string, code: string): Promise<any>;
    fetchUserInfo(appId: string, privateKey: string, accessToken: string): Promise<any>;
    buildAlipayParams(appId: string, method: string, bizContent: any): Record<string, string>;
    signParams(params: Record<string, string>, privateKey: string): string;
};
export default _default;

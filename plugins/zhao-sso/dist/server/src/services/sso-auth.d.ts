import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    login: (params: {
        type: string;
        identifier?: string;
        password?: string;
        code?: string;
        appCode: string;
        channelCode?: string;
        ip?: string;
        userAgent?: string;
    }) => Promise<any>;
    register: (params: {
        username?: string;
        mobile?: string;
        email?: string;
        password?: string;
        appCode: string;
        channelCode?: string;
        inviteCode?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        ip?: string;
        userAgent?: string;
    }) => Promise<any>;
    verifyToken: (token: string) => Promise<{
        payload: any;
        user: any;
    }>;
    refreshToken: (refreshToken: string) => Promise<any>;
    logout: (accessToken: string) => Promise<{
        success: boolean;
    }>;
    getUserRoles: (userId: number, appCode: string) => Promise<string[]>;
    saveTokenRecord: (userId: number, appCode: string, tokenPair: any, channelCode?: string) => Promise<void>;
    sanitizeUser: (user: any) => any;
};
export default _default;

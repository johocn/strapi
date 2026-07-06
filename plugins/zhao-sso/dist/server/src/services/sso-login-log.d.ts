import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    log(params: {
        userId?: number;
        loginType: string;
        provider?: string;
        channelCode?: string;
        appCode?: string;
        ip?: string;
        userAgent?: string;
        success: boolean;
        failReason?: string;
    }): Promise<any>;
    getRecentFailCount(identifier: string, windowMinutes?: number): Promise<number>;
    getUserLogs(userId: number, limit?: number): Promise<any[]>;
    count(where?: any): Promise<number>;
    findManyPaginated(params: {
        where?: any;
        orderBy?: any;
        limit?: number;
        offset?: number;
        populate?: any;
    }): Promise<any[]>;
};
export default _default;

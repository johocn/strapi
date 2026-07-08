import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    toggle(siteId: number, data: {
        type: string;
        targetType: string;
        targetId: string;
        visitorId: string;
        userId?: number;
        ctx?: any;
    }): Promise<{
        action: string;
    }>;
    check(siteId: number, params: {
        type: string;
        targetType: string;
        targetId: string;
        visitorId: string;
    }): Promise<{
        liked: boolean;
    }>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    stats(siteId: number, targetType: string, targetId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
};
export default _default;

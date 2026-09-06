import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number, query?: any): Promise<{
        results: any[];
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        };
    }>;
    findOne(siteId: number, slug: string, locale?: string): Promise<any>;
    findFeatured(siteId: number, limit?: number, locale?: string, type?: string): Promise<any[]>;
};
export default _default;

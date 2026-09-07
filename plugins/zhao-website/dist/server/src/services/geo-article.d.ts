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
    findAdmin(siteId: number, query?: any): Promise<{
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
    findOneAdmin(siteId: number, documentId: string): Promise<any>;
    create(siteId: number, data: any): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    publish(siteId: number, documentId: string): Promise<any>;
    archive(siteId: number, documentId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
    batch(siteId: number, body?: any): Promise<{
        results: any[];
    }>;
};
export default _default;

import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number, query?: any): Promise<any[]>;
    findOne(siteId: number, slug: string): Promise<any>;
    search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
        data: any[];
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        };
    }>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    findOneAdmin(siteId: number, documentId: string): Promise<any>;
    create(siteId: number, data: any): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    publish(siteId: number, documentId: string): Promise<any>;
    unpublish(siteId: number, documentId: string): Promise<any>;
    archive(siteId: number, documentId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
    incrementViewCount(siteId: number, documentId: string): Promise<void>;
};
export default _default;

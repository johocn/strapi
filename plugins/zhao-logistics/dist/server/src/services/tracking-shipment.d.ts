import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findAdmin(siteId: number, query: any): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    findOneAdmin(siteId: number, documentId: string): Promise<any>;
    createAdmin(siteId: number, data: any): Promise<any>;
    updateAdmin(siteId: number, documentId: string, data: any): Promise<any>;
    deleteAdmin(siteId: number, documentId: string): Promise<any>;
};
export default _default;

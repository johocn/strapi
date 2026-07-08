import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findByTarget(siteId: number, targetType: string, targetId: string, summaryType?: string): Promise<any[]>;
    findPublic(siteId: number, query?: any): Promise<any[]>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    create(siteId: number, data: any): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    regenerate(siteId: number, documentId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
};
export default _default;

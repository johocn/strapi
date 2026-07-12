import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findAdmin(siteId: number | null, query?: any): Promise<any[]>;
    findOneAdmin(siteId: number | null, documentId: string): Promise<any>;
    create(siteId: number | null, data: any): Promise<any>;
    update(siteId: number | null, documentId: string, data: any): Promise<any>;
    softDelete(siteId: number | null, documentId: string): Promise<any>;
    listByCategory(siteId: number | null, category: string): Promise<any[]>;
    resolveVariables(siteId: number | null, documentId: string, variables: Record<string, string>): Promise<any>;
    getRefContent(siteId: number | null, category: string): Promise<string>;
};
export default _default;

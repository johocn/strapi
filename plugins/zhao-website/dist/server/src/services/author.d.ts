import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findAdmin(siteId: number): Promise<any[]>;
    findOneAdmin(siteId: number, documentId: string): Promise<any>;
    create(siteId: number, data: any): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
};
export default _default;

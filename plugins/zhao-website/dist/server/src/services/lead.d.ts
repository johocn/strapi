import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    createPublic(siteId: number, data: any, ctx: any): Promise<any>;
    findMine(siteId: number, userId: number, query?: any): Promise<any[]>;
    findAdmin(siteId: number, query?: any): Promise<any[]>;
    findOneAdmin(siteId: number, documentId: string): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    assign(siteId: number, documentId: string, assignedToId: number): Promise<any>;
    followUp(siteId: number, documentId: string, record: {
        content: string;
        result: string;
    }): Promise<any>;
    stats(siteId: number): Promise<{
        total: number;
        byStatus: any;
        byType: any;
    }>;
    softDelete(siteId: number, documentId: string): Promise<any>;
};
export default _default;

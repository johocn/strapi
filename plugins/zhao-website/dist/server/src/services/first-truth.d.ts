import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number, query?: any): Promise<any[]>;
    findOne(siteId: number, documentId: string): Promise<any>;
    findByClaimKey(siteId: number, claimKey: string): Promise<any>;
    create(siteId: number, data: any): Promise<any>;
    update(siteId: number, documentId: string, data: any): Promise<any>;
    _markRelatedEntitiesPending(siteId: number, canonicalEntity: any): Promise<void>;
    verify(siteId: number, documentId: string): Promise<any>;
    softDelete(siteId: number, documentId: string): Promise<any>;
    detectConflicts(siteId: number): Promise<any[]>;
};
export default _default;

import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number | null, query?: any): Promise<any[]>;
    findOne(siteId: number | null, documentId: string): Promise<any>;
    findByClaimKey(siteId: number | null, claimKey: string): Promise<any>;
    create(siteId: number | null, data: any): Promise<any>;
    update(siteId: number | null, documentId: string, data: any): Promise<any>;
    _markRelatedEntitiesPending(siteId: number | null, canonicalEntity: any): Promise<void>;
    verify(siteId: number | null, documentId: string): Promise<any>;
    softDelete(siteId: number | null, documentId: string): Promise<any>;
    detectConflicts(siteId: number | null): Promise<any[]>;
};
export default _default;

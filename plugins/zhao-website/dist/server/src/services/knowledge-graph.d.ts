import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findEntities(siteId: number, query?: any): Promise<any[]>;
    findEntityBySlug(siteId: number, slug: string): Promise<any>;
    findEntityByRef(params: {
        refTargetType: string;
        refTargetId: string;
    }): Promise<any>;
    upsertEntityFromContent(params: {
        siteId: number;
        entityType: string;
        name: string;
        refTargetType: string;
        refTargetId: string;
    }): Promise<any>;
    createEntity(siteId: number | null, data: any): Promise<any>;
    updateEntity(siteId: number | null, documentId: string, data: any): Promise<any>;
    deleteEntity(siteId: number | null, documentId: string): Promise<any>;
    findRelations(siteId: number, query?: any): Promise<any[]>;
    addRelation(params: {
        siteId: number;
        subjectEntityId: string;
        predicate: string;
        objectEntityId?: string;
        objectValue?: any;
        objectText?: string;
        sourceType?: string;
    }): Promise<any>;
    _detectCycle(subjectId: string, objectId: string, predicate: string, visited?: Set<string>): Promise<boolean>;
    deleteRelation(siteId: number, documentId: string): Promise<any>;
    disambiguate(siteId: number, params: {
        name: string;
        entityType?: string;
    }): Promise<any | null>;
    syncFromContent(targetType: string, content: any): Promise<void>;
    verifyAll(siteId: number): Promise<{
        total: number;
        conflicts: number;
        report: any[];
    }>;
    exportGraph(siteId: number): Promise<any>;
    exportEntity(siteId: number, slug: string): Promise<any | null>;
    _entityToJsonLd(entity: any, outgoing?: any[], incoming?: any[]): any;
    exportFacts(siteId: number): Promise<any[]>;
};
export default _default;

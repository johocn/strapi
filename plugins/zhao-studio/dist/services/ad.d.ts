import type { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getZoneByPosition(position: string, siteDomain?: string, siteDocumentId?: string): Promise<{
        zone: null;
        contents: never[];
    } | {
        zone: import("@strapi/types/dist/modules/documents").AnyDocument;
        contents: any;
    }>;
    getAllZones(siteDomain?: string, siteDocumentId?: string): Promise<any[]>;
    listZones(query?: any): Promise<{
        records: any;
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        };
    }>;
    createZone(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    findOneZone(documentId: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    updateZone(documentId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deleteZone(documentId: string): Promise<{
        documentId: import("@strapi/types/dist/modules/documents").ID;
        entries: import("@strapi/types/dist/modules/documents").Result<TContentTypeUID, TParams>[];
    }>;
    listContents(query?: any): Promise<{
        records: any;
        meta: {
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        };
    }>;
    createContent(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    findOneContent(documentId: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    updateContent(documentId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deleteContent(documentId: string): Promise<{
        documentId: import("@strapi/types/dist/modules/documents").ID;
        entries: import("@strapi/types/dist/modules/documents").Result<TContentTypeUID, TParams>[];
    }>;
};
export default _default;
//# sourceMappingURL=ad.d.ts.map
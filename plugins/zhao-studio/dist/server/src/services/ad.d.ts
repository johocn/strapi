import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getZoneByPosition(position: string, siteDomain?: string): Promise<{
        zone: null;
        contents: never[];
    } | {
        zone: import('@strapi/types/dist/modules/documents').AnyDocument;
        contents: any;
    }>;
    getAllZones(siteDomain?: string): Promise<any[]>;
    listZones(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createZone(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    findOneZone(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    updateZone(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteZone(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    listContents(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createContent(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    findOneContent(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    updateContent(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteContent(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
};
export default _default;
//# sourceMappingURL=ad.d.ts.map
declare const _default: {
    tag: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(query?: any): Promise<{
            list: import('@strapi/types/dist/modules/documents').AnyDocument[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
    };
    "tag-index": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        sync(targetType: string, targetId: string, tagIds: string[]): Promise<void>;
        remove(targetType: string, targetId: string): Promise<void>;
        searchByTag(tagDocumentId: string, targetType?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        countByTag(tagDocumentId: string): Promise<number>;
    };
    "tag-group": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(query?: any): Promise<{
            list: import('@strapi/types/dist/modules/documents').AnyDocument[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map
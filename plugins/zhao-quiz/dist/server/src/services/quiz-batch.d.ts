import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
    findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    delete(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    _getFilePath(fileInfo: any): string | null;
    importFromFile(batchDocumentId: string): Promise<{
        total: number;
        success: number;
        skipped: number;
        errors: string[];
    }>;
    exportQuizzes(filters?: any): Promise<any>;
    _resolveCourse(value: string): Promise<string | null>;
    _resolveLesson(value: string): Promise<string | null>;
    _resolveKnowledgePoint(value: string): Promise<string | null>;
    _normalizeOptions(raw: string | string[] | null): {
        key: string;
        text: string;
    }[] | null;
    generateTemplate(params?: any): Promise<any>;
    downloadTemplate(params?: any): Promise<any>;
};
export default _default;

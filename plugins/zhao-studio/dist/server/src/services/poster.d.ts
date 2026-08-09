import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getTemplate(code: string): Promise<any>;
    resolveTemplate(code: string, variables: Record<string, any>): Promise<{
        template: {
            canvasWidth: any;
            canvasHeight: any;
            backgroundColor: any;
            backgroundImage: any;
            backgroundMode: any;
        };
        elements: any;
    } | null>;
    listTemplates(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createTemplate(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    findOneTemplate(documentId: string): Promise<any>;
    updateTemplate(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteTemplate(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    cloneTemplate(documentId: string): Promise<any>;
    batchSaveElements(templateDocumentId: string, elements: any[]): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    listElements(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createElement(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateElement(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteElement(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    seedDefaultTemplate(): Promise<{
        success: boolean;
        reason: string;
        templates?: undefined;
    } | {
        success: boolean;
        templates: number;
        reason?: undefined;
    }>;
};
export default _default;
//# sourceMappingURL=poster.d.ts.map
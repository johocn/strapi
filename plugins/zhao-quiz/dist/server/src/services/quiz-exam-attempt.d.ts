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
    /**
     * 开始考试
     */
    startExam(userId: number, examDocumentId: string): Promise<any>;
    /**
     * 提交答卷
     */
    submitExam(attemptDocumentId: string, answers: any[]): Promise<any>;
    /**
     * 查询用户的考试记录
     */
    getUserAttempts(userId: number, examDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
};
export default _default;

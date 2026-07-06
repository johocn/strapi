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
     * 提交回答 - 自动判题或标记 essay 待评分
     */
    submitAnswer(userId: number, quizDocumentId: string, answer: any, lessonDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 教师人工评分（仅限 essay 问答题）
     */
    teacherGrade(recordDocumentId: string, teacherScore: number, graderUserId: number): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 查询用户的答题记录
     */
    getUserRecords(userId: number, courseDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    /**
     * 查询待评分的问答题记录
     */
    getPendingGrading(courseDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
};
export default _default;

import { Core } from '@strapi/strapi';
type RoleGateOpts = {
    userId?: number;
    isAdmin?: boolean;
    siteDocId?: string;
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(query?: any, options?: RoleGateOpts): Promise<{
        list: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    findOne(documentId: string, options?: RoleGateOpts): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    delete(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    /**
     * 获取考试题目（支持随机排序）
     */
    getQuestions(examDocumentId: string, options?: RoleGateOpts): Promise<any>;
    /**
     * 计算考试总分
     */
    calculateTotalPoints(examDocumentId: string): Promise<any>;
    /**
     * 组卷：fixed 固定题 或 rule 规则抽题；返回隐藏答案的题目与缺额提示
     */
    generatePaper(examDocumentId: string, options?: RoleGateOpts): Promise<{
        documentId: string;
        questions: any[];
        shortages: string[];
    }>;
    /** 考试角色门控：非 admin 且课程配置了 quiz.examRoles 时，未授权角色抛 403 */
    _assertExamRole(exam: any, options?: RoleGateOpts): Promise<void>;
    /** 随机排序并隐藏答案/赋予分值 */
    _hideAnswers(questions: any[], exam: any): any[];
};
export default _default;

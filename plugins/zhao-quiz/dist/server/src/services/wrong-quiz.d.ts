import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 判错时调用：入库或累加计数、等级归 1 */
    onWrong(input: {
        userId: number;
        quizId: number;
        courseId?: number | string;
        lessonId?: number | string;
        knowledgePointName?: string;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /** 答对时调用：按间隔重复升级；达到 PASS_LEVEL 者出集 */
    onCorrect(userId: number, quizId: number): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    findActive(userId: number, quizId: number): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /** 待复习错题（dueAt <= now，用于错题重练） */
    dueList(userId: number, limit?: number): Promise<{
        list: import('@strapi/types/dist/modules/documents').AnyDocument[];
        total: number;
    }>;
    listByUser(userId: number, status?: string, pagination?: {
        page: number;
        pageSize: number;
    }): Promise<{
        list: import('@strapi/types/dist/modules/documents').AnyDocument[];
        total: number;
    }>;
    _dueAt(level: number): Date;
};
export default _default;

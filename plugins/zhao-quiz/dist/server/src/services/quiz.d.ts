import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(query?: any, channelScope?: {
        all: boolean;
        channelIds: number[];
    }): Promise<{
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
    findByType(type: string, query?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    findByDifficulty(difficulty: string, query?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    findByCourse(courseDocumentId: string, query?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    findByLesson(lessonDocumentId: string, query?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    /**
     * C端开始答题：随机抽取题目 + 积分配置
     * 前置校验：课时内容必须完成才能答题
     */
    startQuiz(userId: number, lessonDocumentId: string, count?: number): Promise<{
        questions: {
            documentId: any;
            title: any;
            type: any;
            options: any;
            points: any;
        }[];
        pointsConfig: any;
        courseDocumentId: any;
        channelConfig: {
            channelScope: any;
            channelIds: any;
            pointChannelId: any;
            pointChannelName: any;
            allowCrossChannel: boolean;
        };
        featureFlags: {
            channel_cross_points?: undefined;
        } | {
            channel_cross_points: boolean;
        };
    }>;
    /**
     * C端判题：验证答案是否正确
     */
    checkAnswer(quizDocumentId: string, userAnswer: string): Promise<{
        isCorrect: boolean;
        correctAnswer: any;
        explanation: any;
    }>;
    /**
     * C端领取答题积分
     */
    claimQuizPoints(userId: number, courseDocumentId: string, totalEarnedPoints: number, lessonDocumentId?: string, selectedChannelId?: number | string): Promise<{
        pointsEarned: number;
    }>;
};
export default _default;

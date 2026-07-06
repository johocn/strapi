declare const _default: {
    quiz: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
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
        checkAnswer(quizDocumentId: string, userAnswer: string): Promise<{
            isCorrect: boolean;
            correctAnswer: any;
            explanation: any;
        }>;
        claimQuizPoints(userId: number, courseDocumentId: string, totalEarnedPoints: number, lessonDocumentId?: string, selectedChannelId?: number | string): Promise<{
            pointsEarned: number;
        }>;
    };
    "quiz-record": ({ strapi }: {
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
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
        submitAnswer(userId: number, quizDocumentId: string, answer: any, lessonDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        teacherGrade(recordDocumentId: string, teacherScore: number, graderUserId: number): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        getUserRecords(userId: number, courseDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
        getPendingGrading(courseDocId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    };
    "quiz-exam": ({ strapi }: {
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
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
        getQuestions(examDocumentId: string): Promise<any>;
        calculateTotalPoints(examDocumentId: string): Promise<any>;
    };
    "quiz-exam-attempt": ({ strapi }: {
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
        findOne(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        create(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        update(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
        delete(documentId: string): Promise<{
            documentId: import('@strapi/types/dist/modules/documents').ID;
            entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
        }>;
        startExam(userId: number, examDocumentId: string): Promise<any>;
        submitExam(attemptDocumentId: string, answers: any[]): Promise<any>;
        getUserAttempts(userId: number, examDocumentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    };
    "quiz-batch": ({ strapi }: {
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
            errors: string[];
        }>;
        generateTemplate(_courseDocId?: string, _lessonDocId?: string): Promise<any>;
        downloadTemplate(): Promise<any>;
    };
};
export default _default;

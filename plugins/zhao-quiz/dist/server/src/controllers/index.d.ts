declare const _default: {
    quiz: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        startQuiz(ctx: any): Promise<void>;
        claimQuizPoints(ctx: any): Promise<void>;
        checkAnswer(ctx: any): Promise<void>;
    };
    "quiz-record": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _scopeSvc(): import('@strapi/types/dist/core').Service;
        _channelFilterDeep(ctx: any, path: string[]): Record<string, any> | null;
        _assertInScope(ctx: any, record: any, field: string): void;
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        submitAnswer(ctx: any): Promise<void>;
        teacherGrade(ctx: any): Promise<void>;
        getUserRecords(ctx: any): Promise<void>;
        getPendingGrading(ctx: any): Promise<void>;
    };
    "quiz-exam": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        getQuestions(ctx: any): Promise<void>;
    };
    "quiz-exam-attempt": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        startExam(ctx: any): Promise<void>;
        submitExam(ctx: any): Promise<void>;
        getUserAttempts(ctx: any): Promise<void>;
    };
    "quiz-batch": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        importFile(ctx: any): Promise<void>;
        downloadTemplate(ctx: any): Promise<void>;
    };
};
export default _default;

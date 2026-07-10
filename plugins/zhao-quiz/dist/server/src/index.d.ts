declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    destroy: ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    config: {
        default: {
            scoring: {
                difficultyMultiplier: {
                    easy: number;
                    medium: number;
                    hard: number;
                };
                partialScore: {
                    multipleChoice: number;
                    matching: boolean;
                };
            };
            batch: {
                maxFileSize: number;
                allowedFormats: string[];
            };
            exam: {
                defaultPassScore: number;
                defaultTimeLimit: number;
            };
        };
        validator: (config: Record<string, unknown>) => void;
    };
    controllers: {
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
    routes: {
        "content-api": {
            type: "content-api";
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: (string | {
                        name: string;
                        config: {
                            action: string;
                        };
                    })[];
                };
            }[];
        };
    };
    services: {
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
    contentTypes: {
        quiz: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    title: {
                        type: string;
                        required: boolean;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    options: {
                        type: string;
                    };
                    answer: {
                        type: string;
                    };
                    explanation: {
                        type: string;
                    };
                    difficulty: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    points: {
                        type: string;
                        default: number;
                    };
                    sort: {
                        type: string;
                        default: number;
                    };
                    isPublished: {
                        type: string;
                        default: boolean;
                    };
                    course: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    lesson: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    exams: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    channelScope: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    channelIds: {
                        type: string;
                        default: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "quiz-record": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    quiz: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    answer: {
                        type: string;
                    };
                    isCorrect: {
                        type: string;
                    };
                    score: {
                        type: string;
                        precision: number;
                        scale: number;
                        default: number;
                    };
                    teacherScore: {
                        type: string;
                        precision: number;
                        scale: number;
                        default: number;
                    };
                    scoringStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    grader: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    gradedAt: {
                        type: string;
                    };
                    totalPoints: {
                        type: string;
                        default: number;
                    };
                    submittedAt: {
                        type: string;
                    };
                    duration: {
                        type: string;
                        default: number;
                    };
                    course: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    lesson: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                };
            };
        };
        "quiz-exam": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    title: {
                        type: string;
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    timeLimit: {
                        type: string;
                        default: number;
                    };
                    passScore: {
                        type: string;
                        precision: number;
                        scale: number;
                        default: number;
                    };
                    totalPoints: {
                        type: string;
                        default: number;
                    };
                    questionCount: {
                        type: string;
                        default: number;
                    };
                    randomOrder: {
                        type: string;
                        default: boolean;
                    };
                    allowRetry: {
                        type: string;
                        default: boolean;
                    };
                    maxAttempts: {
                        type: string;
                        default: number;
                    };
                    showResult: {
                        type: string;
                        default: boolean;
                    };
                    questionPoints: {
                        type: string;
                    };
                    course: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    lesson: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    questions: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    channelScope: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    channelIds: {
                        type: string;
                        default: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "quiz-exam-attempt": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    exam: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    answers: {
                        type: string;
                    };
                    totalScore: {
                        type: string;
                        precision: number;
                        scale: number;
                        default: number;
                    };
                    isPassed: {
                        type: string;
                    };
                    startedAt: {
                        type: string;
                    };
                    submittedAt: {
                        type: string;
                    };
                    duration: {
                        type: string;
                        default: number;
                    };
                    attemptNumber: {
                        type: string;
                        default: number;
                    };
                };
            };
        };
        "quiz-batch": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                    };
                    file: {
                        type: string;
                        multiple: boolean;
                    };
                    templateFile: {
                        type: string;
                        multiple: boolean;
                    };
                    totalCount: {
                        type: string;
                        default: number;
                    };
                    successCount: {
                        type: string;
                        default: number;
                    };
                    errorCount: {
                        type: string;
                        default: number;
                    };
                    errors: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    course: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    lesson: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
    };
    policies: {};
};
export default _default;

declare const _default: {
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
export default _default;

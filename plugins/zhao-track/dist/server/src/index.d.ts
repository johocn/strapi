declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    destroy: ({ strapi }: {
        strapi: any;
    }) => void;
    config: {
        default: {
            attributionWindowDays: number;
            clickRateLimitSeconds: number;
            rateLimitMemoryMaxEntries: number;
        };
    };
    controllers: {
        click: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            click(ctx: any): Promise<void>;
        };
        source: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            identify(ctx: any): Promise<void>;
        };
        query: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            clicks(ctx: any): Promise<void>;
            orders(ctx: any): Promise<void>;
            sourceTags(ctx: any): Promise<void>;
        };
        report: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            attributionReport(ctx: any): Promise<void>;
        };
        "admin-sync": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            trigger(ctx: any): Promise<void>;
            attributionRun(ctx: any): Promise<void>;
        };
    };
    contentTypes: {
        "source-tag": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    tagId: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    promoCampaign: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    scene: {
                        type: string;
                    };
                    sourceUrl: {
                        type: string;
                    };
                    utmSource: {
                        type: string;
                    };
                    utmMedium: {
                        type: string;
                    };
                    utmCampaign: {
                        type: string;
                    };
                    utmContent: {
                        type: string;
                    };
                    utmTerm: {
                        type: string;
                    };
                    deviceFingerprint: {
                        type: string;
                    };
                    firstSeenAt: {
                        type: string;
                        default: any;
                    };
                    lastSeenAt: {
                        type: string;
                    };
                    clickEvents: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        "click-event": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    coupon: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    sourceTag: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    promoPid: {
                        type: string;
                    };
                    promoCampaign: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    abVariant: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    deviceFingerprint: {
                        type: string;
                        required: boolean;
                    };
                    clickedAt: {
                        type: string;
                        required: boolean;
                    };
                    ip: {
                        type: string;
                    };
                    userAgent: {
                        type: string;
                    };
                    browser: {
                        type: string;
                    };
                    os: {
                        type: string;
                    };
                    device: {
                        type: string;
                    };
                    referer: {
                        type: string;
                    };
                    resolvedLink: {
                        type: string;
                    };
                };
            };
        };
        order: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    orderId: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    coupon: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    sourceTag: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    promoPid: {
                        type: string;
                    };
                    promoCampaign: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    deviceFingerprint: {
                        type: string;
                    };
                    transactedAt: {
                        type: string;
                        required: boolean;
                    };
                    amount: {
                        type: string;
                        required: boolean;
                    };
                    commission: {
                        type: string;
                    };
                    commissionStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    matchedClick: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    attributionQuality: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    syncedAt: {
                        type: string;
                    };
                };
            };
        };
    };
    services: {
        "source-resolver": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            identify(opts: import('./services/source-resolver').IdentifyOpts): Promise<{
                tag: import('@strapi/types/dist/modules/documents').AnyDocument;
                isNew: boolean;
            }>;
        };
        "rate-limiter": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            checkAndRecord(deviceFingerprint: string, couponId: string): Promise<{
                allowed: boolean;
            }>;
            _resetMemory(): void;
        };
        "click-orchestrator": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            orchestrate(req: import('./services/click-orchestrator').ClickRequest): Promise<{
                clickId: string;
                resolvedLink: any;
                coupon: {
                    documentId: string;
                    couponId: any;
                    amountDesc: any;
                    product: any;
                };
            }>;
        };
        attribution: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findMatchingClick: (order: any) => Promise<{
                click: any;
                quality: string;
                sourceTagId?: string;
            } | null>;
            run(opts?: {
                limit?: number;
            }): Promise<{
                total: number;
                matched: number;
                unmatched: number;
                byQuality: {
                    pid_match: number;
                    click_match: number;
                    weak_match: number;
                    fallback_match: number;
                };
            }>;
        };
        "order-sync": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            syncOrders(params: import('./services/order-sync').SyncOrdersParams): Promise<{
                fetched: number;
                created: number;
                updated: number;
                errors: string[];
            }>;
        };
        "order-sync-scheduler": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            shouldRunNow: (platformCode: string, syncCron: string) => Promise<boolean>;
            run(): Promise<{
                processed: number;
            }>;
        };
    };
    routes: {
        "content-api": () => {
            type: "content-api";
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                };
            }[];
        };
        "admin-api": () => {
            type: "admin";
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
    policies: {};
    middlewares: {};
};
export default _default;

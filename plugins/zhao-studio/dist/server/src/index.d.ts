declare const _default: {
    register: ({ strapi }: {
        strapi: any;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: any;
    }) => void;
    destroy: ({ strapi }: {
        strapi: any;
    }) => void;
    config: {
        default: {
            ai: {
                enabled: boolean;
                provider: string;
                maxTokens: number;
                temperature: number;
            };
        };
        validator(): void;
    };
    controllers: {
        collect: ({ strapi }: {
            strapi: any;
        }) => {
            listSources(ctx: any): Promise<void>;
            createSource(ctx: any): Promise<void>;
            updateSource(ctx: any): Promise<void>;
            deleteSource(ctx: any): Promise<void>;
            createTask(ctx: any): Promise<void>;
            fetchSelectedContent(ctx: any): Promise<void>;
            confirmImport(ctx: any): Promise<void>;
            listTasks(ctx: any): Promise<void>;
            getTask(ctx: any): Promise<void>;
        };
        draft: ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
        };
        publish: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listPlatforms(ctx: any): Promise<void>;
            createPlatform(ctx: any): Promise<void>;
            updatePlatform(ctx: any): Promise<void>;
            deletePlatform(ctx: any): Promise<void>;
            listAccounts(ctx: any): Promise<void>;
            createAccount(ctx: any): Promise<void>;
            updateAccount(ctx: any): Promise<void>;
            deleteAccount(ctx: any): Promise<void>;
            publishArticle(ctx: any): Promise<void>;
            listRecords(ctx: any): Promise<void>;
            retryPublish(ctx: any): Promise<void>;
            syncStatus(ctx: any): Promise<void>;
        };
        'internal-api': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listArticles(ctx: any): Promise<void>;
            getArticle(ctx: any): Promise<void>;
            searchArticles(ctx: any): Promise<void>;
            getCategories(ctx: any): Promise<void>;
            getChannels(ctx: any): Promise<void>;
        };
        ai: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getConfig(ctx: any): Promise<void>;
            updateConfig(ctx: any): Promise<void>;
            generateSummary(ctx: any): Promise<void>;
            optimizeTitle(ctx: any): Promise<void>;
            rewriteContent(ctx: any): Promise<void>;
            convertLanguage(ctx: any): Promise<void>;
            testConnection(ctx: any): Promise<void>;
            chat(ctx: any): Promise<any>;
        };
        analytics: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            trackPageView(ctx: any): Promise<void>;
            trackAdClick(ctx: any): Promise<void>;
            trackReadBehavior(ctx: any): Promise<void>;
            trackUserRegister(ctx: any): Promise<void>;
            listAdSlots(ctx: any): Promise<void>;
            createAdSlot(ctx: any): Promise<void>;
            updateAdSlot(ctx: any): Promise<void>;
            deleteAdSlot(ctx: any): Promise<void>;
            getOverview(ctx: any): Promise<void>;
            getArticleStats(ctx: any): Promise<void>;
            getAdSlotStats(ctx: any): Promise<void>;
            getDeviceStats(ctx: any): Promise<void>;
            getRegionStats(ctx: any): Promise<void>;
            getUserStats(ctx: any): Promise<void>;
        };
    };
    routes: {
        admin: {
            type: "admin";
            routes: any[];
        };
        'content-api': {
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
    };
    services: {
        collect: ({ strapi }: {
            strapi: any;
        }) => {
            createTask(sourceId: string): Promise<any>;
            fetchSelectedContent(taskId: string, selectedTitles: string[]): Promise<any[]>;
            confirmImport(taskId: string, confirmedContents: any[]): Promise<{
                imported: number;
                articles: any[];
            }>;
        };
        scraper: ({ strapi }: {
            strapi: any;
        }) => {
            fetchTitles(sourceId: string): Promise<import('./utils/selectors').ScrapedTitle[]>;
            fetchContent(url: string, sourceId: string): Promise<import('./utils/selectors').ScrapedContent>;
        };
        quality: ({ strapi }: {
            strapi: any;
        }) => {
            calculateQuality(content: any): import('./services/quality').QualityScore;
            isQualityAcceptable(score: import('./services/quality').QualityScore): boolean;
            getQualityLevel(score: import('./services/quality').QualityScore): "high" | "medium" | "low";
        };
        'ai-assist': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            callAI(params: {
                prompt: string;
                type: string;
            }): Promise<any>;
            callQwen(params: {
                prompt: string;
                type: string;
            }, config: any, provider: any): Promise<any>;
            callWenxin(params: {
                prompt: string;
                type: string;
            }, config: any, provider: any): Promise<any>;
            callHunyuan(params: {
                prompt: string;
                type: string;
            }, config: any, provider: any): Promise<any>;
            callSpark(params: {
                prompt: string;
                type: string;
            }, config: any, provider: any): Promise<any>;
            callCustom(params: {
                prompt: string;
                type: string;
            }, config: any): Promise<any>;
            generateSummary(articleId: string, options?: {
                length?: number;
            }): Promise<any>;
            optimizeTitle(articleId: string, style: "formal" | "casual" | "shocking"): Promise<any>;
            rewriteContent(articleId: string, tone: "formal" | "casual" | "humorous"): Promise<any>;
            convertLanguage(articleId: string, target: "simplified" | "traditional"): Promise<any>;
            chat(messages: Array<{
                role: string;
                content: string;
            }>): Promise<{
                content: any;
                role: string;
            }>;
        };
        publish: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            publishArticle(articleId: string, accountIds: string[]): Promise<any[]>;
            listPlatforms(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createPlatform(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updatePlatform(platformId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deletePlatform(platformId: string): Promise<void>;
            listAccounts(platformId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createAccount(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateAccount(accountId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteAccount(accountId: string): Promise<void>;
            listRecords(filters?: {
                articleId?: string;
                platformId?: string;
                accountId?: string;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            retryPublish(recordId: string): Promise<any>;
        };
        'channel-adapter': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            publish(article: any, account: any): Promise<{
                success: any;
                externalId: any;
                error: any;
            } | {
                success: boolean;
                externalId: any;
                accessUrl: string;
                channelCode: any;
            }>;
            publishToToutiao(article: any, account: any): Promise<{
                success: any;
                externalId: any;
                error: any;
            }>;
            publishToXiaohongshu(article: any, account: any): Promise<{
                success: any;
                externalId: any;
                error: any;
            }>;
            publishToWechat(article: any, account: any): Promise<{
                success: boolean;
                externalId: any;
                error: any;
            }>;
            publishToInternal(article: any, account: any): Promise<{
                success: boolean;
                externalId: any;
                accessUrl: string;
                channelCode: any;
            }>;
            publishToCustom(article: any, account: any): Promise<{
                success: any;
                externalId: any;
                error: any;
            }>;
            adaptContent(content: any, platformType: string): Promise<any>;
            checkExternalStatus(record: any): Promise<{
                deleted: boolean;
                status?: string;
            }>;
        };
        'internal-api': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listArticles(filters: any): Promise<any[]>;
            getArticle(articleId: string): Promise<any>;
            searchArticles(query: string, filters: any): Promise<any[]>;
            getCategories(): Promise<string[]>;
            getChannels(): Promise<string[]>;
        };
        'status-sync': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            syncPublishStatus(articleId: string): Promise<void>;
            syncAllPendingRecords(): Promise<{
                synced: number;
                failed: number;
            }>;
            cleanupOldRecords(days: number): Promise<{
                deleted: number;
            }>;
        };
        analytics: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            trackPageView(data: {
                articleId: string;
                sessionId: string;
                userId?: string;
                userAgent: string;
                ip: string;
                referrer: string;
                screen: {
                    width: number;
                    height: number;
                };
                language: string;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            trackAdClick(data: {
                adSlotId: string;
                articleId?: string;
                sessionId: string;
                userId?: string;
                userAgent: string;
                ip: string;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            trackReadBehavior(data: {
                articleId: string;
                sessionId: string;
                readDuration: number;
                scrollDepth: number;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            trackUserRegister(data: {
                sessionId: string;
                userId: string;
                registeredAt: Date;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            listAdSlots(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createAdSlot(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateAdSlot(id: string, data: any): Promise<any>;
            deleteAdSlot(id: string): Promise<void>;
            getOverview(params: {
                startDate: Date;
                endDate: Date;
            }): Promise<{
                pv: number;
                uv: number;
                clickCount: number;
                clickRate: number;
                avgReadDuration: number;
            }>;
            getArticleStats(params: {
                articleId?: string;
                startDate: Date;
                endDate: Date;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getAdSlotStats(params: {
                adSlotId?: string;
                startDate: Date;
                endDate: Date;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getDeviceStats(params: {
                startDate: Date;
                endDate: Date;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getRegionStats(params: {
                startDate: Date;
                endDate: Date;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getUserStats(params: {
                startDate: Date;
                endDate: Date;
            }): Promise<{
                registerCount: number;
                registeredRatio: number;
            }>;
            cleanupOldLogs(days: number): Promise<{
                deleted: number;
            }>;
        };
        aggregation: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            aggregateArticleDaily(date: Date): Promise<void>;
            aggregateAdSlotDaily(date: Date): Promise<void>;
            aggregateGlobalDaily(date: Date): Promise<void>;
            aggregateDeviceDaily(date: Date): Promise<void>;
            aggregateRegionDaily(date: Date): Promise<void>;
            runDailyAggregation(): Promise<{
                success: boolean;
                date: Date;
                error?: undefined;
            } | {
                success: boolean;
                error: any;
                date: Date;
            }>;
        };
    };
    policies: {};
    middlewares: {};
    contentTypes: {
        'article-draft': {
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
                    title: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    content: {
                        type: string;
                        required: boolean;
                    };
                    sourceUrl: {
                        type: string;
                    };
                    sourceTitle: {
                        type: string;
                    };
                    sourcePublishedAt: {
                        type: string;
                    };
                    sourceAuthor: {
                        type: string;
                    };
                    category: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    aiProcessed: {
                        type: string;
                        default: boolean;
                    };
                    aiSummary: {
                        type: string;
                    };
                    aiOptimizedTitle: {
                        type: string;
                    };
                    publishRecords: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    browserLogs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    statSummaries: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'collect-source': {
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
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    url: {
                        type: string;
                        required: boolean;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    template: {
                        type: string;
                    };
                    titleSelector: {
                        type: string;
                    };
                    contentSelector: {
                        type: string;
                    };
                    authorSelector: {
                        type: string;
                    };
                    dateSelector: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    tasks: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    lastCollectedAt: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'collect-task': {
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
                    source: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    titles: {
                        type: string;
                    };
                    selectedTitles: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    error: {
                        type: string;
                    };
                    retryCount: {
                        type: string;
                        default: number;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'publish-platform': {
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
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    description: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    accounts: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'publish-account': {
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
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    config: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    publishRecords: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    lastPublishedAt: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'publish-record': {
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
                    article: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    account: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    externalId: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    error: {
                        type: string;
                    };
                    retryCount: {
                        type: string;
                        default: number;
                    };
                    publishedAt: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'knowledge-point-index': {
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
                    targetType: {
                        type: string;
                        required: boolean;
                    };
                    targetId: {
                        type: string;
                        required: boolean;
                    };
                    knowledgePoint: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'ad-slot': {
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
                    name: {
                        type: string;
                        required: boolean;
                    };
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    position: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    type: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    targetUrl: {
                        type: string;
                    };
                    productId: {
                        type: string;
                    };
                    imageUrl: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    browserLogs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    statSummaries: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
            };
        };
        'browser-log': {
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
                    eventType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    article: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    adSlot: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    userId: {
                        type: string;
                    };
                    sessionId: {
                        type: string;
                        required: boolean;
                    };
                    isRegistered: {
                        type: string;
                        default: boolean;
                    };
                    registeredAt: {
                        type: string;
                    };
                    userAgent: {
                        type: string;
                    };
                    platform: {
                        type: string;
                    };
                    browser: {
                        type: string;
                    };
                    browserVersion: {
                        type: string;
                    };
                    os: {
                        type: string;
                    };
                    osVersion: {
                        type: string;
                    };
                    deviceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    screenWidth: {
                        type: string;
                    };
                    screenHeight: {
                        type: string;
                    };
                    language: {
                        type: string;
                    };
                    ip: {
                        type: string;
                    };
                    country: {
                        type: string;
                    };
                    city: {
                        type: string;
                    };
                    referrer: {
                        type: string;
                    };
                    referrerDomain: {
                        type: string;
                    };
                    readDuration: {
                        type: string;
                        default: number;
                    };
                    scrollDepth: {
                        type: string;
                        default: number;
                    };
                    timestamp: {
                        type: string;
                        required: boolean;
                    };
                    createdAt: {
                        type: string;
                    };
                };
            };
        };
        'stat-summary': {
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
                    date: {
                        type: string;
                        required: boolean;
                    };
                    article: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    adSlot: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    summaryType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    pv: {
                        type: string;
                        default: number;
                    };
                    uv: {
                        type: string;
                        default: number;
                    };
                    clickCount: {
                        type: string;
                        default: number;
                    };
                    clickRate: {
                        type: string;
                        default: number;
                    };
                    avgReadDuration: {
                        type: string;
                        default: number;
                    };
                    avgScrollDepth: {
                        type: string;
                        default: number;
                    };
                    deviceStats: {
                        type: string;
                    };
                    regionStats: {
                        type: string;
                    };
                    referrerStats: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map
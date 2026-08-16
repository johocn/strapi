declare const _default: {
    register: ({ strapi }: {
        strapi: any;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: any;
    }) => Promise<void>;
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
            findOne(ctx: any): Promise<void>;
        };
        draft: ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
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
            findOne(ctx: any): Promise<void>;
            findOnePlatform(ctx: any): Promise<void>;
            findOneAccount(ctx: any): Promise<void>;
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
            findOneAdSlot(ctx: any): Promise<void>;
        };
        'knowledge-index': ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        'browser-log': ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
        };
        'stat-summary': ({ strapi }: {
            strapi: any;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
        };
        'sync-event-api': {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            resolve(ctx: any): Promise<void>;
            createFromWebhook(ctx: any): Promise<void>;
        };
        'promo-channel': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        'promo-campaign': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        'ab-test': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            start(ctx: any): Promise<void>;
            stop(ctx: any): Promise<void>;
            report(ctx: any): Promise<void>;
            pickVariant(ctx: any): Promise<void>;
        };
        'channel-report': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getChannelReport(ctx: any): Promise<void>;
        };
        ad: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getZoneByPosition(ctx: any): Promise<void>;
            getAllZones(ctx: any): Promise<void>;
            listZones(ctx: any): Promise<void>;
            createZone(ctx: any): Promise<void>;
            findOneZone(ctx: any): Promise<void>;
            updateZone(ctx: any): Promise<void>;
            deleteZone(ctx: any): Promise<void>;
            listContents(ctx: any): Promise<void>;
            createContent(ctx: any): Promise<void>;
            findOneContent(ctx: any): Promise<void>;
            updateContent(ctx: any): Promise<void>;
            deleteContent(ctx: any): Promise<void>;
        };
        poster: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getTemplate(ctx: any): Promise<void>;
            resolveTemplate(ctx: any): Promise<void>;
            seedTemplates(ctx: any): Promise<void>;
            listTemplates(ctx: any): Promise<void>;
            createTemplate(ctx: any): Promise<void>;
            findOneTemplate(ctx: any): Promise<void>;
            updateTemplate(ctx: any): Promise<void>;
            deleteTemplate(ctx: any): Promise<void>;
            cloneTemplate(ctx: any): Promise<void>;
            batchSaveElements(ctx: any): Promise<void>;
            listElements(ctx: any): Promise<void>;
            createElement(ctx: any): Promise<void>;
            updateElement(ctx: any): Promise<void>;
            deleteElement(ctx: any): Promise<void>;
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
        'sync-event': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(siteId: number, query?: any): Promise<any[]>;
            findOne(siteId: number, documentId: string): Promise<any>;
            resolve(siteId: number, documentId: string, body: any): Promise<any>;
            createFromWebhook(payload: any): Promise<any>;
        };
        'promo-channel': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listChannels(opts: {
                page: number;
                pageSize: number;
                scene?: string;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getChannel(id: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createChannel(data: {
                name: string;
                code: string;
                description?: string;
                scene?: string;
                budget?: number;
                actualCost?: number;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateChannel(id: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteChannel(id: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            addPlatformConfig(channelId: string, data: {
                platform: string;
                promoPid?: string;
                promoLink?: string;
                isActive?: boolean;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updatePlatformConfig(configId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            removePlatformConfig(configId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
        'promo-campaign': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listCampaigns(opts: {
                page: number;
                pageSize: number;
                channelId?: string;
                status?: boolean;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getCampaign(id: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createCampaign(data: {
                name: string;
                code: string;
                channel: string;
                description?: string;
                startAt: string;
                endAt: string;
                status?: boolean;
                budget?: number;
                actualCost?: number;
            }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateCampaign(id: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteCampaign(id: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
        'ab-test': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listExperiments: (opts: {
                page: number;
                pageSize: number;
                channelId?: string;
                campaignId?: string;
                status?: string;
            }) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createExperiment: (data: any) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            startExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            stopExperiment: (id: string) => Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            pickVariant: (opts: {
                channelId?: string;
                campaignId?: string;
            }) => Promise<any | null>;
            getExperimentReport: (experimentId: string, opts: {
                startDate: string;
                endDate: string;
            }) => Promise<{
                experiment: {
                    documentId: string;
                    name: any;
                    status: any;
                };
                variants: any;
            }>;
        };
        'channel-report': ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getChannelReport(opts: {
                channelCode: string;
                startDate: string;
                endDate: string;
                groupBy?: "day" | "campaign" | "variant";
            }): Promise<any>;
            _resetCache(): void;
        };
        ad: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getZoneByPosition(position: string, siteDomain?: string, siteDocumentId?: string): Promise<{
                zone: null;
                contents: never[];
            } | {
                zone: import('@strapi/types/dist/modules/documents').AnyDocument;
                contents: any;
            }>;
            getAllZones(siteDomain?: string, siteDocumentId?: string): Promise<any[]>;
            listZones(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createZone(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            findOneZone(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            updateZone(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteZone(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            listContents(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createContent(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            findOneContent(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            updateContent(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteContent(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
        };
        poster: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getTemplate(code: string): Promise<any>;
            resolveTemplate(code: string, variables: Record<string, any>): Promise<{
                template: {
                    canvasWidth: any;
                    canvasHeight: any;
                    backgroundColor: any;
                    backgroundImage: any;
                    backgroundMode: any;
                };
                elements: any;
            } | null>;
            listTemplates(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createTemplate(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            findOneTemplate(documentId: string): Promise<any>;
            updateTemplate(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteTemplate(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            cloneTemplate(documentId: string): Promise<any>;
            batchSaveElements(templateDocumentId: string, elements: any[]): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            listElements(filters?: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            createElement(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateElement(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
            deleteElement(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            seedDefaultTemplate(): Promise<{
                success: boolean;
                reason: string;
                templates?: undefined;
            } | {
                success: boolean;
                templates: number;
                reason?: undefined;
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
                    websiteArticles: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    syncEvents: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    scope: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    scopeTenantId: {
                        type: string;
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
                    category: {
                        type: string;
                        enum: string[];
                        required: boolean;
                        default: string;
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
                    abVariant: {
                        type: string;
                        relation: string;
                        target: string;
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
                    promoChannelCode: {
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
        'sync-event': {
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
                pluginOptions: {
                    "content-manager": {
                        visible: boolean;
                    };
                    "content-type-builder": {
                        visible: boolean;
                    };
                };
                attributes: {
                    site: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                        inversedBy: string;
                    };
                    sourceType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    sourceContentType: {
                        type: string;
                        required: boolean;
                    };
                    sourceDocumentId: {
                        type: string;
                    };
                    sourceUrl: {
                        type: string;
                    };
                    sourceTitle: {
                        type: string;
                    };
                    targetDraftId: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    eventStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    eventPayload: {
                        type: string;
                    };
                    resolvedAt: {
                        type: string;
                    };
                    resolvedBy: {
                        type: string;
                    };
                };
            };
        };
        'promo-channel': {
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
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    description: {
                        type: string;
                    };
                    scene: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    budget: {
                        type: string;
                    };
                    actualCost: {
                        type: string;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    platformConfigs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    campaigns: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    experiments: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    coupons: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        'channel-platform-config': {
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
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    platform: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    promoPid: {
                        type: string;
                    };
                    promoLink: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                };
            };
        };
        'promo-campaign': {
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
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                    };
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    description: {
                        type: string;
                    };
                    startAt: {
                        type: string;
                        required: boolean;
                    };
                    endAt: {
                        type: string;
                        required: boolean;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    budget: {
                        type: string;
                    };
                    actualCost: {
                        type: string;
                    };
                    experiments: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        'ab-experiment': {
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
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    campaign: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    description: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    startAt: {
                        type: string;
                    };
                    endAt: {
                        type: string;
                    };
                    variants: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        'ab-variant': {
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
                    experiment: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    weight: {
                        type: string;
                        required: boolean;
                        default: number;
                    };
                    article: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    coupon: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    description: {
                        type: string;
                    };
                };
            };
        };
        'ad-zone': {
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
                    site: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    position: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    displayMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    suggestedWidth: {
                        type: string;
                    };
                    suggestedHeight: {
                        type: string;
                    };
                    adSlotCode: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    adContents: {
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
        'ad-content': {
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
                    adZone: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                        required: boolean;
                    };
                    site: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    contentType: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    priority: {
                        type: string;
                        default: number;
                    };
                    startAt: {
                        type: string;
                    };
                    endAt: {
                        type: string;
                    };
                    frequencyLimit: {
                        type: string;
                        default: number;
                    };
                    frequencyPeriod: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    title: {
                        type: string;
                    };
                    titleColor: {
                        type: string;
                        default: string;
                    };
                    titleFontSize: {
                        type: string;
                        default: number;
                    };
                    titleFontWeight: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    titleAlign: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    titleOverflow: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    titleMaxLines: {
                        type: string;
                        default: number;
                    };
                    titleLineHeight: {
                        type: string;
                        default: number;
                    };
                    subtitle: {
                        type: string;
                    };
                    subtitleColor: {
                        type: string;
                        default: string;
                    };
                    subtitleFontSize: {
                        type: string;
                        default: number;
                    };
                    subtitleOverflow: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    subtitleMaxLines: {
                        type: string;
                        default: number;
                    };
                    ctaText: {
                        type: string;
                    };
                    ctaTextColor: {
                        type: string;
                        default: string;
                    };
                    ctaBgColor: {
                        type: string;
                        default: string;
                    };
                    ctaFontSize: {
                        type: string;
                        default: number;
                    };
                    ctaBorderRadius: {
                        type: string;
                        default: number;
                    };
                    ctaPosition: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    badgeText: {
                        type: string;
                    };
                    badgeBgColor: {
                        type: string;
                        default: string;
                    };
                    badgeTextColor: {
                        type: string;
                        default: string;
                    };
                    badgePosition: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    images: {
                        type: string;
                        default: never[];
                    };
                    videoUrl: {
                        type: string;
                    };
                    videoPoster: {
                        type: string;
                    };
                    videoAutoplay: {
                        type: string;
                        default: boolean;
                    };
                    videoMuted: {
                        type: string;
                        default: boolean;
                    };
                    videoLoop: {
                        type: string;
                        default: boolean;
                    };
                    videoControls: {
                        type: string;
                        default: boolean;
                    };
                    htmlContent: {
                        type: string;
                    };
                    linkType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    linkUrl: {
                        type: string;
                    };
                    linkTarget: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    displayStyle: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    width: {
                        type: string;
                    };
                    height: {
                        type: string;
                    };
                    borderRadius: {
                        type: string;
                        default: number;
                    };
                    backgroundColor: {
                        type: string;
                        default: string;
                    };
                    slideshowAutoplay: {
                        type: string;
                        default: boolean;
                    };
                    slideshowInterval: {
                        type: string;
                        default: number;
                    };
                    slideshowEffect: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    slideshowLoop: {
                        type: string;
                        default: boolean;
                    };
                    slideshowShowDots: {
                        type: string;
                        default: boolean;
                    };
                    slideshowShowArrows: {
                        type: string;
                        default: boolean;
                    };
                    slideshowPauseOnHover: {
                        type: string;
                        default: boolean;
                    };
                    closeDelay: {
                        type: string;
                        default: number;
                    };
                    showCountdown: {
                        type: string;
                        default: boolean;
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
        'poster-template': {
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
                    site: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    canvasWidth: {
                        type: string;
                        default: number;
                    };
                    canvasHeight: {
                        type: string;
                        default: number;
                    };
                    backgroundColor: {
                        type: string;
                        default: string;
                    };
                    backgroundImage: {
                        type: string;
                    };
                    backgroundMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    requiredVariables: {
                        type: string;
                        default: string[];
                    };
                    optionalVariables: {
                        type: string;
                        default: string[];
                    };
                    isActive: {
                        type: string;
                        default: boolean;
                    };
                    isDefault: {
                        type: string;
                        default: boolean;
                    };
                    elements: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    thumbnail: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                };
            };
        };
        'poster-element': {
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
                    posterTemplate: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                        required: boolean;
                    };
                    elementType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                        default: string;
                    };
                    elementKey: {
                        type: string;
                        required: boolean;
                    };
                    elementName: {
                        type: string;
                    };
                    sortOrder: {
                        type: string;
                        default: number;
                    };
                    isVariable: {
                        type: string;
                        default: boolean;
                    };
                    variableName: {
                        type: string;
                    };
                    defaultValue: {
                        type: string;
                    };
                    content: {
                        type: string;
                    };
                    x: {
                        type: string;
                        default: number;
                    };
                    y: {
                        type: string;
                        default: number;
                    };
                    width: {
                        type: string;
                        default: number;
                    };
                    height: {
                        type: string;
                        default: number;
                    };
                    zIndex: {
                        type: string;
                        default: number;
                    };
                    rotation: {
                        type: string;
                        default: number;
                    };
                    opacity: {
                        type: string;
                        default: number;
                    };
                    fontSize: {
                        type: string;
                        default: number;
                    };
                    fontColor: {
                        type: string;
                        default: string;
                    };
                    fontWeight: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    fontFamily: {
                        type: string;
                        default: string;
                    };
                    textAlign: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    lineHeight: {
                        type: string;
                        default: number;
                    };
                    letterSpacing: {
                        type: string;
                        default: number;
                    };
                    borderRadius: {
                        type: string;
                        default: number;
                    };
                    borderWidth: {
                        type: string;
                        default: number;
                    };
                    borderColor: {
                        type: string;
                        default: string;
                    };
                    elementBgColor: {
                        type: string;
                    };
                    imageFit: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    qrContentMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    qrBaseUrl: {
                        type: string;
                    };
                    qrInviteParam: {
                        type: string;
                        default: string;
                    };
                    qrInviteSeparator: {
                        type: string;
                        default: string;
                    };
                    qrFallbackMode: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    qrErrorLevel: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    qrSize: {
                        type: string;
                        default: number;
                    };
                    qrColor: {
                        type: string;
                        default: string;
                    };
                    qrBgColor: {
                        type: string;
                        default: string;
                    };
                    shapeType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map
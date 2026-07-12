declare const _default: {
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
        fetchTitles(sourceId: string): Promise<import('../utils/selectors').ScrapedTitle[]>;
        fetchContent(url: string, sourceId: string): Promise<import('../utils/selectors').ScrapedContent>;
    };
    quality: ({ strapi }: {
        strapi: any;
    }) => {
        calculateQuality(content: any): import('./quality').QualityScore;
        isQualityAcceptable(score: import('./quality').QualityScore): boolean;
        getQualityLevel(score: import('./quality').QualityScore): "high" | "medium" | "low";
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
};
export default _default;
//# sourceMappingURL=index.d.ts.map
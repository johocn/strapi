declare const _default: {
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
export default _default;
//# sourceMappingURL=index.d.ts.map
declare const _default: {
    "knowledge-graph": {
        findEntities(ctx: any): Promise<void>;
        createEntity(ctx: any): Promise<void>;
        updateEntity(ctx: any): Promise<void>;
        deleteEntity(ctx: any): Promise<void>;
        findRelations(ctx: any): Promise<void>;
        addRelation(ctx: any): Promise<void>;
        deleteRelation(ctx: any): Promise<void>;
        disambiguate(ctx: any): Promise<void>;
        exportGraph(ctx: any): Promise<void>;
        createGlobalEntity(ctx: any): Promise<void>;
        updateGlobalEntity(ctx: any): Promise<void>;
        deleteGlobalEntity(ctx: any): Promise<void>;
    };
    "first-truth": {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        verify(ctx: any): Promise<void>;
        conflicts(ctx: any): Promise<void>;
        exportFacts(ctx: any): Promise<void>;
        createGlobal(ctx: any): Promise<void>;
        updateGlobal(ctx: any): Promise<void>;
        deleteGlobal(ctx: any): Promise<void>;
        verifyGlobal(ctx: any): Promise<void>;
    };
    "ai-content-summary": {
        findByTarget(ctx: any): Promise<void>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        regenerate(ctx: any): Promise<void>;
    };
    "studio-bridge": {
        publishFromStudio(ctx: any): Promise<void>;
    };
    stats: {
        overview(ctx: any): Promise<void>;
        leadStats(ctx: any): Promise<void>;
        searchStats(ctx: any): Promise<void>;
    };
    article: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
        featured(ctx: any): Promise<void>;
        related(ctx: any): Promise<any>;
    };
    product: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
    };
    case: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
    };
    faq: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
    };
    tutorial: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byDifficulty(ctx: any): Promise<void>;
    };
    compliance: {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<any>;
        byCategory(ctx: any): Promise<void>;
    };
    download: {
        list(ctx: any): Promise<void>;
        download(ctx: any): Promise<any>;
    };
    lead: {
        submit(ctx: any): Promise<{
            success: boolean;
        }>;
        track(ctx: any): Promise<any>;
    };
    "seo-output": {
        sitemap(ctx: any): Promise<void>;
        robots(ctx: any): Promise<void>;
        llmsTxt(ctx: any): Promise<void>;
        manifest(ctx: any): Promise<void>;
    };
    "site-info": {
        info(ctx: any): Promise<void>;
    };
    "article-admin": {
        find(ctx: any): Promise<void>;
        findOne(ctx: any): Promise<any>;
        create(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
        delete(ctx: any): Promise<void>;
        publish(ctx: any): Promise<void>;
        archive(ctx: any): Promise<void>;
        batch(ctx: any): Promise<void>;
    };
    "seo-config-admin": {
        find(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
    };
    "brand-info-admin": {
        find(ctx: any): Promise<void>;
        update(ctx: any): Promise<void>;
    };
};
export default _default;

declare const _default: {
    "seo-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        ensureDefault(siteId: number): Promise<any>;
        find(siteId: number): Promise<any>;
        update(siteId: number, data: any): Promise<any>;
        findPublic(siteId: number): Promise<any>;
    };
    "brand-info": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        ensureDefault(siteId: number): Promise<any>;
        find(siteId: number): Promise<any>;
        update(siteId: number, data: any): Promise<any>;
        findPublic(siteId: number): Promise<any>;
    };
    article: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    "article-category": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number): Promise<any[]>;
        findTree(siteId: number): Promise<any[]>;
        findAdmin(siteId: number): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
    };
    product: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    case: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    compliance: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    faq: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    tutorial: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
    };
    download: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number, query?: any): Promise<any[]>;
        findOne(siteId: number, slug: string): Promise<any>;
        findFeatured(siteId: number, limit?: number): Promise<any[]>;
        search(siteId: number, keyword: string, page?: number, pageSize?: number): Promise<{
            data: any[];
            meta: {
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            };
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        publish(siteId: number, documentId: string): Promise<any>;
        unpublish(siteId: number, documentId: string): Promise<any>;
        archive(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
        incrementViewCount(siteId: number, documentId: string): Promise<void>;
        incrementDownloadCount(siteId: number, documentId: string): Promise<void>;
    };
    lead: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        createPublic(siteId: number, data: any, ctx: any): Promise<any>;
        findMine(siteId: number, userId: number, query?: any): Promise<any[]>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findOneAdmin(siteId: number, documentId: string): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        assign(siteId: number, documentId: string, assignedToId: number): Promise<any>;
        followUp(siteId: number, documentId: string, record: {
            content: string;
            result: string;
        }): Promise<any>;
        stats(siteId: number): Promise<{
            total: number;
            byStatus: any;
            byType: any;
        }>;
        softDelete(siteId: number, documentId: string): Promise<any>;
    };
    "visit-log": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _getWriter(): import('./utils/async-writer').AsyncWriter;
        enqueueCreate(siteId: number, data: any): Promise<void>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        findMine(siteId: number, userId: number, query?: any): Promise<any[]>;
        stats(siteId: number, days?: number): Promise<{
            total: number;
            byType: any;
            days: number;
        }>;
        purgeOlderThan(days: number): Promise<number>;
    };
    interaction: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        toggle(siteId: number, data: {
            type: string;
            targetType: string;
            targetId: string;
            visitorId: string;
            userId?: number;
            ctx?: any;
        }): Promise<{
            action: string;
        }>;
        check(siteId: number, params: {
            type: string;
            targetType: string;
            targetId: string;
            visitorId: string;
        }): Promise<{
            liked: boolean;
        }>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        stats(siteId: number, targetType: string, targetId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
    };
    "search-log": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        _getWriter(): import('./utils/async-writer').AsyncWriter;
        log(siteId: number, keyword: string, resultCount: number, ctx: any): Promise<void>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        stats(siteId: number, days?: number): Promise<{
            total: number;
            topKeywords: [string, number][];
        }>;
    };
    "knowledge-graph": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findEntities(siteId: number, query?: any): Promise<any[]>;
        findEntityBySlug(siteId: number, slug: string): Promise<any>;
        findEntityByRef(params: {
            refTargetType: string;
            refTargetId: string;
        }): Promise<any>;
        upsertEntityFromContent(params: {
            siteId: number;
            entityType: string;
            name: string;
            refTargetType: string;
            refTargetId: string;
        }): Promise<any>;
        createEntity(siteId: number | null, data: any): Promise<any>;
        updateEntity(siteId: number | null, documentId: string, data: any): Promise<any>;
        deleteEntity(siteId: number | null, documentId: string): Promise<any>;
        findRelations(siteId: number, query?: any): Promise<any[]>;
        addRelation(params: {
            siteId: number;
            subjectEntityId: string;
            predicate: string;
            objectEntityId?: string;
            objectValue?: any;
            objectText?: string;
            sourceType?: string;
        }): Promise<any>;
        _detectCycle(subjectId: string, objectId: string, predicate: string, visited?: Set<string>): Promise<boolean>;
        deleteRelation(siteId: number, documentId: string): Promise<any>;
        disambiguate(siteId: number, params: {
            name: string;
            entityType?: string;
        }): Promise<any | null>;
        syncFromContent(targetType: string, content: any): Promise<void>;
        verifyAll(siteId: number): Promise<{
            total: number;
            conflicts: number;
            report: any[];
        }>;
        exportGraph(siteId: number): Promise<any>;
        exportEntity(siteId: number, slug: string): Promise<any | null>;
        _entityToJsonLd(entity: any, outgoing?: any[], incoming?: any[]): any;
        exportFacts(siteId: number): Promise<any[]>;
    };
    "ai-content-summary": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findByTarget(siteId: number, targetType: string, targetId: string, summaryType?: string): Promise<any[]>;
        findPublic(siteId: number, query?: any): Promise<any[]>;
        findAdmin(siteId: number, query?: any): Promise<any[]>;
        create(siteId: number, data: any): Promise<any>;
        update(siteId: number, documentId: string, data: any): Promise<any>;
        regenerate(siteId: number, documentId: string): Promise<any>;
        softDelete(siteId: number, documentId: string): Promise<any>;
    };
    "first-truth": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        find(siteId: number | null, query?: any): Promise<any[]>;
        findOne(siteId: number | null, documentId: string): Promise<any>;
        findByClaimKey(siteId: number | null, claimKey: string): Promise<any>;
        create(siteId: number | null, data: any): Promise<any>;
        update(siteId: number | null, documentId: string, data: any): Promise<any>;
        _markRelatedEntitiesPending(siteId: number | null, canonicalEntity: any): Promise<void>;
        verify(siteId: number | null, documentId: string): Promise<any>;
        softDelete(siteId: number | null, documentId: string): Promise<any>;
        detectConflicts(siteId: number | null): Promise<any[]>;
    };
    "schema-builder": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        buildOrganization(brandInfo: any, seoConfig: any): any;
        buildArticle(article: any, brandInfo: any): any;
        buildProduct(product: any, brandInfo: any): any;
        buildHowTo(tutorial: any): any;
        buildFAQ(faqs: any[]): any;
        buildBreadcrumb(items: Array<{
            name: string;
            url: string;
        }>): any;
        buildWebSite(seoConfig: any, siteUrl: string): any;
    };
    "llms-txt": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generate(siteId: number): Promise<string>;
    };
    sitemap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generate(siteId: number, siteUrl: string): Promise<string>;
        _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string): string;
    };
    robots: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generate(siteId: number, siteUrl: string): Promise<string>;
    };
    "search-engine-push": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        pushToBaidu(siteId: number, urls: string[]): Promise<any>;
        pushToBing(siteId: number, urls: string[]): Promise<any>;
        pushAll(siteId: number, urls: string[]): Promise<{
            baidu: PromiseSettledResult<any>;
            bing: PromiseSettledResult<any>;
        }>;
    };
    "studio-bridge": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        publishFromStudio(siteId: number, params: {
            articleDraftDocumentId: string;
            overrides?: any;
        }): Promise<any>;
    };
};
export default _default;

declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {};
    };
    controllers: {
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
            _getWriter(): import('./services/utils/async-writer').AsyncWriter;
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
            _getWriter(): import('./services/utils/async-writer').AsyncWriter;
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
    contentTypes: {
        "seo-config": {
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
                    defaultTitle: {
                        type: string;
                        maxLength: number;
                    };
                    titleTemplate: {
                        type: string;
                        maxLength: number;
                    };
                    defaultDescription: {
                        type: string;
                        maxLength: number;
                    };
                    defaultKeywords: {
                        type: string;
                        maxLength: number;
                    };
                    ogImage: {
                        type: string;
                    };
                    favicon: {
                        type: string;
                    };
                    googleSiteVerification: {
                        type: string;
                        maxLength: number;
                    };
                    baiduSiteVerification: {
                        type: string;
                        maxLength: number;
                    };
                    bingSiteVerification: {
                        type: string;
                        maxLength: number;
                    };
                    baiduAnalyticsId: {
                        type: string;
                        maxLength: number;
                    };
                    googleAnalyticsId: {
                        type: string;
                        maxLength: number;
                    };
                    customHeadCode: {
                        type: string;
                    };
                    customBodyCode: {
                        type: string;
                    };
                    enableSitemap: {
                        type: string;
                        default: boolean;
                    };
                    sitemapExcludeTypes: {
                        type: string;
                    };
                    enableRobotsTxt: {
                        type: string;
                        default: boolean;
                    };
                    robotsContent: {
                        type: string;
                    };
                    aiCrawlerPolicy: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    geoRegion: {
                        type: string;
                        maxLength: number;
                    };
                    geoPlacename: {
                        type: string;
                        maxLength: number;
                    };
                    geoPosition: {
                        type: string;
                        maxLength: number;
                    };
                    geoICBM: {
                        type: string;
                        maxLength: number;
                    };
                    defaultLocale: {
                        type: string;
                        maxLength: number;
                        default: string;
                    };
                    alternateLocales: {
                        type: string;
                    };
                    hreflangStrategy: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    organizationName: {
                        type: string;
                        maxLength: number;
                    };
                    organizationLogo: {
                        type: string;
                    };
                    organizationType: {
                        type: string;
                        maxLength: number;
                    };
                    schemaSameAs: {
                        type: string;
                    };
                    schemaContactPoint: {
                        type: string;
                    };
                    icpNumber: {
                        type: string;
                        maxLength: number;
                    };
                    publicSecurityRecord: {
                        type: string;
                        maxLength: number;
                    };
                    extraConfig: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "brand-info": {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    companyName: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    shortName: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    slogan: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    logo: {
                        type: string;
                    };
                    logoDark: {
                        type: string;
                    };
                    favicon: {
                        type: string;
                    };
                    description: {
                        type: string;
                        localized: boolean;
                    };
                    foundingDate: {
                        type: string;
                    };
                    registeredAddress: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    officeAddress: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    contactPhone: {
                        type: string;
                        maxLength: number;
                    };
                    contactEmail: {
                        type: string;
                    };
                    serviceHotline: {
                        type: string;
                        maxLength: number;
                    };
                    businessHours: {
                        type: string;
                        maxLength: number;
                    };
                    wechatQrCode: {
                        type: string;
                    };
                    wechatPublicAccount: {
                        type: string;
                        maxLength: number;
                    };
                    miniProgramName: {
                        type: string;
                        maxLength: number;
                    };
                    socialLinks: {
                        type: string;
                    };
                    offices: {
                        type: string;
                        localized: boolean;
                    };
                    certificates: {
                        type: string;
                        localized: boolean;
                    };
                    legalRepresentative: {
                        type: string;
                        maxLength: number;
                    };
                    registeredCapital: {
                        type: string;
                        maxLength: number;
                    };
                    unifiedSocialCreditCode: {
                        type: string;
                        maxLength: number;
                    };
                    businessScope: {
                        type: string;
                        localized: boolean;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        article: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    title: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    excerpt: {
                        type: string;
                        localized: boolean;
                    };
                    content: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    coverImage: {
                        type: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    author: {
                        type: string;
                        maxLength: number;
                    };
                    authorTitle: {
                        type: string;
                        maxLength: number;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    isPinned: {
                        type: string;
                        default: boolean;
                    };
                    viewCount: {
                        type: string;
                        default: number;
                    };
                    likeCount: {
                        type: string;
                        default: number;
                    };
                    collectCount: {
                        type: string;
                        default: number;
                    };
                    shareCount: {
                        type: string;
                        default: number;
                    };
                    readingTime: {
                        type: string;
                    };
                    wordCount: {
                        type: string;
                    };
                    seoTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoDescription: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoKeywords: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    canonicalUrl: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    ogTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    ogDescription: {
                        type: string;
                        localized: boolean;
                    };
                    ogImage: {
                        type: string;
                    };
                    ogType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    twitterCard: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    schemaType: {
                        type: string;
                        maxLength: number;
                    };
                    schemaJson: {
                        type: string;
                        localized: boolean;
                    };
                    allowIndex: {
                        type: string;
                        default: boolean;
                    };
                    noFollow: {
                        type: string;
                        default: boolean;
                    };
                    sitemapPriority: {
                        type: string;
                        default: number;
                    };
                    sitemapFrequency: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    sourceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    sourceUrl: {
                        type: string;
                    };
                    sourceArticleDraft: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mentionedEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    structuredData: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "article-category": {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    name: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    description: {
                        type: string;
                        localized: boolean;
                    };
                    parent: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    children: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    articles: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    tutorials: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    faqs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    downloads: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    products: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    order: {
                        type: string;
                        default: number;
                    };
                    seoTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoDescription: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        product: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    name: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    tagline: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    description: {
                        type: string;
                        localized: boolean;
                    };
                    content: {
                        type: string;
                        localized: boolean;
                    };
                    coverImage: {
                        type: string;
                    };
                    images: {
                        type: string;
                        multiple: boolean;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    features: {
                        type: string;
                        localized: boolean;
                    };
                    specifications: {
                        type: string;
                        localized: boolean;
                    };
                    scenarios: {
                        type: string;
                    };
                    priceRange: {
                        type: string;
                        maxLength: number;
                    };
                    priceUnit: {
                        type: string;
                        maxLength: number;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    viewCount: {
                        type: string;
                        default: number;
                    };
                    seoTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoDescription: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoKeywords: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    canonicalUrl: {
                        type: string;
                        maxLength: number;
                    };
                    ogImage: {
                        type: string;
                    };
                    allowIndex: {
                        type: string;
                        default: boolean;
                    };
                    sitemapPriority: {
                        type: string;
                        default: number;
                    };
                    sitemapFrequency: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mentionedEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    cases: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    structuredData: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        case: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    title: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    clientName: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    clientLogo: {
                        type: string;
                    };
                    clientIndustry: {
                        type: string;
                        maxLength: number;
                    };
                    clientDescription: {
                        type: string;
                        localized: boolean;
                    };
                    challenge: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    solution: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    results: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    testimonial: {
                        type: string;
                        localized: boolean;
                    };
                    testimonialAuthor: {
                        type: string;
                        maxLength: number;
                    };
                    testimonialTitle: {
                        type: string;
                        maxLength: number;
                    };
                    coverImage: {
                        type: string;
                    };
                    images: {
                        type: string;
                        multiple: boolean;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    relatedProducts: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    viewCount: {
                        type: string;
                        default: number;
                    };
                    seoTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoDescription: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    allowIndex: {
                        type: string;
                        default: boolean;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mentionedEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    structuredData: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        compliance: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    title: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    category: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    content: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    effectiveDate: {
                        type: string;
                    };
                    expiryDate: {
                        type: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    isPinned: {
                        type: string;
                        default: boolean;
                    };
                    seoTitle: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    seoDescription: {
                        type: string;
                        maxLength: number;
                        localized: boolean;
                    };
                    allowIndex: {
                        type: string;
                        default: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        faq: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    question: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    answer: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    order: {
                        type: string;
                        default: number;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    viewCount: {
                        type: string;
                        default: number;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mentionedEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        tutorial: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    title: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                        localized: boolean;
                    };
                    description: {
                        type: string;
                        localized: boolean;
                    };
                    coverImage: {
                        type: string;
                    };
                    steps: {
                        type: string;
                        required: boolean;
                        localized: boolean;
                    };
                    materials: {
                        type: string;
                    };
                    estimatedTime: {
                        type: string;
                        maxLength: number;
                    };
                    difficulty: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    result: {
                        type: string;
                        localized: boolean;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    order: {
                        type: string;
                        default: number;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    viewCount: {
                        type: string;
                        default: number;
                    };
                    mainEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    mentionedEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    structuredData: {
                        type: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        download: {
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
                    i18n: {
                        localized: boolean;
                    };
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
                    name: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                        localized: boolean;
                    };
                    description: {
                        type: string;
                        localized: boolean;
                    };
                    file: {
                        type: string;
                        required: boolean;
                    };
                    fileType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    fileSize: {
                        type: string;
                    };
                    category: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    relatedContentType: {
                        type: string;
                        maxLength: number;
                    };
                    relatedContentId: {
                        type: string;
                    };
                    requireLead: {
                        type: string;
                        default: boolean;
                    };
                    downloadCount: {
                        type: string;
                        default: number;
                    };
                    isFeatured: {
                        type: string;
                        default: boolean;
                    };
                    order: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    publishedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        lead: {
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
                    type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    contactName: {
                        type: string;
                        maxLength: number;
                    };
                    contactPhone: {
                        type: string;
                        maxLength: number;
                    };
                    contactEmail: {
                        type: string;
                    };
                    contactCompany: {
                        type: string;
                        maxLength: number;
                    };
                    contactTitle: {
                        type: string;
                        maxLength: number;
                    };
                    message: {
                        type: string;
                    };
                    sourceType: {
                        type: string;
                        maxLength: number;
                    };
                    sourceId: {
                        type: string;
                    };
                    referralCode: {
                        type: string;
                        maxLength: number;
                    };
                    sourceUrl: {
                        type: string;
                        maxLength: number;
                    };
                    downloadFileId: {
                        type: string;
                    };
                    utmSource: {
                        type: string;
                        maxLength: number;
                    };
                    utmMedium: {
                        type: string;
                        maxLength: number;
                    };
                    utmCampaign: {
                        type: string;
                        maxLength: number;
                    };
                    utmContent: {
                        type: string;
                        maxLength: number;
                    };
                    utmTerm: {
                        type: string;
                        maxLength: number;
                    };
                    referrer: {
                        type: string;
                        maxLength: number;
                    };
                    userAgent: {
                        type: string;
                        maxLength: number;
                    };
                    ipAddress: {
                        type: string;
                        maxLength: number;
                    };
                    assignedTo: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    status: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    followUpRecords: {
                        type: string;
                    };
                    remark: {
                        type: string;
                    };
                    convertedAt: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "visit-log": {
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
                    type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    pageUrl: {
                        type: string;
                        maxLength: number;
                    };
                    pageTitle: {
                        type: string;
                        maxLength: number;
                    };
                    targetType: {
                        type: string;
                        maxLength: number;
                    };
                    targetId: {
                        type: string;
                    };
                    referrer: {
                        type: string;
                        maxLength: number;
                    };
                    referrerDomain: {
                        type: string;
                        maxLength: number;
                    };
                    searchKeyword: {
                        type: string;
                        maxLength: number;
                    };
                    utmSource: {
                        type: string;
                        maxLength: number;
                    };
                    utmMedium: {
                        type: string;
                        maxLength: number;
                    };
                    utmCampaign: {
                        type: string;
                        maxLength: number;
                    };
                    userAgent: {
                        type: string;
                        maxLength: number;
                    };
                    deviceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    browser: {
                        type: string;
                        maxLength: number;
                    };
                    os: {
                        type: string;
                        maxLength: number;
                    };
                    ipAddress: {
                        type: string;
                        maxLength: number;
                    };
                    country: {
                        type: string;
                        maxLength: number;
                    };
                    region: {
                        type: string;
                        maxLength: number;
                    };
                    city: {
                        type: string;
                        maxLength: number;
                    };
                    sessionId: {
                        type: string;
                        maxLength: number;
                    };
                    visitorId: {
                        type: string;
                        maxLength: number;
                    };
                    userId: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    dwellTime: {
                        type: string;
                    };
                    scrollDepth: {
                        type: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        interaction: {
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
                    type: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    targetType: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    targetId: {
                        type: string;
                        required: boolean;
                    };
                    visitorId: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    userId: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    ipAddress: {
                        type: string;
                        maxLength: number;
                    };
                    userAgent: {
                        type: string;
                        maxLength: number;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "search-log": {
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
                    keyword: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    resultCount: {
                        type: string;
                        default: number;
                    };
                    visitorId: {
                        type: string;
                        maxLength: number;
                    };
                    ipAddress: {
                        type: string;
                        maxLength: number;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "knowledge-entity": {
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
                    entityType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    name: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    slug: {
                        type: string;
                        targetField: string;
                        required: boolean;
                    };
                    identifier: {
                        type: string;
                        maxLength: number;
                    };
                    description: {
                        type: string;
                    };
                    sameAs: {
                        type: string;
                    };
                    image: {
                        type: string;
                    };
                    url: {
                        type: string;
                        maxLength: number;
                    };
                    properties: {
                        type: string;
                    };
                    refTargetType: {
                        type: string;
                        maxLength: number;
                    };
                    refTargetId: {
                        type: string;
                    };
                    confidence: {
                        type: string;
                        default: number;
                    };
                    sourceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    lastVerifiedAt: {
                        type: string;
                    };
                    verificationStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    verifiedBy: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    brandInfos: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    subjectRelations: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    objectRelations: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    faqMainEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    faqMentions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    tutorialMainEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    tutorialMentions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    articleMainEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    articleMentions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    firstTruthPolicies: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    productMainEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    productMentions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    caseMainEntities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    caseMentions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "knowledge-relation": {
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
                    subjectEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                        inversedBy: string;
                    };
                    predicate: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    objectEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    objectValue: {
                        type: string;
                    };
                    objectText: {
                        type: string;
                    };
                    sourceUrl: {
                        type: string;
                        maxLength: number;
                    };
                    sourceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    confidence: {
                        type: string;
                        default: number;
                    };
                    lastVerifiedAt: {
                        type: string;
                    };
                    verificationStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "ai-content-summary": {
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
                    targetType: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    targetId: {
                        type: string;
                        required: boolean;
                    };
                    summaryType: {
                        type: string;
                        enum: string[];
                        required: boolean;
                    };
                    content: {
                        type: string;
                        required: boolean;
                    };
                    contentText: {
                        type: string;
                    };
                    language: {
                        type: string;
                        maxLength: number;
                        default: string;
                    };
                    version: {
                        type: string;
                        default: number;
                    };
                    generatedBy: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    aiProvider: {
                        type: string;
                        maxLength: number;
                    };
                    aiModel: {
                        type: string;
                        maxLength: number;
                    };
                    generatedAt: {
                        type: string;
                    };
                    verifiedAt: {
                        type: string;
                    };
                    verificationStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
        "first-truth-policy": {
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
                    claim: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    claimKey: {
                        type: string;
                        maxLength: number;
                        required: boolean;
                    };
                    claimCategory: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    canonicalEntity: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    canonicalValue: {
                        type: string;
                        required: boolean;
                    };
                    canonicalValueType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    canonicalSourceUrl: {
                        type: string;
                        maxLength: number;
                    };
                    canonicalSourceType: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    conflictResolution: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    lastVerifiedAt: {
                        type: string;
                        required: boolean;
                    };
                    verificationStatus: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    conflictDetails: {
                        type: string;
                    };
                    priority: {
                        type: string;
                        default: number;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    deletedAt: {
                        type: string;
                        default: any;
                    };
                };
            };
        };
    };
    policies: {
        "has-website-permission": (config: {
            action?: string;
        }) => (ctx: any, next: any) => Promise<any>;
    };
};
export default _default;

declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    config: {
        default: {};
        validator(): void;
    };
    services: {
        logger: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/logger').Logger;
        "error-handler": ({ strapi: _strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/error-handler').ErrorHandler;
        "config-manager": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/config-manager').ConfigManager;
        i18n: ({ strapi: _strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/i18n').I18n;
        "soft-delete": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            softDelete(contentType: string, documentId: string): Promise<any>;
            restore(contentType: string, documentId: string): Promise<any>;
            findDeleted(contentType: string, options?: {
                filters?: Record<string, any>;
                pagination?: any;
                sort?: any;
            }): Promise<any[] | {
                results: any[];
                pagination: {
                    total: number;
                    page: number;
                    pageSize: any;
                    pageCount: number;
                };
            }>;
        };
        "site-config": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getConfig(siteId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | {
                siteName: string;
                siteDescription: string;
                seoKeywords: string;
                seoDescription: string;
                tencentMapKey: string;
                shareTitle: string;
                shareDescription: string;
                customerServiceUrl: string;
                icpNumber: string;
                domain: string;
                extraConfig: any;
            }>;
            getConfigByDomain(domain: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            _validateDomainUnique(domain: string | null | undefined, excludeDocumentId?: string): Promise<void>;
            updateConfig(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createConfig(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            deleteConfig(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            getPublicConfig(siteId?: string): Promise<any>;
            getAvailableChannels(siteId?: string, userId?: string | number): Promise<any[]>;
        };
        "site-template": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            listTemplates(filters?: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getTemplate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createTemplate(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateTemplate(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            deleteTemplate(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            getDefaultTemplate(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            applyTemplateToSite(templateDocumentId: string, siteDocumentId: string, mode?: "overwrite" | "merge"): Promise<{
                success: boolean;
                templateName: any;
                mode: "overwrite" | "merge";
            }>;
            getMergedConfig(siteConfig: any): Promise<{
                config: {
                    [x: string]: any;
                };
                meta: {
                    templateId: any;
                    templateName: any;
                    fieldConstraints: Record<string, any>;
                    presetKeys: string[];
                };
            }>;
            validateUpdate(siteId: string, updateData: Record<string, any>): Promise<{
                valid: boolean;
                deniedFields?: undefined;
                message?: undefined;
            } | {
                valid: boolean;
                deniedFields: string[];
                message: string;
            }>;
            _clearDefaultFlag(excludeDocumentId?: string): Promise<void>;
        };
        config: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getSiteConfig(siteId?: string): Promise<any>;
            getSiteConfigList(params?: any): Promise<{
                results: import('@strapi/types/dist/modules/documents').AnyDocument[];
                pagination: {
                    page: any;
                    pageSize: any;
                    total: number;
                };
            }>;
            updateSiteConfig(data: any, siteId?: string): Promise<any>;
            getThirdPartyConfigs(filters?: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getThirdPartyConfig(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createThirdPartyConfig(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateThirdPartyConfig(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            deleteThirdPartyConfig(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            getPointsConfig(): Promise<any>;
            updatePointsConfig(data: any): Promise<any>;
            getOssConfig(): Promise<{
                activeProviders: any;
                primaryProvider: any;
                providerTypes: any;
            }>;
            updateOssConfig(data: any): Promise<never>;
            getSsoApps(filters?: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
            getSsoApp(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            createSsoApp(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            updateSsoApp(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
            deleteSsoApp(documentId: string): Promise<{
                documentId: import('@strapi/types/dist/modules/documents').ID;
                entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
            }>;
            getPublicConfig(siteId?: string, channelId?: string | number): Promise<Record<string, any>>;
        };
        "migration-runner": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            ensureMigrationTable(): Promise<void>;
            getExecutedMigrations(plugin: string): Promise<string[]>;
            getMigrationFiles(plugin: string): Promise<Array<{
                version: string;
                name: string;
                filePath: string;
            }>>;
            runMigration(plugin: string, version: string, name: string, filePath: string, direction?: "up" | "down"): Promise<void>;
            runAllMigrations(): Promise<void>;
            rollback(plugin: string, version: string): Promise<void>;
        };
    };
    contentTypes: {
        "site-config": {
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
                attributes: {
                    siteName: {
                        type: string;
                        maxLength: number;
                    };
                    siteDescription: {
                        type: string;
                    };
                    logo: {
                        type: string;
                        multiple: boolean;
                        required: boolean;
                        allowedTypes: string[];
                    };
                    favicon: {
                        type: string;
                        multiple: boolean;
                        required: boolean;
                        allowedTypes: string[];
                    };
                    icpNumber: {
                        type: string;
                        maxLength: number;
                    };
                    seoKeywords: {
                        type: string;
                        maxLength: number;
                    };
                    seoDescription: {
                        type: string;
                    };
                    tencentMapKey: {
                        type: string;
                        maxLength: number;
                    };
                    shareTitle: {
                        type: string;
                        maxLength: number;
                    };
                    shareDescription: {
                        type: string;
                        maxLength: number;
                    };
                    shareImage: {
                        type: string;
                        multiple: boolean;
                        required: boolean;
                        allowedTypes: string[];
                    };
                    customerServiceUrl: {
                        type: string;
                        maxLength: number;
                    };
                    domain: {
                        type: string;
                        maxLength: number;
                        unique: boolean;
                    };
                    channels: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    featureFlags: {
                        type: string;
                        default: {
                            sso: boolean;
                            points: boolean;
                            quiz: boolean;
                            course: boolean;
                            channel: boolean;
                            thirdParty: boolean;
                            oss: boolean;
                            website: boolean;
                            logistics: boolean;
                            studio: boolean;
                        };
                    };
                    template: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    extraConfig: {
                        type: string;
                    };
                    themeConfig: {
                        type: string;
                        default: string;
                    };
                    channelUsage: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    tags: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    tagGroups: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_seo_config: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_brand_info: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_articles: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_article_categories: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_cases: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_faqs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_tutorials: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_compliances: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_downloads: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_ai_summaries: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_first_truths: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_knowledge_entities: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_knowledge_relations: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_leads: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_interactions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_search_logs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_visit_logs: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_products: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_tracking_providers: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_tracking_shipments: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_tracking_nodes: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_subscriptions: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_quote_requests: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_quote_price_rules: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_quote_price_formulas: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_quote_field_rules: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_customer_profiles: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_conversion_events: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_conversion_funnels: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_contact_matrices: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_landing_pages: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_intent_orders: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_referrals: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    logistics_reviews: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    studio_sync_events: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    website_brand_voices: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                };
            };
        };
        "site-template": {
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
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    displayName: {
                        type: string;
                        maxLength: number;
                    };
                    description: {
                        type: string;
                    };
                    presetConfig: {
                        type: string;
                        required: boolean;
                    };
                    fieldConstraints: {
                        type: string;
                        required: boolean;
                    };
                    enabled: {
                        type: string;
                        default: boolean;
                    };
                    isDefault: {
                        type: string;
                        default: boolean;
                    };
                    sites: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    themeConfig: {
                        type: string;
                        default: string;
                    };
                };
            };
        };
    };
    controllers: {
        config: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getSiteList(ctx: any): Promise<void>;
            getSite(ctx: any): Promise<void>;
            getSiteOne(ctx: any): Promise<void>;
            createSite(ctx: any): Promise<void>;
            updateSite(ctx: any): Promise<void>;
            updateSiteById(ctx: any): Promise<void>;
            deleteSite(ctx: any): Promise<void>;
            getThird(ctx: any): Promise<void>;
            getThirdOne(ctx: any): Promise<void>;
            createThird(ctx: any): Promise<void>;
            updateThird(ctx: any): Promise<void>;
            deleteThird(ctx: any): Promise<void>;
            getPoints(ctx: any): Promise<void>;
            updatePoints(ctx: any): Promise<void>;
            getOss(ctx: any): Promise<void>;
            updateOss(ctx: any): Promise<void>;
            getSso(ctx: any): Promise<void>;
            getSsoOne(ctx: any): Promise<void>;
            createSso(ctx: any): Promise<void>;
            updateSso(ctx: any): Promise<void>;
            deleteSso(ctx: any): Promise<void>;
            getPublic(ctx: any): Promise<void>;
            getAvailableChannels(ctx: any): Promise<void>;
        };
        "soft-delete": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            softDelete(ctx: any): Promise<void>;
            restore(ctx: any): Promise<void>;
            findDeleted(ctx: any): Promise<void>;
        };
        "site-config": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            get(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            getPublic(ctx: any): Promise<void>;
        };
        "site-template": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            get(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
            applyToSite(ctx: any): Promise<void>;
        };
    };
    policies: {
        "has-tenant-access-loose": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "has-tenant-access-strict": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "resolve-channel-scope": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    routes: {
        admin: {
            type: "admin";
            routes: any[];
        };
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
    };
};
export default _default;

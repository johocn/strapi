declare const _default: {
    logger: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./logger').Logger;
    "error-handler": ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./error-handler').ErrorHandler;
    "config-manager": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./config-manager').ConfigManager;
    i18n: ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./i18n').I18n;
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
    "global-config": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getGlobalConfig(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | {
            moduleEnabled: {};
            moduleTenantGrants: {};
            moduleVisibility: {};
        }>;
        updateGlobalConfig(data: {
            moduleEnabled?: Record<string, boolean>;
            moduleTenantGrants?: Record<string, string[]>;
            moduleVisibility?: Record<string, string[]>;
        }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    };
};
export default _default;

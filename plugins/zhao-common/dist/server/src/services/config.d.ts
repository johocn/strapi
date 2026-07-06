import { Core } from '@strapi/strapi';
/**
 * 统一配置服务
 * 代理调用各插件的配置接口，提供统一的配置管理入口
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;

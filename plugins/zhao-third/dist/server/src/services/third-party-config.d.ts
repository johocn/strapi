import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findConfig(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findConfigs(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createConfig(data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateConfig(documentId: string, data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteConfig(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    findByPlatformAndAppType(platform: string, appType: string, siteId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | {
        id: any;
        documentId: any;
        name: any;
        platform: any;
        appType: any;
        appId: any;
        appSecret: any;
        enabled: any;
    } | null>;
};
export default _default;
//# sourceMappingURL=third-party-config.d.ts.map
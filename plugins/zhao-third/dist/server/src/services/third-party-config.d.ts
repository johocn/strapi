import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findConfig(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findConfigs(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    /**
     * 按站点 documentId 查询所有关联的三方配置（用 knex 避免 Strapi v5 Document Service manyToOne 过滤不稳定）
     * 返回全字段（含 token/encodingAESKey/merchantId），供管理后台 list 接口使用
     */
    findConfigsBySite(siteDocumentId: string): Promise<{
        id: any;
        documentId: any;
        name: any;
        platform: any;
        appType: any;
        appId: any;
        appSecret: any;
        token: any;
        encodingAESKey: any;
        merchantId: any;
        enabled: any;
    }[]>;
    /**
     * 重复性校验：同一站点下不允许存在相同 platform+appType 的配置
     * @param excludeDocumentId 更新时排除当前记录的 documentId
     * @returns 已存在的冲突记录，null 表示无冲突
     */
    checkDuplicate(platform: string, appType: string, siteDocumentId: string, excludeDocumentId?: string): Promise<any>;
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
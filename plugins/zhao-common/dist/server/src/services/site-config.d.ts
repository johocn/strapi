import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取站点配置，支持按 documentId 查询
     * 多租户安全：siteId 为空时不兜底，返回空配置，避免泄露其他租户数据
     */
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
    /**
     * 按 domain 查询站点配置
     */
    getConfigByDomain(domain: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 校验 domain 唯一性（非空时检查重复）
     */
    _validateDomainUnique(domain: string | null | undefined, excludeDocumentId?: string): Promise<void>;
    /**
     * 更新站点配置
     */
    updateConfig(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 创建站点配置
     */
    createConfig(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    deleteConfig(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    /**
     * 获取公开配置（不含敏感字段）
     * @deprecated 使用 config 服务的 getPublicConfig（支持模板合并）
     */
    getPublicConfig(siteId?: string): Promise<any>;
    /**
     * 获取用户可访问渠道（site channels ∪ user direct channels，按 numeric id 去重）
     * 跨插件复用：zhao-point getProducts 等场景调用
     * @param siteId site-config documentId
     * @param userId 用户 id
     * @returns 渠道列表 [{ id, documentId, name }]
     */
    getAvailableChannels(siteId?: string, userId?: string | number): Promise<any[]>;
};
export default _default;

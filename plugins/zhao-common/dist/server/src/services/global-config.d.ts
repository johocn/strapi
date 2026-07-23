import { Core } from '@strapi/strapi';
/**
 * 全局配置服务
 * 管理跨租户的全局模块开关和租户授权列表
 * 约定：全系统仅 1 条记录，通过 findFirst 读取
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;

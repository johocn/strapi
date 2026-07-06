import { Core } from '@strapi/strapi';
export interface ConfigManager {
    /** 获取插件配置（类型安全） */
    get<T = unknown>(key: string, defaultValue?: T): T;
    /** 获取所有配置 */
    getAll(): Record<string, unknown>;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => ConfigManager;
export default _default;

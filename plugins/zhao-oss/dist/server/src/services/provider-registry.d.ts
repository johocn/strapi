import { Core } from '@strapi/strapi';
import { OssProvider } from './providers/interface';
import { PluginConfig } from '../types';
export interface ProviderRegistry {
    /** 获取指定提供者实例 */
    getProvider(name: string): OssProvider | undefined;
    /** 获取当前主提供者 */
    getPrimaryProvider(): OssProvider | undefined;
    /** 检查主提供者健康状态 */
    isPrimaryHealthy(): Promise<boolean>;
    /** 重新加载所有提供者 */
    reloadProviders(config: PluginConfig): Promise<void>;
    /** 获取当前可用提供者列表 */
    getActiveProviders(): string[];
    /** 获取所有已注册提供者类型 */
    getProviderTypes(): string[];
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => ProviderRegistry;
export default _default;

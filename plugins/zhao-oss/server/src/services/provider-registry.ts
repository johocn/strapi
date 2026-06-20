import type { Core } from "@strapi/strapi";
import { createProvider, getRegisteredProviders } from "./providers";
import type { OssProvider } from "./providers/interface";
import type { PluginConfig } from "../types";

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

export default ({ strapi }: { strapi: Core.Strapi }): ProviderRegistry => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const providers = new Map<string, OssProvider>();
  let primaryProviderName: string | null = null;

  const registry: ProviderRegistry = {
    getProvider(name: string): OssProvider | undefined {
      return providers.get(name);
    },

    getPrimaryProvider(): OssProvider | undefined {
      if (primaryProviderName) {
        return providers.get(primaryProviderName);
      }
      return undefined;
    },

    async isPrimaryHealthy(): Promise<boolean> {
      const provider = registry.getPrimaryProvider();
      if (!provider) return false;
      try {
        return await provider.checkHealth();
      } catch (err) {
        logger.warn(`[zhao-oss] Health check failed for provider "${primaryProviderName}"`, {
          error: (err as Error).message,
        });
        return false;
      }
    },

    async reloadProviders(config: PluginConfig): Promise<void> {
      // 清除现有提供者
      providers.clear();
      primaryProviderName = null;

      const enabledProviders = config.providers.filter((p) => p.enabled);

      for (const providerConfig of enabledProviders) {
        try {
          const provider = createProvider(providerConfig.name);
          await provider.initialize(providerConfig.options);

          providers.set(providerConfig.name, provider);

          if (providerConfig.primary) {
            primaryProviderName = providerConfig.name;
          }

          if (!process.env.NODE_ENV?.includes("test")) logger.info(`[zhao-oss] Provider "${providerConfig.name}" initialized successfully`);
        } catch (err) {
          if (!process.env.NODE_ENV?.includes("test")) logger.error(`[zhao-oss] Failed to initialize provider "${providerConfig.name}"`, {
            error: (err as Error).message,
          });
        }
      }

      if (primaryProviderName && !providers.has(primaryProviderName)) {
        // 如果主提供者初始化失败，使用第一个可用提供者
        const firstAvailable = providers.keys().next().value;
        if (firstAvailable) {
          primaryProviderName = firstAvailable;
          logger.warn(`[zhao-oss] Primary provider failed, falling back to "${firstAvailable}"`);
        }
      }

      if (!process.env.NODE_ENV?.includes("test")) logger.info(`[zhao-oss] Provider registry loaded: ${registry.getActiveProviders().join(", ") || "none"}`);
    },

    getActiveProviders(): string[] {
      return Array.from(providers.keys());
    },

    getProviderTypes(): string[] {
      return getRegisteredProviders();
    },
  };

  return registry;
};

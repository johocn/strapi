import type { Core } from "@strapi/strapi";

export interface ConfigManager {
  /** 获取插件配置（类型安全） */
  get<T = unknown>(key: string, defaultValue?: T): T;
  /** 获取所有配置 */
  getAll(): Record<string, unknown>;
}

export default ({ strapi }: { strapi: Core.Strapi }): ConfigManager => ({
  get<T = unknown>(key: string, defaultValue?: T): T {
    const pluginConfig = (strapi.plugin("zhao-common")?.config ?? {}) as unknown as Record<string, unknown>;
    return (pluginConfig[key] as T) ?? (defaultValue as T);
  },

  getAll(): Record<string, unknown> {
    return (strapi.plugin("zhao-common")?.config ?? {}) as unknown as Record<string, unknown>;
  },
});

import type { Core } from "@strapi/strapi";
import type { PluginConfig, OssProviderConfig } from "../types";
import { createProvider } from "../services/providers";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getConfig(ctx: any) {
    try {
      const store = strapi.store?.({ type: "plugin", name: "zhao-oss" });
      const saved = store ? await store.get({ key: "config" }) as Record<string, unknown> : {};
      const defaults = strapi.config.get("plugin::zhao-oss") as Record<string, unknown>;
      ctx.body = { ...defaults, ...saved };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async updateConfig(ctx: any) {
    try {
      const newConfig = (ctx.request.body?.data || ctx.request.body) as Partial<PluginConfig>;
      const store = strapi.store?.({ type: "plugin", name: "zhao-oss" });

      if (store) {
        const existing = (await store.get({ key: "config" })) as Record<string, unknown> || {};
        await store.set({ key: "config", value: { ...existing, ...newConfig } });
      }

      if (newConfig.providers) {
        const fullConfig = { ...newConfig } as PluginConfig;
        const registry = strapi.plugin("zhao-oss").service("provider-registry");
        await registry.reloadProviders(fullConfig);
      }

      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async testProvider(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { provider } = body as { provider: OssProviderConfig };
      if (!provider?.name || !provider?.options) {
        ctx.status = 400;
        ctx.body = { error: "Provider name and options are required" };
        return;
      }

      const instance = createProvider(provider.name);
      await instance.initialize(provider.options);
      const healthy = await instance.checkHealth();
      ctx.body = { healthy, provider: provider.name };
    } catch (e: any) {
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = { healthy: false, provider: body?.provider?.name, error: e.message };
    }
  },
});

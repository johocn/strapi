import type { PluginConfig } from "./types";

export default {
  default: {
    enabled: true,
    uploadTimeoutMs: 30000,
    maxRetries: 3,
    healthCheckIntervalMs: 60000,
    syncDelete: true,
    fallbackToLocal: true,
    enableUrlRewrite: true,
    providers: [],
  } satisfies PluginConfig,
  validator() {},
};
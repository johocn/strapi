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
    // 上传限制（可用 ZHAO_OSS_MAX_*_BYTES 环境变量覆盖）
    uploadMaxImageBytes: 10 * 1024 * 1024,
    uploadMaxVideoBytes: 200 * 1024 * 1024,
    uploadMaxAudioBytes: 50 * 1024 * 1024,
    uploadMaxDocBytes: 20 * 1024 * 1024,
    uploadMaxArchiveBytes: 20 * 1024 * 1024,
    uploadMaxTotalBytes: 300 * 1024 * 1024,
    providers: [],
  } satisfies PluginConfig,
  validator() {},
};
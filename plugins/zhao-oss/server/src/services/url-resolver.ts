import type { Core } from "@strapi/strapi";

export interface UrlResolver {
  resolveUrl(file: { id: number; url: string }): Promise<string>;
  resolveUrls(files: Array<{ id: number; url: string }>): Promise<Map<number, string>>;
}

export default ({ strapi }: { strapi: Core.Strapi }): UrlResolver => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;

  /**
   * 私有桶读时签名：本地 URL 是相对路径（/static/...），绝对的必为 OSS 公网裸地址，
   * 需要在响应前现签，避免把裸地址返回给前端造成 403。
   */
  const signIfOssUrl = (url: string): string => {
    if (!url || url.startsWith("/")) return url;

    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = registry.getPrimaryProvider();
      if (!provider) return url;

      const key = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
      return key ? provider.signUrl(key) : url;
    } catch {
      return url;
    }
  };

  const urlResolver: UrlResolver = {
    async resolveUrl(file: { id: number; url: string }): Promise<string> {
      try {
        const pluginConfig = strapi.config.get("plugin::zhao-oss") as Record<string, unknown> | undefined;
        const fallbackToLocal = pluginConfig?.fallbackToLocal !== false;

        const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
          where: { fileId: file.id },
        });

        if (!record || record.status !== "success" || !record.remoteUrl) {
          return signIfOssUrl(file.url);
        }

        if (fallbackToLocal) {
          const registry = strapi.plugin("zhao-oss").service("provider-registry");
          const isHealthy = await registry.isPrimaryHealthy();
          if (!isHealthy) {
            logger.debug(`[zhao-oss] OSS unhealthy, using local URL for file ${file.id}`);
            return signIfOssUrl(file.url);
          }
        }

        return signIfOssUrl(record.remoteUrl);
      } catch (err) {
        logger.debug(`[zhao-oss] URL resolution failed for file ${file.id}, using local`, {
          error: (err as Error).message,
        });
        return signIfOssUrl(file.url);
      }
    },

    async resolveUrls(files: Array<{ id: number; url: string }>): Promise<Map<number, string>> {
      const result = new Map<number, string>();

      if (files.length === 0) return result;

      try {
        const pluginConfig = strapi.config.get("plugin::zhao-oss") as Record<string, unknown> | undefined;
        const fallbackToLocal = pluginConfig?.fallbackToLocal !== false;
        const enableUrlRewrite = pluginConfig?.enableUrlRewrite !== false;

        if (!enableUrlRewrite) {
          for (const file of files) {
            result.set(file.id, signIfOssUrl(file.url));
          }
          return result;
        }

        let ossHealthy = true;
        if (fallbackToLocal) {
          try {
            const registry = strapi.plugin("zhao-oss").service("provider-registry");
            ossHealthy = await registry.isPrimaryHealthy();
          } catch {
            ossHealthy = false;
          }
        }

        const fileIds = files.map((f) => f.id);
        const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
          where: { fileId: { $in: fileIds }, status: "success" },
        });

        const recordMap = new Map<number, { remoteUrl: string }>();
        for (const record of records) {
          if (record.remoteUrl) {
            recordMap.set(record.fileId, { remoteUrl: record.remoteUrl });
          }
        }

        for (const file of files) {
          const record = recordMap.get(file.id);
          if (record && ossHealthy) {
            result.set(file.id, signIfOssUrl(record.remoteUrl));
          } else {
            result.set(file.id, signIfOssUrl(file.url));
          }
        }
      } catch (err) {
        logger.debug("[zhao-oss] Batch URL resolution failed, using local URLs", {
          error: (err as Error).message,
        });
        for (const file of files) {
          result.set(file.id, signIfOssUrl(file.url));
        }
      }

      return result;
    },
  };

  return urlResolver;
};
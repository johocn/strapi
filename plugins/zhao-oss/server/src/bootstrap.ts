import type { Core } from "@strapi/strapi";
import type { PluginConfig } from "./types";
import PERMISSIONS from "./permissions";

function extractMediaFiles(obj: any, collected: Array<{ id: number; url: string }> = []): Array<{ id: number; url: string }> {
  if (!obj || typeof obj !== "object") return collected;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractMediaFiles(item, collected);
    }
    return collected;
  }
  if (obj.id && typeof obj.id === "number" && typeof obj.url === "string" && obj.provider !== undefined) {
    collected.push({ id: obj.id, url: obj.url });
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      extractMediaFiles(value, collected);
    }
  }
  return collected;
}

function replaceUrls(obj: any, urlMap: Map<number, string>): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      replaceUrls(item, urlMap);
    }
    return;
  }
  if (obj.id && typeof obj.id === "number" && typeof obj.url === "string" && obj.provider !== undefined) {
    const resolved = urlMap.get(obj.id);
    if (resolved && resolved !== obj.url) {
      obj.url = resolved;
    }
    return;
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      replaceUrls(value, urlMap);
    }
  }
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-oss] Initializing OSS backup plugin...");

  const pluginConfig = strapi.config.get("plugin::zhao-oss") as PluginConfig | undefined;
  if (!pluginConfig?.enabled) {
    if (!isTest) logger.info("[zhao-oss] Plugin is disabled, skipping initialization");
    return;
  }

  const registry = strapi.plugin("zhao-oss").service("provider-registry");
  await registry.reloadProviders(pluginConfig);

  const activeProviders = registry.getActiveProviders();
  if (activeProviders.length === 0 && !isTest) {
    logger.warn("[zhao-oss] No OSS providers configured. Plugin will run in monitoring mode only.");
  }

  const isHealthy = await registry.isPrimaryHealthy();
  if (!isHealthy && activeProviders.length > 0 && !isTest) {
    logger.warn("[zhao-oss] Primary OSS provider is not healthy. Falling back to local storage mode.");
    if (!pluginConfig.fallbackToLocal) {
      logger.warn("[zhao-oss] Fallback to local is disabled. Uploads may fail.");
    }
  }
  const FOLDER_UID = "plugin::upload.folder";

  const DEFAULT_FOLDERS = [
    { name: "general", parent: null },
    { name: "avatars", parent: null },
    { name: "course", parent: null },
    { name: "covers", parent: "course" },
    { name: "thumbnails", parent: "course" },
    { name: "images", parent: "course" },
    { name: "videos", parent: "course" },
    { name: "audios", parent: "course" },
    { name: "attachments", parent: "course" },
    { name: "lessons", parent: "course" },
  ];

  try {
    const existingFolders = await strapi.db.query(FOLDER_UID).findMany({});
    const folderMap = new Map<string, any>();
    for (const f of existingFolders) {
      folderMap.set(f.name, f);
    }

    for (const def of DEFAULT_FOLDERS) {
      if (folderMap.has(def.name)) continue;

      let parentId: number | null = null;
      let parentPath = "/";

      if (def.parent) {
        const parentFolder = folderMap.get(def.parent);
        if (!parentFolder) continue;
        parentId = parentFolder.id;
        parentPath = parentFolder.path;
      }

      const pathIdResult = (await strapi.db.queryBuilder(FOLDER_UID).max("pathId").first().execute()) as { max?: number } | null;
      const pathId = (pathIdResult?.max || 0) + 1;
      const newPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;

      const created = await strapi.db.query(FOLDER_UID).create({
        data: {
          name: def.name,
          pathId,
          path: newPath,
          parent: parentId,
        },
      });
      folderMap.set(def.name, created);
      if (!isTest) logger.info(`[zhao-oss] Created default folder: ${def.name} (path=${newPath})`);
    }
  } catch (err) {
    logger.warn("[zhao-oss] Default folders initialization failed", { error: (err as Error).message });
  }

  // 2.5 注册 has-oss-permission 策略到 zhao-auth
  try {
    const authService = strapi.plugin("zhao-auth").service("auth");
    if (authService && typeof (authService as any).registerPolicy === "function") {
      const createHasOssPermission = (_strapiInstance: any) => {
        return async (context: any, config?: Record<string, unknown>): Promise<{ passed: boolean; code?: string; message?: string }> => {
          const user = context?.state?.user || context?.user;
          if (!user || !user.roles || user.roles.length === 0) {
            return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
          }

          const permission = config?.permission as string;
          if (!permission) return { passed: true };

          const allowedRoles = PERMISSIONS[permission] || [];
          const userRoles = user.roles as string[];
          const hasPermission = allowedRoles.some((role: string) => userRoles.includes(role));

          if (!hasPermission) {
            return { passed: false, code: "FORBIDDEN_PERMISSION", message: `需要 ${permission} 权限` };
          }

          return { passed: true };
        };
      };
      (authService as any).registerPolicy("has-oss-permission", createHasOssPermission(strapi));
      if (!isTest) logger.info("[zhao-oss] has-oss-permission 策略已注册到 zhao-auth");
    }
  } catch {
    logger.warn("[zhao-oss] zhao-auth 插件未启用，Content API 权限策略未注册");
  }
  // 3. 订阅 upload file 生命周期事件（仅写操作）
  strapi.db?.lifecycles.subscribe({
    models: ["plugin::upload.file"],

    async afterCreate(event: any) {
      const { result } = event;
      if (!result || !result.id) return;

      const enableSync = strapi.config.get("plugin::zhao-oss.enabled") !== false;
      if (!enableSync) return;

      try {
        const syncService = strapi.plugin("zhao-oss").service("sync-service");
        setImmediate(async () => {
          try {
            await syncService.backupFile(result.id);
          } catch (err) {
            logger.error("[zhao-oss] Async backup failed", {
              fileId: result.id,
              error: (err as Error).message,
            });
          }
        });
      } catch (err) {
        logger.error("[zhao-oss] Failed to trigger backup", {
          fileId: result.id,
          error: (err as Error).message,
        });
      }
    },

    async beforeDelete(event: any) {
      const { where } = event;
      if (!where?.id) return;

      const syncDelete = strapi.config.get("plugin::zhao-oss.syncDelete") !== false;
      if (!syncDelete) return;

      try {
        const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
          where: { fileId: where.id },
        });

        for (const record of records) {
          if (record.status === "success" && record.remoteUrl) {
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            await syncService.deleteRemote(record.id);
          }
        }
      } catch (err) {
        logger.warn("[zhao-oss] Failed to clean up remote file on delete", {
          fileId: where.id,
          error: (err as Error).message,
        });
      }
    },
  });

  // 监听 site-config 创建 → 自动创建站点默认媒体文件夹
  strapi.db?.lifecycles.subscribe({
    models: ["plugin::zhao-common.site-config"],
    async afterCreate(event: any) {
      const siteId = event.result?.id;
      if (!siteId) return;
      try {
        await strapi.plugin("zhao-oss").service("media-service").ensureSiteDefaultFolders(siteId);
        if (!isTest) logger.info(`[zhao-oss] Created default folders for site ${siteId}`);
      } catch (err) {
        logger.error(`[zhao-oss] Failed to create default folders for site ${siteId}:`, { error: (err as Error).message });
      }
    },
  });

  if (!isTest) logger.info("[zhao-oss] Upload lifecycle hooks registered successfully");

  // 3.5 注册 URL 重写中间件（Koa middleware，拦截响应替换媒体 URL）
  strapi.server.use(async (ctx: any, next: any) => {
    await next();

    const enableUrlRewrite = strapi.config.get("plugin::zhao-oss.enableUrlRewrite") !== false;
    if (!enableUrlRewrite) return;

    if (!ctx.body || typeof ctx.body !== "object") return;
    if (ctx.path.startsWith("/admin")) return;

    try {
      const mediaFiles = extractMediaFiles(ctx.body);
      if (mediaFiles.length === 0) return;

      const urlResolver = strapi.plugin("zhao-oss").service("url-resolver");
      const urlMap = await urlResolver.resolveUrls(mediaFiles);

      replaceUrls(ctx.body, urlMap);
    } catch (err) {
      logger.debug("[zhao-oss] URL rewrite middleware failed", {
        path: ctx.path,
        error: (err as Error).message,
      });
    }
  });

  if (!isTest) logger.info("[zhao-oss] URL rewrite middleware registered");

  // 4. 启动定时健康检查
  const healthCheckInterval = pluginConfig.healthCheckIntervalMs || 60000;
  let healthOk = isHealthy;

  const healthInterval = setInterval(async () => {
    try {
      const currentHealth = await registry.isPrimaryHealthy();
      if (currentHealth !== healthOk) {
        healthOk = currentHealth;
        if (currentHealth) {
          logger.info("[zhao-oss] OSS provider recovered and is healthy again");
        } else {
          logger.warn("[zhao-oss] OSS provider is unhealthy, switching to fallback mode");
        }
      }
    } catch {
      // 静默失败
    }
  }, healthCheckInterval);

  // 5. 清理钩子
  strapi.plugin("zhao-oss").destroy = async () => {
    clearInterval(healthInterval);
  };

  if (!isTest) logger.info("[zhao-oss] Plugin initialized successfully", {
    providers: activeProviders,
    healthy: isHealthy,
    fallbackEnabled: pluginConfig.fallbackToLocal,
    urlRewriteEnabled: pluginConfig.enableUrlRewrite !== false,
  });
};

export default bootstrap;
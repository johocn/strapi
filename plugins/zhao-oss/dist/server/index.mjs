import OSS from "ali-oss";
import * as crypto from "crypto";
import crypto__default from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";
const PERMISSIONS = {
  "oss.file.upload": ["admin", "channel-admin", "course-manager", "instructor", "user"],
  "oss.file.read": ["admin", "channel-admin", "course-manager", "instructor", "user"],
  "oss.file.delete": ["admin", "channel-admin"],
  "oss.folder.create": ["admin", "channel-admin", "course-manager"],
  "oss.folder.read": ["admin", "channel-admin", "course-manager", "instructor", "user"],
  "oss.settings.read": ["admin"],
  "oss.settings.update": ["admin"],
  "oss.sync.read": ["admin", "channel-admin"],
  "oss.sync.create": ["admin", "channel-admin"],
  "oss.sync.delete": ["admin"]
};
function extractMediaFiles(obj, collected = []) {
  if (!obj || typeof obj !== "object") return collected;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractMediaFiles(item, collected);
    }
    return collected;
  }
  if (obj.id && typeof obj.id === "number" && typeof obj.url === "string" && obj.provider !== void 0) {
    collected.push({ id: obj.id, url: obj.url });
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      extractMediaFiles(value, collected);
    }
  }
  return collected;
}
function replaceUrls(obj, urlMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      replaceUrls(item, urlMap);
    }
    return;
  }
  if (obj.id && typeof obj.id === "number" && typeof obj.url === "string" && obj.provider !== void 0) {
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
const bootstrap = async ({ strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest) logger.info("[zhao-oss] Initializing OSS backup plugin...");
  const pluginConfig = strapi.config.get("plugin::zhao-oss");
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
  const FOLDER_UID2 = "plugin::upload.folder";
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
    { name: "lessons", parent: "course" }
  ];
  try {
    const existingFolders = await strapi.db.query(FOLDER_UID2).findMany({});
    const folderMap = /* @__PURE__ */ new Map();
    for (const f of existingFolders) {
      folderMap.set(f.name, f);
    }
    for (const def of DEFAULT_FOLDERS) {
      if (folderMap.has(def.name)) continue;
      let parentId = null;
      let parentPath = "/";
      if (def.parent) {
        const parentFolder = folderMap.get(def.parent);
        if (!parentFolder) continue;
        parentId = parentFolder.id;
        parentPath = parentFolder.path;
      }
      const pathIdResult = await strapi.db.queryBuilder(FOLDER_UID2).max("pathId").first().execute();
      const pathId = (pathIdResult?.max || 0) + 1;
      const newPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;
      const created = await strapi.db.query(FOLDER_UID2).create({
        data: {
          name: def.name,
          pathId,
          path: newPath,
          parent: parentId
        }
      });
      folderMap.set(def.name, created);
      if (!isTest) logger.info(`[zhao-oss] Created default folder: ${def.name} (path=${newPath})`);
    }
  } catch (err) {
    logger.warn("[zhao-oss] Default folders initialization failed", { error: err.message });
  }
  try {
    const authService = strapi.plugin("zhao-auth").service("auth");
    if (authService && typeof authService.registerPolicy === "function") {
      const createHasOssPermission = (_strapiInstance) => {
        return async (context, config2) => {
          const user = context?.state?.user || context?.user;
          if (!user || !user.roles || user.roles.length === 0) {
            return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
          }
          const permission = config2?.permission;
          if (!permission) return { passed: true };
          const allowedRoles = PERMISSIONS[permission] || [];
          const userRoles = user.roles;
          const hasPermission = allowedRoles.some((role) => userRoles.includes(role));
          if (!hasPermission) {
            return { passed: false, code: "FORBIDDEN_PERMISSION", message: `需要 ${permission} 权限` };
          }
          return { passed: true };
        };
      };
      authService.registerPolicy("has-oss-permission", createHasOssPermission(strapi));
      if (!isTest) logger.info("[zhao-oss] has-oss-permission 策略已注册到 zhao-auth");
    }
  } catch {
    logger.warn("[zhao-oss] zhao-auth 插件未启用，Content API 权限策略未注册");
  }
  strapi.db?.lifecycles.subscribe({
    models: ["plugin::upload.file"],
    async afterCreate(event) {
      const { result } = event;
      if (!result || !result.id) return;
      const enableSync = strapi.config.get("plugin::zhao-oss.enabled") !== false;
      if (!enableSync) return;
      try {
        const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
        setImmediate(async () => {
          try {
            await syncService2.backupFile(result.id);
          } catch (err) {
            logger.error("[zhao-oss] Async backup failed", {
              fileId: result.id,
              error: err.message
            });
          }
        });
      } catch (err) {
        logger.error("[zhao-oss] Failed to trigger backup", {
          fileId: result.id,
          error: err.message
        });
      }
    },
    async beforeDelete(event) {
      const { where } = event;
      if (!where?.id) return;
      const syncDelete = strapi.config.get("plugin::zhao-oss.syncDelete") !== false;
      if (!syncDelete) return;
      try {
        const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
          where: { fileId: where.id }
        });
        for (const record of records) {
          if (record.status === "success" && record.remoteUrl) {
            const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
            await syncService2.deleteRemote(record.id);
          }
        }
      } catch (err) {
        logger.warn("[zhao-oss] Failed to clean up remote file on delete", {
          fileId: where.id,
          error: err.message
        });
      }
    }
  });
  strapi.db?.lifecycles.subscribe({
    models: ["plugin::zhao-common.site-config"],
    async afterCreate(event) {
      const siteId = event.result?.id;
      if (!siteId) return;
      try {
        await strapi.plugin("zhao-oss").service("media-service").ensureSiteDefaultFolders(siteId);
        if (!isTest) logger.info(`[zhao-oss] Created default folders for site ${siteId}`);
      } catch (err) {
        logger.error(`[zhao-oss] Failed to create default folders for site ${siteId}:`, { error: err.message });
      }
    }
  });
  if (!isTest) logger.info("[zhao-oss] Upload lifecycle hooks registered successfully");
  strapi.server.use(async (ctx, next) => {
    await next();
    const enableUrlRewrite = strapi.config.get("plugin::zhao-oss.enableUrlRewrite") !== false;
    if (!enableUrlRewrite) return;
    if (!ctx.body || typeof ctx.body !== "object") return;
    if (ctx.path.startsWith("/admin")) return;
    try {
      const mediaFiles = extractMediaFiles(ctx.body);
      if (mediaFiles.length === 0) return;
      const urlResolver2 = strapi.plugin("zhao-oss").service("url-resolver");
      const urlMap = await urlResolver2.resolveUrls(mediaFiles);
      replaceUrls(ctx.body, urlMap);
    } catch (err) {
      logger.debug("[zhao-oss] URL rewrite middleware failed", {
        path: ctx.path,
        error: err.message
      });
    }
  });
  if (!isTest) logger.info("[zhao-oss] URL rewrite middleware registered");
  const healthCheckInterval = pluginConfig.healthCheckIntervalMs || 6e4;
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
    }
  }, healthCheckInterval);
  strapi.plugin("zhao-oss").destroy = async () => {
    clearInterval(healthInterval);
  };
  if (!isTest) logger.info("[zhao-oss] Plugin initialized successfully", {
    providers: activeProviders,
    healthy: isHealthy,
    fallbackEnabled: pluginConfig.fallbackToLocal,
    urlRewriteEnabled: pluginConfig.enableUrlRewrite !== false
  });
};
const register = ({ strapi: _strapi }) => {
};
const config = {
  default: {
    enabled: true,
    uploadTimeoutMs: 3e4,
    maxRetries: 3,
    healthCheckIntervalMs: 6e4,
    syncDelete: true,
    fallbackToLocal: true,
    enableUrlRewrite: true,
    providers: []
  },
  validator() {
  }
};
const syncRecord = {
  schema: {
    collectionName: "zhao_oss_sync_records",
    info: {
      singularName: "sync-record",
      pluralName: "sync-records",
      displayName: "Sync Record",
      description: "OSS 同步记录，追踪文件备份状态"
    },
    options: {
      draftAndPublish: false
    },
    pluginOptions: {
      "content-manager": {
        visible: false
      },
      "content-type-builder": {
        visible: false
      }
    },
    attributes: {
      fileId: {
        type: "integer",
        required: true,
        unique: true
      },
      fileHash: {
        type: "string",
        required: true
      },
      status: {
        type: "enumeration",
        enum: ["pending", "syncing", "success", "failed", "skipped", "deleted"],
        default: "pending",
        required: true
      },
      provider: {
        type: "string",
        required: true
      },
      remoteUrl: {
        type: "string"
      },
      remoteEtag: {
        type: "string"
      },
      errorMessage: {
        type: "text"
      },
      retryCount: {
        type: "integer",
        default: 0,
        min: 0
      },
      lastSyncedAt: {
        type: "datetime"
      }
    }
  }
};
const mediaMeta = {
  schema: {
    collectionName: "zhao_oss_media_metas",
    info: {
      singularName: "media-meta",
      pluralName: "media-metas",
      displayName: "Media Meta",
      description: "媒体业务元信息（租户/上传者/分类）"
    },
    options: { draftAndPublish: false },
    pluginOptions: {
      "content-manager": { visible: false },
      "content-type-builder": { visible: false }
    },
    attributes: {
      site: {
        type: "relation",
        relation: "manyToOne",
        target: "plugin::zhao-common.site-config",
        required: true
      },
      file: {
        type: "relation",
        relation: "oneToOne",
        target: "plugin::upload.file",
        required: true
      },
      fileId: { type: "integer", required: true },
      folder: {
        type: "relation",
        relation: "manyToOne",
        target: "plugin::upload.folder"
      },
      category: {
        type: "enumeration",
        enum: ["brand", "article", "product", "case", "compliance", "faq", "tutorial", "download", "avatar", "general", "other"],
        default: "general"
      },
      uploader: {
        type: "relation",
        relation: "manyToOne",
        target: "admin::user"
      },
      uploaderRole: { type: "string", maxLength: 50 },
      modifier: {
        type: "relation",
        relation: "manyToOne",
        target: "admin::user"
      },
      originalFilename: { type: "string", maxLength: 500 },
      mimeType: { type: "string", maxLength: 100 },
      fileSize: { type: "biginteger" },
      fileExt: { type: "string", maxLength: 20 },
      usageCount: { type: "integer", default: 0 },
      lastUsedAt: { type: "datetime" },
      isPublic: { type: "boolean", default: true },
      tags: { type: "json" },
      deletedAt: { type: "datetime", default: null }
    }
  }
};
const contentTypes = {
  "sync-record": syncRecord,
  "media-meta": mediaMeta
};
const syncController = ({ strapi }) => ({
  async getDashboard(ctx) {
    try {
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const isHealthy = await registry.isPrimaryHealthy();
      const stats = await syncService2.getSyncStats();
      const activeProviders = registry.getActiveProviders();
      const providerTypes = registry.getProviderTypes();
      ctx.body = { isHealthy, stats, activeProviders, availableProviderTypes: providerTypes };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async getSyncRecords(ctx) {
    try {
      const { page = 1, pageSize = 20, status } = ctx.query;
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = await mediaService2.listSyncRecords({ page: parseInt(page), pageSize: parseInt(pageSize), status });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async triggerSync(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { fileId } = body;
      if (!fileId) {
        ctx.status = 400;
        ctx.body = { error: "fileId is required" };
        return;
      }
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      await syncService2.backupFile(fileId);
      ctx.body = await syncService2.checkSyncStatus(fileId);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async batchSync(ctx) {
    try {
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      ctx.body = await syncService2.batchSync(100, 0);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async deleteRemote(ctx) {
    try {
      const { recordId } = ctx.params;
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      await syncService2.deleteRemote(parseInt(recordId));
      ctx.body = { success: true };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async checkHealth(ctx) {
    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const isHealthy = await registry.isPrimaryHealthy();
      ctx.body = {
        healthy: isHealthy,
        primaryProvider: registry.getActiveProviders()[0] || null,
        activeProviders: registry.getActiveProviders()
      };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
class AliyunOssProvider {
  constructor() {
    this.name = "aliyun";
    this.initialized = false;
  }
  async initialize(options) {
    this.options = {
      region: options.region,
      accessKeyId: options.accessKeyId,
      accessKeySecret: options.accessKeySecret,
      bucket: options.bucket,
      cname: options.cname,
      basePath: options.basePath || "uploads",
      secure: options.secure !== false,
      internalEndpoint: options.internalEndpoint
    };
    const config2 = {
      region: this.options.region,
      accessKeyId: this.options.accessKeyId,
      accessKeySecret: this.options.accessKeySecret,
      bucket: this.options.bucket,
      secure: this.options.secure,
      refreshSTSTokenInterval: 3e5
    };
    if (this.options.cname) {
      config2.endpoint = this.options.cname;
      config2.cname = true;
    } else if (this.options.internalEndpoint) {
      config2.endpoint = this.options.internalEndpoint;
    }
    this.client = new OSS(config2);
    this.initialized = true;
  }
  async upload(params) {
    this.ensureInitialized();
    const key = this.buildObjectKey(params);
    const result = await this.client.put(key, params.buffer, {
      mime: params.mimeType,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
    return {
      url: this.getUrl(key),
      etag: result.res?.headers?.etag || void 0,
      provider: this.name
    };
  }
  async delete(key) {
    this.ensureInitialized();
    await this.client.delete(key);
  }
  async checkHealth() {
    try {
      this.ensureInitialized();
      await this.client.list(
        {
          "max-keys": 1
        },
        {}
      );
      return true;
    } catch {
      return false;
    }
  }
  getUrl(key) {
    if (this.options.cname) {
      const protocol2 = this.options.secure ? "https" : "http";
      return `${protocol2}://${this.options.cname}/${key}`;
    }
    const protocol = this.options.secure ? "https" : "http";
    return `${protocol}://${this.options.bucket}.oss-${this.options.region}.aliyuncs.com/${key}`;
  }
  buildObjectKey(params) {
    const basePath = this.options.basePath || "uploads";
    const timestamp = Date.now();
    const randomStr = crypto__default.randomBytes(4).toString("hex");
    const ext = this.getExtension(params.filename);
    const datePath = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "/");
    return `${basePath}/${datePath}/${timestamp}-${randomStr}${ext}`;
  }
  getExtension(filename) {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
  }
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Aliyun OSS provider not initialized. Call initialize() first.");
    }
  }
}
const PROVIDER_CLASSES = {
  aliyun: AliyunOssProvider
};
function createProvider(type) {
  const ProviderClass = PROVIDER_CLASSES[type];
  if (!ProviderClass) {
    throw new Error(`Unsupported OSS provider type: "${type}". Available: ${Object.keys(PROVIDER_CLASSES).join(", ")}`);
  }
  return new ProviderClass();
}
function getRegisteredProviders() {
  return Object.keys(PROVIDER_CLASSES);
}
const settingsController = ({ strapi }) => ({
  async getConfig(ctx) {
    try {
      const store = strapi.store?.({ type: "plugin", name: "zhao-oss" });
      const saved = store ? await store.get({ key: "config" }) : {};
      const defaults = strapi.config.get("plugin::zhao-oss");
      ctx.body = { ...defaults, ...saved };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async updateConfig(ctx) {
    try {
      const newConfig = ctx.request.body?.data || ctx.request.body;
      const store = strapi.store?.({ type: "plugin", name: "zhao-oss" });
      if (store) {
        const existing = await store.get({ key: "config" }) || {};
        await store.set({ key: "config", value: { ...existing, ...newConfig } });
      }
      if (newConfig.providers) {
        const fullConfig = { ...newConfig };
        const registry = strapi.plugin("zhao-oss").service("provider-registry");
        await registry.reloadProviders(fullConfig);
      }
      ctx.body = { success: true };
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async testProvider(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { provider } = body;
      if (!provider?.name || !provider?.options) {
        ctx.status = 400;
        ctx.body = { error: "Provider name and options are required" };
        return;
      }
      const instance = createProvider(provider.name);
      await instance.initialize(provider.options);
      const healthy = await instance.checkHealth();
      ctx.body = { healthy, provider: provider.name };
    } catch (e) {
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = { healthy: false, provider: body?.provider?.name, error: e.message };
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const apiController = ({ strapi }) => ({
  async upload(ctx) {
    try {
      const { files } = ctx.request;
      if (!files || Object.keys(files).length === 0) {
        ctx.status = 400;
        ctx.body = { error: "No files provided" };
        return;
      }
      const file = Object.values(files)[0];
      const fs2 = require("fs/promises");
      const filePath = file.filepath ?? file.path;
      const fileBuffer = filePath ? await fs2.readFile(filePath) : file.buffer;
      const originalName = file.originalFilename ?? file.name ?? "";
      const mimeType = file.mimetype ?? file.type ?? "application/octet-stream";
      const fileSize = file.size || fileBuffer.length;
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      const body = ctx.request.body?.data || ctx.request.body;
      const result = await mediaService2.uploadFile({
        fileBuffer,
        originalName,
        customName: body?.name || null,
        mimeType,
        fileSize,
        folderInput: body?.folder || "/general",
        folderIdInput: body?.folderId
      });
      ctx.body = wrap(result);
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async getSyncStatus(ctx) {
    try {
      const { fileId } = ctx.params;
      if (!fileId) {
        ctx.status = 400;
        ctx.body = { error: "fileId is required" };
        return;
      }
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      ctx.body = wrap(await syncService2.checkSyncStatus(parseInt(fileId)));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async mediaList(ctx) {
    try {
      const { page = 1, pageSize = 20, folderPath, mime, search, sort = "createdAt:desc" } = ctx.query;
      const user = ctx.state?.user || ctx.user || null;
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = wrapList(await mediaService2.listFiles({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        folderPath,
        mime,
        search,
        sort,
        user
      }));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async getFolders(ctx) {
    try {
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      const folders = await mediaService2.getFolderTree();
      ctx.body = wrap({ folders });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async createFolder(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { name, parentId = null } = body;
      if (!name) {
        ctx.status = 400;
        ctx.body = { error: "Folder name is required" };
        return;
      }
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = wrap(await mediaService2.createFolder(name, parentId));
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async deleteMedia(ctx) {
    try {
      const { fileId } = ctx.params;
      if (!fileId) {
        ctx.status = 400;
        ctx.body = { error: "fileId is required" };
        return;
      }
      const parsedId = parseInt(fileId, 10);
      if (isNaN(parsedId)) {
        ctx.status = 400;
        ctx.body = { error: "Invalid fileId" };
        return;
      }
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      const file = await mediaService2.findFileById(parsedId);
      if (!file) {
        ctx.status = 404;
        ctx.body = { error: "File not found" };
        return;
      }
      const user = ctx.state?.user || ctx.user;
      const canDelete = await mediaService2.canDeleteFile(parsedId, user);
      if (!canDelete) {
        ctx.status = 403;
        ctx.body = { error: "无权删除此媒体文件" };
        return;
      }
      const syncService2 = strapi.plugin("zhao-oss").service("sync-service");
      const result = await syncService2.deleteFileCompletely(parsedId);
      ctx.body = wrap({ success: true, fileId: parsedId, details: result });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  },
  async repairFolders(ctx) {
    try {
      const mediaService2 = strapi.plugin("zhao-oss").service("media-service");
      const results = await mediaService2.repairFolders();
      ctx.body = wrap({ success: true, results });
    } catch (e) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message };
    }
  }
});
const controllers = {
  "sync-controller": syncController,
  "settings-controller": settingsController,
  "api-controller": apiController
};
const adminRoute = (method, path2, handler, permission) => ({
  method,
  path: `/v1/admin${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const admin = () => ({
  type: "content-api",
  routes: [
    adminRoute("GET", "/sync/dashboard", "sync-controller.getDashboard", "oss.read"),
    adminRoute("GET", "/sync/records", "sync-controller.getSyncRecords", "oss.read"),
    adminRoute("POST", "/sync/trigger", "sync-controller.triggerSync", "oss.upload"),
    adminRoute("POST", "/sync/batch", "sync-controller.batchSync", "oss.upload"),
    adminRoute("DELETE", "/sync/remote/:recordId", "sync-controller.deleteRemote", "oss.delete"),
    adminRoute("GET", "/sync/health", "sync-controller.checkHealth", "oss.read"),
    adminRoute("GET", "/settings", "settings-controller.getConfig", "oss.read"),
    adminRoute("PUT", "/settings", "settings-controller.updateConfig", "oss.upload"),
    adminRoute("POST", "/settings/test-provider", "settings-controller.testProvider", "oss.upload"),
    adminRoute("POST", "/repair/folders", "api-controller.repairFolders", "oss.upload")
  ]
});
const apiRoute = (method, path2, handler, permission) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const api = () => ({
  type: "content-api",
  routes: [
    apiRoute("POST", "/upload", "api-controller.upload", "oss.upload"),
    apiRoute("GET", "/media/list", "api-controller.mediaList", "oss.read"),
    apiRoute("GET", "/media/folders", "api-controller.getFolders", "oss.read"),
    apiRoute("POST", "/media/folders", "api-controller.createFolder", "oss.upload"),
    apiRoute("GET", "/sync/status/:fileId", "api-controller.getSyncStatus", "oss.read"),
    apiRoute("DELETE", "/media/:fileId", "api-controller.deleteMedia", "oss.delete")
  ]
});
const adminRoutes = admin();
const apiRoutes = api();
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...apiRoutes.routes, ...adminRoutes.routes]
  }
};
const providerRegistry = ({ strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const providers = /* @__PURE__ */ new Map();
  let primaryProviderName = null;
  const registry = {
    getProvider(name) {
      return providers.get(name);
    },
    getPrimaryProvider() {
      if (primaryProviderName) {
        return providers.get(primaryProviderName);
      }
      return void 0;
    },
    async isPrimaryHealthy() {
      const provider = registry.getPrimaryProvider();
      if (!provider) return false;
      try {
        return await provider.checkHealth();
      } catch (err) {
        logger.warn(`[zhao-oss] Health check failed for provider "${primaryProviderName}"`, {
          error: err.message
        });
        return false;
      }
    },
    async reloadProviders(config2) {
      providers.clear();
      primaryProviderName = null;
      const enabledProviders = config2.providers.filter((p) => p.enabled);
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
            error: err.message
          });
        }
      }
      if (primaryProviderName && !providers.has(primaryProviderName)) {
        const firstAvailable = providers.keys().next().value;
        if (firstAvailable) {
          primaryProviderName = firstAvailable;
          logger.warn(`[zhao-oss] Primary provider failed, falling back to "${firstAvailable}"`);
        }
      }
      if (!process.env.NODE_ENV?.includes("test")) logger.info(`[zhao-oss] Provider registry loaded: ${registry.getActiveProviders().join(", ") || "none"}`);
    },
    getActiveProviders() {
      return Array.from(providers.keys());
    },
    getProviderTypes() {
      return getRegisteredProviders();
    }
  };
  return registry;
};
const syncService = ({ strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const pluginConfig = strapi.config.get("plugin::zhao-oss");
  const getConfigValue = (key, defaultValue) => {
    return pluginConfig?.[key] ?? defaultValue;
  };
  const syncService2 = {
    async backupFile(fileId) {
      const maxRetries = getConfigValue("maxRetries", 3);
      const uploadTimeoutMs = getConfigValue("uploadTimeoutMs", 3e4);
      const file = await strapi.db.query("plugin::upload.file").findOne({
        where: { id: fileId }
      });
      if (!file) {
        logger.warn(`[zhao-oss] File not found for backup: id=${fileId}`);
        return;
      }
      const providerRegistry2 = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = providerRegistry2.getPrimaryProvider();
      if (!provider) {
        logger.warn("[zhao-oss] No OSS provider available for backup");
        return;
      }
      const existingRecord = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { fileId }
      });
      if (existingRecord?.status === "success") {
        return;
      }
      const fs2 = require("fs/promises");
      const path2 = require("path");
      let fileBuffer;
      try {
        const uploadDir = strapi.dirs.static.public;
        const filePath = file.url ? path2.join(uploadDir, file.url) : null;
        if (filePath && fs2.access(filePath).then(() => true).catch(() => false)) {
          fileBuffer = await fs2.readFile(filePath);
        } else if (file.buffer) {
          fileBuffer = Buffer.from(file.buffer);
        } else {
          logger.error(`[zhao-oss] Cannot read file for upload: id=${fileId}, url=${file.url}`);
          return;
        }
      } catch (err) {
        logger.error(`[zhao-oss] Failed to read file: id=${fileId}`, {
          error: err.message
        });
        return;
      }
      const fileHash = crypto__default.createHash("md5").update(fileBuffer).digest("hex");
      let record;
      if (existingRecord) {
        await strapi.db.query("plugin::zhao-oss.sync-record").update({
          where: { id: existingRecord.id },
          data: {
            status: "syncing",
            retryCount: existingRecord.retryCount + 1,
            fileHash
          }
        });
        record = existingRecord;
      } else {
        record = await strapi.db.query("plugin::zhao-oss.sync-record").create({
          data: {
            fileId,
            fileHash,
            status: "syncing",
            provider: provider.name,
            retryCount: 0
          }
        });
      }
      let lastError = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Upload timeout")), uploadTimeoutMs)
          );
          const uploadPromise = provider.upload({
            buffer: fileBuffer,
            filename: file.hash || file.name || `file_${fileId}`,
            mimeType: file.mime || "application/octet-stream",
            fileSize: file.size || fileBuffer.length
          });
          const result = await Promise.race([uploadPromise, timeoutPromise]);
          await strapi.db.query("plugin::zhao-oss.sync-record").update({
            where: { id: record.id },
            data: {
              status: "success",
              remoteUrl: result.url,
              remoteEtag: result.etag || null,
              errorMessage: null,
              lastSyncedAt: /* @__PURE__ */ new Date(),
              retryCount: attempt
            }
          });
          logger.info(`[zhao-oss] File synced successfully: id=${fileId}, url=${result.url}`);
          return;
        } catch (err) {
          lastError = err;
          logger.warn(
            `[zhao-oss] Upload attempt ${attempt + 1}/${maxRetries + 1} failed for file ${fileId}`,
            { error: lastError.message }
          );
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1e3));
          }
        }
      }
      await strapi.db.query("plugin::zhao-oss.sync-record").update({
        where: { id: record.id },
        data: {
          status: "failed",
          errorMessage: lastError?.message || "Unknown error",
          lastSyncedAt: /* @__PURE__ */ new Date()
        }
      });
      logger.error(`[zhao-oss] File sync failed after ${maxRetries + 1} attempts: id=${fileId}`, {
        error: lastError?.message
      });
    },
    async batchSync(limit = 50, offset = 0) {
      const unsyncedFiles = await strapi.db.query("plugin::upload.file").findMany({
        limit,
        offset,
        orderBy: "id"
      });
      const total = unsyncedFiles.length;
      let success = 0;
      let failed = 0;
      for (const file of unsyncedFiles) {
        try {
          await syncService2.backupFile(file.id);
          success++;
        } catch {
          failed++;
        }
      }
      return { total, success, failed };
    },
    async deleteRemote(recordId) {
      const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { id: recordId }
      });
      if (!record || !record.remoteUrl || record.status !== "success") return;
      const provider = strapi.plugin("zhao-oss").service("provider-registry").getProvider(record.provider);
      if (!provider) return;
      try {
        const url = new URL(record.remoteUrl);
        const key = url.pathname.replace(/^\//, "");
        await provider.delete(key);
        await strapi.db.query("plugin::zhao-oss.sync-record").update({
          where: { id: recordId },
          data: {
            status: "deleted",
            remoteUrl: null,
            remoteEtag: null
          }
        });
        logger.info(`[zhao-oss] Remote file deleted: recordId=${recordId}`);
      } catch (err) {
        logger.error(`[zhao-oss] Failed to delete remote file: recordId=${recordId}`, {
          error: err.message
        });
      }
    },
    async deleteFileCompletely(fileId) {
      const result = { deletedLocal: false, deletedRemote: false, deletedRecord: false };
      const file = await strapi.db.query("plugin::upload.file").findOne({
        where: { id: fileId }
      });
      if (!file) {
        logger.warn(`[zhao-oss] File not found for complete deletion: id=${fileId}`);
        return result;
      }
      const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
        where: { fileId }
      });
      for (const record of records) {
        if (record.status === "success" && record.remoteUrl) {
          try {
            const provider = strapi.plugin("zhao-oss").service("provider-registry").getProvider(record.provider);
            if (provider) {
              const url = new URL(record.remoteUrl);
              const key = url.pathname.replace(/^\//, "");
              await provider.delete(key);
              result.deletedRemote = true;
            }
          } catch (err) {
            logger.warn(`[zhao-oss] Failed to delete remote file for fileId=${fileId}`, {
              recordId: record.id,
              error: err.message
            });
          }
        }
        try {
          await strapi.db.query("plugin::zhao-oss.sync-record").delete({
            where: { id: record.id }
          });
          result.deletedRecord = true;
        } catch (err) {
          logger.warn(`[zhao-oss] Failed to delete sync-record: id=${record.id}`, {
            error: err.message
          });
        }
      }
      try {
        const fs2 = require("fs/promises");
        const path2 = require("path");
        const uploadDir = strapi.dirs.static.public;
        if (file.url) {
          const filePath = path2.join(uploadDir, file.url);
          await fs2.access(filePath);
          await fs2.unlink(filePath);
          result.deletedLocal = true;
        }
      } catch (err) {
        logger.debug(`[zhao-oss] Local file already removed or not found: fileId=${fileId}`, {
          error: err.message
        });
      }
      try {
        await strapi.db.query("plugin::upload.file").delete({
          where: { id: fileId }
        });
      } catch (err) {
        logger.warn(`[zhao-oss] Failed to delete upload.file record: id=${fileId}`, {
          error: err.message
        });
      }
      logger.info(`[zhao-oss] File completely deleted: fileId=${fileId}`, result);
      return result;
    },
    async checkSyncStatus(fileId) {
      const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { fileId }
      });
      if (!record) return { synced: false };
      return {
        synced: record.status === "success",
        provider: record.status === "success" ? record.provider : void 0,
        remoteUrl: record.remoteUrl || void 0
      };
    },
    async getSyncStats() {
      const allRecords = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({});
      const total = allRecords.length;
      const synced = allRecords.filter((r) => r.status === "success").length;
      const failed = allRecords.filter((r) => r.status === "failed").length;
      const pending = allRecords.filter(
        (r) => r.status === "pending" || r.status === "syncing"
      ).length;
      return { total, synced, failed, pending };
    }
  };
  return syncService2;
};
const urlResolver = ({ strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const urlResolver2 = {
    async resolveUrl(file) {
      try {
        const pluginConfig = strapi.config.get("plugin::zhao-oss");
        const fallbackToLocal = pluginConfig?.fallbackToLocal !== false;
        const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
          where: { fileId: file.id }
        });
        if (!record || record.status !== "success" || !record.remoteUrl) {
          return file.url;
        }
        if (fallbackToLocal) {
          const registry = strapi.plugin("zhao-oss").service("provider-registry");
          const isHealthy = await registry.isPrimaryHealthy();
          if (!isHealthy) {
            logger.debug(`[zhao-oss] OSS unhealthy, using local URL for file ${file.id}`);
            return file.url;
          }
        }
        return record.remoteUrl;
      } catch (err) {
        logger.debug(`[zhao-oss] URL resolution failed for file ${file.id}, using local`, {
          error: err.message
        });
        return file.url;
      }
    },
    async resolveUrls(files) {
      const result = /* @__PURE__ */ new Map();
      if (files.length === 0) return result;
      try {
        const pluginConfig = strapi.config.get("plugin::zhao-oss");
        const fallbackToLocal = pluginConfig?.fallbackToLocal !== false;
        const enableUrlRewrite = pluginConfig?.enableUrlRewrite !== false;
        if (!enableUrlRewrite) {
          for (const file of files) {
            result.set(file.id, file.url);
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
          where: { fileId: { $in: fileIds }, status: "success" }
        });
        const recordMap = /* @__PURE__ */ new Map();
        for (const record of records) {
          if (record.remoteUrl) {
            recordMap.set(record.fileId, { remoteUrl: record.remoteUrl });
          }
        }
        for (const file of files) {
          const record = recordMap.get(file.id);
          if (record && ossHealthy) {
            result.set(file.id, record.remoteUrl);
          } else {
            result.set(file.id, file.url);
          }
        }
      } catch (err) {
        logger.debug("[zhao-oss] Batch URL resolution failed, using local URLs", {
          error: err.message
        });
        for (const file of files) {
          result.set(file.id, file.url);
        }
      }
      return result;
    }
  };
  return urlResolver2;
};
const FOLDER_UID = "plugin::upload.folder";
const FILE_UID = "plugin::upload.file";
const SYNC_RECORD_UID = "plugin::zhao-oss.sync-record";
const mediaService = ({ strapi }) => ({
  /**
   * 获取下一个可用的 pathId
   */
  async getNextPathId() {
    const result = await strapi.db.queryBuilder(FOLDER_UID).max("pathId").first().execute();
    return (result?.max || 0) + 1;
  },
  /**
   * 按人类可读路径确保文件夹存在（不存在则逐级创建）
   */
  async ensureFolderByPath(humanPath) {
    const segments = humanPath.split("/").filter(Boolean);
    let parentFolder = null;
    for (const segment of segments) {
      let existing = await strapi.db.query(FOLDER_UID).findOne({
        where: { name: segment, parent: parentFolder?.id || null }
      });
      if (!existing) {
        const pathId = await this.getNextPathId();
        const parentPath = parentFolder ? parentFolder.path : "/";
        const newPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;
        existing = await strapi.db.query(FOLDER_UID).create({
          data: {
            name: segment,
            pathId,
            path: newPath,
            parent: parentFolder?.id || null
          }
        });
      }
      parentFolder = existing;
    }
    return parentFolder;
  },
  /**
   * 根据 folderId 构建人类可读路径
   */
  async buildHumanPath(folderId) {
    const parts = [];
    let current = await strapi.db.query(FOLDER_UID).findOne({ where: { id: folderId } });
    while (current) {
      parts.unshift(current.name);
      const parentId = current.parent?.id || current.parent;
      if (parentId) {
        current = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parentId } });
      } else {
        break;
      }
    }
    return "/" + parts.join("/");
  },
  /**
   * 上传文件：本地存储 + OSS 同步 + 数据库记录
   */
  async uploadFile(params) {
    const { fileBuffer, originalName, customName, mimeType, fileSize, folderInput = "/general", folderIdInput, siteId, category, uploader } = params;
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const ext = originalName ? `.${originalName.split(".").pop()}` : "";
    const fileName = customName || originalName || `file_${Date.now()}`;
    let folderRecord = null;
    let strapiFolderPath = "/";
    let storagePath = folderInput;
    if (folderIdInput) {
      folderRecord = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parseInt(folderIdInput) } });
      if (folderRecord) {
        strapiFolderPath = folderRecord.path;
        storagePath = await this.buildHumanPath(folderRecord.id);
      }
    } else if (folderInput && folderInput !== "/") {
      folderRecord = await this.ensureFolderByPath(folderInput);
      if (folderRecord) {
        strapiFolderPath = folderRecord.path;
        storagePath = folderInput;
      }
    }
    const uploadDir = strapi.dirs.static.public;
    const targetDir = path.join(uploadDir, storagePath);
    await fs.mkdir(targetDir, { recursive: true });
    const localFileName = `${fileHash}${ext}`;
    const localFilePath = path.join(targetDir, localFileName);
    await fs.writeFile(localFilePath, fileBuffer);
    const localUrl = `${storagePath}/${localFileName}`;
    let width = null;
    let height = null;
    let formats = {};
    if (mimeType.startsWith("image/")) {
      try {
        const metadata = await sharp(fileBuffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
      }
    }
    let ossUrl = null;
    let ossStatus = "pending";
    let providerName = "zhao-oss-local";
    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = registry.getPrimaryProvider();
      if (provider) {
        const result = await provider.upload({
          buffer: fileBuffer,
          filename: `${storagePath}/${localFileName}`,
          mimeType,
          fileSize
        });
        ossUrl = result.url;
        ossStatus = "success";
        providerName = result.provider || "aliyun";
      }
    } catch (ossErr) {
      strapi.log.warn(`[zhao-oss] OSS upload failed, falling back to local: ${ossErr.message}`);
    }
    const uploadFile = await strapi.db.query(FILE_UID).create({
      data: {
        name: fileName,
        alternativeText: null,
        caption: null,
        width,
        height,
        formats,
        hash: fileHash,
        ext,
        mime: mimeType,
        size: fileSize,
        url: ossUrl || localUrl,
        previewUrl: null,
        provider: providerName,
        provider_metadata: { ossUrl, localUrl, ossStatus },
        folder: folderRecord?.id || null,
        folderPath: strapiFolderPath
      }
    });
    await strapi.db.query(SYNC_RECORD_UID).create({
      data: {
        fileId: uploadFile.id,
        fileHash,
        status: ossStatus,
        provider: providerName,
        remoteUrl: ossUrl,
        remoteEtag: null,
        errorMessage: ossStatus === "pending" ? "OSS upload failed, pending sync" : null,
        lastSyncedAt: ossStatus === "success" ? /* @__PURE__ */ new Date() : null,
        retryCount: 0
      }
    });
    if (siteId) {
      try {
        await strapi.db.query("plugin::zhao-oss.media-meta").create({
          data: {
            site: siteId,
            file: uploadFile.id,
            fileId: uploadFile.id,
            folder: folderRecord?.id || null,
            category: category || "general",
            uploader: uploader || null,
            originalFilename: originalName,
            mimeType,
            fileSize,
            fileExt: ext,
            isPublic: true
          }
        });
      } catch (metaErr) {
        strapi.log.warn(`[zhao-oss] Failed to create media-meta: ${metaErr.message}`);
      }
    }
    return {
      id: uploadFile.id,
      documentId: uploadFile.documentId,
      name: uploadFile.name,
      url: ossUrl || localUrl,
      hash: fileHash,
      ext,
      mime: mimeType,
      size: fileSize,
      provider: providerName,
      folderPath: strapiFolderPath,
      provider_metadata: { ossUrl, localUrl, ossStatus }
    };
  },
  /**
   * 检查用户是否有权删除指定文件
   * 规则：admin / channel-admin 可删除任何文件，其他用户只能删除自己创建的文件
   */
  async canDeleteFile(fileId, user) {
    const file = await strapi.db.query(FILE_UID).findOne({
      where: { id: fileId }
    });
    if (!file) return false;
    const userRoles = (user?.roles || []).map((r) => {
      if (typeof r === "string") return r;
      if (r?.type) return r.type;
      if (r?.name) return r.name;
      return null;
    }).filter(Boolean);
    const isAdmin = userRoles.includes("admin");
    const isChannelAdmin = userRoles.includes("channel-admin");
    const isOwner = file.createdBy === user?.id || file.created_by === user?.id;
    return isAdmin || isChannelAdmin || isOwner;
  },
  /**
   * 文件列表查询（分页 + 过滤）
   * 管理员以上角色不过滤 createdBy，其他用户自动添加 createdBy 过滤
   */
  async listFiles(params) {
    const { page, pageSize, folderPath, mime, search, sort = "createdAt:desc", user } = params;
    const where = {};
    if (folderPath) {
      where.$or = [
        { folderPath },
        { folderPath: { $startsWith: folderPath + "/" } }
      ];
    }
    if (mime) where.mime = { $contains: mime };
    if (search) where.name = { $containsi: search };
    if (user) {
      const userRoles = (user.roles || []).map((r) => {
        if (typeof r === "string") return r;
        if (r?.type) return r.type;
        if (r?.name) return r.name;
        return null;
      }).filter(Boolean);
      const isAdmin = userRoles.some((r) => ["admin", "channel-admin", "plugin-admin"].includes(r));
      if (!isAdmin) {
        where.createdBy = user.id;
      }
    }
    const [sortField, sortDir] = sort.split(":");
    const orderBy = {};
    orderBy[sortField || "createdAt"] = sortDir === "asc" ? "asc" : "desc";
    const offset = (page - 1) * pageSize;
    const [files, total] = await Promise.all([
      strapi.db.query(FILE_UID).findMany({ where, limit: pageSize, offset, orderBy }),
      strapi.db.query(FILE_UID).count({ where })
    ]);
    return {
      list: files.map((f) => ({
        id: f.id,
        documentId: f.documentId,
        name: f.name,
        url: f.url,
        hash: f.hash,
        ext: f.ext,
        mime: f.mime,
        size: f.size,
        provider: f.provider,
        folderPath: f.folderPath,
        provider_metadata: f.provider_metadata,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      })),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 获取文件夹树
   */
  async getFolderTree() {
    const folders = await strapi.db.query(FOLDER_UID).findMany({
      orderBy: { path: "asc" },
      populate: { parent: { select: ["id"] } }
    });
    const buildTree = (items, parentId = null) => {
      return items.filter((item) => {
        const itemParentId = item.parent?.id ?? item.parent ?? null;
        return itemParentId === parentId;
      }).map((item) => ({
        id: item.id,
        documentId: item.documentId,
        name: item.name,
        path: item.path,
        pathId: item.pathId,
        children: buildTree(items, item.id)
      }));
    };
    return buildTree(folders);
  },
  /**
   * 创建文件夹
   */
  async createFolder(name, parentId = null) {
    const existing = await strapi.db.query(FOLDER_UID).findOne({
      where: { name, parent: parentId || null }
    });
    if (existing) {
      return { id: existing.id, documentId: existing.documentId, name: existing.name, path: existing.path };
    }
    const pathId = await this.getNextPathId();
    let parentPath = "/";
    let parentFolder = null;
    if (parentId) {
      parentFolder = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parentId } });
      if (parentFolder) parentPath = parentFolder.path;
    }
    const folderPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;
    const folder = await strapi.db.query(FOLDER_UID).create({
      data: { name, pathId, path: folderPath, parent: parentFolder?.id || null }
    });
    return { id: folder.id, documentId: folder.documentId, name: folder.name, path: folder.path };
  },
  /**
   * 根据 ID 查找文件
   */
  async findFileById(fileId) {
    return strapi.db.query(FILE_UID).findOne({ where: { id: fileId } });
  },
  /**
   * 同步记录列表查询（分页 + 过滤）
   */
  async listSyncRecords(params) {
    const { page, pageSize, status } = params;
    const offset = (page - 1) * pageSize;
    const where = {};
    if (status) where.status = status;
    const [records, total] = await Promise.all([
      strapi.db.query(SYNC_RECORD_UID).findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: { createdAt: "desc" }
      }),
      strapi.db.query(SYNC_RECORD_UID).count({ where })
    ]);
    return {
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  /**
   * 修复文件夹结构：删除无效的数字名文件夹 + 修复文件的 folderPath
   */
  async repairFolders() {
    const results = [];
    const allFolders = await strapi.db.query(FOLDER_UID).findMany({});
    const numericNameFolders = allFolders.filter((f) => /^\d+$/.test(f.name));
    for (const folder of numericNameFolders) {
      const filesInFolder = await strapi.db.query(FILE_UID).count({
        where: { folderPath: folder.path }
      });
      if (filesInFolder === 0) {
        await strapi.db.query(FOLDER_UID).delete({ where: { id: folder.id } });
        results.push(`Deleted invalid folder: id=${folder.id}, name="${folder.name}", path="${folder.path}"`);
      } else {
        results.push(`Kept numeric-name folder (has files): id=${folder.id}, name="${folder.name}"`);
      }
    }
    const allFiles = await strapi.db.query(FILE_UID).findMany({});
    for (const file of allFiles) {
      if (!file.folderPath || file.folderPath === "/") continue;
      const segments = file.folderPath.split("/").filter(Boolean);
      const isPathIdFormat = segments.every((s) => /^\d+$/.test(s));
      if (isPathIdFormat) continue;
      let current = null;
      for (const segment of segments) {
        const where = { name: segment };
        if (current) where.parent = current.id;
        else where.parent = null;
        const found = await strapi.db.query(FOLDER_UID).findOne({ where });
        if (!found) {
          current = await this.ensureFolderByPath(file.folderPath);
          break;
        }
        current = found;
      }
      if (current) {
        const oldPath = file.folderPath;
        await strapi.db.query(FILE_UID).update({
          where: { id: file.id },
          data: { folderPath: current.path, folder: current.id }
        });
        results.push(`Fixed file id=${file.id}: folderPath "${oldPath}" -> "${current.path}"`);
      }
    }
    return results;
  },
  /**
   * 为站点创建默认媒体文件夹（site-config 创建时调用）
   */
  async ensureSiteDefaultFolders(siteId) {
    const SITE_DEFAULT_FOLDERS = [
      { name: "general", category: "general" },
      { name: "articles", category: "article" },
      { name: "products", category: "product" },
      { name: "cases", category: "case" },
      { name: "compliance", category: "compliance" },
      { name: "faqs", category: "faq" },
      { name: "tutorials", category: "tutorial" },
      { name: "downloads", category: "download" },
      { name: "brand", category: "brand" }
    ];
    const siteRoot = await this.ensureFolderByPath(`site-${siteId}`);
    for (const folder of SITE_DEFAULT_FOLDERS) {
      await this.ensureFolderByPath(`site-${siteId}/${folder.name}`);
    }
    return siteRoot;
  },
  /**
   * 按站点查询媒体文件（通过 media-meta 关联表）
   */
  async listFilesBySite(siteId, params = {}) {
    const { page = 1, pageSize = 20, category } = params;
    const where = { site: siteId, deletedAt: null };
    if (category) where.category = category;
    const [metas, total] = await Promise.all([
      strapi.db.query("plugin::zhao-oss.media-meta").findMany({
        where,
        limit: Number(pageSize),
        offset: (Number(page) - 1) * Number(pageSize),
        populate: ["file"],
        orderBy: { createdAt: "DESC" }
      }),
      strapi.db.query("plugin::zhao-oss.media-meta").count({ where })
    ]);
    return {
      list: metas.map((m) => m.file).filter(Boolean),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        pageCount: Math.ceil(total / Number(pageSize))
      }
    };
  }
});
const services = {
  "provider-registry": providerRegistry,
  "sync-service": syncService,
  "url-resolver": urlResolver,
  "media-service": mediaService
};
const policies = {};
const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies
};
export {
  index as default
};

import type { Core } from "@strapi/strapi";
import crypto from "crypto";

export interface SyncService {
  backupFile(fileId: number): Promise<void>;
  batchSync(limit?: number, offset?: number): Promise<{ total: number; success: number; failed: number }>;
  deleteRemote(recordId: number): Promise<void>;
  deleteFileCompletely(fileId: number): Promise<{ deletedLocal: boolean; deletedRemote: boolean; deletedRecord: boolean }>;
  checkSyncStatus(fileId: number): Promise<{ synced: boolean; provider?: string; remoteUrl?: string }>;
  getSyncStats(): Promise<{ total: number; synced: number; failed: number; pending: number }>;
}

export default ({ strapi }: { strapi: Core.Strapi }): SyncService => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const pluginConfig = strapi.config.get("plugin::zhao-oss") as Record<string, unknown> | undefined;

  const getConfigValue = <T>(key: string, defaultValue: T): T => {
    return (pluginConfig?.[key] as T) ?? defaultValue;
  };

  const syncService: SyncService = {
    async backupFile(fileId: number): Promise<void> {
      const maxRetries = getConfigValue("maxRetries", 3);
      const uploadTimeoutMs = getConfigValue("uploadTimeoutMs", 30000);

      const file = await strapi.db.query("plugin::upload.file").findOne({
        where: { id: fileId },
      });

      if (!file) {
        logger.warn(`[zhao-oss] File not found for backup: id=${fileId}`);
        return;
      }

      const providerRegistry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = providerRegistry.getPrimaryProvider();
      if (!provider) {
        logger.warn("[zhao-oss] No OSS provider available for backup");
        return;
      }

      const existingRecord = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { fileId },
      });

      if (existingRecord?.status === "success") {
        return;
      }

      const fs = require("fs/promises");
      const path = require("path");

      let fileBuffer: Buffer;
      try {
        const uploadDir = strapi.dirs.static.public;
        // 去除 /static 前缀后再拼接物理路径（url 是对外访问路径，物理文件在 public/ 下不包含 /static）
        const LOCAL_URL_PREFIX = "/static";
        const localPath = file.url?.startsWith(LOCAL_URL_PREFIX)
          ? file.url.slice(LOCAL_URL_PREFIX.length)
          : file.url;
        const filePath = localPath ? path.join(uploadDir, localPath) : null;

        if (filePath && fs.access(filePath).then(() => true).catch(() => false)) {
          fileBuffer = await fs.readFile(filePath);
        } else if (file.buffer) {
          fileBuffer = Buffer.from(file.buffer);
        } else {
          logger.error(`[zhao-oss] Cannot read file for upload: id=${fileId}, url=${file.url}`);
          return;
        }
      } catch (err) {
        logger.error(`[zhao-oss] Failed to read file: id=${fileId}`, {
          error: (err as Error).message,
        });
        return;
      }

      const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

      let record: { id: number };
      if (existingRecord) {
        await strapi.db.query("plugin::zhao-oss.sync-record").update({
          where: { id: existingRecord.id },
          data: {
            status: "syncing",
            retryCount: existingRecord.retryCount + 1,
            fileHash,
          },
        });
        record = existingRecord;
      } else {
        record = await strapi.db.query("plugin::zhao-oss.sync-record").create({
          data: {
            fileId,
            fileHash,
            status: "syncing",
            provider: provider.name,
            retryCount: 0,
          },
        });
      }

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Upload timeout")), uploadTimeoutMs)
          );

          const uploadPromise = provider.upload({
            buffer: fileBuffer,
            filename: file.hash || file.name || `file_${fileId}`,
            mimeType: file.mime || "application/octet-stream",
            fileSize: file.size || fileBuffer.length,
          });

          const result = await Promise.race([uploadPromise, timeoutPromise]);

          await strapi.db.query("plugin::zhao-oss.sync-record").update({
            where: { id: record.id },
            data: {
              status: "success",
              remoteUrl: result.url,
              remoteEtag: result.etag || null,
              errorMessage: null,
              lastSyncedAt: new Date(),
              retryCount: attempt,
            },
          });

          logger.info(`[zhao-oss] File synced successfully: id=${fileId}, url=${result.url}`);
          return;
        } catch (err) {
          lastError = err as Error;
          logger.warn(
            `[zhao-oss] Upload attempt ${attempt + 1}/${maxRetries + 1} failed for file ${fileId}`,
            { error: lastError.message }
          );

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      await strapi.db.query("plugin::zhao-oss.sync-record").update({
        where: { id: record.id },
        data: {
          status: "failed",
          errorMessage: lastError?.message || "Unknown error",
          lastSyncedAt: new Date(),
        },
      });

      logger.error(`[zhao-oss] File sync failed after ${maxRetries + 1} attempts: id=${fileId}`, {
        error: lastError?.message,
      });
    },

    async batchSync(limit = 50, offset = 0): Promise<{ total: number; success: number; failed: number }> {
      const unsyncedFiles = await strapi.db.query("plugin::upload.file").findMany({
        limit,
        offset,
        orderBy: "id",
      });

      const total = unsyncedFiles.length;
      let success = 0;
      let failed = 0;

      for (const file of unsyncedFiles) {
        try {
          await syncService.backupFile(file.id);
          success++;
        } catch {
          failed++;
        }
      }

      return { total, success, failed };
    },

    async deleteRemote(recordId: number): Promise<void> {
      const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { id: recordId },
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
            remoteEtag: null,
          },
        });

        logger.info(`[zhao-oss] Remote file deleted: recordId=${recordId}`);
      } catch (err) {
        logger.error(`[zhao-oss] Failed to delete remote file: recordId=${recordId}`, {
          error: (err as Error).message,
        });
      }
    },

    async deleteFileCompletely(fileId: number): Promise<{ deletedLocal: boolean; deletedRemote: boolean; deletedRecord: boolean }> {
      const result = { deletedLocal: false, deletedRemote: false, deletedRecord: false };

      const file = await strapi.db.query("plugin::upload.file").findOne({
        where: { id: fileId },
      });

      if (!file) {
        logger.warn(`[zhao-oss] File not found for complete deletion: id=${fileId}`);
        return result;
      }

      const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
        where: { fileId },
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
              error: (err as Error).message,
            });
          }
        }

        try {
          await strapi.db.query("plugin::zhao-oss.sync-record").delete({
            where: { id: record.id },
          });
          result.deletedRecord = true;
        } catch (err) {
          logger.warn(`[zhao-oss] Failed to delete sync-record: id=${record.id}`, {
            error: (err as Error).message,
          });
        }
      }

      try {
        const fs = require("fs/promises");
        const path = require("path");
        const uploadDir = strapi.dirs.static.public;
        if (file.url) {
          // 去除 /static 前缀后再拼接物理路径
          const LOCAL_URL_PREFIX = "/static";
          const localPath = file.url.startsWith(LOCAL_URL_PREFIX)
            ? file.url.slice(LOCAL_URL_PREFIX.length)
            : file.url;
          const filePath = path.join(uploadDir, localPath);
          await fs.access(filePath);
          await fs.unlink(filePath);
          result.deletedLocal = true;
        }
      } catch (err) {
        logger.debug(`[zhao-oss] Local file already removed or not found: fileId=${fileId}`, {
          error: (err as Error).message,
        });
      }

      try {
        await strapi.db.query("plugin::upload.file").delete({
          where: { id: fileId },
        });
      } catch (err) {
        logger.warn(`[zhao-oss] Failed to delete upload.file record: id=${fileId}`, {
          error: (err as Error).message,
        });
      }

      logger.info(`[zhao-oss] File completely deleted: fileId=${fileId}`, result);
      return result;
    },

    async checkSyncStatus(fileId: number): Promise<{ synced: boolean; provider?: string; remoteUrl?: string }> {
      const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
        where: { fileId },
      });

      if (!record) return { synced: false };

      return {
        synced: record.status === "success",
        provider: record.status === "success" ? record.provider : undefined,
        remoteUrl: record.remoteUrl || undefined,
      };
    },

    async getSyncStats(): Promise<{ total: number; synced: number; failed: number; pending: number }> {
      const allRecords = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({});
      const total = allRecords.length;
      const synced = allRecords.filter((r: { status: string }) => r.status === "success").length;
      const failed = allRecords.filter((r: { status: string }) => r.status === "failed").length;
      const pending = allRecords.filter(
        (r: { status: string }) => r.status === "pending" || r.status === "syncing"
      ).length;

      return { total, synced, failed, pending };
    },
  };

  return syncService;
};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    var _a;
    const logger = ((_a = strapi.plugin("zhao-common")) === null || _a === void 0 ? void 0 : _a.service("logger")) || strapi.log;
    const urlResolver = {
        async resolveUrl(file) {
            try {
                const pluginConfig = strapi.config.get("plugin::zhao-oss");
                const fallbackToLocal = (pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.fallbackToLocal) !== false;
                const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
                    where: { fileId: file.id },
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
            }
            catch (err) {
                logger.debug(`[zhao-oss] URL resolution failed for file ${file.id}, using local`, {
                    error: err.message,
                });
                return file.url;
            }
        },
        async resolveUrls(files) {
            const result = new Map();
            if (files.length === 0)
                return result;
            try {
                const pluginConfig = strapi.config.get("plugin::zhao-oss");
                const fallbackToLocal = (pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.fallbackToLocal) !== false;
                const enableUrlRewrite = (pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.enableUrlRewrite) !== false;
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
                    }
                    catch {
                        ossHealthy = false;
                    }
                }
                const fileIds = files.map((f) => f.id);
                const records = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
                    where: { fileId: { $in: fileIds }, status: "success" },
                });
                const recordMap = new Map();
                for (const record of records) {
                    if (record.remoteUrl) {
                        recordMap.set(record.fileId, { remoteUrl: record.remoteUrl });
                    }
                }
                for (const file of files) {
                    const record = recordMap.get(file.id);
                    if (record && ossHealthy) {
                        result.set(file.id, record.remoteUrl);
                    }
                    else {
                        result.set(file.id, file.url);
                    }
                }
            }
            catch (err) {
                logger.debug("[zhao-oss] Batch URL resolution failed, using local URLs", {
                    error: err.message,
                });
                for (const file of files) {
                    result.set(file.id, file.url);
                }
            }
            return result;
        },
    };
    return urlResolver;
};

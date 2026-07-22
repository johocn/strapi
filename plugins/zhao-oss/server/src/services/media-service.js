"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const FOLDER_UID = "plugin::upload.folder";
const FILE_UID = "plugin::upload.file";
const SYNC_RECORD_UID = "plugin::zhao-oss.sync-record";
exports.default = ({ strapi }) => ({
    /**
     * 获取下一个可用的 pathId
     */
    async getNextPathId() {
        const result = (await strapi.db.queryBuilder(FOLDER_UID).max("pathId").first().execute());
        return ((result === null || result === void 0 ? void 0 : result.max) || 0) + 1;
    },
    /**
     * 按人类可读路径确保文件夹存在（不存在则逐级创建）
     */
    async ensureFolderByPath(humanPath) {
        const segments = humanPath.split("/").filter(Boolean);
        let parentFolder = null;
        for (const segment of segments) {
            let existing = await strapi.db.query(FOLDER_UID).findOne({
                where: { name: segment, parent: (parentFolder === null || parentFolder === void 0 ? void 0 : parentFolder.id) || null },
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
                        parent: (parentFolder === null || parentFolder === void 0 ? void 0 : parentFolder.id) || null,
                    },
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
        var _a;
        const parts = [];
        let current = await strapi.db.query(FOLDER_UID).findOne({ where: { id: folderId } });
        while (current) {
            parts.unshift(current.name);
            const parentId = ((_a = current.parent) === null || _a === void 0 ? void 0 : _a.id) || current.parent;
            if (parentId) {
                current = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parentId } });
            }
            else {
                break;
            }
        }
        return "/" + parts.join("/");
    },
    /**
     * 上传文件：本地存储 + OSS 同步 + 数据库记录
     */
    async uploadFile(params) {
        var _a, _b;
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
        }
        else if (folderInput && folderInput !== "/") {
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
        const localUrl = `/static${storagePath}/${localFileName}`;
        let width = null;
        let height = null;
        let formats = {};
        if (mimeType.startsWith("image/")) {
            try {
                const metadata = await (0, sharp_1.default)(fileBuffer).metadata();
                width = (_a = metadata.width) !== null && _a !== void 0 ? _a : null;
                height = (_b = metadata.height) !== null && _b !== void 0 ? _b : null;
            }
            catch {
                // ignore
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
                    fileSize,
                });
                ossUrl = result.url;
                ossStatus = "success";
                providerName = result.provider || "aliyun";
            }
        }
        catch (ossErr) {
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
                folder: (folderRecord === null || folderRecord === void 0 ? void 0 : folderRecord.id) || null,
                folderPath: strapiFolderPath,
            },
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
                lastSyncedAt: ossStatus === "success" ? new Date() : null,
                retryCount: 0,
            },
        });
        // 写入 media-meta 租户关联（如果提供了 siteId）
        if (siteId) {
            try {
                await strapi.db.query("plugin::zhao-oss.media-meta").create({
                    data: {
                        site: siteId,
                        file: uploadFile.id,
                        fileId: uploadFile.id,
                        folder: (folderRecord === null || folderRecord === void 0 ? void 0 : folderRecord.id) || null,
                        category: category || "general",
                        uploader: uploader || null,
                        originalFilename: originalName,
                        mimeType,
                        fileSize,
                        fileExt: ext,
                        isPublic: true,
                    },
                });
            }
            catch (metaErr) {
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
            provider_metadata: { ossUrl, localUrl, ossStatus },
        };
    },
    /**
     * 检查用户是否有权删除指定文件
     * 规则：admin / channel-admin 可删除任何文件，其他用户只能删除自己创建的文件
     */
    async canDeleteFile(fileId, user) {
        const file = await strapi.db.query(FILE_UID).findOne({
            where: { id: fileId },
        });
        if (!file)
            return false;
        const userRoles = ((user === null || user === void 0 ? void 0 : user.roles) || []).map((r) => {
            if (typeof r === "string")
                return r;
            if (r === null || r === void 0 ? void 0 : r.type)
                return r.type;
            if (r === null || r === void 0 ? void 0 : r.name)
                return r.name;
            return null;
        }).filter(Boolean);
        const isAdmin = userRoles.includes("admin");
        const isChannelAdmin = userRoles.includes("channel-admin");
        const isOwner = file.createdBy === (user === null || user === void 0 ? void 0 : user.id) || file.created_by === (user === null || user === void 0 ? void 0 : user.id);
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
                { folderPath: { $startsWith: folderPath + "/" } },
            ];
        }
        if (mime)
            where.mime = { $contains: mime };
        if (search)
            where.name = { $containsi: search };
        // 权限过滤：非管理员只能看自己上传的文件
        if (user) {
            const userRoles = (user.roles || []).map((r) => {
                if (typeof r === "string")
                    return r;
                if (r === null || r === void 0 ? void 0 : r.type)
                    return r.type;
                if (r === null || r === void 0 ? void 0 : r.name)
                    return r.name;
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
            strapi.db.query(FILE_UID).count({ where }),
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
                updatedAt: f.updatedAt,
            })),
            pagination: {
                page,
                pageSize,
                total,
                pageCount: Math.ceil(total / pageSize),
            },
        };
    },
    /**
     * 获取文件夹树
     */
    async getFolderTree() {
        const folders = await strapi.db.query(FOLDER_UID).findMany({
            orderBy: { path: "asc" },
            populate: { parent: { select: ["id"] } },
        });
        const buildTree = (items, parentId = null) => {
            return items
                .filter((item) => {
                var _a, _b, _c;
                const itemParentId = (_c = (_b = (_a = item.parent) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : item.parent) !== null && _c !== void 0 ? _c : null;
                return itemParentId === parentId;
            })
                .map((item) => ({
                id: item.id,
                documentId: item.documentId,
                name: item.name,
                path: item.path,
                pathId: item.pathId,
                children: buildTree(items, item.id),
            }));
        };
        return buildTree(folders);
    },
    /**
     * 创建文件夹
     */
    async createFolder(name, parentId = null) {
        const existing = await strapi.db.query(FOLDER_UID).findOne({
            where: { name, parent: parentId || null },
        });
        if (existing) {
            return { id: existing.id, documentId: existing.documentId, name: existing.name, path: existing.path };
        }
        const pathId = await this.getNextPathId();
        let parentPath = "/";
        let parentFolder = null;
        if (parentId) {
            parentFolder = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parentId } });
            if (parentFolder)
                parentPath = parentFolder.path;
        }
        const folderPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;
        const folder = await strapi.db.query(FOLDER_UID).create({
            data: { name, pathId, path: folderPath, parent: (parentFolder === null || parentFolder === void 0 ? void 0 : parentFolder.id) || null },
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
        if (status)
            where.status = status;
        const [records, total] = await Promise.all([
            strapi.db.query(SYNC_RECORD_UID).findMany({
                where,
                limit: pageSize,
                offset,
                orderBy: { createdAt: "desc" },
            }),
            strapi.db.query(SYNC_RECORD_UID).count({ where }),
        ]);
        return {
            data: records,
            pagination: {
                page,
                pageSize,
                total,
                pageCount: Math.ceil(total / pageSize),
            },
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
                where: { folderPath: folder.path },
            });
            if (filesInFolder === 0) {
                await strapi.db.query(FOLDER_UID).delete({ where: { id: folder.id } });
                results.push(`Deleted invalid folder: id=${folder.id}, name="${folder.name}", path="${folder.path}"`);
            }
            else {
                results.push(`Kept numeric-name folder (has files): id=${folder.id}, name="${folder.name}"`);
            }
        }
        const allFiles = await strapi.db.query(FILE_UID).findMany({});
        for (const file of allFiles) {
            if (!file.folderPath || file.folderPath === "/")
                continue;
            const segments = file.folderPath.split("/").filter(Boolean);
            const isPathIdFormat = segments.every((s) => /^\d+$/.test(s));
            if (isPathIdFormat)
                continue;
            let current = null;
            for (const segment of segments) {
                const where = { name: segment };
                if (current)
                    where.parent = current.id;
                else
                    where.parent = null;
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
                    data: { folderPath: current.path, folder: current.id },
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
            { name: "brand", category: "brand" },
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
        if (category)
            where.category = category;
        const [metas, total] = await Promise.all([
            strapi.db.query("plugin::zhao-oss.media-meta").findMany({
                where,
                limit: Number(pageSize),
                offset: (Number(page) - 1) * Number(pageSize),
                populate: ["file"],
                orderBy: { createdAt: "DESC" },
            }),
            strapi.db.query("plugin::zhao-oss.media-meta").count({ where }),
        ]);
        return {
            list: metas.map((m) => m.file).filter(Boolean),
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize),
                total,
                pageCount: Math.ceil(total / Number(pageSize)),
            },
        };
    },
});

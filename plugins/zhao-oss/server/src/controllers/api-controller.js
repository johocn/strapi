"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = ({ strapi }) => ({
    async upload(ctx) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const { files } = ctx.request;
            if (!files || Object.keys(files).length === 0) {
                ctx.status = 400;
                ctx.body = { error: "No files provided" };
                return;
            }
            const file = Object.values(files)[0];
            const fs = require("fs/promises");
            const filePath = (_a = file.filepath) !== null && _a !== void 0 ? _a : file.path;
            const fileBuffer = filePath ? await fs.readFile(filePath) : file.buffer;
            const originalName = (_c = (_b = file.originalFilename) !== null && _b !== void 0 ? _b : file.name) !== null && _c !== void 0 ? _c : "";
            const mimeType = (_e = (_d = file.mimetype) !== null && _d !== void 0 ? _d : file.type) !== null && _e !== void 0 ? _e : "application/octet-stream";
            const fileSize = file.size || fileBuffer.length;
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            const body = ((_f = ctx.request.body) === null || _f === void 0 ? void 0 : _f.data) || ctx.request.body;
            const result = await mediaService.uploadFile({
                fileBuffer,
                originalName,
                customName: (body === null || body === void 0 ? void 0 : body.name) || null,
                mimeType,
                fileSize,
                folderInput: (body === null || body === void 0 ? void 0 : body.folder) || "/general",
                folderIdInput: body === null || body === void 0 ? void 0 : body.folderId,
            });
            ctx.body = wrap(result);
        }
        catch (e) {
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
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            ctx.body = wrap(await syncService.checkSyncStatus(parseInt(fileId)));
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async mediaList(ctx) {
        var _a;
        try {
            const { page = 1, pageSize = 20, folderPath, mime, search, sort = "createdAt:desc" } = ctx.query;
            const user = ((_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) || ctx.user || null;
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            ctx.body = wrapList(await mediaService.listFiles({
                page: parseInt(page), pageSize: parseInt(pageSize), folderPath, mime, search, sort,
                user,
            }));
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async getFolders(ctx) {
        try {
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            const folders = await mediaService.getFolderTree();
            ctx.body = wrap({ folders });
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async createFolder(ctx) {
        var _a;
        try {
            const body = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const { name, parentId = null } = body;
            if (!name) {
                ctx.status = 400;
                ctx.body = { error: "Folder name is required" };
                return;
            }
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            ctx.body = wrap(await mediaService.createFolder(name, parentId));
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async deleteMedia(ctx) {
        var _a;
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
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            const file = await mediaService.findFileById(parsedId);
            if (!file) {
                ctx.status = 404;
                ctx.body = { error: "File not found" };
                return;
            }
            const user = ((_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) || ctx.user;
            const canDelete = await mediaService.canDeleteFile(parsedId, user);
            if (!canDelete) {
                ctx.status = 403;
                ctx.body = { error: "无权删除此媒体文件" };
                return;
            }
            const syncService = strapi.plugin("zhao-oss").service("sync-service");
            const result = await syncService.deleteFileCompletely(parsedId);
            ctx.body = wrap({ success: true, fileId: parsedId, details: result });
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async repairFolders(ctx) {
        try {
            const mediaService = strapi.plugin("zhao-oss").service("media-service");
            const results = await mediaService.repairFolders();
            ctx.body = wrap({ success: true, results });
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});

import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async upload(ctx: any) {
    try {
      const { files } = ctx.request;
      if (!files || Object.keys(files).length === 0) {
        ctx.status = 400;
        ctx.body = { error: "No files provided" };
        return;
      }

      const file = Object.values(files)[0] as any;
      const fs = require("fs/promises");
      const filePath = file.filepath ?? file.path;
      const fileBuffer: Buffer = filePath ? await fs.readFile(filePath) : file.buffer;
      const originalName = file.originalFilename ?? file.name ?? "";
      const mimeType = file.mimetype ?? file.type ?? "application/octet-stream";
      const fileSize = file.size || fileBuffer.length;

      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      const body = ctx.request.body?.data || ctx.request.body;
      const result = await mediaService.uploadFile({
        fileBuffer,
        originalName,
        customName: body?.name || null,
        mimeType,
        fileSize,
        folderInput: body?.folder || "/general",
        folderIdInput: body?.folderId,
      });

      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async getSyncStatus(ctx: any) {
    try {
      const { fileId } = ctx.params;
      if (!fileId) { ctx.status = 400; ctx.body = { error: "fileId is required" }; return; }

      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      ctx.body = wrap(await syncService.checkSyncStatus(parseInt(fileId)));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async mediaList(ctx: any) {
    try {
      const { page = 1, pageSize = 20, folderPath, mime, search, sort = "createdAt:desc" } = ctx.query;
      const user = ctx.state?.user || ctx.user || null;
      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = wrapList(await mediaService.listFiles({
        page: parseInt(page), pageSize: parseInt(pageSize), folderPath, mime, search, sort,
        user,
      }));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async getFolders(ctx: any) {
    try {
      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      const folders = await mediaService.getFolderTree();
      ctx.body = wrap({ folders });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async createFolder(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { name, parentId = null } = body;
      if (!name) { ctx.status = 400; ctx.body = { error: "Folder name is required" }; return; }

      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      ctx.body = wrap(await mediaService.createFolder(name, parentId));
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async deleteMedia(ctx: any) {
    try {
      const { fileId } = ctx.params;
      if (!fileId) { ctx.status = 400; ctx.body = { error: "fileId is required" }; return; }

      const parsedId = parseInt(fileId, 10);
      if (isNaN(parsedId)) { ctx.status = 400; ctx.body = { error: "Invalid fileId" }; return; }

      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      const file = await mediaService.findFileById(parsedId);
      if (!file) { ctx.status = 404; ctx.body = { error: "File not found" }; return; }

      const user = ctx.state?.user || ctx.user;
      const canDelete = await mediaService.canDeleteFile(parsedId, user);
      if (!canDelete) { ctx.status = 403; ctx.body = { error: "无权删除此媒体文件" }; return; }

      const syncService = strapi.plugin("zhao-oss").service("sync-service");
      const result = await syncService.deleteFileCompletely(parsedId);
      ctx.body = wrap({ success: true, fileId: parsedId, details: result });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },

  async getReferences(ctx: any) {
    try {
      const { fileId } = ctx.params;
      if (!fileId) { ctx.status = 400; ctx.body = { error: "fileId is required" }; return; }

      const parsedId = parseInt(fileId, 10);
      if (isNaN(parsedId)) { ctx.status = 400; ctx.body = { error: "Invalid fileId" }; return; }

      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      const file = await mediaService.findFileById(parsedId);
      if (!file) { ctx.status = 404; ctx.body = { error: "File not found" }; return; }

      const user = ctx.state?.user || ctx.user;
      const canAccess = await mediaService.canDeleteFile(parsedId, user);
      if (!canAccess) { ctx.status = 403; ctx.body = { error: "无权查看此文件的引用信息" }; return; }

      const references = await mediaService.checkReferences(parsedId);

      ctx.body = {
        data: {
          fileId: parsedId,
          fileName: file.name || `#${parsedId}`,
          fileSize: file.size,
          fileMime: file.mime,
          totalCount: references.reduce((sum: number, r: any) => sum + r.items.length, 0),
          hasRequiredReference: references.some((r: any) => r.required),
          references,
        },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async repairFolders(ctx: any) {
    try {
      const mediaService = strapi.plugin("zhao-oss").service("media-service");
      const results = await mediaService.repairFolders();
      ctx.body = wrap({ success: true, results });
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message };
    }
  },
});

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

  /**
   * 为受保护媒体路径签发短期签名播放地址（is-authenticated 已校验登录）
   * body: { path } → 原始视频/音频 URL（本地 /static 或 /uploads 路径）
   * 返回: { data: { url } }，url 为相对 BASE_API 的流式地址
   */
  async issueStreamToken(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body || {};
      const pathStr = typeof body.path === "string" ? body.path : "";
      if (!pathStr) {
        ctx.status = 400;
        ctx.body = { error: "path is required" };
        return;
      }

      const mediaStream = strapi.plugin("zhao-oss").service("media-stream");
      const url = await mediaStream.issueStreamUrl(pathStr);
      ctx.body = wrap({ url });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  /**
   * 流式交付受保护媒体文件（支持 Range 断点续播/拖动进度条）
   * query: path(URL路径) + exp(过期秒级时间戳) + sig(HMAC 签名)
   */
  async streamMedia(ctx: any) {
    const mediaStream = strapi.plugin("zhao-oss").service("media-stream");
    const target = mediaStream.resolveStreamFile({
      path: ctx.query.path,
      exp: ctx.query.exp,
      sig: ctx.query.sig,
    });

    if (!target) {
      ctx.status = 403;
      ctx.body = { error: "鉴权失败或文件不存在" };
      return;
    }

    const { filePath, mime } = target;

    let total = 0;
    try {
      total = (await import("fs")).statSync(filePath).size;
    } catch {
      ctx.status = 404;
      ctx.body = { error: "文件不存在" };
      return;
    }
    if (total <= 0) {
      ctx.status = 404;
      ctx.body = { error: "文件为空" };
      return;
    }

    const fs = require("fs");
    const range = ctx.headers.range || "";
    let start = 0;
    let end = total - 1;
    let status = 200;

    const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    if (m) {
      const s = m[1] ? parseInt(m[1], 10) : 0;
      const e = m[2] ? parseInt(m[2], 10) : total - 1;
      start = Number.isNaN(s) ? 0 : s;
      end = Number.isNaN(e) ? total - 1 : e;
      if (start > end) {
        ctx.status = 416;
        ctx.set("Content-Range", `bytes */${total}`);
        ctx.body = "";
        return;
      }
      if (end >= total) end = total - 1;
      status = 206;
    }

    ctx.status = status;
    ctx.set("Content-Type", mime);
    ctx.set("Accept-Ranges", "bytes");
    ctx.set("Content-Length", String(end - start + 1));
    if (status === 206) {
      ctx.set("Content-Range", `bytes ${start}-${end}/${total}`);
    }
    ctx.set("Cache-Control", "private, max-age=0, must-revalidate");

    if (ctx.method === "HEAD") {
      ctx.body = "";
      return;
    }

    ctx.body = fs.createReadStream(filePath, { start, end });
  },
});

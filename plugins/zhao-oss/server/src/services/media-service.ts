import type { Core } from "@strapi/strapi";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";

const FOLDER_UID = "plugin::upload.folder";
const FILE_UID = "plugin::upload.file";
const SYNC_RECORD_UID = "plugin::zhao-oss.sync-record";

/**
 * 判断路径是否为纯数字路径（如 /3/4）
 * 根目录 / 视为数字路径
 */
function isNumericPath(p: string): boolean {
  if (!p || p === "/") return true;
  const segs = p.split("/").filter(Boolean);
  return segs.every((s) => /^\d+$/.test(s));
}

export interface UploadParams {
  fileBuffer: Buffer;
  originalName: string;
  customName?: string | null;
  mimeType: string;
  fileSize: number;
  folderInput?: string;
  folderIdInput?: string;
  siteId?: number;
  category?: string;
  uploader?: number;
}

export interface UploadResult {
  id: number;
  documentId: string;
  name: string;
  url: string;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  provider: string;
  folderPath: string;
  provider_metadata: {
    ossUrl: string | null;
    localUrl: string;
    ossStatus: "success" | "pending";
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取下一个可用的 pathId
   */
  async getNextPathId(): Promise<number> {
    const result = (await strapi.db.queryBuilder(FOLDER_UID).max("pathId").first().execute()) as { max?: number } | null;
    return (result?.max || 0) + 1;
  },

  /**
   * 按人类可读路径确保文件夹存在（不存在则逐级创建）
   */
  async ensureFolderByPath(humanPath: string): Promise<any> {
    const segments = humanPath.split("/").filter(Boolean);
    let parentFolder: any = null;

    for (const segment of segments) {
      let existing = await strapi.db.query(FOLDER_UID).findOne({
        where: { name: segment, parent: parentFolder?.id || null },
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
            parent: parentFolder?.id || null,
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
  async buildHumanPath(folderId: number): Promise<string> {
    const parts: string[] = [];
    let current: any = await strapi.db.query(FOLDER_UID).findOne({ where: { id: folderId } });
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
   * 将人类可读路径（如 /course/covers）解析为数字路径（如 /3/4）
   * 逐层按文件夹名查找，任一段找不到返回 null
   */
  async resolveHumanPathToNumericPath(humanPath: string): Promise<string | null> {
    if (!humanPath || humanPath === "/") return "/";
    const segs = humanPath.split("/").filter(Boolean);
    let parentId: number | null = null;
    let lastFolderPath = "/";

    try {
      for (const seg of segs) {
        const folder = await strapi.db.query(FOLDER_UID).findOne({
          where: { name: seg, parent: parentId },
        });
        if (!folder) return null;
        parentId = folder.id;
        lastFolderPath = folder.path;
      }
      return lastFolderPath;
    } catch (err) {
      strapi.log.warn(`[zhao-oss] resolveHumanPathToNumericPath failed: ${humanPath}`, {
        error: (err as Error).message,
      });
      return null;
    }
  },

  /**
   * 上传文件：本地存储 + OSS 同步 + 数据库记录
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    const { fileBuffer, originalName, customName, mimeType, fileSize, folderInput = "/general", folderIdInput, siteId, category, uploader } = params;

    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const ext = originalName ? `.${originalName.split(".").pop()}` : "";
    const fileName = customName || originalName || `file_${Date.now()}`;

    let folderRecord: any = null;
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
    const localUrl = `/static${storagePath}/${localFileName}`;

    let width: number | null = null;
    let height: number | null = null;
    let formats: Record<string, any> = {};
    if (mimeType.startsWith("image/")) {
      try {
        const metadata = await sharp(fileBuffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
        // ignore
      }
    }

    let ossUrl: string | null = null;
    let ossStatus: "success" | "pending" = "pending";
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
    } catch (ossErr) {
      strapi.log.warn(`[zhao-oss] OSS upload failed, falling back to local: ${(ossErr as Error).message}`);
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
            folder: folderRecord?.id || null,
            category: category || "general",
            uploader: uploader || null,
            originalFilename: originalName,
            mimeType,
            fileSize,
            fileExt: ext,
            isPublic: true,
          },
        });
      } catch (metaErr) {
        strapi.log.warn(`[zhao-oss] Failed to create media-meta: ${(metaErr as Error).message}`);
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
  async canDeleteFile(fileId: number, user: any): Promise<boolean> {
    const file = await strapi.db.query(FILE_UID).findOne({
      where: { id: fileId },
    });

    if (!file) return false;

    const userRoles = (user?.roles || []).map((r: any) => {
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
   * 检查文件被哪些业务表引用
   * 读取 config/plugins.ts 中 zhao-oss.config.referenceMap 配置
   */
  async checkReferences(fileId: number): Promise<Array<{
    uid: string;
    field: string;
    label: string;
    collection: boolean;
    required: boolean;
    items: Array<{ id: number; documentId: string; title: string }>;
  }>> {
    const pluginConfig = strapi.config.get("plugin::zhao-oss");
    const referenceMap: Array<{
      uid: string;
      field: string;
      label: string;
      collection?: boolean;
      required?: boolean;
    }> = pluginConfig?.referenceMap || [];

    const references = [];

    for (const ref of referenceMap) {
      const where = ref.collection
        ? { [ref.field]: { $contains: fileId } }
        : { [ref.field]: fileId };

      try {
        const hits = await strapi.db.query(ref.uid).findMany({ where });

        if (hits.length > 0) {
          references.push({
            uid: ref.uid,
            field: ref.field,
            label: ref.label,
            collection: ref.collection || false,
            required: ref.required || false,
            items: hits.map((h: any) => ({
              id: h.id,
              documentId: h.documentId,
              title: h.title || h.name || h.subject || `#${h.id}`,
            })),
          });
        }
      } catch (err) {
        strapi.log.warn(`[zhao-oss] Failed to check reference: ${ref.uid}.${ref.field}`, {
          error: (err as Error).message,
        });
      }
    }

    return references;
  },

  /**
   * 文件列表查询（分页 + 过滤）
   * 管理员以上角色不过滤 createdBy，其他用户自动添加 createdBy 过滤
   */
  async listFiles(params: {
    page: number;
    pageSize: number;
    folderPath?: string;
    mime?: string;
    search?: string;
    sort?: string;
    user?: any;
  }): Promise<{ list: any[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } }> {
    const { page, pageSize, folderPath, mime, search, sort = "createdAt:desc", user } = params;

    const where: Record<string, unknown> = {};
    let effectiveFolderPath = folderPath;
    if (folderPath && !isNumericPath(folderPath)) {
      effectiveFolderPath = await this.resolveHumanPathToNumericPath(folderPath);
      if (!effectiveFolderPath) {
        return {
          list: [],
          pagination: { page, pageSize, total: 0, pageCount: 0 },
        };
      }
    }
    if (effectiveFolderPath) {
      where.$or = [
        { folderPath: effectiveFolderPath },
        { folderPath: { $startsWith: effectiveFolderPath + "/" } },
      ];
    }
    if (mime) where.mime = { $contains: mime };
    if (search) where.name = { $containsi: search };

    // 权限过滤：非管理员只能看自己上传的文件
    if (user) {
      const userRoles = (user.roles || []).map((r: any) => {
        if (typeof r === "string") return r;
        if (r?.type) return r.type;
        if (r?.name) return r.name;
        return null;
      }).filter(Boolean);
      const isAdmin = userRoles.some((r: string) => ["admin", "channel-admin", "plugin-admin"].includes(r));
      if (!isAdmin) {
        where.createdBy = user.id;
      }
    }

    const [sortField, sortDir] = sort.split(":");
    const orderBy: Record<string, string> = {};
    orderBy[sortField || "createdAt"] = sortDir === "asc" ? "asc" : "desc";

    const offset = (page - 1) * pageSize;

    const [files, total] = await Promise.all([
      strapi.db.query(FILE_UID).findMany({ where, limit: pageSize, offset, orderBy }),
      strapi.db.query(FILE_UID).count({ where }),
    ]);

    return {
      list: files.map((f: any) => ({
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
        createdBy: f.createdBy,
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
  async getFolderTree(): Promise<any[]> {
    const folders = await strapi.db.query(FOLDER_UID).findMany({
      orderBy: { path: "asc" },
      populate: { parent: { select: ["id"] } },
    });

    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter((item: any) => {
          const itemParentId = item.parent?.id ?? item.parent ?? null;
          return itemParentId === parentId;
        })
        .map((item: any) => ({
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
  async createFolder(name: string, parentId: number | null = null): Promise<{ id: number; documentId: string; name: string; path: string }> {
    const existing = await strapi.db.query(FOLDER_UID).findOne({
      where: { name, parent: parentId || null },
    });

    if (existing) {
      return { id: existing.id, documentId: existing.documentId, name: existing.name, path: existing.path };
    }

    const pathId = await this.getNextPathId();

    let parentPath = "/";
    let parentFolder: any = null;
    if (parentId) {
      parentFolder = await strapi.db.query(FOLDER_UID).findOne({ where: { id: parentId } });
      if (parentFolder) parentPath = parentFolder.path;
    }

    const folderPath = parentPath === "/" ? `/${pathId}` : `${parentPath}/${pathId}`;

    const folder = await strapi.db.query(FOLDER_UID).create({
      data: { name, pathId, path: folderPath, parent: parentFolder?.id || null },
    });

    return { id: folder.id, documentId: folder.documentId, name: folder.name, path: folder.path };
  },

  /**
   * 根据 ID 查找文件
   */
  async findFileById(fileId: number): Promise<any | null> {
    return strapi.db.query(FILE_UID).findOne({ where: { id: fileId } });
  },

  /**
   * 同步记录列表查询（分页 + 过滤）
   */
  async listSyncRecords(params: {
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{ data: any[]; pagination: { page: number; pageSize: number; total: number; pageCount: number } }> {
    const { page, pageSize, status } = params;
    const offset = (page - 1) * pageSize;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

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
  async repairFolders(): Promise<string[]> {
    const results: string[] = [];

    const allFolders = await strapi.db.query(FOLDER_UID).findMany({});
    const numericNameFolders = allFolders.filter((f: any) => /^\d+$/.test(f.name));
    for (const folder of numericNameFolders) {
      const filesInFolder = await strapi.db.query(FILE_UID).count({
        where: { folderPath: folder.path },
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
      const isPathIdFormat = segments.every((s: string) => /^\d+$/.test(s));
      if (isPathIdFormat) continue;

      let current: any = null;
      for (const segment of segments) {
        const where: any = { name: segment };
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
  async ensureSiteDefaultFolders(siteId: number): Promise<any> {
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
  async listFilesBySite(siteId: number, params: { page?: number; pageSize?: number; category?: string } = {}): Promise<{ list: any[]; pagination: any }> {
    const { page = 1, pageSize = 20, category } = params;
    const where: any = { site: siteId, deletedAt: null };
    if (category) where.category = category;

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
      list: metas.map((m: any) => m.file).filter(Boolean),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        pageCount: Math.ceil(total / Number(pageSize)),
      },
    };
  },
});

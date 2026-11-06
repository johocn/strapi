import type { Core } from "@strapi/strapi";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";

const FOLDER_UID = "plugin::upload.folder";
const FILE_UID = "plugin::upload.file";
const SYNC_RECORD_UID = "plugin::zhao-oss.sync-record";

const MB = 1024 * 1024;

/** 文件夹路径安全校验：仅允许中英文、数字、下划线、短横线，禁止 . / .. / 绝对路径 / 分隔符 */
function assertSafeFolderInput(input: unknown): string {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "/general";
  if (raw.includes("\0") || raw.includes("\\")) {
    throw httpError(400, "上传被拒绝：文件夹路径包含非法字符（不允许反斜杠或空字符）");
  }
  if (/^[a-zA-Z]:/.test(raw) || raw.startsWith("//") || raw.startsWith("~")) {
    throw httpError(400, "上传被拒绝：文件夹路径不允许使用绝对路径（盘符 / UNC / ~）");
  }
  const segments = raw.split("/");
  if (segments[0] === "") segments.shift();
  if (segments.length === 0) return "/";
  if (segments.length > 8) {
    throw httpError(400, "上传被拒绝：文件夹层级过深（最多 8 层）");
  }
  for (const segment of segments) {
    if (!segment) {
      throw httpError(400, "上传被拒绝：文件夹路径包含空目录段");
    }
    if (segment === "." || segment === "..") {
      throw httpError(400, "上传被拒绝：文件夹路径不允许包含 . 或 .. 段");
    }
    if (!/^[\p{L}\p{N}_-]{1,64}$/u.test(segment)) {
      throw httpError(400, "上传被拒绝：文件夹名仅允许中英文、数字、下划线和短横线，且不超过 64 字符");
    }
  }
  return `/${segments.join("/")}`;
}

/** folderId 数据库路径的安全校验：只做穿越防护（目录名可能含空格等历史字符） */
function assertSafeStoredPath(storedPath: string): string {
  const raw = String(storedPath || "/").trim();
  if (!raw || raw === "/") return "/";
  if (raw.includes("\0") || raw.includes("\\")) {
    throw httpError(400, "上传被拒绝：文件夹路径包含非法字符");
  }
  const segments = raw.split("/").filter(Boolean);
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw httpError(400, "上传被拒绝：文件夹路径不允许包含 . 或 .. 段");
    }
  }
  return `/${segments.join("/")}`;
}

/** 校验目标目录必须落在 public 根内（含软链接实际路径） */
async function assertInsidePublicRoot(uploadRoot: string, targetDir: string): Promise<string> {
  const resolvedTarget = path.resolve(targetDir);
  if (resolvedTarget !== uploadRoot && !resolvedTarget.startsWith(uploadRoot + path.sep)) {
    throw httpError(400, "上传被拒绝：目标目录超出 public 根目录");
  }
  await fs.mkdir(resolvedTarget, { recursive: true });
  const realTarget = await fs.realpath(resolvedTarget).catch(() => resolvedTarget);
  const realRoot = await fs.realpath(uploadRoot).catch(() => uploadRoot);
  if (realTarget !== realRoot && !realTarget.startsWith(realRoot + path.sep)) {
    throw httpError(400, "上传被拒绝：目标目录超出 public 根目录");
  }
  return resolvedTarget;
}

function httpError(status: number, message: string): Error {
  const err = new Error(message);
  (err as any).status = status;
  return err;
}

/** 扩展名 → 规范 MIME + 归类（用于大小上限） */
type MediaFamily = "image" | "video" | "audio" | "doc" | "archive";
interface ExtRule {
  mime: string;
  family: MediaFamily;
}

const EXT_RULES: Record<string, ExtRule> = {
  jpg: { mime: "image/jpeg", family: "image" },
  jpeg: { mime: "image/jpeg", family: "image" },
  png: { mime: "image/png", family: "image" },
  gif: { mime: "image/gif", family: "image" },
  webp: { mime: "image/webp", family: "image" },
  bmp: { mime: "image/bmp", family: "image" },
  avif: { mime: "image/avif", family: "image" },
  mp4: { mime: "video/mp4", family: "video" },
  m4v: { mime: "video/x-m4v", family: "video" },
  mov: { mime: "video/quicktime", family: "video" },
  webm: { mime: "video/webm", family: "video" },
  mp3: { mime: "audio/mpeg", family: "audio" },
  m4a: { mime: "audio/mp4", family: "audio" },
  aac: { mime: "audio/aac", family: "audio" },
  wav: { mime: "audio/wav", family: "audio" },
  ogg: { mime: "audio/ogg", family: "audio" },
  flac: { mime: "audio/flac", family: "audio" },
  pdf: { mime: "application/pdf", family: "doc" },
  doc: { mime: "application/msword", family: "doc" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", family: "doc" },
  xls: { mime: "application/vnd.ms-excel", family: "doc" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", family: "doc" },
  ppt: { mime: "application/vnd.ms-powerpoint", family: "doc" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", family: "doc" },
  txt: { mime: "text/plain", family: "doc" },
  csv: { mime: "text/csv", family: "doc" },
  zip: { mime: "application/zip", family: "archive" },
};

const EXT_ALLOWLIST_TEXT = "jpg/jpeg/png/gif/webp/bmp/avif、mp4/m4v/mov/webm、mp3/m4a/aac/wav/ogg/flac、pdf/doc/docx/xls/xlsx/ppt/pptx/txt/csv/zip";

/** 扩展名允许的嗅探结果（服务端不信任客户端 Content-Type） */
const SNIFF_RULES: Record<string, string[]> = {
  jpg: ["jpeg"],
  jpeg: ["jpeg"],
  png: ["png"],
  gif: ["gif"],
  webp: ["webp"],
  bmp: ["bmp"],
  avif: ["avif", "isobmff"],
  mp4: ["isobmff"],
  m4v: ["isobmff"],
  mov: ["isobmff"],
  webm: ["matroska"],
  mp3: ["mp3"],
  m4a: ["isobmff"],
  aac: ["aac"],
  wav: ["wav"],
  ogg: ["ogg"],
  flac: ["flac"],
  pdf: ["pdf"],
  doc: ["ole"],
  xls: ["ole"],
  ppt: ["ole"],
  docx: ["zip"],
  xlsx: ["zip"],
  pptx: ["zip"],
  zip: ["zip"],
  txt: ["text"],
  csv: ["text"],
};

/** 魔数嗅探（只看文件头，够用且无额外依赖） */
function sniffMagic(buffer: Buffer): string {
  const ascii = (start: number, len: number) => buffer.subarray(start, start + len).toString("latin1");

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && ascii(1, 3) === "PNG") return "png";
  if (buffer.length >= 6 && ascii(0, 3) === "GIF") return "gif";
  if (buffer.length >= 12 && ascii(0, 4) === "RIFF") {
    const tag = ascii(8, 4);
    if (tag === "WEBP") return "webp";
    if (tag === "WAVE") return "wav";
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";
  if (buffer.length >= 12 && ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    return "isobmff";
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "matroska";
  }
  if (buffer.length >= 4 && ascii(0, 4) === "OggS") return "ogg";
  if (buffer.length >= 4 && ascii(0, 4) === "fLaC") return "flac";
  if (buffer.length >= 5 && ascii(0, 5) === "%PDF-") return "pdf";
  if (buffer.length >= 4 && ascii(0, 2) === "PK" && buffer[2] === 0x03 && buffer[3] === 0x04) return "zip";
  if (buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return "ole";
  }
  if (buffer.length >= 3 && ascii(0, 3) === "ID3") return "mp3";
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) {
    const layer = (buffer[1] >> 1) & 0x03;
    return layer === 0 ? "aac" : "mp3";
  }
  if (looksLikeText(buffer)) return "text";
  return "unknown";
}

function looksLikeText(buffer: Buffer): boolean {
  const sample = Math.min(buffer.length, 4096);
  if (sample <= 0) return false;
  let printable = 0;
  for (let i = 0; i < sample; i += 1) {
    const code = buffer[i];
    if (code === 0) return false;
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || code >= 0x80) {
      printable += 1;
    }
  }
  return printable / sample > 0.9;
}

function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

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
    const rawExt = path.extname(originalName || "").toLowerCase().replace(/^\./, "");
    if (!rawExt) {
      throw httpError(400, `上传被拒绝：文件缺少扩展名，允许的类型为 ${EXT_ALLOWLIST_TEXT}`);
    }
    const rule = EXT_RULES[rawExt];
    if (!rule) {
      throw httpError(400, `上传被拒绝：不支持的文件类型 .${rawExt}，允许的类型为 ${EXT_ALLOWLIST_TEXT}`);
    }
    const ext = `.${rawExt}`;
    const fileName = customName || originalName || `file_${Date.now()}`;

    // 客户端声明的 MIME 只做一致性校验，最终入库使用扩展名对应的规范 MIME
    const declaredMime = (mimeType || "").toLowerCase().split(";")[0].trim();
    if (declaredMime && declaredMime !== "application/octet-stream") {
      const declaredPrefix = declaredMime.split("/")[0];
      const allowedPrefixes = rule.family === "image" ? ["image"] : rule.family === "video" ? ["video"] : rule.family === "audio" ? ["audio"] : rule.family === "archive" ? ["application"] : ["application", "text"];
      if (!allowedPrefixes.includes(declaredPrefix)) {
        throw httpError(400, `上传被拒绝：文件 .${rawExt} 的 Content-Type「${declaredMime}」不在允许范围`);
      }
    }

    // 服务端魔数嗅探：内容必须与扩展名匹配，杜绝 html/svg/js 改后缀上传
    const detected = sniffMagic(fileBuffer);
    const expectedSniffs = SNIFF_RULES[rawExt] || [];
    if (!expectedSniffs.includes(detected)) {
      throw httpError(400, `上传被拒绝：文件内容与扩展名 .${rawExt} 不符（服务端检测为 ${detected}）`);
    }

    // 单文件大小上限（按类别可配置，环境变量优先）
    const pluginConfig = ((strapi as any).config?.get?.("plugin::zhao-oss") || {}) as any;
    const familyConfigKey: Record<MediaFamily, string> = {
      image: "uploadMaxImageBytes",
      video: "uploadMaxVideoBytes",
      audio: "uploadMaxAudioBytes",
      doc: "uploadMaxDocBytes",
      archive: "uploadMaxArchiveBytes",
    };
    const familyLabel: Record<MediaFamily, string> = { image: "图片", video: "视频", audio: "音频", doc: "文档", archive: "压缩包" };
    const envLimit = Number(process.env[`ZHAO_OSS_MAX_${rule.family.toUpperCase()}_BYTES`]);
    const configuredLimit = Number(pluginConfig[familyConfigKey[rule.family]]);
    const fallbackLimit: Record<MediaFamily, number> = { image: 10 * MB, video: 200 * MB, audio: 50 * MB, doc: 20 * MB, archive: 20 * MB };
    const sizeLimit = envLimit > 0 ? envLimit : configuredLimit > 0 ? configuredLimit : fallbackLimit[rule.family];
    const actualSize = fileBuffer.length;
    if (actualSize > sizeLimit) {
      throw httpError(413, `上传被拒绝：${familyLabel[rule.family]} ${formatBytes(actualSize)} 超过上限 ${formatBytes(sizeLimit)}（可通过 ZHAO_OSS_MAX_${rule.family.toUpperCase()}_BYTES 调整）`);
    }

    let folderRecord: any = null;
    let strapiFolderPath = "/";
    let storagePath = "/general";
    const hasFolderId = folderIdInput !== undefined && folderIdInput !== null && String(folderIdInput).trim() !== "";

    if (hasFolderId) {
      const rawFolderId = String(folderIdInput).trim();
      if (!/^\d+$/.test(rawFolderId) || Number(rawFolderId) <= 0) {
        throw httpError(400, "上传被拒绝：folderId 非法");
      }
      folderRecord = await strapi.db.query(FOLDER_UID).findOne({ where: { id: Number(rawFolderId) } });
      if (!folderRecord) {
        throw httpError(400, "上传被拒绝：指定的文件夹不存在");
      }
      strapiFolderPath = folderRecord.path;
      storagePath = assertSafeStoredPath(await this.buildHumanPath(folderRecord.id));
    } else {
      storagePath = assertSafeFolderInput(folderInput);
      if (storagePath !== "/") {
        folderRecord = await this.ensureFolderByPath(storagePath);
        if (folderRecord) {
          strapiFolderPath = folderRecord.path;
        }
      }
    }

    const uploadRoot = path.resolve(strapi.dirs.static.public);
    const targetDir = await assertInsidePublicRoot(
      uploadRoot,
      path.join(uploadRoot, storagePath.replace(/^\/+/, "")),
    );
    const localFileName = `${fileHash}${ext}`;
    const localFilePath = path.join(targetDir, localFileName);
    await fs.writeFile(localFilePath, fileBuffer);
    const localUrl = `/static${storagePath === "/" ? "" : storagePath}/${localFileName}`;

    let width: number | null = null;
    let height: number | null = null;
    let formats: Record<string, any> = {};
    if (rule.mime.startsWith("image/")) {
      try {
        const metadata = await sharp(fileBuffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
        // ignore
      }
    }

    let ossUrl: string | null = null;
    // 响应给调用方的地址：私有桶下必须是签名 URL（入库仍用裸地址 ossUrl）
    let ossPublicUrl: string | null = null;
    let ossStatus: "success" | "pending" = "pending";
    let providerName = "zhao-oss-local";

    try {
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = registry.getPrimaryProvider();
      if (provider) {
        const result = await provider.upload({
          buffer: fileBuffer,
          filename: `${storagePath}/${localFileName}`,
          mimeType: rule.mime,
          fileSize: actualSize,
        });
        ossUrl = result.url;
        ossPublicUrl = provider.signUrl(result.key);
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
        mime: rule.mime,
        size: actualSize,
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
      url: ossPublicUrl || localUrl,
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
    const pluginConfig = strapi.config.get("plugin::zhao-oss") as any;
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
    if (effectiveFolderPath && effectiveFolderPath !== "/") {
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
    const safeName = typeof name === "string" ? name.trim() : "";
    if (!/^[\p{L}\p{N}_-]{1,64}$/u.test(safeName)) {
      throw httpError(400, "创建文件夹失败：名称仅允许中英文、数字、下划线和短横线，且不超过 64 字符");
    }
    const existing = await strapi.db.query(FOLDER_UID).findOne({
      where: { name: safeName, parent: parentId || null },
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
      data: { name: safeName, pathId, path: folderPath, parent: parentFolder?.id || null },
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

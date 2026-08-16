import type { Core } from "@strapi/strapi";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface MediaStream {
  /** 为受保护媒体路径签发短期签名播放地址（需已登录调用） */
  issueStreamUrl(input: string): Promise<string>;
  /** 校验签名令牌，返回物理文件路径；非法返回 null */
  resolveStreamFile(params: {
    path?: string;
    exp?: string | number;
    sig?: string;
  }): { filePath: string; mime: string } | null;
}

const STREAM_ROUTE = "/zhao-oss/v1/media/stream";
const TTL_SEC = 30 * 60; // 30 分钟
/** 需要走鉴权代理的本地目录前缀 */
const PROTECTED_PREFIXES = ["/static", "/uploads"];

function getSecret(): string {
  return process.env.ZHAO_MEDIA_SIGN_SECRET || "zhao-media-sign-v1";
}

function sign(pathStr: string, exp: number): string {
  return crypto.createHmac("sha256", getSecret()).update(`${pathStr}:${exp}`).digest("hex");
}

function verifySig(pathStr: string, exp: number, sig: string): boolean {
  const expected = sign(pathStr, exp);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig || "");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** 将可能的完整 URL / 相对路径规整为 URL 路径（取 pathname，去掉 query） */
function toUrlPath(input: string): string {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) {
    try {
      return new URL(input).pathname;
    } catch {
      return "";
    }
  }
  return input.split("?")[0] || "";
}

/** 由 URL 路径解析出本地物理文件绝对路径；不受保护的前缀或越权返回 null */
function resolvePhysical(publicDir: string, urlPath: string): string | null {
  if (!urlPath) return null;
  if (!PROTECTED_PREFIXES.some((p) => urlPath.startsWith(p))) return null;

  let rel = urlPath;
  if (rel.startsWith("/static")) rel = rel.slice("/static".length);

  const base = path.resolve(publicDir);
  const physical = path.resolve(base, "." + rel);

  // 防目录穿越
  if (physical !== base && !physical.startsWith(base + path.sep)) return null;
  return physical;
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  pdf: "application/pdf",
};

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export default ({ strapi }: { strapi: Core.Strapi }): MediaStream => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;

  const mediaStream: MediaStream = {
    async issueStreamUrl(input: string): Promise<string> {
      try {
        const publicDir: string = strapi.dirs.static.public;
        const urlPath = toUrlPath(input);
        const physical = resolvePhysical(publicDir, urlPath);

        // 非本地受保护路径（如外部 OSS 直链）原样返回，不做代理
        if (!physical || !fs.existsSync(physical)) {
          return input;
        }

        const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
        const sig = sign(urlPath, exp);
        const q = `path=${encodeURIComponent(urlPath)}&exp=${exp}&sig=${sig}`;
        return `${STREAM_ROUTE}?${q}`;
      } catch (err) {
        logger.debug(`[zhao-oss] issueStreamUrl failed for ${input}`, {
          error: (err as Error).message,
        });
        return input;
      }
    },

    resolveStreamFile({ path: p, exp, sig }): { filePath: string; mime: string } | null {
      try {
        if (!p || !exp || !sig) return null;
        const expNum = Number(exp);
        if (!Number.isFinite(expNum)) return null;
        if (Math.floor(Date.now() / 1000) > expNum) return null; // 过期
        if (!verifySig(p, expNum, String(sig).trim())) return null;

        const publicDir: string = strapi.dirs.static.public;
        const physical = resolvePhysical(publicDir, p);
        if (!physical || !fs.existsSync(physical) || !fs.statSync(physical).isFile()) return null;

        return { filePath: physical, mime: mimeFromPath(physical) };
      } catch (err) {
        logger.debug(`[zhao-oss] resolveStreamFile failed`, { error: (err as Error).message });
        return null;
      }
    },
  };

  return mediaStream;
};
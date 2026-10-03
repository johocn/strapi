// server/src/services/rpa/shared.ts
// RPA 驱动公共工具：步骤包装、失败取证、远程图片转上传载荷。

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';

/**
 * 把一段交互包成具名步骤。失败时抛出的错误带步骤前缀，便于定位是「哪一步选择器没命中」。
 */
export async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    throw new Error(`[RPA step:${name}] ${err?.message || err}`);
  }
}

/**
 * 发布失败时落盘截图 + DOM，供后续在真实浏览器调试选择器时对照。
 * 目录：<os.tmpdir()>/zhao-rpa-debug。绝不抛异常。
 */
export async function dumpDebug(page: any, platform: string, label: string): Promise<string | undefined> {
  try {
    const dir = path.join(os.tmpdir(), 'zhao-rpa-debug');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.join(dir, `${platform}-${label}-${stamp}`);
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`${base}.html`, html, 'utf-8');
    return `${base}.png`;
  } catch {
    return undefined;
  }
}

/**
 * 远程图片 → Playwright setInputFiles 可接受的 { name, mimeType, buffer } 载荷。
 * 本地的 http(s) 之外的路径（file:// 或相对路径）直接交给 Playwright。
 */
export async function toUploadPayload(
  src: string
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const resp = await axios.get(src, { responseType: 'arraybuffer', timeout: 30000 });
  const rawType = resp.headers['content-type'];
  const mimeType = (typeof rawType === 'string' ? rawType.split(';')[0] : '') || 'image/jpeg';
  const ext = mimeType.split('/')[1] || 'jpg';
  const name = `rpa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return { name, mimeType, buffer: Buffer.from(resp.data) };
}

/** 判断是否为可直接交给 Playwright 的本地路径 */
export function isLocalPath(src: string): boolean {
  return !/^https?:\/\//i.test(src);
}
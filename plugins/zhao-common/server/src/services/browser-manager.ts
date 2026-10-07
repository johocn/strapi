'use strict';

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import os from 'os';

/**
 * 跨插件共享的 Playwright 浏览器管理服务（browser-manager）。
 *
 * 设计目标（1.8GB 小内存生产服务器）：
 * 1. 全进程仅一个 Browser 单例，按需惰性启动——绝不在插件 bootstrap 启动浏览器
 *    （zhao-wealth 原 eager initBrowser 曾在服务器上每次启动拉起 chromium 导致 OOM 循环）
 * 2. 并发闸：同时打开的 Page 数受限（PLAYWRIGHT_MAX_PAGES，默认 2），超出排队等待
 * 3. 空闲回收：无活动 Page 超时自动关闭浏览器（PLAYWRIGHT_IDLE_CLOSE_MS，默认 10 分钟）
 * 4. 内存守门：启动前检查 MemAvailable（PLAYWRIGHT_MIN_FREE_MB，默认 500），不足则本次降级
 *    跳过（暂态条件不设永久失败标记，下次任务重试）
 * 5. Context 级登录态隔离：createPage({ storageState }) 支持多平台多账号会话复用
 *
 * 消费方：zhao-wealth（理财净值采集，createPage）、zhao-studio（多媒体中心 RPA 采集/发布，openContext）
 * 访问方式：strapi.plugin('zhao-common').service('browser-manager')
 */

// Linux 上 Chrome 可能的路径（按优先级探测）
const LINUX_CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
];

// Windows 上 Chrome 可能的路径
const WINDOWS_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  // 动态匹配当前用户（LOCALAPPDATA 在 Windows 上指向 %USERPROFILE%\AppData\Local）
  ...(process.env.LOCALAPPDATA
    ? [`${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`]
    : ['C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe']),
  // Edge 作为备选（Chromium 内核，Playwright 兼容）
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

/**
 * 探测可用的 Chrome 可执行文件路径
 * 1. 优先用环境变量 PLAYWRIGHT_CHROME_PATH
 * 2. 其次按平台探测常见路径
 * 3. 找不到返回 undefined（让 Playwright 用自带 chromium）
 */
function detectChromePath(): string | undefined {
  const envPath = process.env.PLAYWRIGHT_CHROME_PATH;
  if (envPath) {
    if (existsSync(envPath)) return envPath;
    console.warn(`[zhao-common] PLAYWRIGHT_CHROME_PATH=${envPath} 不存在，将尝试其他路径`);
  }
  const paths = process.platform === 'win32' ? WINDOWS_CHROME_PATHS : LINUX_CHROME_PATHS;
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

const PAGE_TIMEOUT = 30000;
const MAX_PAGES = Math.max(1, Number(process.env.PLAYWRIGHT_MAX_PAGES || 2));
const IDLE_CLOSE_MS = Math.max(60_000, Number(process.env.PLAYWRIGHT_IDLE_CLOSE_MS || 10 * 60_000));
const MIN_FREE_MB = Math.max(0, Number(process.env.PLAYWRIGHT_MIN_FREE_MB ?? 500));
// 额外启动参数（空格分隔）：如容器内 page crashed 时设 PLAYWRIGHT_EXTRA_ARGS=--single-process
const EXTRA_ARGS = (process.env.PLAYWRIGHT_EXTRA_ARGS || '').split(/\s+/).filter(Boolean);
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

let browser: Browser | null = null;
let initPromise: Promise<Browser | null> | null = null;
let initFailed = false; // 启动失败标记（永久性失败，避免反复尝试刷屏）；内存守门不设此标记
let activePages = 0;
const waiters: Array<() => void> = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;

/** 可用内存（MB）：Linux 读 /proc/meminfo MemAvailable，其他平台退回 os.freemem 估算 */
function memAvailableMB(): number {
  try {
    if (process.platform === 'linux') {
      const m = readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+) kB/);
      if (m) return Math.round(Number(m[1]) / 1024);
    }
  } catch { /* fallthrough */ }
  return Math.round(os.freemem() / 1024 / 1024);
}

/** 释放槽位：有排队者则直接移交槽位（计数不变），否则计数减一 */
function releaseSlot(): void {
  const next = waiters.shift();
  if (next) next();
  else activePages = Math.max(0, activePages - 1);
}

/** 空闲回收：浏览器存在且无活动 Page 时，超时自动关闭 */
function armIdleTimer(): void {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (!browser || activePages > 0) return;
  idleTimer = setTimeout(() => {
    idleTimer = null;
    void shutdown('idle');
  }, IDLE_CLOSE_MS);
}

async function initBrowser(): Promise<Browser | null> {
  if (browser) return browser;
  if (initFailed) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 内存守门：可用内存不足时绝不启动（暂态条件，不设永久失败标记）
    const freeMB = memAvailableMB();
    if (freeMB < MIN_FREE_MB) {
      console.warn(`[zhao-common] browser-manager 内存守门：可用 ${freeMB}MB < 阈值 ${MIN_FREE_MB}MB，本次降级跳过`);
      initPromise = null;
      return null;
    }
    try {
      const executablePath = detectChromePath();
      const launchOptions = {
        headless: process.platform !== 'win32',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage', ...EXTRA_ARGS],
        ...(executablePath ? { executablePath } : {}),
      };
      browser = await chromium.launch(launchOptions);
      console.log(`[zhao-common] browser-manager 浏览器已启动（${executablePath ?? 'playwright 自带 chromium'}，启动时可用内存 ${freeMB}MB）`);
      return browser;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[zhao-common] browser-manager 浏览器启动失败: ${msg}`);
      console.error('[zhao-common] 修复指引: npx playwright install-deps chromium && npx playwright install chromium，');
      console.error('  或安装系统 Chrome，或在 .env 设置 PLAYWRIGHT_CHROME_PATH（采集为可选功能，不影响主流程）');
      initFailed = true;
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

/** 占用槽位：满员排队等待移交；拿到槽位即取消空闲回收计时 */
async function acquireSlot(): Promise<void> {
  if (activePages >= MAX_PAGES) {
    // 排队：槽位由 releaseSlot 直接移交，此处不再自增
    await new Promise<void>(resolve => waiters.push(resolve));
  } else {
    activePages++;
  }
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
}

/** Context 句柄：调用方掌控 Context 生命周期，close() 释放槽位（不关共享 Browser） */
export interface ContextHandle {
  context: BrowserContext;
  close(): Promise<void>;
}

/**
 * 创建裸 Context（RPA/多媒体发布场景）：与 createPage 共用同一 Browser 单例与并发闸。
 * opts.cookies: Playwright Cookie 数组（登录态注入）；opts.initScripts: Context 级注入脚本
 * （须在 newPage 之前注入，如 stealth 反检测）；UA/locale/viewport 可覆盖默认。
 * 内存守门降级或启动失败返回 null（与 createPage 语义一致）。
 */
async function openContext(opts?: {
  cookies?: any[];
  initScripts?: string[];
  userAgent?: string;
  locale?: string;
  viewport?: { width: number; height: number };
}): Promise<ContextHandle | null> {
  await acquireSlot();
  if (!browser) browser = await initBrowser();
  if (!browser) {
    releaseSlot();
    return null;
  }
  let context: BrowserContext;
  try {
    context = await browser.newContext({
      userAgent: opts?.userAgent || DEFAULT_UA,
      ...(opts?.locale ? { locale: opts.locale } : {}),
      ...(opts?.viewport ? { viewport: opts.viewport } : {}),
    });
    if (opts?.cookies?.length) {
      await context.addCookies(opts.cookies as any[]);
    }
    for (const script of opts?.initScripts ?? []) {
      await context.addInitScript(script);
    }
    return {
      context,
      close: async () => {
        try {
          await context.close();
        } catch {
          // 忽略关闭错误
        }
        releaseSlot();
        armIdleTimer();
      },
    };
  } catch (error) {
    releaseSlot();
    throw error;
  }
}

/**
 * 创建新 Page（自动排队限流 + 超时设置）
 * opts.storageState: Playwright storageState（cookies+localStorage），用于多平台多账号登录态复用
 */
async function createPage(opts?: { storageState?: any; userAgent?: string }): Promise<Page | null> {
  await acquireSlot();

  if (!browser) browser = await initBrowser();
  if (!browser) {
    releaseSlot();
    return null;
  }
  try {
    const context = await browser.newContext({
      userAgent: opts?.userAgent || DEFAULT_UA,
      ...(opts?.storageState ? { storageState: opts.storageState } : {}),
    });
    const page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT);
    return page;
  } catch (error) {
    releaseSlot();
    throw error;
  }
}

/** 关闭 Page 和其 Context 并释放槽位 */
async function closePage(page: Page): Promise<void> {
  try {
    const context = page.context();
    await page.close();
    await context.close();
  } catch {
    // 忽略关闭错误
  }
  releaseSlot();
  armIdleTimer();
}

/** 关闭浏览器（进程退出 / 空闲回收 / 手动） */
async function shutdown(reason = 'manual'): Promise<void> {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  // 唤醒所有排队者，让其走 browser=null 的降级返回
  while (waiters.length) waiters.shift()();
  activePages = 0;
  if (browser) {
    try {
      await browser.close();
    } catch {
      // 忽略关闭错误
    }
    browser = null;
    initPromise = null;
    initFailed = false;
    console.log(`[zhao-common] browser-manager 浏览器已关闭（${reason}）`);
  }
}

/** 运行状态（调试/运维观测用） */
function stats() {
  return {
    browserUp: !!browser,
    activePages,
    queued: waiters.length,
    maxPages: MAX_PAGES,
    minFreeMB: MIN_FREE_MB,
    idleCloseMs: IDLE_CLOSE_MS,
    memAvailableMB: memAvailableMB(),
  };
}

export default ({ strapi }: any) => ({
  createPage,
  openContext,
  closePage,
  shutdown,
  stats,
});

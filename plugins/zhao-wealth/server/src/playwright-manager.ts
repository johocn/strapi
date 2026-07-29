'use strict';

import { chromium, type Browser, type Page } from 'playwright';
import { existsSync } from 'fs';

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
  'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
];

/**
 * 探测可用的 Chrome 可执行文件路径
 * 1. 优先用环境变量 PLAYWRIGHT_CHROME_PATH
 * 2. 其次按平台探测常见路径
 * 3. 找不到返回 undefined（让 Playwright 用自带 chromium）
 */
function detectChromePath(): string | undefined {
  // 1. 环境变量优先
  const envPath = process.env.PLAYWRIGHT_CHROME_PATH;
  if (envPath) {
    if (existsSync(envPath)) return envPath;
    console.warn(`[zhao-wealth] PLAYWRIGHT_CHROME_PATH=${envPath} 不存在，将尝试其他路径`);
  }

  // 2. 按平台探测常见路径
  const paths = process.platform === 'win32' ? WINDOWS_CHROME_PATHS : LINUX_CHROME_PATHS;
  for (const p of paths) {
    if (existsSync(p)) return p;
  }

  // 3. 找不到系统 Chrome，返回 undefined 让 Playwright 用自带 chromium
  return undefined;
}

const PAGE_TIMEOUT = 30000;

let browser: Browser | null = null;
let initPromise: Promise<Browser | null> | null = null;
let initFailed = false; // 初始化失败标记，避免反复尝试刷屏日志

/**
 * 初始化 Browser 单例
 * Windows: headed 模式（复用本机 Chrome，用于调试）
 * Linux:   headless 模式（服务器无显示环境）
 *
 * 失败后标记 initFailed，不再反复尝试（避免日志刷屏）
 * 服务器安装 Chrome 后重启 Strapi 即可恢复
 */
export async function initBrowser(): Promise<Browser | null> {
  if (browser) return browser;
  if (initFailed) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const executablePath = detectChromePath();
      const launchOptions = {
        headless: process.platform !== 'win32',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
        ...(executablePath ? { executablePath } : {}),
      };
      if (executablePath) {
        console.log(`[zhao-wealth] Playwright 使用 Chrome: ${executablePath}`);
      } else {
        console.log('[zhao-wealth] 未找到系统 Chrome，尝试使用 Playwright 自带 chromium');
      }
      browser = await chromium.launch(launchOptions);
      console.log('[zhao-wealth] Playwright Browser 已启动');
      return browser;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[zhao-wealth] Playwright Browser 启动失败: ${msg}`);
      console.error('[zhao-wealth] 修复指引（任选其一）:');
      console.error('  方案1: 安装系统 Chrome');
      console.error('    CentOS/RHEL: yum install -y google-chrome-stable');
      console.error('    Ubuntu/Debian: apt install -y chromium-browser');
      console.error('  方案2: 安装 Playwright 自带 chromium');
      console.error('    npx playwright install chromium');
      console.error('  方案3: 在 .env 中设置 PLAYWRIGHT_CHROME_PATH 指向 Chrome 路径');
      console.error('  注: 采集功能可选，不影响 Strapi 主功能；修复后重启 Strapi 即可');
      initFailed = true;
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

/**
 * 获取 Browser 实例
 */
export function getBrowser(): Browser | null {
  return browser;
}

/**
 * 创建新 Page（自动设置超时）
 */
export async function createPage(): Promise<Page | null> {
  if (!browser) {
    browser = await initBrowser();
  }
  if (!browser) return null;

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);
  return page;
}

/**
 * 关闭 Page 和其 Context
 */
export async function closePage(page: Page): Promise<void> {
  try {
    const context = page.context();
    await page.close();
    await context.close();
  } catch {
    // 忽略关闭错误
  }
}

/**
 * 销毁 Browser
 */
export async function destroyBrowser(): Promise<void> {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // 忽略关闭错误
    }
    browser = null;
    initPromise = null;
    initFailed = false;
    console.log('[zhao-wealth] Playwright Browser 已关闭');
  }
}

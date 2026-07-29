'use strict';

import { chromium, type Browser, type Page } from 'playwright';

// Chrome 路径：优先用环境变量 PLAYWRIGHT_CHROME_PATH，否则按平台选默认路径
// Windows: C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe
// Linux:   /usr/bin/google-chrome 或 /usr/bin/chromium-browser
const CHROME_PATH =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome');
const PAGE_TIMEOUT = 30000;

let browser: Browser | null = null;
let initPromise: Promise<Browser | null> | null = null;

/**
 * 初始化 Browser 单例
 * Windows: headed 模式（复用本机 Chrome，用于调试）
 * Linux:   headless 模式（服务器无显示环境）
 */
export async function initBrowser(): Promise<Browser | null> {
  if (browser) return browser;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: process.platform !== 'win32',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      });
      console.log('[zhao-wealth] Playwright Browser 已启动');
      return browser;
    } catch (error) {
      console.error(`[zhao-wealth] Playwright Browser 启动失败: ${error.message}`);
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
    console.log('[zhao-wealth] Playwright Browser 已关闭');
  }
}

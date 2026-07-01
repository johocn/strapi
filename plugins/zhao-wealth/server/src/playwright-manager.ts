'use strict';

import { chromium, type Browser, type Page } from 'playwright';

const CHROME_PATH = 'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const PAGE_TIMEOUT = 30000;

let browser: Browser | null = null;
let initPromise: Promise<Browser | null> | null = null;

/**
 * 初始化 Browser 单例（headed 模式，复用本机 Chrome）
 */
export async function initBrowser(): Promise<Browser | null> {
  if (browser) return browser;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      browser = await chromium.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
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

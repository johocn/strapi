// server/src/services/rpa-client.ts
// RPA 基类：封装 Playwright 浏览器生命周期 + cookie 管理 + stealth 注入
// 运行时动态 import playwright — 服务器没装也能正常启动 Strapi，仅在调 publish 时才检查

import type { Core } from '@strapi/strapi';

// ============ 内联 stealth patch（零外部依赖） ============
// 标准反检测：navigator.webdriver + chrome 对象 + plugins 数组 + permissions + runtime 等
// 注入时机：context 创建后、第一个 page 加载前，通过 addInitScript 保证在站点 JS 之前运行
const STEALTH_JS = `
() => {
  // 1. navigator.webdriver → undefined（W3C 标准自动化检测标记）
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });

  // 2. 伪造 chrome 对象（部分站点检测 window.chrome.runtime）
  if (!window.chrome) {
    Object.defineProperty(window, 'chrome', {
      value: { runtime: {}, loadTimes: () => ({ commitLoadTime: Date.now() / 1000 }) },
      configurable: true,
    });
  } else if (!window.chrome.runtime) {
    window.chrome.runtime = {};
  }

  // 3. 伪造 plugins 数组（headless 默认 plugins.length=0）
  if (navigator.plugins.length === 0) {
    const fakePlugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => fakePlugins,
      configurable: true,
    });
  }

  // 4. 伪造 permissions.query（headless notifications 默认 denied）
  const origQuery = navigator.permissions?.query?.bind(navigator.permissions);
  if (origQuery && !(navigator as any).__pwStealthPatched) {
    navigator.permissions.query = (descriptor: any) =>
      origQuery(descriptor).then((result: any) => {
        if (descriptor.name === 'notifications' && result.state === 'denied') {
          return { ...result, state: 'granted' };
        }
        return result;
      });
    (navigator as any).__pwStealthPatched = true;
  }

  // 5. 伪造 languages（部分站点检测 navigator.languages 只有 en-US）
  if (navigator.languages.length < 2) {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      configurable: true,
    });
  }
}
`;

export interface RpaCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface RpaPlatformConfig {
  /** 平台标识，跟 channel-adapter platformType 对齐 */
  platform: 'xiaohongshu' | 'toutiao';
  /** 平台发布入口 URL（工作台/创作中心） */
  publishUrl: string;
  /** 登录入口 URL（首次扫码） */
  loginUrl: string;
  /** cookie 所属 domain（判断 cookie 是否属于本平台） */
  cookieDomain: string;
}

export const RPA_PLATFORMS: Record<RpaPlatformConfig['platform'], RpaPlatformConfig> = {
  xiaohongshu: {
    platform: 'xiaohongshu',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    loginUrl: 'https://creator.xiaohongshu.com/login',
    cookieDomain: '.xiaohongshu.com',
  },
  toutiao: {
    platform: 'toutiao',
    publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    loginUrl: 'https://mp.toutiao.com/login',
    cookieDomain: '.toutiao.com',
  },
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ============ 运行时依赖检查 ============

  async ensurePlaywrightRuntime(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _pw = await import('playwright');
    } catch {
      throw new Error('RPA runtime 未安装。服务器需执行: npm i playwright && npx playwright install chromium');
    }
  },

  // ============ Cookie 管理 ============

  async getCookies(accountId: string): Promise<RpaCookie[]> {
    const acc = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
    if (!acc?.rpaCookies) return [];
    try {
      return JSON.parse(acc.rpaCookies);
    } catch {
      return [];
    }
  },

  async saveCookies(accountId: string, cookies: RpaCookie[]): Promise<void> {
    await strapi.documents('plugin::zhao-studio.publish-account').update({
      documentId: accountId,
      data: {
        rpaCookies: JSON.stringify(cookies),
        rpaCookiesAt: new Date(),
      } as any,
    });
  },

  isCookiesFresh(cookies: RpaCookie[], maxAgeMs = 3 * 24 * 60 * 60 * 1000): boolean {
    if (cookies.length === 0) return false;
    const now = Date.now();
    const valid = cookies.filter(c => !c.expires || c.expires * 1000 > now);
    if (valid.length === 0) return false;
    // 找最接近过期的那个
    const minExpires = valid.reduce((min, c) => c.expires ? Math.min(min, c.expires * 1000) : min, Infinity);
    if (minExpires === Infinity) return true; // 无过期时间的 cookie 视为长期有效
    return now < minExpires - maxAgeMs;
  },

  // ============ 浏览器生命周期 ============

  async launchBrowser(headless = true) {
    await this.ensurePlaywrightRuntime();
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    return browser;
  },

  async createContext(browser: any, cookies: RpaCookie[], platform: RpaPlatformConfig['platform']) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'zh-CN',
    });

    // 注入 cookie
    if (cookies.length > 0) {
      const platformCfg = RPA_PLATFORMS[platform];
      const domainCookies = cookies.filter(c =>
        c.domain && platformCfg.cookieDomain.includes(c.domain.replace(/^\./, ''))
      );
      if (domainCookies.length > 0) {
        await ctx.addCookies(domainCookies);
      }
    }

    // stealth 反检测：内联 JS patch，零外部依赖
    await ctx.addInitScript(STEALTH_JS);

    return ctx;
  },

  async captureCookies(ctx: any, platform: RpaPlatformConfig['platform']): Promise<RpaCookie[]> {
    const platformCfg = RPA_PLATFORMS[platform];
    const all = await ctx.cookies();
    return all.filter(c => c.domain.includes(platformCfg.cookieDomain.replace(/^\./, '')));
  },

  // ============ 登录（需要人工扫码） ============

  async startLoginSession(platform: RpaPlatformConfig['platform'], headless = false) {
    const platformCfg = RPA_PLATFORMS[platform];
    const browser = await this.launchBrowser(headless);
    const ctx = await browser.newContext({ locale: 'zh-CN' });
    const page = await ctx.newPage();
    await page.goto(platformCfg.loginUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // 这里留给操作者扫码登录
    // 返回 browser / ctx / page 引用，调用方应等待登录完成后再 saveCookies
    return { browser, ctx, page, platform };
  },

  // ============ 发布（骨架：子类 override） ============

  async publishViaRPA(params: {
    platform: RpaPlatformConfig['platform'];
    accountId: string;
    title: string;
    content: string;
    coverImage?: string;
  }): Promise<{ success: boolean; externalId?: string; url?: string; error?: string }> {
    const { platform, accountId, title, content, coverImage } = params;
    const platformCfg = RPA_PLATFORMS[platform];

    // 1. 检查 cookie
    const cookies = await this.getCookies(accountId);
    if (!this.isCookiesFresh(cookies)) {
      return {
        success: false,
        error: `RPA cookie 过期或未配置。请调用 POST /v1/admin/rpa/setup-cookies/${accountId} 完成扫码登录`,
      };
    }

    // 2. 启动浏览器
    const browser = await this.launchBrowser(true);
    const ctx = await this.createContext(browser, cookies, platform);
    const page = await ctx.newPage();

    try {
      // 3. 导航到发布页
      await page.goto(platformCfg.publishUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 4. 骨架抛明确错误 — 具体选择器 + 发布流程需要在真实浏览器里调试
      // 子类 override 时实现以下逻辑:
      //    a) 等待发布表单加载 (page.waitForSelector)
      //    b) 填写标题 (page.fill)
      //    c) 填正文 (page.fill / page.type)
      //    d) 上传封面图 (page.setInputFiles)
      //    e) 点击发布 (page.click)
      //    f) 等待成功提示 (page.waitForSelector)
      //    g) 提取 externalId / url
      throw new Error(
        `[RPA] ${platform} 发布流程骨架已就绪，但具体选择器需在真实浏览器调试后实现。` +
        `cookie 已自动注入，浏览器已起。请 override publishViaRPA 子类方法。`
      );

      // return { success: true, externalId: '...', url: '...' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      // 5. 刷新 cookie（发布可能触发 refresh token）
      try {
        const freshCookies = await this.captureCookies(ctx, platform);
        if (freshCookies.length > 0) {
          await this.saveCookies(accountId, freshCookies);
        }
      } catch { /* ignore cookie refresh fail */ }
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  },
});

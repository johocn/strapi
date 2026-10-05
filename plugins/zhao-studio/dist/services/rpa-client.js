"use strict";
// server/src/services/rpa-client.ts
// RPA 基类：封装 Playwright 浏览器生命周期 + cookie 管理 + stealth 注入
// 运行时动态 import playwright — 服务器没装也能正常启动 Strapi，仅在调 publish 时才检查
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPA_PLATFORMS = void 0;
const os = __importStar(require("os"));
const rpa_1 = require("./rpa");
const shared_1 = require("./rpa/shared");
// 扫码登录会话（进程内持有，5 分钟过期）。key = accountId。
const LOGIN_SESSIONS = new Map();
const LOGIN_SESSION_TTL_MS = 5 * 60 * 1000;
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
exports.RPA_PLATFORMS = {
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
    bilibili: {
        platform: 'bilibili',
        publishUrl: 'https://member.bilibili.com/platform/upload/video/frame.html',
        loginUrl: 'https://passport.bilibili.com/login',
        cookieDomain: '.bilibili.com',
    },
};
exports.default = ({ strapi }) => ({
    // ============ 运行时依赖检查 ============
    async ensurePlaywrightRuntime() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _pw = await Promise.resolve().then(() => __importStar(require('playwright')));
        }
        catch {
            throw new Error('RPA runtime 未安装。服务器需执行: npm i playwright && npx playwright install chromium');
        }
    },
    // ============ Cookie 管理 ============
    async getCookies(accountId) {
        const acc = await strapi.documents('plugin::zhao-studio.publish-account').findOne({ documentId: accountId });
        if (!acc?.rpaCookies)
            return [];
        try {
            return JSON.parse(acc.rpaCookies);
        }
        catch {
            return [];
        }
    },
    async saveCookies(accountId, cookies) {
        await strapi.documents('plugin::zhao-studio.publish-account').update({
            documentId: accountId,
            data: {
                rpaCookies: JSON.stringify(cookies),
                rpaCookiesAt: new Date(),
            },
        });
    },
    isCookiesFresh(cookies, maxAgeMs = 3 * 24 * 60 * 60 * 1000) {
        if (cookies.length === 0)
            return false;
        const now = Date.now();
        const valid = cookies.filter(c => !c.expires || c.expires * 1000 > now);
        if (valid.length === 0)
            return false;
        // 找最接近过期的那个
        const minExpires = valid.reduce((min, c) => c.expires ? Math.min(min, c.expires * 1000) : min, Infinity);
        if (minExpires === Infinity)
            return true; // 无过期时间的 cookie 视为长期有效
        return now < minExpires - maxAgeMs;
    },
    async clearCookies(accountId) {
        await this.saveCookies(accountId, []);
    },
    async getCookiesStatus(accountId) {
        const acc = await strapi.documents('plugin::zhao-studio.publish-account').findOne({
            documentId: accountId,
            populate: ['platform'],
        });
        if (!acc)
            throw new Error('账号不存在');
        const cookies = await this.getCookies(accountId);
        return {
            platformType: acc.platform?.type || null,
            hasCookies: cookies.length > 0,
            cookieCount: cookies.length,
            fresh: this.isCookiesFresh(cookies),
            cookiesAt: acc.rpaCookiesAt || null,
        };
    },
    /** 解析账号对应的 RPA 平台，非 xiaohongshu/toutiao 直接报错 */
    async resolveAccountPlatform(accountId) {
        const acc = await strapi.documents('plugin::zhao-studio.publish-account').findOne({
            documentId: accountId,
            populate: ['platform'],
        });
        if (!acc)
            throw new Error('账号不存在');
        const type = acc.platform?.type;
        if (type !== 'xiaohongshu' && type !== 'toutiao' && type !== 'bilibili') {
            throw new Error(`账号平台 ${type || '未知'} 不支持 RPA（仅 xiaohongshu / toutiao / bilibili）`);
        }
        return type;
    },
    // ============ 浏览器生命周期 ============
    async launchBrowser(headless = true) {
        await this.ensurePlaywrightRuntime();
        const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
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
    async createContext(browser, cookies, platform) {
        const ctx = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'zh-CN',
        });
        // 注入 cookie
        if (cookies.length > 0) {
            const platformCfg = exports.RPA_PLATFORMS[platform];
            const domainCookies = cookies.filter(c => c.domain && platformCfg.cookieDomain.includes(c.domain.replace(/^\./, '')));
            if (domainCookies.length > 0) {
                await ctx.addCookies(domainCookies);
            }
        }
        // stealth 反检测：内联 JS patch，零外部依赖
        await ctx.addInitScript(STEALTH_JS);
        return ctx;
    },
    async captureCookies(ctx, platform) {
        const platformCfg = exports.RPA_PLATFORMS[platform];
        const all = await ctx.cookies();
        return all.filter((c) => c.domain.includes(platformCfg.cookieDomain.replace(/^\./, '')));
    },
    // ============ 扫码登录会话 ============
    /** 关闭指定账号的登录会话（存在才关） */
    async closeLoginSession(accountId) {
        const s = LOGIN_SESSIONS.get(accountId);
        if (!s)
            return;
        LOGIN_SESSIONS.delete(accountId);
        await s.ctx?.close().catch(() => { });
        await s.browser?.close().catch(() => { });
    },
    /** 清理过期会话 */
    async _sweepLoginSessions() {
        const now = Date.now();
        for (const [accountId, s] of LOGIN_SESSIONS) {
            if (now - s.createdAt > LOGIN_SESSION_TTL_MS) {
                await this.closeLoginSession(accountId);
            }
        }
    },
    /**
     * 开启扫码登录：起 headless 浏览器 → 打开平台登录页 → 截图二维码返回（dataURL）。
     * 操作者扫码后调用 finishLoginSession 抓取并保存 cookie。
     * ⚠️ 需真实浏览器环境（服务器装 playwright + chromium），当前无验证环境、选择器未实测。
     */
    async openLoginSession(accountId, headless = true) {
        await this._sweepLoginSessions();
        const platform = await this.resolveAccountPlatform(accountId);
        await this.closeLoginSession(accountId);
        const platformCfg = exports.RPA_PLATFORMS[platform];
        const browser = await this.launchBrowser(headless);
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' });
        await ctx.addInitScript(STEALTH_JS);
        const page = await ctx.newPage();
        await page.goto(platformCfg.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2500); // 等二维码渲染
        const buffer = await page.screenshot({ type: 'png' });
        LOGIN_SESSIONS.set(accountId, { browser, ctx, page, platform, createdAt: Date.now() });
        return {
            platform,
            loginUrl: platformCfg.loginUrl,
            qrImage: `data:image/png;base64,${buffer.toString('base64')}`,
            expiresInSec: Math.floor(LOGIN_SESSION_TTL_MS / 1000),
            hint: '请用手机 App 扫码登录，完成后调用 finishLogin',
        };
    },
    /** 扫码完成后：抓取会话 cookie 持久化 */
    async finishLoginSession(accountId) {
        await this._sweepLoginSessions();
        const s = LOGIN_SESSIONS.get(accountId);
        if (!s)
            throw new Error('登录会话不存在或已过期，请重新获取二维码');
        const cookies = await this.captureCookies(s.ctx, s.platform);
        if (cookies.length === 0) {
            throw new Error('未检测到登录态 cookie，请确认已在手机端完成扫码');
        }
        await this.saveCookies(accountId, cookies);
        await this.closeLoginSession(accountId);
        return { platform: s.platform, cookieCount: cookies.length };
    },
    // ============ 发布（驱动分发） ============
    async publishViaRPA(params) {
        const { platform, accountId, title, content, coverImage, images, videoUrl } = params;
        const platformCfg = exports.RPA_PLATFORMS[platform];
        const driver = (0, rpa_1.getRpaDriver)(platform);
        // 1. 检查 cookie
        const cookies = await this.getCookies(accountId);
        if (!this.isCookiesFresh(cookies)) {
            return {
                success: false,
                error: `RPA cookie 过期或未配置。请调用 POST /v1/admin/rpa/login/${accountId} 获取二维码完成扫码登录`,
            };
        }
        // 2. 启动浏览器
        const browser = await this.launchBrowser(true);
        const ctx = await this.createContext(browser, cookies, platform);
        const page = await ctx.newPage();
        try {
            // 3. 导航到发布页
            await page.goto(platformCfg.publishUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // 4. 交给平台驱动：填写 → 上传 → 提交 → 成功校验
            return await driver.publish(page, { title, content, coverImage, images, videoUrl }, os.tmpdir());
        }
        catch (err) {
            // 失败取证：截图 + DOM 落到 <tmp>/zhao-rpa-debug/，供真机调选择器
            const shot = await (0, shared_1.dumpDebug)(page, platform, 'publish-fail');
            return {
                success: false,
                error: `RPA 发布失败: ${err.message}${shot ? `（现场已留存: ${shot}）` : ''}`,
            };
        }
        finally {
            // 5. 刷新 cookie（发布可能触发 refresh token）
            try {
                const freshCookies = await this.captureCookies(ctx, platform);
                if (freshCookies.length > 0) {
                    await this.saveCookies(accountId, freshCookies);
                }
            }
            catch { /* ignore cookie refresh fail */ }
            await ctx.close().catch(() => { });
            await browser.close().catch(() => { });
        }
    },
});
//# sourceMappingURL=rpa-client.js.map
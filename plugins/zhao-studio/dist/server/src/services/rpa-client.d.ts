import { Core } from '../../../../../node_modules/@strapi/strapi';
import { RpaPlatform } from './rpa/types';
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
export declare const RPA_PLATFORMS: Record<RpaPlatformConfig['platform'], RpaPlatformConfig>;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    ensurePlaywrightRuntime(): Promise<void>;
    getCookies(accountId: string): Promise<RpaCookie[]>;
    saveCookies(accountId: string, cookies: RpaCookie[]): Promise<void>;
    isCookiesFresh(cookies: RpaCookie[], maxAgeMs?: number): boolean;
    clearCookies(accountId: string): Promise<void>;
    getCookiesStatus(accountId: string): Promise<{
        platformType: any;
        hasCookies: boolean;
        cookieCount: number;
        fresh: boolean;
        cookiesAt: any;
    }>;
    /** 解析账号对应的 RPA 平台，非 xiaohongshu/toutiao 直接报错 */
    resolveAccountPlatform(accountId: string): Promise<RpaPlatform>;
    launchBrowser(headless?: boolean): Promise<import('playwright-core').Browser>;
    createContext(browser: any, cookies: RpaCookie[], platform: RpaPlatformConfig["platform"]): Promise<any>;
    captureCookies(ctx: any, platform: RpaPlatformConfig["platform"]): Promise<RpaCookie[]>;
    /** 关闭指定账号的登录会话（存在才关） */
    closeLoginSession(accountId: string): Promise<void>;
    /** 清理过期会话 */
    _sweepLoginSessions(): Promise<void>;
    /**
     * 开启扫码登录：起 headless 浏览器 → 打开平台登录页 → 截图二维码返回（dataURL）。
     * 操作者扫码后调用 finishLoginSession 抓取并保存 cookie。
     * ⚠️ 需真实浏览器环境（服务器装 playwright + chromium），当前无验证环境、选择器未实测。
     */
    openLoginSession(accountId: string, headless?: boolean): Promise<{
        platform: RpaPlatform;
        loginUrl: string;
        qrImage: string;
        expiresInSec: number;
        hint: string;
    }>;
    /** 扫码完成后：抓取会话 cookie 持久化 */
    finishLoginSession(accountId: string): Promise<{
        platform: RpaPlatform;
        cookieCount: number;
    }>;
    publishViaRPA(params: {
        platform: RpaPlatformConfig["platform"];
        accountId: string;
        title: string;
        content: string;
        coverImage?: string;
        images?: string[];
    }): Promise<{
        success: boolean;
        externalId?: string;
        url?: string;
        error?: string;
    }>;
};
export default _default;
//# sourceMappingURL=rpa-client.d.ts.map
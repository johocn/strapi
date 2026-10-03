import { Core } from '../../../../../node_modules/@strapi/strapi';
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
    launchBrowser(headless?: boolean): Promise<import('playwright-core').Browser>;
    createContext(browser: any, cookies: RpaCookie[], platform: RpaPlatformConfig["platform"]): Promise<any>;
    captureCookies(ctx: any, platform: RpaPlatformConfig["platform"]): Promise<RpaCookie[]>;
    startLoginSession(platform: RpaPlatformConfig["platform"], headless?: boolean): Promise<{
        browser: import('playwright-core').Browser;
        ctx: import('playwright-core').BrowserContext;
        page: import('playwright-core').Page;
        platform: "toutiao" | "xiaohongshu";
    }>;
    publishViaRPA(params: {
        platform: RpaPlatformConfig["platform"];
        accountId: string;
        title: string;
        content: string;
        coverImage?: string;
    }): Promise<{
        success: boolean;
        externalId?: string;
        url?: string;
        error?: string;
    }>;
};
export default _default;
//# sourceMappingURL=rpa-client.d.ts.map
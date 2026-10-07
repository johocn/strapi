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
    platform: 'xiaohongshu' | 'toutiao' | 'bilibili';
    /** 平台发布入口 URL（工作台/创作中心） */
    publishUrl: string;
    /** 登录入口 URL（首次扫码） */
    loginUrl: string;
    /** cookie 所属 domain（判断 cookie 是否属于本平台） */
    cookieDomain: string;
    /** 登录页「切到扫码登录」入口选择器；缺省用文字匹配（/扫码|二维码/） */
    qrTabSelector?: string;
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
    /** zhao-common 共享 browser-manager 服务（方案A：全进程唯一 Browser 单例，四道闸门） */
    getSharedBrowserSvc(): any | null;
    /**
     * 获取一个可用 Context：优先走 zhao-common 共享 Browser 单例（内存守门/并发闸统一管理），
     * 仅当 zhao-common 服务整体不可用时才本地 launch 兜底。共享服务返回 null（内存守门降级/
     * 启动失败）时直接抛错——绝不能绕过内存守门再起独立浏览器，否则 OOM 防线失效。
     * opts.cookies: 平台登录态（domain 过滤后由调用方传入，共享模式 addCookies 注入）
     */
    acquireContext(opts?: {
        cookies?: RpaCookie[];
    }): Promise<{
        ctx: any;
        release: () => Promise<void>;
    }>;
    launchBrowser(headless?: boolean): Promise<import('playwright-core').Browser>;
    captureCookies(ctx: any, platform: RpaPlatformConfig["platform"]): Promise<RpaCookie[]>;
    /** 关闭指定账号的登录会话（存在才关）：关 Context 并归还槽位/关闭兜底 Browser */
    closeLoginSession(accountId: string): Promise<void>;
    /** 清理过期会话 */
    _sweepLoginSessions(): Promise<void>;
    /**
     * 开启扫码登录：取 Context（共享 Browser 单例优先）→ 打开平台登录页 → 截图二维码返回（dataURL）。
     * 操作者扫码后调用 finishLoginSession 抓取并保存 cookie。
     * headless 参数仅为兼容旧签名保留：共享模式下 Browser 由 zhao-common 统一管理（Linux 恒 headless）。
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
        videoUrl?: string;
    }): Promise<{
        success: boolean;
        externalId?: string;
        url?: string;
        error?: string;
    }>;
};
export default _default;
//# sourceMappingURL=rpa-client.d.ts.map
import { BrowserContext, Page } from 'playwright';
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
declare function openContext(opts?: {
    cookies?: any[];
    initScripts?: string[];
    userAgent?: string;
    locale?: string;
    viewport?: {
        width: number;
        height: number;
    };
}): Promise<ContextHandle | null>;
/**
 * 创建新 Page（自动排队限流 + 超时设置）
 * opts.storageState: Playwright storageState（cookies+localStorage），用于多平台多账号登录态复用
 */
declare function createPage(opts?: {
    storageState?: any;
    userAgent?: string;
}): Promise<Page | null>;
/** 关闭 Page 和其 Context 并释放槽位 */
declare function closePage(page: Page): Promise<void>;
/** 关闭浏览器（进程退出 / 空闲回收 / 手动） */
declare function shutdown(reason?: string): Promise<void>;
/** 运行状态（调试/运维观测用） */
declare function stats(): {
    browserUp: boolean;
    activePages: number;
    queued: number;
    maxPages: number;
    minFreeMB: number;
    idleCloseMs: number;
    memAvailableMB: number;
};
declare const _default: ({ strapi }: any) => {
    createPage: typeof createPage;
    openContext: typeof openContext;
    closePage: typeof closePage;
    shutdown: typeof shutdown;
    stats: typeof stats;
};
export default _default;

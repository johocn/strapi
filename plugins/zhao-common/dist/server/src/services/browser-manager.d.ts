import { Page } from 'playwright';
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
    closePage: typeof closePage;
    shutdown: typeof shutdown;
    stats: typeof stats;
};
export default _default;

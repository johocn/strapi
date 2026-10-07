/**
 * 浏览器网关（薄壳）。
 *
 * Playwright 实现已上移 zhao-common 的 browser-manager 共享服务
 * （plugins/zhao-common/server/src/services/browser-manager.ts），与多媒体中心（zhao-studio）
 * 共用同一 Browser 单例：惰性启动 + 并发闸 + 空闲回收 + 内存守门 + Context 级登录态隔离。
 *
 * 本模块仅做转发，保持 collectors 的 `import { createPage, closePage } from '../playwright-manager'`
 * 导入形态与 jest.mock 用法不变。网关由插件 bootstrap 注入（绝不在此启动浏览器——
 * 原 eager initBrowser 曾在 1.8GB 生产服务器上每次启动拉起 chromium 导致 OOM 循环）。
 */
type Page = any;
type BrowserGateway = {
    createPage(opts?: {
        storageState?: any;
        userAgent?: string;
    }): Promise<Page | null>;
    closePage(page: Page): Promise<void>;
};
/** bootstrap 时注入 zhao-common browser-manager 服务 */
export declare function setBrowserGateway(svc: BrowserGateway | null): void;
export declare function getBrowserGateway(): BrowserGateway | null;
/** 取页面：未注入网关或共享服务不可用时返回 null（调用方按「浏览器不可用」降级） */
export declare function createPage(opts?: {
    storageState?: any;
    userAgent?: string;
}): Promise<Page | null>;
export declare function closePage(page: Page): Promise<void>;
export {};

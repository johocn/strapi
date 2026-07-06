import { Browser, Page } from 'playwright';
/**
 * 初始化 Browser 单例（headed 模式，复用本机 Chrome）
 */
export declare function initBrowser(): Promise<Browser | null>;
/**
 * 获取 Browser 实例
 */
export declare function getBrowser(): Browser | null;
/**
 * 创建新 Page（自动设置超时）
 */
export declare function createPage(): Promise<Page | null>;
/**
 * 关闭 Page 和其 Context
 */
export declare function closePage(page: Page): Promise<void>;
/**
 * 销毁 Browser
 */
export declare function destroyBrowser(): Promise<void>;

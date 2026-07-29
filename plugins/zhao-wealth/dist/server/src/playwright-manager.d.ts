import { Browser, Page } from 'playwright';
/**
 * 初始化 Browser 单例
 * Windows: headed 模式（复用本机 Chrome，用于调试）
 * Linux:   headless 模式（服务器无显示环境）
 *
 * 失败后标记 initFailed，不再反复尝试（避免日志刷屏）
 * 服务器安装 Chrome 后重启 Strapi 即可恢复
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

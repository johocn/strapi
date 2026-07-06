/**
 * 在 AsyncLocalStorage 上下文中执行函数（由全局中间件调用）。
 * AsyncLocalStorage 保证每个异步链的上下文独立，无竞态条件。
 */
export declare function runWithContext<T>(url: string, fn: () => Promise<T>): Promise<T>;
/**
 * 检查当前请求是否来自后台管理面板。
 * 后台管理面板创建的账号不应自动创建个人渠道。
 */
export declare function isAdminContext(): boolean;

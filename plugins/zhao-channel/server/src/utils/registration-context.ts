import { AsyncLocalStorage } from "async_hooks";

interface RegistrationContext {
  /** 请求 URL，用于判断是否为后台管理请求 */
  url: string;
}

const contextStorage = new AsyncLocalStorage<RegistrationContext>();

/**
 * 在 AsyncLocalStorage 上下文中执行函数（由全局中间件调用）。
 * AsyncLocalStorage 保证每个异步链的上下文独立，无竞态条件。
 */
export function runWithContext<T>(url: string, fn: () => Promise<T>): Promise<T> {
  return contextStorage.run({ url }, fn);
}

/**
 * 检查当前请求是否来自后台管理面板。
 * 后台管理面板创建的账号不应自动创建个人渠道。
 */
export function isAdminContext(): boolean {
  const ctx = contextStorage.getStore();
  if (!ctx) return false;
  return ctx.url.includes("/admin/") || ctx.url.includes("/content-manager/");
}

/** 全局安装：patch window.fetch，为 /api/zhao- 请求注入 Authorization（幂等） */
export declare function installZhaoAuthFetch(): void;
/** 推荐用法：显式经由此封装调用 zhao-studio admin 接口 */
export declare function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T>;
//# sourceMappingURL=http.d.ts.map
// admin/src/utils/http.ts
// 统一请求封装：对 /api/zhao-* 同源请求自动注入 Strapi admin token。
// zhao-auth 的 is-authenticated 策略已兼容 admin JWT（映射为 admin 角色），
// 使 zhao-studio admin 页面的所有接口调用在生产环境可正常通过鉴权。

let installed = false;

/** 全局安装：patch window.fetch，为 /api/zhao- 请求注入 Authorization（幂等） */
export function installZhaoAuthFetch(): void {
  if (installed || typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: any, init?: any) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/zhao-')) {
        const token = window.localStorage.getItem('jwtToken');
        if (token) {
          const headers = new Headers(init?.headers || (typeof input !== 'string' ? input?.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          return originalFetch(input, { ...init, headers, credentials: init?.credentials || 'include' });
        }
      }
    } catch {
      // 注入失败则退回原始 fetch
    }
    return originalFetch(input, init);
  };
  installed = true;
}

const BASE = '/api/zhao-studio/v1/admin';

/** 推荐用法：显式经由此封装调用 zhao-studio admin 接口 */
export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('jwtToken') : null;
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`请求失败 ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

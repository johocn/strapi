import type { Core } from "@strapi/strapi";

/**
 * Vendure 电商档案客户端（课程用户类型同步）
 * - 从环境变量注入管理 API 地址与凭据（不提交 git / 不入库）
 * - 仅覆盖管理员会话可见的渠道（当前为默认渠道）；租户渠道顾客不可见时安全跳过
 * - 任何失败只记日志，never throw，不影响课程报名主流程
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const apiUrl = process.env.ZUES_VENDURE_ADMIN_API || "http://127.0.0.1:3020/admin-api";
  const username = process.env.ZUES_VENDURE_ADMIN_USERNAME || "";
  const password = process.env.ZUES_VENDURE_ADMIN_PASSWORD || "";
  const COURSE_TYPE = "course";

  let cachedToken: string | null = null;

  function configured(): boolean {
    return Boolean(apiUrl && username && password);
  }

  async function gql(body: { query: string; variables?: any }, token?: string): Promise<any> {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const authToken = res.headers.get("vendure-auth-token");
    let json: any = null;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, authToken, json };
  }

  async function login(): Promise<string> {
    const { authToken, json } = await gql({
      query: `mutation($u:String!,$p:String!){ login(username:$u,password:$p){ ... on CurrentUser { id } } }`,
      variables: { u: username, p: password },
    });
    if (!authToken) {
      const msg = json?.errors?.[0]?.message || "unknown";
      throw new Error(`Vendure admin 登录失败: ${msg}`);
    }
    cachedToken = authToken;
    return authToken;
  }

  async function ensureToken(): Promise<string> {
    if (cachedToken) return cachedToken;
    return login();
  }

  async function runWithRetry<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await ensureToken();
    try {
      return await fn(token);
    } catch (err: any) {
      // 令牌失效则重登一次再试
      if (err && (err.code === "FORBIDDEN" || err.code === "UNAUTHORIZED" || err.status === 401)) {
        cachedToken = null;
        const fresh = await login();
        return await fn(fresh);
      }
      throw err;
    }
  }

  return {
    /**
     * 将用户标记为课程用户（幂等）
     * @param ssoId SSO 用户数字主键（对应电商 customer.customFieldsSsoid 字符串）
     */
    async markAsCourseUser(ssoId: string | number): Promise<{
      ok: boolean; reason?: string; skipped?: boolean; customerId?: string;
    }> {
      const sid = String(ssoId);
      if (!configured()) {
        return { ok: false, reason: "ZUES_VENDURE_ADMIN_* 未配置，跳过电商档案标记" };
      }
      try {
        return await runWithRetry(async (token) => {
          const q = await gql({
            query: `query($s:String!){
              customers(options:{ filter:{ ssoId:{ eq:$s } } }){
                items { id customFields { customerType } }
              }
            }`,
            variables: { s: sid },
          }, token);
          if (q.json?.errors?.length) {
            throw Object.assign(new Error(q.json.errors[0].message), { status: 400 });
          }
          const items = q.json?.data?.customers?.items || [];
          if (items.length === 0) {
            return { ok: false, reason: `未找到 ssoId=${sid} 的电商顾客（可能在其他渠道或未建档）` };
          }
          const customer = items[0];
          if (customer.customFields?.customerType === COURSE_TYPE) {
            return { ok: true, skipped: true, customerId: customer.id };
          }
          const mut = await gql({
            query: `mutation($input:UpdateCustomerInput!){
              updateCustomer(input:$input){ ... on Customer { id customFields { customerType } } }
            }`,
            variables: { input: { id: customer.id, customFields: { customerType: COURSE_TYPE } } },
          }, token);
          if (mut.json?.errors?.length) {
            throw Object.assign(new Error(mut.json.errors[0].message), { status: 400 });
          }
          return { ok: true, customerId: mut.json?.data?.updateCustomer?.id };
        });
      } catch (err: any) {
        strapi.log.warn(`[zhao-course] 标记课程用户失败 ssoId=${sid}: ${err?.message || err}`);
        return { ok: false, reason: err?.message || "unknown error" };
      }
    },
  };
};
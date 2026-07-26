/**
 * 内置回退认证策略
 * - 若 zhao-auth 已安装，使用其 auth 服务验证 JWT 并注入 ctx.state.user
 * - 否则检查 Strapi 原生 admin 认证：state.user 存在则放行
 *
 * 注意：Strapi v5 的 policyContext 即 Koa ctx，policyContext.throw 不存在
 */
const fallbackAuthenticated = async (policyContext: any, _config: any, { strapi }: { strapi: any }) => {
  // 优先使用 zhao-auth 的 auth 服务
  try {
    const zhaoAuth = strapi.plugin("zhao-auth");
    if (zhaoAuth) {
      const authService = zhaoAuth.service("auth");
      if (authService) {
        const token = authService.extractToken(policyContext);
        if (token) {
          const user = await authService.authenticate(token);
          if (user) {
            policyContext.state.user = user;
            policyContext.user = user;
            return true;
          }
        }
      }
    }
  } catch (e: any) {
    // zhao-auth 认证失败，继续回退检查
  }

  // 回退：检查 state.user（Strapi 原生 admin session）
  if (policyContext.state?.user) {
    return true;
  }
  return false;
};

export default fallbackAuthenticated;

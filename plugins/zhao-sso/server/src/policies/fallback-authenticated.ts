/**
 * 内置回退认证策略（独立安装模式，无 zhao-auth 时使用）
 * 检查 Strapi 原生 admin 认证：state.user 存在则放行，否则 401
 */
const fallbackAuthenticated = (policyContext: any, _config: any, _ctx: any) => {
  const { state } = policyContext;
  if (state.user) {
    return true;
  }
  policyContext.throw(401, "Authentication required");
  return false;
};

export default fallbackAuthenticated;

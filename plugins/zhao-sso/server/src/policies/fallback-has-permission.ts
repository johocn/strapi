/**
 * 内置回退权限策略（独立安装模式，无 zhao-auth 时使用）
 * 超管放行；非超管拒绝（403）
 */
const fallbackHasPermission = (policyContext: any, _config: any, _ctx: any) => {
  const { state } = policyContext;
  if (state.user?.roles?.some((r: any) => r.code === "strapi-super-admin")) {
    return true;
  }
  policyContext.throw(403, "Insufficient permissions");
  return false;
};

export default fallbackHasPermission;

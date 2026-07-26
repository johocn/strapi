/**
 * 内置回退权限策略
 * - 若 zhao-auth 已安装，使用其 permission 服务检查权限
 * - 否则超管放行，非超管返回 false
 *
 * 注意：Strapi v5 的 policyContext 即 Koa ctx，policyContext.throw 不存在
 * config.action 指定要检查的权限动作（如 "sso.oauth-config.create"）
 */
const fallbackHasPermission = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }

  const action = config?.action;
  if (!action) {
    // 没有指定权限动作，放行（由认证策略保证已登录）
    return true;
  }

  // admin 角色直接放行
  const userRoles: string[] = Array.isArray((user as any).zhaoRoles)
    ? (user as any).zhaoRoles
    : Array.isArray(user.roles)
      ? (typeof user.roles[0] === "string"
          ? user.roles
          : user.roles.map((r: any) => r?.code || r?.name || r?.type).filter(Boolean))
      : [];

  if (userRoles.includes("admin")) {
    return true;
  }

  // 使用 zhao-auth 的 permission 服务检查
  try {
    const zhaoAuth = strapi.plugin("zhao-auth");
    if (zhaoAuth) {
      const permissionService = zhaoAuth.service("permission");
      if (permissionService) {
        const tenantDocumentId = policyContext.state?.siteDocumentId;
        const result = await permissionService.getMyPermissions(user.id, tenantDocumentId);
        if (result?.permissions?.includes(action)) {
          return true;
        }
      }
    }
  } catch {
    // ignore
  }

  // 回退：超管放行
  const isSuperAdmin = userRoles.includes("strapi-super-admin") ||
    user.roles?.some((r: any) => r.code === "strapi-super-admin" || r.code === "admin" || r.name === "admin");
  if (isSuperAdmin) {
    return true;
  }
  return false;
};

export default fallbackHasPermission;

/**
 * 功能权限策略（Strapi v5 原生签名）
 * 检查用户是否有指定的功能权限
 * 配置项: action - 权限动作（如 "channel.read"）
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
const hasPermission = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }

  const action = config?.action;
  if (!action) {
    return false;
  }

  const userRoles: string[] = Array.isArray(user.roles) ? user.roles : [];

  if (userRoles.includes("admin")) {
    return true;
  }

  try {
    const permissionService = strapi.plugin("zhao-auth").service("permission");
    const result = await permissionService.getMyPermissions(user.id);

    if (result.permissions.includes(action)) {
      return true;
    }
  } catch (e: any) {
    // ignore
  }

  return false;
};

export default hasPermission;

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

  // 统一使用 zhaoRoles 判定 admin（修复 roles vs zhaoRoles 不一致）
  const userRoles: string[] = Array.isArray((user as any).zhaoRoles)
    ? (user as any).zhaoRoles
    : Array.isArray(user.roles)
      ? user.roles
      : [];

  if (userRoles.includes("admin")) {
    return true;
  }

  // admin 面板 token（非超管角色）不再回退到 up_users 权限查询：
  // admin_users.id 与 up_users.id 不同源，回退可能命中无关账号造成越权
  if ((user as any).isAdminPanel) {
    return false;
  }

  try {
    const permissionService = strapi.plugin("zhao-auth").service("permission");
    // 传入 tenantDocumentId（由 tenant-context-injector policy 或 site-resolver 设置）
    const tenantDocumentId = policyContext.state?.siteDocumentId;
    const result = await permissionService.getMyPermissions(user.id, tenantDocumentId);

    if (result.permissions.includes(action)) {
      return true;
    }
  } catch (e: any) {
    // ignore
  }

  return false;
};

export default hasPermission;

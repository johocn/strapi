/**
 * 租户访问策略（Strapi v5 原生签名）
 * 校验用户是否有权访问当前租户（site）
 *
 * 依赖：
 * - is-authenticated（注入 ctx.state.user）
 * - has-channel-scope（注入 ctx.state.channelScope，非阻断）
 * - site-resolver 中间件（注入 ctx.state.siteId，即 site-config 的 documentId）
 *
 * 逻辑：
 * - admin 直接放行
 * - 未识别租户（无 siteId）放行，由其他策略处理
 * - 否则检查用户可见渠道与租户关联渠道是否存在交集
 *
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
const hasTenantAccess = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }

  // admin 直接放行（优先级：roles > zhaoRoles）
  const userRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : (Array.isArray(user.zhaoRoles) ? user.zhaoRoles : []);
  if (userRoles.includes("admin")) {
    return true;
  }

  const siteId = policyContext.state?.siteDocumentId; // site-config 的 documentId
  if (!siteId) {
    // 未识别租户，放行由其他策略处理
    return true;
  }

  // 用户可见渠道（复用 has-channel-scope 注入的 channelScope；缺失时回退查询）
  const scope = policyContext.state?.channelScope;
  let userChannelIds: number[];
  if (scope) {
    if (scope.all) {
      return true;
    }
    userChannelIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  } else {
    // channelScope 缺失（has-channel-scope 未执行），回退查询 channel-permission
    try {
      const channelPermService = strapi.plugin("zhao-channel").service("channel-permission");
      userChannelIds = await channelPermService.getUserAllChannels(user.id) || [];
    } catch (e: any) {
      strapi.log.warn(`[has-tenant-access] failed to resolve user channels: ${e.message}`);
      return false;
    }
  }

  if (userChannelIds.length === 0) {
    return false;
  }

  // 租户关联渠道（site-config documentId → channels numeric ids）
  // channel.sites 与 site-config.channels 为 manyToMany，底层关联表 zhao_channels_sites_lnk
  let siteChannelIds: number[] = [];
  try {
    const siteConfig = await strapi.db.query("plugin::zhao-common.site-config").findOne({
      where: { documentId: siteId },
      populate: { channels: { select: ["id"] } },
    });
    if (siteConfig?.channels && Array.isArray(siteConfig.channels)) {
      siteChannelIds = siteConfig.channels
        .map((c: any) => c?.id)
        .filter((id: any) => typeof id === "number");
    }
  } catch (e: any) {
    strapi.log.warn(`[has-tenant-access] failed to query site channels: ${e.message}`);
    return false;
  }

  if (siteChannelIds.length === 0) {
    // 租户未关联任何渠道，拒绝以避免越权
    return false;
  }

  return userChannelIds.some((uc) => siteChannelIds.includes(uc));
};

export default hasTenantAccess;

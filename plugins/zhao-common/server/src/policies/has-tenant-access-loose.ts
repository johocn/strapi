/**
 * 宽松版租户访问策略（Strapi v5 原生签名）
 * 与 plugin::zhao-auth.has-tenant-access 的区别：采用并集语义
 *
 * 适用场景：C 端资源发现类端点（如 /channels/available）
 * - 用户已登录但与当前站点无渠道交集时仍需放行
 * - 仅当用户与站点双方皆无渠道时才拒绝
 *
 * 依赖：
 * - is-authenticated（注入 ctx.state.user）
 * - has-channel-scope（注入 ctx.state.channelScope，非阻断）
 * - site-resolver 中间件（注入 ctx.state.siteId）
 */
const hasTenantAccessLoose = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
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

  const siteId = policyContext.state?.siteId;
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
    try {
      userChannelIds = await strapi.plugin("zhao-channel").service("channel-permission").getUserAllChannels(user.id) || [];
    } catch (e: any) {
      strapi.log.warn(`[has-tenant-access-loose] failed to resolve user channels: ${e.message}`);
      return false;
    }
  }

  // 租户关联渠道（site-config documentId → channels numeric ids）
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
    strapi.log.warn(`[has-tenant-access-loose] failed to query site channels: ${e.message}`);
    return false;
  }

  // 并集：双方皆空才拒绝；任一非空即放行
  if (userChannelIds.length === 0 && siteChannelIds.length === 0) {
    return false;
  }
  return true;
};

export default hasTenantAccessLoose;

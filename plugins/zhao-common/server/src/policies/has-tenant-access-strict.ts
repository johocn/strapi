/**
 * 严格版租户访问策略（Strapi v5 原生签名）
 * 与 has-tenant-access-loose 的区别：用户渠道查询不复用 channelScope（扩展子树），
 * 改为直接调用 channel-permission.getUserDirectChannels（不扩展子树）
 *
 * 适用场景：C 端仅需直接关联渠道的端点（如 /channels/available）
 * - 仅当用户直接渠道与站点渠道双方皆空时才拒绝
 *
 * 依赖：
 * - is-authenticated（注入 ctx.state.user）
 * - site-resolver 中间件（注入 ctx.state.siteId）
 * - channel-permission.getUserDirectChannels（不扩展子树）
 */
const hasTenantAccessStrict = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
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

  // 用户直接渠道（不复用 channelScope，直接调 getUserDirectChannels 不扩展子树）
  let userChannelIds: number[];
  try {
    userChannelIds = await strapi.plugin("zhao-channel").service("channel-permission").getUserDirectChannels(user.id) || [];
  } catch (e: any) {
    strapi.log.warn(`[has-tenant-access-strict] failed to resolve user direct channels: ${e.message}`);
    return false;
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
    strapi.log.warn(`[has-tenant-access-strict] failed to query site channels: ${e.message}`);
    return false;
  }

  // 并集：双方皆空才拒绝；任一非空即放行
  if (userChannelIds.length === 0 && siteChannelIds.length === 0) {
    return false;
  }
  return true;
};

export default hasTenantAccessStrict;

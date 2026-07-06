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
declare const hasTenantAccessStrict: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasTenantAccessStrict;

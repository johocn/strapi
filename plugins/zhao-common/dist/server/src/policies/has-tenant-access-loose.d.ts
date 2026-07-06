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
declare const hasTenantAccessLoose: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasTenantAccessLoose;

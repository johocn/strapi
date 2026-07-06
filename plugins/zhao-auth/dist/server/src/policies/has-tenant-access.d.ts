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
declare const hasTenantAccess: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasTenantAccess;

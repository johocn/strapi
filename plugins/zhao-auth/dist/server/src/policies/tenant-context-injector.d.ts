/**
 * 租户上下文注入策略（Strapi v5 原生签名）
 * 当 ctx.state.siteDocumentId 未设置时（admin 后台场景），从 JWT 的 currentTenantId 注入
 * 确保 channel-admin 在 admin 后台操作时租户覆盖能生效
 *
 * 必须在 is-authenticated 之后、has-permission 之前执行
 */
declare const tenantContextInjector: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default tenantContextInjector;

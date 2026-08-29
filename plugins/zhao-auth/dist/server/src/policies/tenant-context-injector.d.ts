/**
 * 租户上下文注入策略（Strapi v5 原生签名）
 * 已认证用户 JWT 中的 currentTenantId 是显式选择的租户，始终优先覆盖 siteDocumentId
 * （site-resolver 中间件在 h.joho.cn 无域名匹配时会兜底为默认站点，必须被 JWT 覆盖）
 * 未切换租户（无 currentTenantId）时保留 site-resolver 的域名/兜底解析结果
 *
 * 必须在 is-authenticated 之后、has-permission 之前执行
 */
declare const tenantContextInjector: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default tenantContextInjector;

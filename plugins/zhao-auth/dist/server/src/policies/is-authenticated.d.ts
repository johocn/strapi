/**
 * 认证策略（Strapi v5 原生签名）
 * 提取 JWT token，验证并注入 ctx.state.user
 *
 * Strapi v5 策略签名: (policyContext, config, { strapi }) => boolean | void
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 * 注意：不要抛出 @strapi/utils errors，因为插件打包会导致 instanceof 失败
 *
 * 兼容 SSO token：SSO 插件签发的 JWT 用独立 secret，
 * 这里先尝试 zhao-auth 的 secret 验证，失败后再尝试 SSO 的 secret。
 */
declare const isAuthenticated: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default isAuthenticated;

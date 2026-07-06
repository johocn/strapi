/**
 * SSO 认证策略（Strapi v5 原生签名）
 * 验证 SSO Bearer token，注入 ssoUser 到 policyContext.state
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
declare const ssoAuthenticated: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default ssoAuthenticated;

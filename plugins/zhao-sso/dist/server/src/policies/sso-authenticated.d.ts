/**
 * SSO 认证策略（Strapi v5 原生签名）
 * 验证 SSO Bearer token，注入 ssoUser 到 policyContext.state
 * 鉴权失败（缺失/格式错误/过期/无效/已注销 access token）抛 401；
 * 真 403 由控制器内权限校验（e.status=403）负责，本策略只判"是否已认证"不判权限。
 */
declare const ssoAuthenticated: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default ssoAuthenticated;

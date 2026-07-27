/**
 * 内置回退认证策略
 * - 若 zhao-auth 已安装，使用其 auth 服务验证 JWT 并注入 ctx.state.user
 * - 否则检查 Strapi 原生 admin 认证：state.user 存在则放行
 *
 * 注意：Strapi v5 的 policyContext 即 Koa ctx，policyContext.throw 不存在
 */
declare const fallbackAuthenticated: (policyContext: any, _config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default fallbackAuthenticated;

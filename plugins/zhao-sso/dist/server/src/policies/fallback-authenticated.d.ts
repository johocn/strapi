/**
 * 内置回退认证策略（独立安装模式，无 zhao-auth 时使用）
 * 检查 Strapi 原生 admin 认证：state.user 存在则放行，否则 401
 */
declare const fallbackAuthenticated: (policyContext: any, _config: any, _ctx: any) => boolean;
export default fallbackAuthenticated;

/**
 * 内置回退权限策略
 * - 若 zhao-auth 已安装，使用其 permission 服务检查权限
 * - 否则超管放行，非超管返回 false
 *
 * 注意：Strapi v5 的 policyContext 即 Koa ctx，policyContext.throw 不存在
 * config.action 指定要检查的权限动作（如 "sso.oauth-config.create"）
 */
declare const fallbackHasPermission: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default fallbackHasPermission;

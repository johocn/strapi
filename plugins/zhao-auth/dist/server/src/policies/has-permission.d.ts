/**
 * 功能权限策略（Strapi v5 原生签名）
 * 检查用户是否有指定的功能权限
 * 配置项: action - 权限动作（如 "channel.read"）
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
declare const hasPermission: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasPermission;

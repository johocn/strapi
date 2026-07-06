/**
 * 渠道访问策略（Strapi v5 原生签名）
 * 检查用户是否有权访问指定渠道
 * 从请求参数/body/query 中提取 channelId
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
declare const hasChannelAccess: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasChannelAccess;

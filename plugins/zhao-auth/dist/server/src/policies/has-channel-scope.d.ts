/**
 * 渠道范围策略（Strapi 原生签名，非阻断）
 * 解析用户可见渠道范围，注入 policyContext.state.channelScope
 */
declare const hasChannelScope: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default hasChannelScope;

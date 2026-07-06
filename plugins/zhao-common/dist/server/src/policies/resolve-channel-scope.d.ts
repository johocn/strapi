/**
 * 渠道范围解析策略（Strapi v5 原生签名，非阻断）
 *
 * 依赖前置：
 * - is-authenticated（可选，注入 ctx.state.user）
 * - has-channel-scope（注入 ctx.state.channelScope）
 * - site-resolver 中间件（注入 ctx.state.siteId）
 *
 * 注入 ctx.state:
 * - channelUsage: 'site_only' | 'site_and_cross' | 'site_cross_user'
 * - mergedChannelIds: number[]（site_only=siteChannelIds, site_and_cross=siteChannelIds,
 *                   site_cross_user=siteChannelIds ∪ userChannelIds）
 * - crossChannelEnabled: boolean（site_only=false，其余=true）
 * - siteChannelIds: number[]
 * - isGuest: boolean
 */
declare const resolveChannelScope: (policyContext: any, config: any, { strapi }: {
    strapi: any;
}) => Promise<boolean>;
export default resolveChannelScope;

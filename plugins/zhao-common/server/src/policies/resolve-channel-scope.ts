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
const resolveChannelScope = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const channelScope = policyContext.state?.channelScope;
  const isGuest = !channelScope || channelScope.isGuest === true
    || (!channelScope.all && !(channelScope.channelIds?.length));

  const userChannelIds: number[] = channelScope?.all
    ? []
    : (Array.isArray(channelScope?.channelIds) ? channelScope.channelIds : []);

  const siteId = policyContext.state?.siteDocumentId; // site-config 的 documentId

  // 无 siteId：fallback 到默认值 site_cross_user
  if (!siteId) {
    policyContext.state.channelUsage = 'site_cross_user';
    policyContext.state.mergedChannelIds = userChannelIds;
    policyContext.state.crossChannelEnabled = true;
    policyContext.state.siteChannelIds = [];
    policyContext.state.isGuest = isGuest;
    return true;
  }

  // 查询 site-config
  let siteChannelIds: number[] = [];
  let channelUsage: string = 'site_cross_user';
  try {
    const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
      where: { documentId: siteId },
      select: ['channelUsage'],
      populate: { channels: { select: ['id'] } },
    });
    if (siteConfig) {
      if (siteConfig.channelUsage) {
        channelUsage = siteConfig.channelUsage;
      }
      if (Array.isArray(siteConfig.channels)) {
        siteChannelIds = siteConfig.channels
          .map((c: any) => (typeof c === 'number' ? c : c?.id))
          .filter((id: any) => typeof id === 'number');
      }
    }
  } catch (e: any) {
    strapi.log.warn(`[resolve-channel-scope] 查询 site-config 失败: ${e.message}`);
    // 降级：用默认值继续
  }

  // 计算 mergedChannelIds
  let mergedChannelIds: number[];
  if (channelUsage === 'site_cross_user' && !channelScope?.all) {
    // 并集去重
    const set = new Set<number>([...siteChannelIds, ...userChannelIds]);
    mergedChannelIds = Array.from(set);
  } else {
    // site_only / site_and_cross / admin：仅站点渠道
    mergedChannelIds = siteChannelIds;
  }

  const crossChannelEnabled = channelUsage !== 'site_only';

  policyContext.state.channelUsage = channelUsage;
  policyContext.state.mergedChannelIds = mergedChannelIds;
  policyContext.state.crossChannelEnabled = crossChannelEnabled;
  policyContext.state.siteChannelIds = siteChannelIds;
  policyContext.state.isGuest = isGuest;

  return true;
};

export default resolveChannelScope;

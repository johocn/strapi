import type { Core } from '@strapi/strapi';

const CHANNEL_UID = 'plugin::zhao-studio.promo-channel';
const BROWSER_LOG_UID = 'plugin::zhao-studio.browser-log';
const CLICK_EVENT_UID = 'plugin::zhao-track.click-event';
const ORDER_UID = 'plugin::zhao-track.order';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwErr = (code: string, message: string) => {
    const err: any = new Error(message);
    err.code = code;
    throw err;
  };

  // 5 分钟内存缓存
  const cache = new Map<string, { data: any; expireAt: number }>();
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const CACHE_MAX = 10000;

  const getCache = (key: string) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  };

  const setCache = (key: string, data: any) => {
    if (cache.size >= CACHE_MAX) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, { data, expireAt: Date.now() + CACHE_TTL_MS });
  };

  return {
    async getChannelReport(opts: { channelCode: string; startDate: string; endDate: string; groupBy?: 'day' | 'campaign' | 'variant' }) {
      const cacheKey = `channel-report:${opts.channelCode}:${opts.startDate}:${opts.endDate}:${opts.groupBy || ''}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      // 查渠道
      const channels = await strapi.documents(CHANNEL_UID).findMany({
        filters: { code: opts.channelCode },
        populate: { campaigns: { populate: { experiments: { populate: { variants: true } } } } },
      });
      if (!channels || channels.length === 0) {
        throwErr('STUDIO_PROMO_CHANNEL_NOT_FOUND', '推广渠道不存在');
      }
      const channel = channels[0];

      // 按文案变体分组：曝光 / 点击 / CTR / 转化，用于对比哪条文案更好
      if (opts.groupBy === 'variant') {
        const campaignIds = (channel.campaigns || []).map((c: any) => c.documentId);
        const variants: any[] = [];
        for (const c of (channel.campaigns || [])) {
          for (const e of (c.experiments || [])) {
            for (const v of (e.variants || [])) {
              variants.push({ ...v, campaignCode: c.code, campaignName: c.name });
            }
          }
        }
        const byVariant = await Promise.all(
          variants.map(async (v: any) => {
            const impLogs = await strapi.documents(BROWSER_LOG_UID).findMany({
              filters: {
                abVariant: { documentId: v.documentId },
                promoChannelCode: opts.channelCode,
                eventType: 'page-view',
                timestamp: { $gte: opts.startDate, $lte: opts.endDate },
              },
            });
            const impressions = impLogs ? impLogs.length : 0;

            let clicks = 0;
            let orders = 0;
            let matchedCommission = 0;
            if (campaignIds.length > 0) {
              const clk = await strapi.documents(CLICK_EVENT_UID).findMany({
                filters: {
                  abVariant: { documentId: v.documentId },
                  promoCampaign: { documentId: { $in: campaignIds } },
                  clickedAt: { $gte: opts.startDate, $lte: opts.endDate },
                },
              });
              clicks = clk ? clk.length : 0;
              const ords = await strapi.documents(ORDER_UID).findMany({
                filters: {
                  matchedClick: { abVariant: { documentId: v.documentId } },
                  transactedAt: { $gte: opts.startDate, $lte: opts.endDate },
                },
              });
              orders = ords ? ords.length : 0;
              for (const o of (ords || [])) {
                const comm = Number(o.commission) || 0;
                if (o.attributionQuality && o.attributionQuality !== 'unmatched') {
                  matchedCommission += comm;
                }
              }
            }

            const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
            return {
              variantId: v.documentId,
              variantName: v.name,
              campaignCode: v.campaignCode,
              campaignName: v.campaignName,
              weight: v.weight,
              impressions,
              clicks,
              ctr,
              orders,
              matchedCommission: Number(matchedCommission.toFixed(2)),
            };
          }),
        );

        const variantReport = {
          channel: { code: channel.code, name: channel.name, scene: channel.scene },
          groupBy: 'variant',
          byVariant,
        };
        setCache(cacheKey, variantReport);
        return variantReport;
      }

      // 内容侧：browser-log
      const browserLogs = await strapi.documents(BROWSER_LOG_UID).findMany({
        filters: {
          promoChannelCode: opts.channelCode,
          timestamp: { $gte: opts.startDate, $lte: opts.endDate },
        },
      });
      const impressions = (browserLogs || []).filter((l: any) => l.eventType === 'page-view').length;
      const adClicks = (browserLogs || []).filter((l: any) => l.eventType === 'ad-click').length;

      // 优惠券侧：跨插件查 zhao-track
      const campaignIds = (channel.campaigns || []).map((c: any) => c.documentId);

      let couponClicks = 0;
      let orders = 0;
      let paidOrders = 0;
      let totalCommission = 0;
      let matchedCommission = 0;

      if (campaignIds.length > 0) {
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            promoCampaign: { documentId: { $in: campaignIds } },
            clickedAt: { $gte: opts.startDate, $lte: opts.endDate },
          },
        });
        couponClicks = clicks ? clicks.length : 0;

        const orderList = await strapi.documents(ORDER_UID).findMany({
          filters: {
            promoCampaign: { documentId: { $in: campaignIds } },
            transactedAt: { $gte: opts.startDate, $lte: opts.endDate },
          },
        });
        orders = orderList ? orderList.length : 0;
        for (const o of (orderList || [])) {
          const comm = Number(o.commission) || 0;
          totalCommission += comm;
          if (o.attributionQuality && o.attributionQuality !== 'unmatched') {
            matchedCommission += comm;
          }
          if (o.commissionStatus === 'paid') {
            paidOrders++;
          }
        }
      }

      // 成本
      const channelCost = Number(channel.actualCost) || 0;
      const campaignCost = (channel.campaigns || []).reduce((sum: number, c: any) => sum + (Number(c.actualCost) || 0), 0);
      const actualCost = channelCost + campaignCost;

      // ROI
      const roi = actualCost > 0 ? Number(((matchedCommission - actualCost) / actualCost * 100).toFixed(2)) : 0;

      const report = {
        channel: { code: channel.code, name: channel.name, scene: channel.scene },
        funnel: { impressions, adClicks, couponClicks, orders, paidOrders },
        revenue: { totalCommission: Number(totalCommission.toFixed(2)), matchedCommission: Number(matchedCommission.toFixed(2)) },
        cost: { budget: Number(channel.budget) || 0, actualCost },
        roi,
        byCampaign: (channel.campaigns || []).map((c: any) => ({
          campaign: c.name,
          code: c.code,
        })),
      };

      setCache(cacheKey, report);
      return report;
    },

    _resetCache() {
      cache.clear();
    },
  };
};

import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-track.order";
const SOURCE_TAG_UID = "plugin::zhao-track.source-tag";
const CLICK_EVENT_UID = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";
const CAMPAIGN_UID = "plugin::zhao-studio.promo-campaign";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getWindowDays = (): number => {
    try {
      const cm = strapi.plugin("zhao-common").service("config-manager");
      const v = cm?.get?.("attributionWindowDays", 7);
      return typeof v === "number" && v > 0 ? v : 7;
    } catch {
      return 7;
    }
  };

  /**
   * 对单个订单执行 4 级匹配，返回 { click, quality } 或 null
   * 不修改订单，仅返回匹配结果（写入由 run() 统一处理）
   */
  const findMatchingClick = async (order: any): Promise<{ click: any; quality: string; sourceTagId?: string } | null> => {
    const WINDOW_DAYS = getWindowDays();
    const transactedAt = new Date(order.transactedAt || new Date());
    const windowStart = new Date(transactedAt);
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

    const couponDocId = order.coupon?.documentId || order.coupon;

    // 规则 1: promoPid 匹配（通过 ChannelPlatformConfig 反查 channel → campaign → ClickEvent）
    if (order.promoPid) {
      try {
        const configs = await strapi.documents(CHANNEL_CONFIG_UID).findMany({
          filters: { promoPid: order.promoPid },
          populate: { channel: true },
          limit: 1,
        });
        if (configs && configs.length > 0) {
          const channelId = configs[0].channel?.documentId;
          if (channelId) {
            const campaigns = await strapi.documents(CAMPAIGN_UID).findMany({
              filters: { channel: channelId },
            });
            const campaignIds = (campaigns || []).map((c: any) => c.documentId);
            if (campaignIds.length > 0) {
              const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
                filters: {
                  coupon: couponDocId,
                  promoCampaign: { $in: campaignIds },
                  clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
                },
                sort: { clickedAt: "desc" },
                limit: 1,
                populate: { sourceTag: true },
              });
              if (clicks && clicks.length > 0) {
                return { click: clicks[0], quality: "pid_match", sourceTagId: clicks[0].sourceTag?.documentId };
              }
            }
          }
        }
      } catch (err: any) {
        strapi.log.warn(`[attribution] rule1 (pid_match) failed: ${err.message}`);
      }
    }

    // 规则 2: deviceFingerprint 直接匹配（少数平台支持）
    if (order.deviceFingerprint) {
      try {
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            coupon: couponDocId,
            deviceFingerprint: order.deviceFingerprint,
            clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
          },
          sort: { clickedAt: "desc" },
          limit: 1,
          populate: { sourceTag: true },
        });
        if (clicks && clicks.length > 0) {
          return { click: clicks[0], quality: "click_match", sourceTagId: clicks[0].sourceTag?.documentId };
        }
      } catch (err: any) {
        strapi.log.warn(`[attribution] rule2 (click_match) failed: ${err.message}`);
      }
    }

    // 规则 3: coupon + promoPid 弱匹配（直接查 ClickEvent.promoPid，不走 channel 反查）
    if (order.promoPid) {
      try {
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            coupon: couponDocId,
            promoPid: order.promoPid,
            clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
          },
          sort: { clickedAt: "desc" },
          limit: 1,
          populate: { sourceTag: true },
        });
        if (clicks && clicks.length > 0) {
          return { click: clicks[0], quality: "weak_match", sourceTagId: clicks[0].sourceTag?.documentId };
        }
      } catch (err: any) {
        strapi.log.warn(`[attribution] rule3 (weak_match) failed: ${err.message}`);
      }
    }

    // 规则 4: 仅 coupon 兜底匹配
    try {
      const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
        filters: {
          coupon: couponDocId,
          clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() },
        },
        sort: { clickedAt: "desc" },
        limit: 1,
        populate: { sourceTag: true },
      });
      if (clicks && clicks.length > 0) {
        return { click: clicks[0], quality: "fallback_match", sourceTagId: clicks[0].sourceTag?.documentId };
      }
    } catch (err: any) {
      strapi.log.warn(`[attribution] rule4 (fallback_match) failed: ${err.message}`);
    }

    return null;
  };

  return {
    findMatchingClick,

    /**
     * 执行归因：扫描所有 matchedClick 为空的订单，逐条匹配并写入
     * 幂等：仅处理 matchedClick: null 的订单
     */
    async run(opts?: { limit?: number }) {
      const limit = opts?.limit || 500;
      const pendingOrders = await strapi.documents(ORDER_UID).findMany({
        filters: { matchedClick: null },
        populate: { coupon: true, promoCampaign: true },
        limit,
        sort: { transactedAt: "asc" },
      });

      const stats = { total: pendingOrders.length, matched: 0, unmatched: 0, byQuality: { pid_match: 0, click_match: 0, weak_match: 0, fallback_match: 0 } };

      for (const order of pendingOrders) {
        try {
          const result = await findMatchingClick(order);
          if (result) {
            const updateData: any = {
              matchedClick: result.click.documentId,
              attributionQuality: result.quality,
            };
            if (result.sourceTagId) {
              updateData.sourceTag = result.sourceTagId;
            }
            if (result.click.promoCampaign && !order.promoCampaign) {
              updateData.promoCampaign = result.click.promoCampaign;
            }
            await strapi.documents(ORDER_UID).update({
              documentId: order.documentId,
              data: updateData,
            });
            stats.matched++;
            stats.byQuality[result.quality as keyof typeof stats.byQuality]++;
          } else {
            await strapi.documents(ORDER_UID).update({
              documentId: order.documentId,
              data: { attributionQuality: "unmatched" } as any,
            });
            stats.unmatched++;
          }
        } catch (err: any) {
          strapi.log.warn(`[attribution] order ${order.orderId} failed: ${err.message}`);
        }
      }

      strapi.log.info(`[attribution] done: ${stats.matched}/${stats.total} matched, ${stats.unmatched} unmatched`);
      return stats;
    },
  };
};

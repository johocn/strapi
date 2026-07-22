import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const ORDER_UID = "plugin::zhao-track.order";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async attributionReport(ctx: any) {
    try {
      const { promoChannelId, startDate, endDate, groupBy = "day" } = ctx.query;
      const where: any = {};
      if (promoChannelId) where.promoChannelId = promoChannelId;
      if (startDate || endDate) {
        where.transactedAt = {};
        if (startDate) where.transactedAt.$gte = startDate;
        if (endDate) where.transactedAt.$lte = endDate;
      }

      const orders = await strapi.documents(ORDER_UID).findMany({
        where,
        limit: 5000,
      });

      const stats = {
        totalOrders: orders.length,
        matchedOrders: 0,
        unmatchedOrders: 0,
        totalCommission: 0,
        matchedCommission: 0,
        byQuality: { pid_match: 0, click_match: 0, weak_match: 0, fallback_match: 0, unmatched: 0 },
        groups: {} as Record<string, { orders: number; commission: number }>,
      };

      for (const o of orders) {
        stats.totalCommission += Number(o.commissionAmount) || 0;
        const q = o.attributionQuality || "unmatched";
        stats.byQuality[q as keyof typeof stats.byQuality] = (stats.byQuality[q as keyof typeof stats.byQuality] || 0) + 1;
        if (q === "unmatched") {
          stats.unmatchedOrders++;
        } else {
          stats.matchedOrders++;
          stats.matchedCommission += Number(o.commissionAmount) || 0;
        }

        let groupKey = "all";
        if (groupBy === "day") {
          groupKey = new Date(o.transactedAt).toISOString().slice(0, 10);
        } else if (groupBy === "channel") {
          groupKey = o.promoChannelId || "unknown";
        } else if (groupBy === "coupon") {
          groupKey = o.coupon?.documentId || "unknown";
        }
        if (!stats.groups[groupKey]) stats.groups[groupKey] = { orders: 0, commission: 0 };
        stats.groups[groupKey].orders++;
        stats.groups[groupKey].commission += Number(o.commissionAmount) || 0;
      }

      ctx.body = wrap(stats);
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  },
});

import type { Core } from "@strapi/strapi";

const PLATFORM_UID = "plugin::zhao-deal.platform";
const ORDER_UID = "plugin::zhao-track.order";

export interface SyncOrdersParams {
  platformCode: string;
  startTime?: Date;
  endTime?: Date;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwError = (code: string, message: string, details?: any) => {
    const err = new Error(message) as any;
    err.code = code;
    err.details = details;
    throw err;
  };

  const getPlatform = async (platformCode: string) => {
    const platforms = await strapi.documents(PLATFORM_UID).findMany({
      filters: { code: platformCode, syncEnabled: true },
      limit: 1,
    });
    if (!platforms || platforms.length === 0) {
      throwError("DEAL_ADAPTER_NOT_FOUND", `平台 ${platformCode} 未启用或不存在`);
    }
    return platforms[0];
  };

  const getAdapter = (platformCode: string) => {
    const dealPlugin = strapi.plugin("zhao-deal");
    const registry = (dealPlugin as any)?.service?.("adapterRegistry");
    if (!registry) {
      throwError("DEAL_ADAPTER_NOT_FOUND", "zhao-deal adapterRegistry 不可用");
    }
    const adapter = registry.get(platformCode);
    if (!adapter) {
      throwError("DEAL_ADAPTER_NOT_FOUND", `平台 ${platformCode} 的 adapter 未注册`);
    }
    return adapter;
  };

  return {
    async syncOrders(params: SyncOrdersParams) {
      const platform = await getPlatform(params.platformCode);
      const adapter = getAdapter(params.platformCode);

      const startTime = params.startTime || new Date(Date.now() - 24 * 3600 * 1000);
      const endTime = params.endTime || new Date();

      const stats = { fetched: 0, created: 0, updated: 0, errors: [] as string[] };
      let pageNo = 1;
      const pageSize = 50;

      while (true) {
        let batch: any;
        try {
          batch = await adapter.fetchOrders({
            startTime,
            endTime,
            pageNo,
            pageSize,
            fetchConfig: platform.fetchConfig?.orders,
          });
        } catch (err: any) {
          stats.errors.push(`page ${pageNo} failed: ${err.message}`);
          break;
        }

        stats.fetched += batch.list.length;
        for (const item of batch.list) {
          try {
            let couponDocId: string | undefined;
            if (item.couponId) {
              const coupons = await strapi.documents("plugin::zhao-deal.coupon").findMany({
                filters: { couponId: item.couponId },
                limit: 1,
              });
              if (coupons && coupons.length > 0) couponDocId = coupons[0].documentId;
            }
            const existing = await strapi.documents(ORDER_UID).findMany({
              filters: { orderId: item.orderId },
              limit: 1,
            });
            if (existing && existing.length > 0) {
              await strapi.documents(ORDER_UID).update({
                documentId: existing[0].documentId,
                data: {
                  amount: item.amount,
                  commission: item.commission,
                  commissionStatus: item.commissionStatus,
                  promoPid: item.promoPid || existing[0].promoPid,
                  deviceFingerprint: item.deviceFingerprint || existing[0].deviceFingerprint,
                  syncedAt: new Date(),
                } as any,
              });
              stats.updated++;
            } else {
              await strapi.documents(ORDER_UID).create({
                data: {
                  orderId: item.orderId,
                  coupon: couponDocId,
                  promoChannelId: item.promoChannelId,
                  promoPid: item.promoPid,
                  deviceFingerprint: item.deviceFingerprint,
                  amount: item.amount,
                  commission: item.commission,
                  commissionStatus: item.commissionStatus || "pending",
                  transactedAt: item.transactedAt,
                  attributionQuality: "unmatched",
                  syncedAt: new Date(),
                } as any,
              });
              stats.created++;
            }
          } catch (err: any) {
            stats.errors.push(`order ${item.orderId}: ${err.message}`);
          }
        }

        if (!batch.hasNext || batch.list.length < pageSize) break;
        pageNo++;
      }

      return stats;
    },
  };
};

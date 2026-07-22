import type { Core } from "@strapi/strapi";

const PLATFORM_UID = "plugin::zhao-deal.platform";
const CATEGORY_UID = "plugin::zhao-deal.category";

export const resolveTimeRange = (timeRange: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  switch (timeRange) {
    case "last_24h":
      return { startTime: new Date(now.getTime() - 24 * 3600 * 1000), endTime: now };
    case "last_7d":
      return { startTime: new Date(now.getTime() - 7 * 24 * 3600 * 1000), endTime: now };
    case "last_30d":
      return { startTime: new Date(now.getTime() - 30 * 24 * 3600 * 1000), endTime: now };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0);
      const ye = new Date(y); ye.setHours(23, 59, 59, 999);
      return { startTime: y, endTime: ye };
    }
    case "today": {
      const t = new Date(now); t.setHours(0, 0, 0, 0);
      return { startTime: t, endTime: now };
    }
    case "custom":
      return { startTime: new Date(customStart!), endTime: new Date(customEnd!) };
    default:
      return { startTime: undefined, endTime: undefined };
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const mergeConditions = (fetchConfig: any, conditions: any) => {
    if (!conditions) return fetchConfig;
    return { ...fetchConfig, ...conditions };
  };

  const resolveCategoryId = async (categoryCode: string, platformId: string) => {
    const cats = await strapi.documents(CATEGORY_UID).findMany({
      filters: { code: categoryCode, platform: platformId },
    });
    return cats && cats.length > 0 ? cats[0].documentId : undefined;
  };

  return {
    async syncPlatformData(opts: { platformCode: string; type: "coupons" | "products"; conditions?: any }) {
      const { platformCode, type, conditions } = opts;
      const startedAt = Date.now();
      const platforms = await strapi.documents(PLATFORM_UID).findMany({
        filters: { code: platformCode },
      });
      if (!platforms || platforms.length === 0) {
        const err: any = new Error(`平台不存在: ${platformCode}`);
        err.code = "DEAL_ADAPTER_NOT_FOUND";
        throw err;
      }
      const platform = platforms[0];
      const fetchConfig = platform.fetchConfig?.[type] || {};
      const merged = mergeConditions(fetchConfig, conditions);
      const { startTime, endTime } = resolveTimeRange(
        merged.timeRange,
        merged.customStart,
        merged.customEnd
      );

      const dealPlugin = strapi.plugin("zhao-deal");
      const registry = (dealPlugin as any).service("adapterRegistry");
      const adapter = registry.get(platformCode);

      const preFilterService = strapi.plugin("zhao-deal").service("pre-filter");
      const candidateService = strapi.plugin("zhao-deal").service("candidate");

      let fetched = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      let pageNo = 1;
      const pageSize = merged.pageSize || 100;

      while (true) {
        try {
          let result;
          if (type === "coupons") {
            result = await adapter.fetchCoupons({
              pageSize, pageNo, startTime, endTime,
              categoryCodes: merged.categoryCodes,
              minAmount: merged.minAmount,
              onlyRecommended: merged.onlyRecommended,
            });
            const filtered = preFilterService.filterCoupons(result.list, merged.preFilter);
            for (const item of filtered) {
              fetched++;
              const catId = item.categoryCode ? await resolveCategoryId(item.categoryCode, platform.documentId) : undefined;
              try {
                const r = await candidateService.upsertCouponCandidate(item, platform.documentId, catId);
                if (r && r.status === "pending" && r.documentId) created++;
                else updated++;
              } catch (e: any) {
                errors.push(`coupon ${item.couponId}: ${e.message}`);
              }
            }
          } else {
            result = await adapter.fetchProducts({
              pageSize, pageNo, startTime, endTime,
              categoryCodes: merged.categoryCodes,
              minSales: merged.minSales,
            });
            const filtered = preFilterService.filterProducts(result.list, merged.preFilter);
            for (const item of filtered) {
              fetched++;
              const catId = item.categoryCode ? await resolveCategoryId(item.categoryCode, platform.documentId) : undefined;
              try {
                const r = await candidateService.upsertProductCandidate(item, platform.documentId, catId);
                if (r && r.status === "pending" && r.documentId) created++;
                else updated++;
              } catch (e: any) {
                errors.push(`product ${item.productId}: ${e.message}`);
              }
            }
          }
          if (!result.hasNext) break;
          pageNo++;
        } catch (e: any) {
          errors.push(`page ${pageNo}: ${e.message}`);
          break;
        }
      }

      return {
        platformCode,
        type,
        fetched,
        created,
        updated,
        skipped,
        errors,
        duration: Date.now() - startedAt,
      };
    },
  };
};

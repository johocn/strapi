import type { Core } from "@strapi/strapi";
import cronParser from "cron-parser";

const PLATFORM_UID = "plugin::zhao-deal.platform";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () => strapi.store({ type: "plugin", name: "zhao-deal" });

  return {
    async shouldRunNow(platformCode: string, syncCron: string): Promise<boolean> {
      if (!syncCron) return false;
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr as string) : new Date(0);

      try {
        // 基于 lastRun 计算下一次触发时间，判断 now 是否已到/过该时间
        const parser = cronParser.parseExpression(syncCron, { currentDate: lastRun });
        const nextRun = parser.next().toDate();
        const now = new Date();
        if (now >= nextRun && now.getTime() - lastRun.getTime() > 60 * 1000) {
          await getStore().set({ key: storeKey, value: now.toISOString() });
          return true;
        }
      } catch (err: any) {
        strapi.log.warn(`[zhao-deal] 无效 cron 表达式 ${syncCron}: ${err.message}`);
      }
      return false;
    },

    async getLastRun(platformCode: string): Promise<Date | null> {
      const v = await getStore().get({ key: `sync_last_run::${platformCode}` });
      return v ? new Date(v as string) : null;
    },

    /**
     * 扫描所有 syncEnabled + syncMode in ['scheduled','both'] 的平台，
     * 对到期的平台触发优惠券 + 产品同步（候选机制，结果进入 pending 等待人工审核）
     */
    async run() {
      let platforms: any[] = [];
      try {
        platforms = await strapi.documents(PLATFORM_UID).findMany({
          filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } },
        });
      } catch (err: any) {
        strapi.log.warn(`[zhao-deal sync-scheduler] load platforms failed: ${err.message}`);
        return { processed: 0 };
      }

      let processed = 0;
      for (const platform of platforms) {
        try {
          const should = await this.shouldRunNow(platform.code, platform.syncCron);
          if (!should) continue;

          const syncService = strapi.plugin("zhao-deal").service("sync");
          let platformFailed = false;

          // 同步优惠券（独立 try/catch，失败不影响 products 同步）
          let couponStats: any;
          try {
            couponStats = await syncService.syncPlatformData({
              platformCode: platform.code, type: "coupons",
            });
          } catch (err: any) {
            platformFailed = true;
            strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform.code} coupons failed: ${err.message}`);
          }

          // 同步产品（即使 coupons 失败也尝试）
          let productStats: any;
          try {
            productStats = await syncService.syncPlatformData({
              platformCode: platform.code, type: "products",
            });
          } catch (err: any) {
            platformFailed = true;
            strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform.code} products failed: ${err.message}`);
          }

          if (!platformFailed) {
            strapi.log.info(
              `[zhao-deal sync-scheduler] ${platform.code}: ` +
              `coupons(fetched=${couponStats.fetched} created=${couponStats.created} updated=${couponStats.updated}) ` +
              `products(fetched=${productStats.fetched} created=${productStats.created} updated=${productStats.updated})`
            );
            processed++;
          }
        } catch (err: any) {
          strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform.code} failed: ${err.message}`);
        }
      }
      return { processed };
    },
  };
};

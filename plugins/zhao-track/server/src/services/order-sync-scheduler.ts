import type { Core } from "@strapi/strapi";
import cronParser from "cron-parser";

const PLATFORM_UID = "plugin::zhao-deal.platform";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getPluginStore = () => strapi.store({ type: "plugin", name: "zhao-track" });

  const shouldRunNow = async (platformCode: string, syncCron: string): Promise<boolean> => {
    if (!syncCron) return false;
    try {
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getPluginStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr as string) : new Date(0);

      // 以 lastRun 为基准计算下一个应运行时间点，确保到期后能触发
      const parser = cronParser.parseExpression(syncCron, { currentDate: lastRun });
      const nextRun = parser.next().toDate();

      const now = new Date();
      if (now >= nextRun && now.getTime() - lastRun.getTime() > 60 * 1000) {
        await getPluginStore().set({ key: storeKey, value: now.toISOString() });
        return true;
      }
      return false;
    } catch (err: any) {
      strapi.log.warn(`[order-sync-scheduler] shouldRunNow failed for ${platformCode}: ${err.message}`);
      return false;
    }
  };

  return {
    shouldRunNow,

    async run() {
      let platforms: any[] = [];
      try {
        platforms = await strapi.documents(PLATFORM_UID).findMany({
          filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } },
        });
      } catch (err: any) {
        strapi.log.warn(`[order-sync-scheduler] load platforms failed: ${err.message}`);
        return { processed: 0 };
      }

      let processed = 0;
      for (const platform of platforms) {
        try {
          const should = await shouldRunNow(platform.code, platform.syncCron);
          if (!should) continue;

          const orderSync = strapi.plugin("zhao-track").service("order-sync");
          const stats = await orderSync.syncOrders({ platformCode: platform.code });
          strapi.log.info(`[order-sync-scheduler] ${platform.code}: fetched=${stats.fetched} created=${stats.created} updated=${stats.updated}`);
          processed++;
        } catch (err: any) {
          strapi.log.warn(`[order-sync-scheduler] platform ${platform.code} failed: ${err.message}`);
        }
      }
      return { processed };
    },
  };
};

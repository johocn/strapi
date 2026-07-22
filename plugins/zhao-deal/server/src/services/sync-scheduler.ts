import type { Core } from "@strapi/strapi";
import cronParser from "cron-parser";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getStore = () => strapi.store({ type: "plugin", name: "zhao-deal" });

  return {
    async shouldRunNow(platformCode: string, syncCron: string): Promise<boolean> {
      if (!syncCron) return false;
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr as string) : new Date(0);

      try {
        const parser = cronParser.parseExpression(syncCron);
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
  };
};

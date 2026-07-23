export default {
  // 每小时检查是否到平台 syncCron 触发时间，命中则同步优惠券/产品候选
  "0 * * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-deal").service("syncScheduler").run();
    } catch (err: any) {
      strapi.log.warn(`[zhao-deal cron] syncScheduler failed: ${err.message}`);
    }
  },
};

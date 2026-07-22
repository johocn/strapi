export default {
  // 每分钟检查是否到平台 syncCron 触发时间，命中则拉取订单
  "*/1 * * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-track").service("order-sync-scheduler").run();
    } catch (err: any) {
      strapi.log.warn(`[zhao-track cron] order-sync-scheduler failed: ${err.message}`);
    }
  },
  // 每日 03:00 执行归因匹配
  "0 3 * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-track").service("attribution").run();
    } catch (err: any) {
      strapi.log.warn(`[zhao-track cron] attribution failed: ${err.message}`);
    }
  },
};

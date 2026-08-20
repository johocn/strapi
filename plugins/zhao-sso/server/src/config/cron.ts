export default {
  // 每 1 分钟扫描到期消息任务并发送；单实例幂等由 job status 流转保证
  "* * * * *": async ({ strapi }: { strapi: any }) => {
    try {
      const sent = await strapi.plugin("zhao-sso").service("sso-sop").runDueJobs(50);
      if (sent > 0) strapi.log.info(`[zhao-sso cron] sent ${sent} due msg jobs`);
    } catch (err: any) {
      strapi.log.warn(`[zhao-sso cron] runDueJobs failed: ${err.message}`);
    }
  },
};
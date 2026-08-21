export default {
  "0 8 * * *": async ({ strapi }: { strapi: any }) => {
    try {
      await strapi.plugin("zhao-course").service("course-progress").runActivationReminderScan();
    } catch (err: any) {
      strapi.log.warn(`[zhao-course cron] activation scan failed: ${err.message}`);
    }
  },
};
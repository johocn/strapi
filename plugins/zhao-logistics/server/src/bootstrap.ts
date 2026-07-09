import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-logistics] Initializing...");

  // 权限由 zhao-auth initDefaultRoles 自动同步（PERMISSION_TREE 已扩展 menu.logistics-center）
  if (!isTest) {
    logger.info("[zhao-logistics] 权限由 zhao-auth initDefaultRoles 自动同步（PERMISSION_TREE 已扩展）");
  }

  // 定时任务通过 config/cron.ts 注册
  if (!isTest) {
    logger.info("[zhao-logistics] 定时任务通过 config/cron.ts 注册");
  }

  if (!isTest) logger.info("[zhao-logistics] Ready");
};

export default bootstrap;

import type { Core } from "@strapi/strapi";
import { PERMISSIONS, ROLE_PERMISSIONS, buildPermissionId } from "./config/permissions";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.plugin("zhao-common")?.service("logger") || strapi.log;
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) logger.info("[zhao-logistics] Initializing...");

  // 1. 同步权限到数据库（每次启动都同步，幂等）
  try {
    const authPlugin = strapi.plugin("zhao-auth");
    if (authPlugin?.service("permission-sync")) {
      // 注册权限到 zhao-auth 的权限注册表
      const allPerms = [];
      for (const [ct, config] of Object.entries(PERMISSIONS)) {
        for (const action of config.actions) {
          allPerms.push({
            id: buildPermissionId(ct, action),
            displayName: `${config.displayName} - ${action}`,
          });
        }
      }
      // 调用 zhao-auth 注册权限（具体 API 在 Plan 4 对接，此处先 log）
      if (!isTest) logger.info(`[zhao-logistics] ${allPerms.length} permissions defined`);
    }
  } catch (err) {
    logger.error("[zhao-logistics] Permission definition failed:", err);
  }

  // 2. 角色权限同步（具体实现在 Plan 4，此处占位）
  // 3. 定时任务注册（具体实现在 Plan 4，此处占位）

  if (!isTest) logger.info("[zhao-logistics] Ready");
};

export default bootstrap;

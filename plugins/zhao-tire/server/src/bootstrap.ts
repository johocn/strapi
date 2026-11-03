import type { Core } from "@strapi/strapi";
import runExpiryReminder from "./cron/expiry-reminder";
import seed from "./seed";

const ADMIN_ROLES = [
  { code: "tire-admin", name: "轮胎管理员" },
  { code: "tire-warehouse", name: "仓库操作员" },
];

// 后台菜单与插件页面依赖 RBAC action；仓库操作员仅保留读取 + 出入库
const ALL_ACTIONS = [
  "order.read",
  "order.accept",
  "order.reject",
  "order.update",
  "order.inbound",
  "order.outbound",
  "order.export",
  "package.manage",
  "config.manage",
  "content.manage",
  "customer.read",
  "sms.manage",
];

const ROLE_ACTIONS: Record<string, string[]> = {
  "tire-admin": ALL_ACTIONS,
  "tire-warehouse": ["order.read", "order.inbound", "order.outbound"],
};

const CONFIG_UID = "plugin::zhao-tire.tire-config";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  const logger = strapi.log;
  const s = strapi as any;

  logger.info("[zhao-tire] bootstrap");

  // 幂等创建原生 admin 角色，并同步插件权限（否则后台菜单对自定义角色不可见）
  try {
    for (const role of ADMIN_ROLES) {
      let existing = await s.db
        .query("admin::role")
        .findOne({ where: { code: role.code } });

      if (!existing) {
        existing = await s.admin.services.role.create(role);
        logger.info(`[zhao-tire] admin role created: ${role.code}`);
      }

      const actions = ROLE_ACTIONS[role.code] || [];
      await s.admin.services.role.assignPermissions(
        existing.id,
        actions.map((uid) => ({ action: `plugin::zhao-tire.${uid}` }))
      );
      logger.info(
        `[zhao-tire] role permissions synced: ${role.code} (${actions.length})`
      );
    }
  } catch (err) {
    logger.error(`[zhao-tire] admin role init failed: ${err}`);
  }

  // 幂等创建 tire-config 默认记录
  try {
    const existing = await s.documents(CONFIG_UID).findFirst();
    if (!existing) {
      await s.documents(CONFIG_UID).create({ data: {} });
      logger.info("[zhao-tire] tire-config default record created");
    }
  } catch (err) {
    logger.error(`[zhao-tire] tire-config init failed: ${err}`);
  }

  // 每日 09:00（Asia/Shanghai）扫描 7/3 天后到期的在存订单并生成提醒
  try {
    s.cron.add({
      "tire-expiry-reminder": {
        task: runExpiryReminder,
        options: { rule: "0 9 * * *", tz: "Asia/Shanghai" },
      },
    });
    logger.info("[zhao-tire] cron registered: tire-expiry-reminder");
  } catch (err) {
    logger.error(`[zhao-tire] cron register failed: ${err}`);
  }

  // 幂等写入套餐 / 增值项 / FAQ / 评价 / 站点配置默认值
  await seed({ strapi });
};

export default bootstrap;

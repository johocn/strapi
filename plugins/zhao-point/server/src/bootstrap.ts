import type { Core } from "@strapi/strapi";

const RULE_UID = "plugin::zhao-point.point-rule";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-point] 插件已加载，开始种子数据检查...");

  try {
    const defaultConfig = strapi.plugin("zhao-point").config("default") as any;
    if (!defaultConfig) return;

    const allRules: Record<string, any> = {};

    // 合并 increase 和 decrease 规则
    for (const [action, rule] of Object.entries(defaultConfig.increaseRules || {})) {
      allRules[action] = { ...(rule as any), category: "increase" };
    }
    for (const [action, rule] of Object.entries(defaultConfig.decreaseRules || {})) {
      allRules[action] = { ...(rule as any), category: "decrease" };
    }

    // 查询已有规则的 action 列表
    const existingRules = await strapi.db.query(RULE_UID).findMany({
      select: ["action"],
    });
    const existingActions = new Set(existingRules.map((r: any) => r.action));

    // Seed 缺失的规则
    let seeded = 0;
    for (const [action, rule] of Object.entries(allRules)) {
      if (existingActions.has(action)) continue;

      await strapi.db.query(RULE_UID).create({
        data: {
          action,
          category: rule.category,
          points: rule.points || 0,
          enabled: true,
          limitPerDay: rule.limitPerDay ?? 0,
          limitPerUser: rule.limitPerUser ?? 0,
          limitPerDayPerUser: rule.limitPerDayPerUser ?? 0,
          isOneTime: rule.isOneTime ?? false,
          description: rule.description || "",
          taskGroup: rule.taskGroup || "other",
          extraConfig: rule.extraConfig ? JSON.stringify(rule.extraConfig) : "{}",
        },
      });
      seeded++;
    }

    if (seeded > 0) {
      strapi.log.info(`[zhao-point] 已种子 ${seeded} 条积分规则`);
    } else {
      strapi.log.info("[zhao-point] 积分规则已完整，无需种子");
    }
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 种子数据失败: ${err.message}`);
  }
};

export default bootstrap;

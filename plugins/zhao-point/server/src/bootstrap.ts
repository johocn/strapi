import type { Core } from "@strapi/strapi";

const RULE_UID = "plugin::zhao-point.point-rule";

// 进场记录（activity_attendances）与报名的多对一关系走 Strapi 链接表，
// 该表自带 _uq(activity_attendance_id, activity_signup_id) 只保证「同一条链接不重复」，
// 无法阻止同一 signup 挂两条 attendance，故需补一条单列唯一索引作为 DB 级最终防线。
const ATT_LNK_TABLE = "activity_attendances_signup_lnk";
const ATT_LNK_UNIQUE_INDEX = "activity_attendances_signup_lnk_suq";

/**
 * 幂等补建「一条报名至多一条到场记录」唯一索引。
 * Strapi 不支持在关系字段上声明 unique，只能以幂等 DDL 兜底；
 * 若已存在重复数据则只告警并跳过，绝不阻断启动（交由人工核账后重试）。
 */
const ensureAttendanceUniqueIndex = async (strapi: Core.Strapi) => {
  const knex = strapi.db.connection;
  const dup = await knex(ATT_LNK_TABLE)
    .select("activity_signup_id")
    .groupBy("activity_signup_id")
    .havingRaw("count(*) > 1")
    .limit(5);
  if (Array.isArray(dup) && dup.length > 0) {
    const ids = dup.map((d: any) => d.activity_signup_id).join(",");
    strapi.log.warn(`[zhao-point] 到场链接存在重复 signup(${ids})，跳过唯一索引创建，请先人工核账`);
    return;
  }
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS ${ATT_LNK_UNIQUE_INDEX} ON ${ATT_LNK_TABLE} (activity_signup_id)`);
  strapi.log.info(`[zhao-point] 到场记录唯一索引已就绪 (${ATT_LNK_UNIQUE_INDEX})`);
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-point] 插件已加载，开始种子数据检查...");

  // 与种子配置无关的启动兜底必须放在种子块的 early-return 之前，否则会被跳过：
  // Strapi 5 的 plugins loader 会把 plugin.config 覆写为「已解包」的 default 导出
  // （见 @strapi/core loaders/plugins applyUserConfig），故 config("default") 恒为
  // undefined，种子块实际从不执行，其后的代码同样从不执行。
  // 启动兜底：推进已到期但未流转的活动（懒加载流转的历史积压）
  try {
    const actSvc = strapi.plugin("zhao-point").service("activity");
    if (actSvc?.drainDueActivities) await actSvc.drainDueActivities();
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 启动 drain 失败: ${err.message}`);
  }

  // 启动兜底：补建到场记录唯一索引（幂等 DDL）
  try {
    await ensureAttendanceUniqueIndex(strapi);
  } catch (err: any) {
    strapi.log.warn(`[zhao-point] 到场记录唯一索引创建失败: ${err.message}`);
  }

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

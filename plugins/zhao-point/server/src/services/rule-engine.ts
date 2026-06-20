import type { Core } from "@strapi/strapi";

const TEMPLATE_UID = "plugin::zhao-point.rule-template";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  // ===== 规则校验 =====

  const validateAction = async (params: {
    userId: string | number;
    action: string;
    source?: string;
    channelId?: string | number;
  }) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const rule = await pointService.getMergedRule(params.action);

    if (!rule) {
      return { valid: false, rule: null, reason: "规则不存在" };
    }
    if (!rule.enabled) {
      return { valid: false, rule, reason: "规则未启用" };
    }

    // 一次性检查
    if (rule.isOneTime) {
      const records = await strapi.db.query("plugin::zhao-point.point-record").findMany({
        where: { user: params.userId, action: params.action, type: "increase" },
        limit: 1,
      });
      if (records.length > 0) {
        return { valid: false, rule, reason: "一次性奖励已领取" };
      }
    }

    // 日上限检查
    if (rule.limitPerDay > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await strapi.db.query("plugin::zhao-point.point-record").count({
        where: {
          user: params.userId,
          action: params.action,
          createdAt: { $gte: today.toISOString() },
        },
      });
      if (todayCount >= rule.limitPerDay) {
        return { valid: false, rule, reason: "已达每日上限", todayCount };
      }
    }

    // 个人每日上限
    if (rule.limitPerDayPerUser > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const userTodayCount = await strapi.db.query("plugin::zhao-point.point-record").count({
        where: {
          user: params.userId,
          action: params.action,
          createdAt: { $gte: today.toISOString() },
        },
      });
      if (userTodayCount >= rule.limitPerDayPerUser) {
        return { valid: false, rule, reason: "已达个人每日上限" };
      }
    }

    return { valid: true, rule };
  };

  const getEligibleActions = async (
    userId: string | number,
    channelId?: string | number
  ) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const allRules = await pointService.getRules({ category: "increase", enabled: true });
    const eligible: any[] = [];

    for (const rule of allRules) {
      const validation = await validateAction({ userId, action: rule.action, channelId });
      eligible.push({
        action: rule.action,
        description: rule.description,
        points: rule.points,
        limitPerDay: rule.limitPerDay,
        isOneTime: rule.isOneTime,
        canEarn: validation.valid,
        reason: validation.reason || null,
      });
    }

    return eligible;
  };

  // ===== 规则模板 =====

  const getTemplates = async (filters?: { category?: string; enabled?: boolean }) => {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.enabled !== undefined) where.enabled = filters.enabled;

    return await strapi.db.query(TEMPLATE_UID).findMany({
      where,
      orderBy: { name: "asc" },
    });
  };

  const createTemplate = async (data: any) => {
    return await strapi.db.query(TEMPLATE_UID).create({ data });
  };

  const updateTemplate = async (id: string | number, data: any) => {
    return await strapi.db.query(TEMPLATE_UID).update({ where: { id }, data });
  };

  const deleteTemplate = async (id: string | number) => {
    const template = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id } });
    if (template?.builtIn) {
      throwErr("RULE_001", 400, "内置模板不可删除");
    }
    return await strapi.db.query(TEMPLATE_UID).delete({ where: { id } });
  };

  const applyTemplate = async (templateId: string | number, targetAction: string) => {
    const template = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: templateId } });
    if (!template) {
      throwErr("RULE_002", 404, "模板不存在");
    }

    const pointService = strapi.plugin("zhao-point").service("point");
    return await pointService.upsertRule({
      action: targetAction,
      category: template.category,
      points: template.defaultPoints,
      limitPerDay: template.defaultLimitPerDay,
      isOneTime: template.defaultIsOneTime,
      description: template.description,
      enabled: true,
    });
  };

  // ===== 批量操作 =====

  const batchEnableActions = async (actions: string[], enabled: boolean) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const rules = await pointService.getDBRules();
    let count = 0;

    for (const action of actions) {
      if (rules[action]) {
        rules[action].enabled = enabled;
        count++;
      } else {
        const defaultConfig = pointService.getDefaultConfig();
        const defaultRule =
          defaultConfig.increaseRules[action] || defaultConfig.decreaseRules[action];
        if (defaultRule) {
          rules[action] = { ...defaultRule, enabled };
          count++;
        }
      }
    }

    const store = strapi.store({ type: "plugin", name: "zhao-point" });
    await store.set({ key: "rules", value: rules });
    return { updated: count };
  };

  return {
    validateAction,
    getEligibleActions,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    batchEnableActions,
  };
};

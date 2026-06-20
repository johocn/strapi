import type { Core } from "@strapi/strapi";
import pluginConfig from "../config";

const RECORD_UID = "plugin::zhao-point.point-record";

const getPluginStore = (strapi: Core.Strapi) => {
  return strapi.store({ type: "plugin", name: "zhao-point" });
};

const getDefaultConfig = () => pluginConfig.default;

export interface EarnPointsParams {
  userId: string | number;
  action: string;
  source?: string;
  method?: string;
  remark?: string;
  orderId?: string;
  channelId?: string | number;
  userChannelId?: string | number;
}

export interface DeductPointsParams {
  userId: string | number;
  action: string;
  points?: number;
  source?: string;
  method?: string;
  remark?: string;
  orderId?: string;
}

export interface AdminAdjustParams {
  userId: string | number;
  points: number;
  action?: string;
  remark?: string;
  operatorId: string | number;
}

export interface BatchAdjustItem {
  userId: string | number;
  points: number;
  action?: string;
  remark?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // ===== 辅助方法 =====

  const RULE_UID = "plugin::zhao-point.point-rule";

  const getMergedRule = async (action: string): Promise<any | null> => {
    // 1. 优先查 point-rule 表
    const dbRule = await strapi.db.query(RULE_UID).findOne({
      where: { action, deletedAt: null },
    });
    if (dbRule) {
      return {
        action: dbRule.action,
        category: dbRule.category,
        points: dbRule.points,
        enabled: dbRule.enabled,
        limitPerDay: dbRule.limitPerDay,
        limitPerUser: dbRule.limitPerUser,
        limitPerDayPerUser: dbRule.limitPerDayPerUser,
        isOneTime: dbRule.isOneTime,
        description: dbRule.description,
        extraConfig: dbRule.extraConfig,
      };
    }

    // 2. Fallback 到默认配置
    const defaultRules = getDefaultConfig();
    if (defaultRules.increaseRules[action]) {
      return { ...defaultRules.increaseRules[action], category: "increase", enabled: true };
    }
    if (defaultRules.decreaseRules[action]) {
      return { ...defaultRules.decreaseRules[action], category: "decrease", enabled: true };
    }
    return null;
  };

  const getLatestBalance = async (userId: string | number): Promise<number> => {
    const lastRecord = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId },
      orderBy: { createdAt: "desc" },
    });
    return lastRecord ? lastRecord.balance : 0;
  };

  const countTodayAction = async (
    userId: string | number,
    action: string
  ): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await strapi.db.query(RECORD_UID).count({
      where: {
        user: userId,
        action,
        createdAt: { $gte: today.toISOString() },
      },
    });
    return count;
  };

  const checkOneTimeClaimed = async (
    userId: string | number,
    action: string
  ): Promise<boolean> => {
    const existing = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId, action, type: "increase" },
    });
    return !!existing;
  };

  const createRecord = async (
    userId: string | number,
    action: string,
    points: number,
    currentBalance: number,
    type: "increase" | "decrease",
    extra: {
      source?: string;
      method?: string;
      remark?: string;
      operatorId?: string | number;
      orderId?: string;
      channelId?: string | number;
      userChannelId?: string | number;
      expiresAt?: string;
    }
  ) => {
    // 积分必须归属渠道：channelId（业务/课程渠道）或 userChannelId（用户归属渠道）
    if (!extra.channelId && !extra.userChannelId) {
      throwError("POINT_020", "积分记录必须归属渠道（业务渠道或用户渠道）", { action });
    }
    const newBalance = type === "increase" ? currentBalance + points : currentBalance - points;
    return await strapi.db.query(RECORD_UID).create({
      data: {
        user: userId,
        action,
        points: type === "increase" ? points : -points,
        balance: newBalance,
        type,
        source: extra.source || "",
        method: extra.method || "",
        remark: extra.remark || "",
        orderId: extra.orderId || undefined,
        operator: extra.operatorId || undefined,
        channel: extra.channelId || undefined,
        userChannel: extra.userChannelId || undefined,
        expiresAt: extra.expiresAt || undefined,
        createdAt: new Date(),
      },
    });
  };

  const throwError = (code: string, message: string, details?: any) => {
    const err = new Error(message) as any;
    err.code = code;
    err.details = details;
    throw err;
  };

  // ===== 核心业务方法 =====

  const earnPoints = async (params: EarnPointsParams) => {
    const { userId, action, source, method, remark, orderId, channelId, userChannelId } = params;

    // channel 决策：channelId 优先（调用方负责 selected → pointChannel 选择），空时降级到 userChannelId 兜底
    // 仅 channelScope="all" + pointChannel 空的场景会走到兜底
    const finalChannelId = channelId ?? userChannelId;

    const rule = await getMergedRule(action);
    if (!rule || rule.category === "decrease") {
      throwError("POINT_001", `积分规则不存在 (action=${action})`, { action });
    }

    if (!rule.enabled) {
      throwError("POINT_019", `积分规则未启用 (action=${action})`, { action });
    }

    if (rule.isOneTime) {
      const claimed = await checkOneTimeClaimed(userId, action);
      if (claimed) {
        throwError("POINT_011", `一次性奖励已领取过 (action=${action})`, { action });
      }
    }

    if (rule.limitPerDay > 0) {
      const todayCount = await countTodayAction(userId, action);
      if (todayCount >= rule.limitPerDay) {
        throwError("POINT_004", `已达每日积分上限 (action=${action})`, { action, limit: rule.limitPerDay });
      }
    }

    const balance = await getLatestBalance(userId);

    const now = new Date();
    let expiresAt: string | undefined;
    try {
      const configService = strapi.plugin("zhao-point").service("config-service");
      if (configService) {
        const config = await configService.getConfig();
        if (config?.expiryEnabled && config?.expiryDays > 0) {
          const expiryDate = new Date(now);
          expiryDate.setDate(expiryDate.getDate() + config.expiryDays);
          expiresAt = expiryDate.toISOString();
        }
      }
    } catch {
      // config-service not available
    }

    const record = await createRecord(userId, action, rule.points, balance, "increase", {
      source, method, remark, orderId, channelId: finalChannelId, userChannelId, expiresAt,
    });

    return record;
  };

  const deductPoints = async (params: DeductPointsParams) => {
    const { userId, action, points: customPoints, source, method, remark, orderId } = params;

    const rule = await getMergedRule(action);
    const deductAmount = customPoints || rule?.points || 0;
    if (deductAmount <= 0) {
      throwError("POINT_010", "无效的积分操作类型", { action });
    }

    const balance = await getLatestBalance(userId);
    if (balance < deductAmount) {
      throwError("POINT_002", "积分余额不足", { balance, required: deductAmount });
    }

    const record = await createRecord(userId, action, deductAmount, balance, "decrease", {
      source, method, remark, orderId,
    });

    return record;
  };

  const getBalance = async (userId: string | number) => {
    const records = await strapi.db.query(RECORD_UID).findMany({
      where: { user: userId },
      select: ['points'],
      populate: { channel: { select: ['id', 'name'] } },
    });

    let totalBalance = 0;
    let globalBalance = 0;
    const channelMap = new Map<number, { name: string; balance: number }>();

    for (const r of records) {
      const pts = r.points || 0;
      totalBalance += pts;
      if (!r.channel) {
        globalBalance += pts;
      } else {
        const chId = r.channel.id || r.channel;
        const chName = r.channel.name || `渠道${chId}`;
        const existing = channelMap.get(chId) || { name: chName, balance: 0 };
        existing.balance += pts;
        channelMap.set(chId, existing);
      }
    }

    const channelBalances = Array.from(channelMap.entries()).map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      balance: data.balance,
    }));

    return { balance: totalBalance, channelBalances, globalBalance };
  };

  const getRecords = async (
    userId: string | number,
    params?: {
      page?: number;
      pageSize?: number;
      action?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      channelId?: string | number;
    }
  ) => {
    const { page = 1, pageSize = 20, action, type, startDate, endDate, channelId } = params || {};

    const where: any = { user: userId };
    if (action) where.action = action;
    if (type) where.type = type;
    if (channelId) where.channel = channelId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }

    const [records, total] = await Promise.all([
      strapi.db.query(RECORD_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.db.query(RECORD_UID).count({ where }),
    ]);

    const balance = await getLatestBalance(userId);

    return { records, total, balance, page, pageSize };
  };

  const getStatistics = async (userId: string | number) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = async (since: Date) => {
      const result = await strapi.db.query(RECORD_UID).findMany({
        where: {
          user: userId,
          createdAt: { $gte: since.toISOString() },
        },
      });
      let earned = 0, spent = 0;
      result.forEach((r: any) => {
        if (r.type === "increase") earned += Math.abs(r.points);
        else spent += Math.abs(r.points);
      });
      return { earned, spent };
    };

    const [today, month, balance] = await Promise.all([
      stats(startOfToday),
      stats(startOfMonth),
      getLatestBalance(userId),
    ]);

    const allRecords = await strapi.db.query(RECORD_UID).findMany({
      where: { user: userId },
    });
    let totalEarned = 0, totalSpent = 0;
    allRecords.forEach((r: any) => {
      if (r.type === "increase") totalEarned += Math.abs(r.points);
      else totalSpent += Math.abs(r.points);
    });

    // 计算即将过期积分
    let expiringSoon = 0;
    try {
      const configService = strapi.plugin("zhao-point").service("config-service");
      if (configService) {
        const config = await configService.getConfig();
        if (config?.expiryEnabled) {
          const reminderDate = new Date();
          reminderDate.setDate(reminderDate.getDate() + (config.expiryReminderDays || 7));
          const expiringRecords = await strapi.db.query(RECORD_UID).findMany({
            where: {
              user: userId,
              type: "increase",
              expiresAt: {
                $gte: new Date().toISOString(),
                $lte: reminderDate.toISOString(),
              },
              expiredAt: null,
            },
          });
          expiringSoon = expiringRecords.reduce((sum: number, r: any) => sum + Math.abs(r.points), 0);
        }
      }
    } catch {
      // ignore
    }

    return {
      todayEarned: today.earned,
      todaySpent: today.spent,
      monthEarned: month.earned,
      monthSpent: month.spent,
      totalEarned,
      totalSpent,
      balance,
      expiringSoon,
    };
  };

  const adminAdjust = async (params: AdminAdjustParams) => {
    const { userId, points, action, remark, operatorId } = params;
    if (points === 0) {
      throwError("POINT_003", "积分操作失败", { message: "调整积分数不能为 0" });
    }

    const balance = await getLatestBalance(userId);
    const type: "increase" | "decrease" = points > 0 ? "increase" : "decrease";
    const absPoints = Math.abs(points);

    if (type === "decrease" && balance < absPoints) {
      throwError("POINT_002", "积分余额不足", { balance, required: absPoints });
    }

    const record = await createRecord(userId, action || "manual_adjust", absPoints, balance, type, {
      method: "管理员手动调整",
      remark,
      operatorId,
    });

    return record;
  };

  const batchAdjust = async (items: BatchAdjustItem[], operatorId: string | number) => {
    if (!items || items.length === 0) {
      throwError("POINT_008", "批量调整失败 - 部分记录未处理", { message: "调整列表为空" });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const item of items) {
      try {
        const record = await adminAdjust({
          userId: item.userId,
          points: item.points,
          action: item.action || "manual_adjust",
          remark: item.remark,
          operatorId,
        });
        results.push(record);
      } catch (e: any) {
        errors.push({ userId: item.userId, error: e.message });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throwError("POINT_008", "批量调整失败 - 部分记录未处理", errors);
    }

    return { success: results, failed: errors, totalSuccess: results.length, totalFailed: errors.length };
  };

  const getExpiringPoints = async (userId: string | number, withinDays: number) => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + withinDays);

    const records = await strapi.db.query(RECORD_UID).findMany({
      where: {
        user: userId,
        type: "increase",
        expiresAt: {
          $gte: now.toISOString(),
          $lte: future.toISOString(),
        },
        expiredAt: null,
      },
      orderBy: { expiresAt: "asc" },
    });

    const totalPoints = records.reduce((sum: number, r: any) => sum + Math.abs(r.points), 0);
    return { points: totalPoints, records };
  };

  const applyExpiryDeduction = async (userId: string | number) => {
    const now = new Date().toISOString();
    const expiredRecords = await strapi.db.query(RECORD_UID).findMany({
      where: {
        user: userId,
        type: "increase",
        expiresAt: { $lte: now },
        expiredAt: null,
      },
    });

    let deducted = 0;
    const processed: any[] = [];

    for (const record of expiredRecords) {
      const points = Math.abs(record.points);
      const balance = await getLatestBalance(userId);
      await createRecord(userId, "expiration_deduct", points, balance, "decrease", {
        method: "积分过期扣除",
        remark: `积分记录 #${record.id} 到期扣除`,
      });
      await strapi.db.query(RECORD_UID).update({
        where: { id: record.id },
        data: { expiredAt: now },
      });
      deducted += points;
      processed.push(record);
    }

    return { deducted, records: processed };
  };

  const getRules = async (params?: { action?: string; category?: string; enabled?: boolean }) => {
    // 优先查 point-rule 表
    const dbRuleList = await strapi.db.query(RULE_UID).findMany({
      where: { deletedAt: null },
    });
    const dbRuleMap: Record<string, any> = {};
    for (const r of dbRuleList) {
      dbRuleMap[r.action] = r;
    }

    const defaultConfig = getDefaultConfig();

    const allRules: any[] = [];
    const mergeRules = (config: any, category: string) => {
      for (const [action, rule] of Object.entries(config)) {
        const dbRule = dbRuleMap[action];
        allRules.push({
          action,
          category,
          points: dbRule?.points ?? (rule as any).points,
          limitPerDay: dbRule?.limitPerDay ?? (rule as any).limitPerDay ?? 0,
          isOneTime: dbRule?.isOneTime ?? (rule as any).isOneTime ?? false,
          description: dbRule?.description ?? (rule as any).description,
          enabled: dbRule?.enabled ?? true,
          limitPerUser: dbRule?.limitPerUser ?? 0,
          limitPerDayPerUser: dbRule?.limitPerDayPerUser ?? 0,
          priority: dbRule?.priority ?? 0,
          taskGroup: dbRule?.taskGroup ?? (rule as any).taskGroup ?? "other",
        });
      }
    };

    mergeRules(defaultConfig.increaseRules, "increase");
    mergeRules(defaultConfig.decreaseRules, "decrease");

    // 添加只在 DB 中存在但不在默认配置中的规则
    for (const [action, dbRule] of Object.entries(dbRuleMap)) {
      if (!defaultConfig.increaseRules[action] && !defaultConfig.decreaseRules[action]) {
        allRules.push({
          action,
          category: dbRule.category,
          points: dbRule.points,
          limitPerDay: dbRule.limitPerDay ?? 0,
          isOneTime: dbRule.isOneTime ?? false,
          description: dbRule.description,
          enabled: dbRule.enabled ?? true,
          limitPerUser: dbRule.limitPerUser ?? 0,
          limitPerDayPerUser: dbRule.limitPerDayPerUser ?? 0,
          priority: dbRule.priority ?? 0,
          taskGroup: dbRule.taskGroup ?? "other",
        });
      }
    }

    let result = allRules;
    if (params?.action) result = result.filter((r) => r.action === params.action);
    if (params?.category) result = result.filter((r) => r.category === params.category);
    if (params?.enabled !== undefined) result = result.filter((r) => r.enabled === params.enabled);

    return result;
  };

  const upsertRule = async (data: {
    action: string;
    category: string;
    points: number;
    description?: string;
    limitPerDay?: number;
    limitPerUser?: number;
    limitPerDayPerUser?: number;
    isOneTime?: boolean;
    enabled?: boolean;
    priority?: number;
    taskGroup?: string;
    extraConfig?: any;
  }) => {
    const existing = await strapi.db.query(RULE_UID).findOne({
      where: { action: data.action, deletedAt: null },
    });

    if (existing) {
      await strapi.db.query(RULE_UID).update({
        where: { id: existing.id },
        data: {
          category: data.category,
          points: data.points,
          description: data.description || existing.description,
          limitPerDay: data.limitPerDay ?? existing.limitPerDay,
          limitPerUser: data.limitPerUser ?? existing.limitPerUser,
          limitPerDayPerUser: data.limitPerDayPerUser ?? existing.limitPerDayPerUser,
          isOneTime: data.isOneTime ?? existing.isOneTime,
          enabled: data.enabled ?? existing.enabled,
          priority: data.priority ?? existing.priority,
          taskGroup: data.taskGroup ?? existing.taskGroup,
          extraConfig: data.extraConfig ? JSON.stringify(data.extraConfig) : existing.extraConfig,
        },
      });
    } else {
      await strapi.db.query(RULE_UID).create({
        data: {
          action: data.action,
          category: data.category,
          points: data.points,
          description: data.description || "",
          limitPerDay: data.limitPerDay ?? 0,
          limitPerUser: data.limitPerUser ?? 0,
          limitPerDayPerUser: data.limitPerDayPerUser ?? 0,
          isOneTime: data.isOneTime ?? false,
          enabled: data.enabled ?? true,
          priority: data.priority ?? 0,
          taskGroup: data.taskGroup ?? "other",
          extraConfig: data.extraConfig ? JSON.stringify(data.extraConfig) : "{}",
        },
      });
    }

    return { action: data.action, ...data };
  };

  const deleteRule = async (action: string) => {
    const existing = await strapi.db.query(RULE_UID).findOne({
      where: { action, deletedAt: null },
    });
    if (existing) {
      await strapi.db.query(RULE_UID).update({
        where: { id: existing.id },
        data: { deletedAt: new Date().toISOString() },
      });
    }
    return { success: true };
  };

  const listRecords = async (params: {
    userId?: string;
    action?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }) => {
    const { userId, action, type, startDate, endDate, page, pageSize } = params;
    const where: any = {};
    if (userId) where.user = userId;
    if (action) where.action = action;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    const [records, total] = await Promise.all([
      strapi.db.query(RECORD_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.db.query(RECORD_UID).count({ where }),
    ]);
    return { records, total, page, pageSize };
  };

  const findRecordByDocumentId = async (documentId: string) => {
    return strapi.db.query(RECORD_UID).findOne({
      where: { documentId },
    });
  };

  const findVerificationByDocumentId = async (documentId: string) => {
    return strapi.db.query("plugin::zhao-point.channel-verification").findOne({
      where: { documentId },
    });
  };

  const findOneRule = async (action: string) => {
    const rule = await strapi.db.query(RULE_UID).findOne({
      where: { action, deletedAt: null },
    });
    return rule ? { action, ...rule } : null;
  };

  const earnCustomPoints = async (params: {
    userId: string | number;
    action: string;
    points: number;
    source?: string;
    remark?: string;
    channelId?: string | number;
    userChannelId?: string | number;
  }) => {
    const { userId, action, points, source, remark, channelId, userChannelId } = params;

    // channel 决策：channelId 优先，空时降级到 userChannelId 兜底
    const finalChannelId = channelId ?? userChannelId;

    // 规则审查
    const rule = await getMergedRule(action);
    if (!rule || rule.category === "decrease") {
      throwError("POINT_001", `积分规则不存在 (action=${action})`, { action });
    }

    if (!rule.enabled) {
      throwError("POINT_019", `积分规则未启用 (action=${action})`, { action });
    }

    if (rule.isOneTime) {
      const claimed = await checkOneTimeClaimed(userId, action);
      if (claimed) {
        throwError("POINT_011", `一次性奖励已领取过 (action=${action})`, { action });
      }
    }

    if (rule.limitPerDay > 0) {
      const todayCount = await countTodayAction(userId, action);
      if (todayCount >= rule.limitPerDay) {
        throwError("POINT_004", `已达每日积分上限 (action=${action})`, { action, limit: rule.limitPerDay });
      }
    }

    if (points <= 0) {
      throwError("POINT_003", "积分操作失败", { message: "积分数必须大于 0" });
    }

    const balance = await getLatestBalance(userId);

    let expiresAt: string | undefined;
    try {
      const configService = strapi.plugin("zhao-point").service("config-service");
      if (configService) {
        const config = await configService.getConfig();
        if (config?.expiryEnabled && config?.expiryDays > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + config.expiryDays);
          expiresAt = expiryDate.toISOString();
        }
      }
    } catch {
      // config-service not available
    }

    const record = await createRecord(userId, action, points, balance, "increase", {
      source: source || "",
      method: "用户自主领取",
      remark: remark || "",
      channelId: finalChannelId ?? undefined,
      userChannelId: userChannelId ?? undefined,
      expiresAt,
    });

    return record;
  };

  const getTasks = async (userId: number) => {
    const RULE_UID = "plugin::zhao-point.point-rule";
    const RECORD_UID = "plugin::zhao-point.point-record";

    // 查询所有启用的 increase 规则
    const rules = await strapi.db.query(RULE_UID).findMany({
      where: { category: "increase", enabled: true, deletedAt: null },
      orderBy: { taskGroup: "asc", action: "asc" },
    });

    // 查询用户今日积分记录
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRecords = await strapi.db.query(RECORD_UID).findMany({
      where: {
        user: userId,
        type: "increase",
        createdAt: { $gte: todayStart.toISOString() },
      },
    });

    // 统计今日每个 action 的完成次数
    const todayActionCount: Record<string, number> = {};
    for (const r of todayRecords) {
      todayActionCount[r.action] = (todayActionCount[r.action] || 0) + 1;
    }

    // 按 taskGroup 分组
    const groups: Record<string, any[]> = {};
    for (const rule of rules) {
      const group = rule.taskGroup || "other";
      if (!groups[group]) groups[group] = [];

      const todayCount = todayActionCount[rule.action] || 0;
      const isCompleted = rule.limitPerDay > 0 ? todayCount >= rule.limitPerDay : (rule.isOneTime ? todayCount > 0 : false);

      groups[group].push({
        action: rule.action,
        description: rule.description,
        points: rule.points,
        limitPerDay: rule.limitPerDay,
        isOneTime: rule.isOneTime,
        todayCount,
        isCompleted,
      });
    }

    return groups;
  };

  return {
    earnPoints,
    earnCustomPoints,
    deductPoints,
    getBalance,
    getRecords,
    getStatistics,
    adminAdjust,
    batchAdjust,
    getExpiringPoints,
    applyExpiryDeduction,
    getRules,
    findOneRule,
    upsertRule,
    deleteRule,
    getDefaultConfig,
    listRecords,
    findRecordByDocumentId,
    findVerificationByDocumentId,
    getMergedRule,
    getTasks,
  };
};

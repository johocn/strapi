import type { Core } from "@strapi/strapi";
import pluginConfig from "../config";

const RECORD_UID = "plugin::zhao-point.point-record";

const ACTIVITY_UID = "plugin::zhao-point.activity";

const VISIT_UID = "plugin::zhao-point.activity-share-visit";

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
  points?: string | number; // 发放积分覆盖值(缺省用规则 points)，用于活动分享裂变奖励等动态积分
  dimType?: string; // 分享维度：activity | task
  dimId?: string | number | null; // 分享维度 id（活动 id / 任务 id）
  activityId?: string | number | null; // 兼容旧调用，映射到 dimType=activity
}

export interface DeductPointsParams {
  userId: string | number;
  action: string;
  points?: number;
  source?: string;
  method?: string;
  remark?: string;
  orderId?: string;
  channelId?: string | number;
  userChannelId?: string | number;
}

export interface AdminAdjustParams {
  userId: string | number;
  points: number;
  action?: string;
  remark?: string;
  operatorId: string | number;
  channelId?: string | number; // 新增：积分归属渠道（documentId 或 id）
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
        name: dbRule.name,
        icon: dbRule.icon,
        linkType: dbRule.linkType,
        linkTargetId: dbRule.linkTargetId,
        linkTitle: dbRule.linkTitle,
        linkThumb: dbRule.linkThumb,
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

  // 并发加固：改用 SUM(points) 计算余额，彻底消除 createdAt 排序快照竞态。
  // 传入可选 trx：earnPoints/deductPoints 事务内复用同一连接，保证读到本事务已写余额。
  const getLatestBalance = async (userId: string | number, trx?: any): Promise<number> => {
    const conn = trx || strapi.db.connection;
    const REC_TABLE = "zhao_point_records";
    const LNK_TABLE = "zhao_point_records_user_lnk";
    const result: { total_balance: string | number }[] = await conn(REC_TABLE)
      .join(LNK_TABLE, `${REC_TABLE}.id`, "=", `${LNK_TABLE}.point_record_id`)
      .where(`${LNK_TABLE}.user_id`, userId)
      .select(conn.raw(`COALESCE(SUM(${REC_TABLE}.points), 0) AS total_balance`));
    return parseInt(String(result[0]?.total_balance ?? 0), 10) || 0;
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

  /** 冷却校验：返回距上次成功记录还剩多少毫秒（<=0 表示可通过） */
  const cooldownRemainingMs = async (userId: number, action: string, intervalMinutes: number): Promise<number> => {
    const last = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId, action, type: "increase" },
      orderBy: { createdAt: "desc" },
      select: ["createdAt"],
    });
    if (!last?.createdAt) return 0;
    const elapsed = Date.now() - new Date(last.createdAt).getTime();
    return Math.max(0, intervalMinutes * 60 * 1000 - elapsed);
  };

  // 维度化好友点击：返回该分享者、该维度最早的（即冷却基准）与是否有点击
  const getShareVisitState = async (params: {
    userId: number | string;
    dimType: string;
    dimId?: string | number | null;
  }): Promise<{ hasClick: boolean; firstClickAt: number | null }> => {
    const where: Record<string, any> = { inviter: params.userId, targetType: params.dimType };
    if (params.dimId != null && params.dimId !== "") where.targetId = String(params.dimId);
    const first = await strapi.db.query(VISIT_UID).findOne({
      where,
      orderBy: { createdAt: "asc" },
      select: ["createdAt"],
    });
    return { hasClick: !!first?.createdAt, firstClickAt: first?.createdAt ? new Date(first.createdAt).getTime() : null };
  };

  // 维度化每日领分计数：按 point_record.source 标签（share:{dimType}:{dimId}）统计当日
  const countTodayShareByDim = async (
    userId: number | string,
    dimType: string,
    dimId: string | number | null
  ): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tag = `share:${dimType}:${dimId ?? ""}`;
    const count = await strapi.db.query(RECORD_UID).count({
      where: {
        user: userId,
        action: "activity_share",
        source: tag,
        createdAt: { $gte: today.toISOString() },
      },
    });
    return count;
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
    const { userId, action, source, method, remark, orderId, channelId, userChannelId, points: pointsOverride } = params;

    // 并发加固：防重校验(isOneTime/limitPerDay)与积分写入同处一个数据库事务，
    // 依赖 Strapi5 事务 AsyncLocalStorage，事务内 strapi.db.query 自动绑定同一 trx。
    // 同一用户的积分操作串行化，杜绝「先查后写」造成的重复发放 / 余额快照竞态。
    return strapi.db.transaction(async ({ trx }) => {
      // channel 决策：channelId 优先（调用方负责 selected → pointChannel 选择），空时降级到 userChannelId 兜底
      // 仅 channelScope="all" + pointChannel 空的场景会走到兜底
      const finalChannelId = channelId ?? userChannelId;

      // 并发防重核心：对用户主行加排他锁(SELECT FOR UPDATE)。
      // 同一用户并发积分操作在此串行，后到者等先到者提交后再读防重，杜绝重复发放。
      await trx("up_users").where({ id: userId }).forUpdate();

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

      // 冷却校验：分享领分以「好友点击」为成功判定，冷却从该维度首次点击起算，后续点击不更新
      const interval = Number((rule.extraConfig as any)?.intervalMinutes) || 0;
      if (interval > 0) {
        if (action === "activity_share") {
          const dimType = ["activity", "task"].includes(params.dimType || "") ? params.dimType! : "activity";
          const dimId = params.dimType ? params.dimId : params.activityId;
          // 维度每日上限（同一事务内复核，防并发绕过）
          if (rule.limitPerDay > 0) {
            const dimCount = await countTodayShareByDim(userId, dimType, dimId);
            if (dimCount >= rule.limitPerDay) {
              throwError("POINT_004", `已达当日分享次数上限 (action=${action})`, { action, limit: rule.limitPerDay });
            }
          }
          const { hasClick, firstClickAt } = await getShareVisitState({ userId, dimType, dimId });
          if (!hasClick || firstClickAt == null) {
            throwError("POINT_024", "分享出去等待好友点击", { action, dimType, dimId });
          }
          const elapsed = Date.now() - firstClickAt!;
          if (elapsed < interval * 60 * 1000) {
            const min = Math.ceil((interval * 60 * 1000 - elapsed) / 60000);
            throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
          }
        } else {
          const remainMs = await cooldownRemainingMs(userId, action, interval);
          if (remainMs > 0) {
            const min = Math.ceil(remainMs / 60000);
            throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
          }
        }
      }

      // SUM(points) 实时计算，复用事务连接(trx)，保证读到本事务已写部分，余额正确
      const balance = await getLatestBalance(userId, trx);

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

      const earnAmount = pointsOverride ?? rule.points;

      const record = await createRecord(userId, action, earnAmount, balance, "increase", {
        source, method, remark, orderId, channelId: finalChannelId, userChannelId, expiresAt,
      });

      return record;
    });
  };

  const deductPoints = async (params: DeductPointsParams) => {
    const { userId, action, points: customPoints, source, method, remark, orderId, channelId, userChannelId } = params;

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
      source, method, remark, orderId, channelId, userChannelId,
    });

    return record;
  };

  const refundPoints = async (params: {
    userId: string | number;
    action: string;
    points: number;
    source?: string;
    method?: string;
    remark?: string;
    orderId?: string;
    channelId?: string | number;
    userChannelId?: string | number;
  }) => {
    const { userId, action, points, source, method, remark, orderId, channelId, userChannelId } = params;

    if (points <= 0) {
      throwError("POINT_021", "无效退款金额", { action });
    }

    const balance = await getLatestBalance(userId);
    const record = await createRecord(userId, action, points, balance, "increase", {
      source, method, remark, orderId, channelId, userChannelId,
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
    const { userId, points, action, remark, operatorId, channelId } = params;
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
      channelId,
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
    name?: string;
    icon?: string;
    linkType?: string;
    linkTargetId?: string;
    linkTitle?: string;
    linkThumb?: string;
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
          name: data.name ?? existing.name,
          icon: data.icon ?? existing.icon,
          linkType: data.linkType ?? existing.linkType,
          linkTargetId: data.linkTargetId ?? existing.linkTargetId,
          linkTitle: data.linkTitle ?? existing.linkTitle,
          linkThumb: data.linkThumb ?? existing.linkThumb,
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
          name: data.name ?? undefined,
          icon: data.icon ?? undefined,
          linkType: data.linkType ?? "none",
          linkTargetId: data.linkTargetId ?? undefined,
          linkTitle: data.linkTitle ?? undefined,
          linkThumb: data.linkThumb ?? undefined,
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
    extraWhere?: Record<string, any>;
  }) => {
    const { userId, action, type, startDate, endDate, page, pageSize, extraWhere } = params;
    const where: any = {};
    if (userId) where.user = userId;
    if (action) where.action = action;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
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

    // 无自定义 name 时，用可读化 action 兜底（如 daily_checkin -> Daily Checkin）
    const readableAction = (action: string) =>
      action
        .split(/[_-]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

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
        taskId: rule.documentId || rule.id,   // 稳定任务维度标识（分享任务按此核算 task 维度）
        name: rule.name || readableAction(rule.action),
        icon: rule.icon,
        linkType: rule.linkType || "none",
        linkTargetId: rule.linkTargetId,
        linkTitle: rule.linkTitle,
        linkThumb: rule.linkThumb,
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

  // 分享领分状态查询：供任务中心 / 活动页点亮「领取积分」按钮、展示规则与置灰原因；支持活动/任务维度核算
  const getShareStatus = async (params: {
    userId: number | string;
    dimType?: string;
    dimId?: string | number | null;
    activityId?: string | number | null;   // 兼容旧调用，映射到 dimType=activity
  }) => {
    const dimType = (["activity", "task"].includes(params.dimType || "")) ? params.dimType! : "activity";
    const dimId = params.dimType ? params.dimId : (params.activityId ?? null);
    const { userId } = params;

    const rule = await getMergedRule("activity_share");
    const interval = Number(rule?.extraConfig?.intervalMinutes) || 30;
    const limitPerDay = Number(rule?.limitPerDay) || 0;

    let points = Number(rule?.points) || 5;
    if (dimType === "activity" && dimId != null) {
      try {
        const idNum = Number(dimId);
        const act = await strapi.db.query(ACTIVITY_UID).findOne({
          where: Number.isNaN(idNum) ? { documentId: String(dimId) } : { id: idNum },
          select: ["shareRewardPoints"],
        });
        if (act?.shareRewardPoints) points = Number(act.shareRewardPoints);
      } catch { /* 活动不存在或类型异常：回退默认分 */ }
    }

    const { hasClick, firstClickAt } = await getShareVisitState({ userId, dimType, dimId });
    const dailyCount = await countTodayShareByDim(userId, dimType, dimId);

    let remainingMs = 0;
    if (hasClick && firstClickAt != null) {
      const elapsed = Date.now() - firstClickAt;
      remainingMs = Math.max(0, interval * 60 * 1000 - elapsed);
    }

    let canClaim = hasClick && remainingMs === 0;
    if (limitPerDay > 0 && dailyCount >= limitPerDay) canClaim = false;

    return {
      action: "activity_share",
      dimType,
      dimId: dimId != null ? String(dimId) : undefined,
      canClaim,
      hasClick,
      waitClick: !hasClick,
      points,
      remainingMs,
      dailyCount,
      dailyLimit: limitPerDay,
      intervalMinutes: interval,
    };
  };

  return {
    earnPoints,
    earnCustomPoints,
    deductPoints,
    refundPoints,
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
    getShareStatus,
    getShareVisitState,
  };
};

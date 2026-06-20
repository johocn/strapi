import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-point.point-config";
const TYPE_UID = "plugin::zhao-point.point-type";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getConfig = async () => {
    let config = await strapi.db.query(CONFIG_UID).findOne();
    if (!config) {
      // 创建默认配置
      config = await strapi.db.query(CONFIG_UID).create({
        data: {
          moduleEnabled: true,
          earnEnabled: true,
          redeemEnabled: true,
          expiryEnabled: false,
          expiryDays: 365,
          expiryReminderDays: 7,
          minRedeemPoints: 0,
          maxDailyEarn: 0,
          defaultExchangeRate: 1.0,
          signInEnabled: true,
          tasksEnabled: true,
        },
      });
    }
    return config;
  };

  const updateConfig = async (data: any) => {
    let config = await strapi.db.query(CONFIG_UID).findOne();
    if (config) {
      config = await strapi.db.query(CONFIG_UID).update({
        where: { id: config.id },
        data,
      });
    } else {
      config = await strapi.db.query(CONFIG_UID).create({ data });
    }
    return config;
  };

  const isModuleEnabled = async (moduleName?: "earn" | "redeem" | "expiry") => {
    try {
      const config = await getConfig();
      if (!config.moduleEnabled) return false;
      if (moduleName === "earn" && !config.earnEnabled) return false;
      if (moduleName === "redeem" && !config.redeemEnabled) return false;
      return true;
    } catch {
      return true; // 默认启用
    }
  };

  const getDashboardStats = async () => {
    const RECORD_UID = "plugin::zhao-point.point-record";
    const REDEMPTION_UID = "plugin::zhao-point.point-redemption";
    const LOCATION_UID = "plugin::zhao-point.pickup-location";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 总积分发放/消耗（使用聚合查询避免全量加载）
    const increaseRecords = await strapi.db.query(RECORD_UID).findMany({
      where: { type: "increase" },
      select: ['points', 'user', 'action', 'createdAt'],
    });
    const decreaseRecords = await strapi.db.query(RECORD_UID).findMany({
      where: { type: "decrease" },
      select: ['points'],
    });

    let totalPointsIssued = 0;
    let totalPointsSpent = 0;
    const activeUsersSet = new Set();
    const todayActions: any[] = [];

    increaseRecords.forEach((r: any) => {
      totalPointsIssued += Math.abs(r.points);
      if (new Date(r.createdAt) >= startOfToday) {
        activeUsersSet.add(r.user?.id || r.user);
        todayActions.push(r);
      }
    });
    decreaseRecords.forEach((r: any) => {
      totalPointsSpent += Math.abs(r.points);
    });

    // 待处理兑换
    const pendingRedemptions = await strapi.db.query(REDEMPTION_UID).count({
      where: { status: "pending", deletedAt: null },
    });

    // 待兑付自提订单
    const pendingPickups = await strapi.db.query(REDEMPTION_UID).count({
      where: { status: "approved", deliveryType: "self_pickup", deletedAt: null },
    });

    // 自提点数量
    const pickupLocationCount = await strapi.db.query(LOCATION_UID).count({
      where: { status: "active", deletedAt: null },
    });

    // 即将过期积分
    const config = await getConfig();
    let expiringSoonPoints = 0;
    if (config?.expiryEnabled) {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + (config.expiryReminderDays || 7));
      const expiringRecords = await strapi.db.query(RECORD_UID).findMany({
        where: {
          type: "increase",
          expiresAt: {
            $gte: new Date().toISOString(),
            $lte: reminderDate.toISOString(),
          },
          expiredAt: null,
        },
      });
      expiringSoonPoints = expiringRecords.reduce((sum: number, r: any) => sum + Math.abs(r.points), 0);
    }

    // 热门操作统计
    const actionCounts: Record<string, { count: number; totalPoints: number }> = {};
    todayActions.forEach((r: any) => {
      if (!actionCounts[r.action]) {
        actionCounts[r.action] = { count: 0, totalPoints: 0 };
      }
      actionCounts[r.action].count++;
      actionCounts[r.action].totalPoints += Math.abs(r.points);
    });
    const topEarnActions = Object.entries(actionCounts)
      .map(([action, data]) => ({ action, ...data }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);

    return {
      totalUsers: activeUsersSet.size,
      activeUsersToday: activeUsersSet.size,
      activeUsers: activeUsersSet.size,
      totalPointsIssued,
      totalIssued: totalPointsIssued,
      totalPointsSpent,
      totalRedeemed: totalPointsSpent,
      totalBalance: totalPointsIssued - totalPointsSpent,
      pendingRedemptions,
      pendingPickups,
      pickupLocationCount,
      expiringSoonPoints,
      topEarnActions,
    };
  };

  return {
    getConfig,
    updateConfig,
    isModuleEnabled,
    getDashboardStats,

    // Point-type CRUD
    findTypes: async (filters: any = {}) => strapi.documents(TYPE_UID).findMany({ filters }),
    findOneType: async (documentId: string) => strapi.documents(TYPE_UID).findOne({ documentId }),
    createType: async (data: any) => strapi.documents(TYPE_UID).create({ data }),
    updateType: async (documentId: string, data: any) => strapi.documents(TYPE_UID).update({ documentId, data }),
    deleteType: async (documentId: string) => strapi.documents(TYPE_UID).delete({ documentId }),
  };
};

import type { Core } from "@strapi/strapi";

const SIGN_IN_UID = "plugin::zhao-point.sign-in-record";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const signIn = async (userId: number) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. 检查今天是否已签到
    const todayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: today },
    });
    if (todayRecord) {
      const e: any = new Error("今天已签到");
      e.code = "SIGN_001";
      e.status = 400;
      throw e;
    }

    // 2. 计算连续签到天数
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const yesterdayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: yesterday },
    });
    const streakDays = yesterdayRecord ? (yesterdayRecord.streakDays || 0) + 1 : 1;

    // 3. 签到固定积分
    const pointService = strapi.plugin("zhao-point").service("point");
    let totalEarned = 0;
    let fixedResult: any = null;

    try {
      fixedResult = await pointService.earnPoints({
        userId,
        action: "daily_sign_in",
      });
      totalEarned += fixedResult?.points || 0;
    } catch (e: any) {
      // 规则未启用或已达上限，仍记录签到
      strapi.log.warn(`[sign-in] daily_sign_in 积分获取失败: ${e.message}`);
    }

    // 4. 连续签到阶梯奖励
    let isStreakReward = false;
    const streakRule = await pointService.getMergedRule("daily_sign_in_streak");
    if (streakRule?.enabled && streakRule.extraConfig) {
      let extraConfig: any = {};
      try {
        extraConfig = typeof streakRule.extraConfig === "string"
          ? JSON.parse(streakRule.extraConfig)
          : streakRule.extraConfig;
      } catch {}

      const milestones: number[] = extraConfig.streakMilestones || [];
      const bonusPoints: number[] = extraConfig.streakBonusPoints || [];

      const milestoneIdx = milestones.indexOf(streakDays);
      if (milestoneIdx !== -1 && bonusPoints[milestoneIdx]) {
        try {
          await pointService.earnCustomPoints({
            userId,
            action: "daily_sign_in_streak",
            points: bonusPoints[milestoneIdx],
            remark: `连续签到${streakDays}天奖励${bonusPoints[milestoneIdx]}积分`,
          });
          totalEarned += bonusPoints[milestoneIdx];
          isStreakReward = true;
        } catch (e: any) {
          strapi.log.warn(`[sign-in] daily_sign_in_streak 积分获取失败: ${e.message}`);
        }
      }
    }

    // 5. 写入签到记录
    await strapi.db.query(SIGN_IN_UID).create({
      data: {
        user: userId,
        signInDate: today,
        streakDays,
        pointsEarned: totalEarned,
        isStreakReward,
      },
    });

    return { signInDate: today, streakDays, pointsEarned: totalEarned, isStreakReward };
  };

  const getSignInStatus = async (userId: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: today },
    });

    // 获取最近签到记录（含今天）
    const lastRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId },
      orderBy: { signInDate: "desc" },
    });

    let streakDays = 0;
    if (todayRecord) {
      // 今天已签到，直接用今天的连续天数
      streakDays = todayRecord.streakDays || 1;
    } else if (lastRecord) {
      // 今天未签到，检查昨天是否签到
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastRecord.signInDate === yesterday) {
        streakDays = lastRecord.streakDays || 0;
      }
      // 昨天也没签到则连续天数归0
    }

    // 获取最近30天签到记录
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const recentRecords = await strapi.db.query(SIGN_IN_UID).findMany({
      where: { user: userId, signInDate: { $gte: thirtyDaysAgo } },
      orderBy: { signInDate: "asc" },
    });

    return {
      isSignedInToday: !!todayRecord,
      streakDays: streakDays || 0,
      recentDates: recentRecords.map((r: any) => r.signInDate),
    };
  };

  return { signIn, getSignInStatus };
};

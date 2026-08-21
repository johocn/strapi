import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";
const AUTH_UID = "plugin::zhao-course.user-course-auth";
const ACTIVITY_UID = "plugin::zhao-point.activity";

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function grantPoints(strapi, userId: number, action: string, remark: string) {
  try {
    // 积分必须归属渠道：解析用户当前渠道（优先 channel-member 当前渠道，其次直接授权渠道）
    const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
    let userChannelId: number | undefined;
    if (channelSvc) {
      const member = await strapi.db.query("plugin::zhao-channel.channel-member")
        .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
      userChannelId = member?.channel?.id || member?.channel;
      if (!userChannelId) {
        const dirs = await channelSvc.getUserDirectChannels(userId);
        userChannelId = dirs?.[0];
      }
    }
    await strapi.plugin("zhao-point").service("point").earnPoints(
      { userId, action, source: "activity", method: action, remark, userChannelId }
    );
  } catch (e: any) {
    console.error(`[zhao-point:activity] grantPoints(${action},user=${userId}) failed:`, e?.message);
  }
}

async function grantCourseTrial(strapi, userId: number, courseId: number) {
  try {
    const existing = await strapi.db.query(AUTH_UID).findOne({ where: { user: userId, course: courseId } });
    if (existing) return;
    await strapi.documents(AUTH_UID).create({ data: { user: userId, course: courseId, authType: "trial", isExpired: false } });
  } catch { /* 幂等授权，失败忽略 */ }
}

async function resolveUserChannelId(strapi, userId: number): Promise<number | undefined> {
  const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
  let userChannelId: number | undefined;
  if (channelSvc) {
    const member = await strapi.db.query("plugin::zhao-channel.channel-member")
      .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
    userChannelId = member?.channel?.id || member?.channel;
    if (!userChannelId) {
      const dirs = await channelSvc.getUserDirectChannels(userId);
      userChannelId = dirs?.[0];
    }
  }
  return userChannelId;
}

/**
 * 分享裂变奖励：下线 B(userId, upUser) 成功报名活动 act → 给其邀请人 A 发积分。
 * 幂等键：(invitee, activity)；虚拟分享者/无码/奖励<=0/桥接不到 A 均跳过；失败仅日志，绝不阻断报名主流程。
 */
async function grantShareReward(strapi, userId: number, act: any) {
  try {
    if (!act?.id) return;
    const configSvc = strapi.plugin("zhao-point").service("config-service");
    const config = configSvc ? await configSvc.getConfig() : null;
    const reward = Number(act.shareRewardPoints ?? config?.defaultShareRewardPoints ?? 0) || 0;
    if (reward <= 0) return;

    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const profileSvc = strapi.plugin("zhao-sso")?.service("sso-profile");
    if (!sop || !profileSvc) return;

    const inviteeSso = await sop.resolveSsoUserForUpUser(userId);
    const inviteCodeStr = inviteeSso?.invite_code_used;
    if (!inviteCodeStr) return;

    const code = await strapi.db.query("plugin::zhao-sso.sso-invite-code").findOne({
      where: { code: inviteCodeStr, is_active: true },
      populate: ["creator"],
    });
    const inviter = code?.creator;
    if (!inviter || inviter.status === "virtual") return;

    const inviterUp = await profileSvc.resolveUpUserForSsoUser(inviter.id);
    if (!inviterUp?.id) return;

    const REWARD_UID = "plugin::zhao-point.activity-referral-reward";
    const exists = await strapi.db.query(REWARD_UID).findOne({
      where: { invitee: userId, activity: act.id },
    });
    if (exists) return;

    const userChannelId = await resolveUserChannelId(strapi, inviterUp.id);
    await strapi.plugin("zhao-point").service("point").earnPoints({
      userId: inviterUp.id,
      action: "activity_share_reward",
      source: "activity",
      method: "activity_share_reward",
      points: reward,
      remark: `分享活动:${act.title}`,
      userChannelId,
    });
    await strapi.db.query(REWARD_UID).create({
      data: {
        inviter: inviterUp.id,
        invitee: userId,
        activity: act.id,
        points: reward,
        sourceInviteCode: inviteCodeStr,
        issuedAt: new Date(),
      },
    });
  } catch (e: any) {
    strapi.log.warn(`[zhao-point:activity] grantShareReward failed: ${e.message}`);
  }
}

const feeSvc = () => strapi.plugin("zhao-point").service("fee-service");

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async signup({ userId, activityId }: { userId: number; activityId: string }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId, populate: { preUnlockLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "signup_open") throw new Error("活动未开放报名");
    const now = Date.now();
    if (act.signupStart && now < new Date(act.signupStart).getTime()) throw new Error("报名未开始");
    if (act.signupEnd && now > new Date(act.signupEnd).getTime()) throw new Error("报名已截止");
    const dup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: act.id, status: { $in: ["active", "waiting"] } },
    });
    if (dup) return { ok: false, reason: "already_signed_up" };
    const knex = strapi.db.connection;
    const reserved = await knex("activities").where("id", act.id).andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);
    if (reserved === 0) {
      // 名额已满 → 进入候补队列（不占用名额）
      const sig = await strapi.db.query(SIGNS_UID).create({
        data: { user: userId, activity: act.id, status: "waiting", signupAt: new Date() },
      });
      const waitCount = await strapi.db.query(SIGNS_UID).count({
        where: {
          activity: act.id,
          status: "waiting",
          $or: [
            { signupAt: { $lt: sig.signupAt } },
            { signupAt: sig.signupAt, id: { $lt: sig.id } },
          ],
        },
      });
      return { ok: true, waitlisted: true, position: waitCount + 1 };
    }
    let resolved = await feeSvc().resolveFee(act, userId);
    if (resolved.mode === "tier" && resolved.tierId && Number(resolved.tier?.quota || 0) > 0) {
      let attempts = (Array.isArray(act.feeTiers) ? act.feeTiers.length : 0) + 1;
      while (attempts-- > 0 && resolved.tierId) {
        const usage = await feeSvc().tierUsage(act.id, resolved.tierId);
        if (usage < Number(resolved.tier?.quota || 0)) break;
        resolved = await feeSvc().resolveFee(act, userId, { excludeTierId: resolved.tierId });
      }
    }
    const feeCollectAt = resolved.feeCollectAt || "signup";
    const cost = resolved.cost || 0;
    if (feeCollectAt === "signup" && cost > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: cost, source: "activity", method: "activity_signup", remark: `报名活动:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        await strapi.db.connection("activities").where("id", act.id).decrement("used_capacity", 1);
        return { ok: false, reason: "insufficient_points" };
      }
    }
    await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null } });
    // 报名积分
    await grantPoints(strapi, userId, "activity_signup", "活动报名");
    // 分享裂变奖励
    await grantShareReward(strapi, userId, act);
    // 预留存：试看课时所属课程授权
    for (const lesson of act.preUnlockLessons || []) {
      if (lesson?.course?.id) await grantCourseTrial(strapi, userId, lesson.course.id);
    }
    // SOP 埋点：报名确认立即通知 + 活动开始前 24h 提醒（跨插件调用 zhao-sso/sso-sop）
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(userId);
        if (!sso) return { ok: true };
        const startTime = act.startTime;
        const schedules: any[] = [{ templateCode: "act_confirm", scene: "activity.confirm" }];
        if (startTime) {
          const beforeAt = new Date(new Date(startTime).getTime() - 24 * 3600 * 1000).toISOString();
          // 活动开始前 24h 已过（早于 now）则跳过该条
          if (new Date(beforeAt).getTime() > Date.now()) {
            schedules.push({ templateCode: "act_before", scene: "activity.before", scheduledAt: beforeAt });
          }
        }
        await sop.trigger("activity.signup", {
          user: sso.id,
          payload: { activity: { name: act.title, startTime } },
          schedules,
        });
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] sop activity.signup embed failed: ${e.message}`);
    }
    return { ok: true };
  },

  /**
   * 活动结束触点：本项目无可靠业务结束判定（无 cron、无专属关闭端点，adminUpdate 仅通用更新 status），
   * 因此提供公开 service 方法 closeActivity(activityId) 兼做“activity.closed”未到场回访埋点，不引入 cron。
   * 调用方在活动结束后自行调用；对活动期内未签到(attended_at 为空)且未取消的每个报名用户触发一次回访。
   */
  async closeActivity(activityId: string) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    await strapi.documents("plugin::zhao-point.activity").update({ documentId: activityId, data: { status: "ended" } });
    const name = act.title;
    const startTime = act.startTime;
    // 未签到（attendedAt 为空）且未取消（status=active）的报名名单
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active", attendedAt: { $null: true } },
      populate: ["user"],
    });
    let triggered = 0;
    for (const s of signs) {
      const upUserId = s.user?.id ?? s.user;
      if (!upUserId) continue;
      try {
        const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
        if (!sop) continue;
        const sso = await sop.resolveSsoUserForUpUser(upUserId);
        if (!sso) continue;
        await sop.trigger("activity.closed", {
          user: sso.id,
          payload: { activity: { name, startTime } },
          schedules: [{ templateCode: "act_revisit", scene: "activity.closed" }],
        });
        triggered++;
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] sop activity.closed embed failed (user=${upUserId}): ${e.message}`);
      }
    }
    return { ok: true, closed: true, revisitTriggered: triggered };
  },

  async cancel({ userId, activityId }: { userId: number; activityId: number }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: activityId, status: { $in: ["active", "waiting"] } },
    });
    if (!signup) throw new Error("未报名");
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
    if (signup.status === "active") {
      // 报名时收费（signup 模式）且已扣积分 → 取消退款
      const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
      if (signup.pointsCharged > 0) {
        const userChannelId = await resolveUserChannelId(strapi, userId);
        try {
          await strapi.plugin("zhao-point").service("point").refundPoints({ userId, action: "activity_fee_refund", points: signup.pointsCharged, source: "activity", method: "activity_cancel", remark: `取消退费:${act?.title ?? ''}`, userChannelId });
        } catch (e: any) {
          strapi.log.warn(`[zhao-point:activity] refund failed (user=${userId}): ${e?.message}`);
        }
      }
      // 释放名额并递补候补（释放一席只转正一人）
      await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
      await this.promoteWaiting(activityId);
    }
    // waiting 取消：仅移出队列，不减名额、不递补
    return { ok: true };
  },

  /**
   * 递补：从候补队列取最旧的一个 waiting 转正为 active（复用"used_capacity<capacity 原子占位"法，
   * cancel 释放一席后调用，故每次至多转正一人），并对转正用户即时通知。
   */
  async promoteWaiting(activityId: number) {
    const pending = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: activityId, status: "waiting" },
      orderBy: [{ signupAt: "asc" }, { id: "asc" }],
      populate: ["user"],
    });
    const knex = strapi.db.connection;
    const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
    let promoted = 0;
    for (const p of pending) {
      if (promoted >= 1) break; // 本次调用对应释放的一席，只转正一人
      const claimed = await knex("activities")
        .where("id", activityId)
        .andWhere("used_capacity", "<", knex.raw("capacity"))
        .increment("used_capacity", 1);
      if (claimed === 0) break; // 无空位（并发已吃满），停止
      const upUserId = p.user?.id ?? p.user;
      const resolved = await feeSvc().resolveFee(act ?? { id: activityId, pointsCost: 0, feeCollectAt: "signup", pricingMode: "flat" }, upUserId);
      const feeCollectAt = resolved.feeCollectAt || "signup";
      const cost = resolved.cost || 0;
      if (feeCollectAt === "signup" && cost > 0) {
        const userChannelId = await resolveUserChannelId(strapi, upUserId);
        try {
          await strapi.plugin("zhao-point").service("point").deductPoints({ userId: upUserId, action: "activity_fee", points: cost, source: "activity", method: "activity_promote", remark: `候补转正:${act?.title ?? ''}`, orderId: `act:${act?.id ?? activityId}`, userChannelId });
        } catch {
          await knex("activities").where("id", activityId).decrement("used_capacity", 1);
          continue;
        }
      }
      await strapi.db.query(SIGNS_UID).update({
        where: { id: p.id },
        data: { status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null },
      });
      promoted++;
      if (upUserId) await this.notifyPromoted(upUserId, activityId);
    }
    return { promoted };
  },

  /** 递补转正即时通知：resolve sso 用户 → sso-msg.sendNow(act_promoted)，幂等；匹配不到/模板缺失降级不断链 */
  async notifyPromoted(upUserId: number, activityId: number) {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
      const act = await strapi.db.query("plugin::zhao-point.activity").findOne({ where: { id: activityId } });
      if (!sop || !msg || !act) return;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso) {
        strapi.log.warn(`[zhao-point:activity] promote notify skip: no sso for upUser=${upUserId}`);
        return;
      }
      await msg.sendNow({
        user: sso.id,
        scene: "activity.promoted",
        templateCode: "act_promoted",
        params: { name: act.title, time: act.startTime },
        dedupeKey: `activity:promote:${upUserId}:${activityId}`,
      });
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] promote notify failed (user=${upUserId}): ${e.message}`);
    }
  },

  async checkin({ userId, activityId, method, lat, lng }: {
    userId: number; activityId: string; method: "worker_scan" | "self"; lat?: number; lng?: number;
  }) {
    const attSvc = this as any;
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId, populate: { learningPackageLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
    if (!signup) throw new Error("尚未报名");
    const existing = await strapi.db.query(ATT_UID).findOne({ where: { signup: signup.id } });
    if (existing) return { ok: false, reason: "already_checked_in", attendanceId: existing.id, point: existing.pointsGranted };

    let geoPassed = true;
    if (method === "self" && act.geoEnforced && typeof lat === "number" && typeof lng === "number") {
      geoPassed = haversineM(lat, lng, act.lat, act.lng) <= act.geoRadiusM;
      if (!geoPassed) throw new Error("不在活动场地范围内");
    }
    // 到场收费（checkin 模式）
    const resolved = await feeSvc().resolveFee(act, userId);
    if (resolved.feeCollectAt === "checkin" && (resolved.cost || 0) > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: resolved.cost, source: "activity", method: "activity_checkin", remark: `到场收费:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        return { ok: false, reason: "insufficient_points" };
      }
    }
    const att = await strapi.db.query(ATT_UID).create({
      data: { signup: signup.id, method, checkinAt: new Date(), lat, lng, geoPassed, pointsGranted: false },
    });
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { attendedAt: new Date() } });

    await grantPoints(strapi, userId, "activity_attend", "活动到场签到");
    await strapi.db.query(ATT_UID).update({ where: { id: att.id }, data: { pointsGranted: true } });
    // 专属学习包：课时所属课程授权
    for (const lesson of act.learningPackageLessons || []) {
      if (lesson?.course?.id) await grantCourseTrial(strapi, userId, lesson.course.id);
    }
    return { ok: true, attendanceId: att.id, point: true };
  },
});
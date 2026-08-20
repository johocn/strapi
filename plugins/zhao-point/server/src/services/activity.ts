import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";
const AUTH_UID = "plugin::zhao-course.user-course-auth";

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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async signup({ userId, activityId }: { userId: number; activityId: string }) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId, populate: { preUnlockLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "signup_open") throw new Error("活动未开放报名");
    const now = Date.now();
    if (act.signupStart && now < new Date(act.signupStart).getTime()) throw new Error("报名未开始");
    if (act.signupEnd && now > new Date(act.signupEnd).getTime()) throw new Error("报名已截止");
    const dup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
    if (dup) return { ok: false, reason: "already_signed_up" };
    const knex = strapi.db.connection;
    const reserved = await knex("activities").where("id", act.id).andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);
    if (reserved === 0) throw new Error("名额已满");
    await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date() } });
    // 报名积分
    await grantPoints(strapi, userId, "activity_signup", "活动报名");
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
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: activityId, status: "active" } });
    if (!signup) throw new Error("未报名");
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
    await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
    return { ok: true };
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
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
    return { ok: true };
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
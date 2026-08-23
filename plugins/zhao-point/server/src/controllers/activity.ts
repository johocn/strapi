import type { Core } from "@strapi/strapi";
import { FormValidationError } from "../services/form";
import { isRoleGateEnabled, mayAccessVisibleToRoles } from "../../../../zhao-common/server/src/utils/role-gate";
import { resolveUserRoles } from "../../../../zhao-course/server/src/utils/role-gate";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getUserId = (ctx: any) => ctx.state.user.id || ctx.state.user.documentId;
  const activitySvc = () => strapi.plugin("zhao-point").service("activity");

  // 关系归一：{connect:[N]}|N|{id:N}+documentId → number | undefined
  function relId(v: any): number | undefined {
    if (!v) return undefined;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return relId(v[0]);
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
    if (typeof v === "object") {
      if (Array.isArray(v.connect) && v.connect.length) return relId(v.connect[0]);
      if (v.id != null) return Number(v.id);
      if (v.documentId) return relId(v.documentId);
    }
    return undefined;
  }

  return ({
  // ===== 公开 =====

  // GET /activities
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", category, search, ...rest } = ctx.query;
      const filters: any = { status: { $notIn: ["draft", "archived"] } };
      if (category) filters.category = { $eq: category };
      if (search) filters.title = { $contains: search };
      const rows = await strapi.documents(ACTIVITY_UID).findMany({
        ...rest,
        filters,
        populate: "*",
        sort: "startTime:desc",
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize) },
      });

      // 强角色门控：租户开启 roleGate 时，仅授权角色可见配置了 visibleToRoles 的活动（游客 userRoles 为空 → 受限活动不可见）
      let data: any = rows;
      const roleGateEnabled = await isRoleGateEnabled(strapi, ctx.state?.siteDocumentId);
      if (roleGateEnabled) {
        const userRoles = await resolveUserRoles(strapi, ctx.state.user?.id);
        data = rows.filter((a: any) => mayAccessVisibleToRoles(userRoles, a.visibleToRoles));
      }
      ctx.body = wrapList(data);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /activities/categories
  async categories(ctx: any) {
    try {
      const rows = await strapi.db.query(ACTIVITY_UID).findMany({
        select: ["category"],
        where: { status: { $notIn: ["draft", "archived"] } },
      });
      const set = new Set<string>();
      for (const r of rows) if (r.category) set.add(r.category);
      ctx.body = wrap(Array.from(set).sort((a, b) => a.localeCompare(b, "zh")));
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /activities/:documentId
  async detail(ctx: any) {
    try {
      const activity = await strapi.documents(ACTIVITY_UID).findOne({
        documentId: ctx.params.documentId,
        populate: "*",
      });
      if (!activity) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      // 强角色门控：租户开启 roleGate 且活动配置了 visibleToRoles 时，未授权角色不可见
      const roleGateEnabled = await isRoleGateEnabled(strapi, ctx.state?.siteDocumentId);
      if (roleGateEnabled) {
        const userRoles = await resolveUserRoles(strapi, ctx.state.user?.id);
        if (!mayAccessVisibleToRoles(userRoles, activity.visibleToRoles)) {
          ctx.status = 403; ctx.body = { error: "无权查看该活动" }; return;
        }
      }
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // ===== 注册用户 =====

  // POST /my/activity/signup
  async signup(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { activityId, formData, chosenRewards } = ctx.request.body || {};
      const result = await activitySvc().signup({ userId, activityId, formData, chosenRewards });
      if (result?.ok === false && result.reason === "already_signed_up") {
        ctx.status = 200;
      }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 400;
      if (e instanceof FormValidationError) {
        ctx.body = { error: e.message, errors: e.errors };
        return;
      }
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/cancel
  async cancel(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const result = await activitySvc().cancel({ userId, activityId: act.id });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/checkin
  async checkin(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { method, lat, lng } = ctx.request.body;
      const result = await activitySvc().checkin({
        userId, activityId: ctx.params.documentId, method, lat, lng,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /my/activities
  async mySignups(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const rows = await strapi.db.query(SIGNS_UID).findMany({
        where: { user: userId },
        populate: { activity: true },
        orderBy: { signupAt: "desc" },
      });
      const ids = rows.map((r: any) => r.id);
      let attendances: any[] = [];
      if (ids.length) {
        attendances = await strapi.db.query(ATT_UID).findMany({
          where: { signup: { $in: ids } },
          populate: { signup: { select: ["id"] } },
        });
      }
      for (const row of rows) {
        row.attendance = attendances.find((a: any) => (a.signup?.id ?? a.signup) === row.id) || null;
      }
      ctx.body = wrapList(rows);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // ===== 管理员 =====

  // GET /adm/activities
  async adminList(ctx: any) {
    try {
      const { page = "1", pageSize = "20", status, ...rest } = ctx.query;
      const filters: any = {};
      if (status) filters.status = status;
      const result = await strapi.documents(ACTIVITY_UID).findMany({
        ...rest,
        filters: Object.keys(filters).length ? filters : undefined,
        populate: "*",
        sort: "startTime:desc",
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize) },
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities
  async adminCreate(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      // 排期冲突校验（仅当给定时间与资源时）
      const lecturerId = relId(body.lecturer);
      const venueId = relId(body.venue);
      if (body.startTime && body.endTime && (lecturerId || venueId)) {
        const chk = await strapi.plugin("zhao-point").service("resource-schedule").check({
          start: body.startTime, end: body.endTime, lecturerId, venueId,
        });
        if (!chk.ok) {
          const c = chk.conflicts[0];
          ctx.status = 400;
          ctx.body = { error: `排期冲突：与活动「${c.conflictActivityTitle ?? c.conflictActivityId}」时间重叠`, conflicts: chk.conflicts };
          return;
        }
      }
      const activity = await strapi.documents(ACTIVITY_UID).create({ data: body });
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /adm/activities/:documentId
  async adminUpdate(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const existing = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId, populate: { lecturer: true, venue: true } });
      if (!existing) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const startTime = body.startTime ?? existing.startTime;
      const endTime = body.endTime ?? existing.endTime;
      const lecturerId = relId(body.lecturer) ?? relId(existing.lecturer);
      const venueId = relId(body.venue) ?? relId(existing.venue);
      if (startTime && endTime && (lecturerId || venueId)) {
        const chk = await strapi.plugin("zhao-point").service("resource-schedule").check({
          start: startTime, end: endTime, excludeActivityId: existing.id, lecturerId, venueId,
        });
        if (!chk.ok) {
          const c = chk.conflicts[0];
          ctx.status = 400;
          ctx.body = { error: `排期冲突：与活动「${c.conflictActivityTitle ?? c.conflictActivityId}」时间重叠`, conflicts: chk.conflicts };
          return;
        }
      }
      const activity = await strapi.documents(ACTIVITY_UID).update({
        documentId: ctx.params.documentId,
        data: body,
      });
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // DELETE /adm/activities/:documentId
  async adminDelete(ctx: any) {
    try {
      const activity = await strapi.documents(ACTIVITY_UID).delete({ documentId: ctx.params.documentId });
      ctx.body = wrap(activity);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activities/:documentId/signups
  async adminSignups(ctx: any) {
    try {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const rows = await strapi.db.query(SIGNS_UID).findMany({
        where: { activity: act.id },
        populate: { user: true },
        orderBy: { signupAt: "desc" },
      });
      ctx.body = wrapList(rows);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities/:documentId/signups/:signupId/cancel  仅可移出候补(waiting)
  async adminCancelSignup(ctx: any) {
    try {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const signupId = parseInt(ctx.params.signupId, 10);
      const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { id: signupId, activity: act.id } });
      if (!signup) { ctx.status = 404; ctx.body = { error: "报名记录不存在" }; return; }
      if (signup.status !== "waiting") { ctx.status = 400; ctx.body = { error: "仅可移出候补名单" }; return; }
      await strapi.db.query(SIGNS_UID).update({ where: { id: signupId }, data: { status: "cancelled" } });
      ctx.body = wrap({ ok: true });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities/:documentId/scan-checkin
  async adminScanCheckin(ctx: any) {
    try {
      const { userId } = ctx.request.body;
      const result = await activitySvc().checkin({
        userId, activityId: ctx.params.documentId, method: "worker_scan",
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activities/:documentId/attendance
  async adminAttendance(ctx: any) {
    try {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
      if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const rows = await strapi.db.query(ATT_UID).findMany({
        populate: { signup: { populate: ["user"] } },
        orderBy: { checkinAt: "desc" },
      });
      const filtered = rows.filter((a: any) => a.signup && a.signup.activity === act.id);
      ctx.body = wrapList(filtered);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /activities/:documentId/review （注册用户评价：评分1-5/NPS 0-10/文字）
  async review(ctx: any) {
    const userId = getUserId(ctx);
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId });
    if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: act.id, status: "active" },
    });
    if (!signup) { ctx.status = 403; ctx.body = { error: "尚未报名，无法评价" }; return; }
    const { rating, nps, review } = ctx.request.body || {};
    if (rating != null && (Number(rating) < 1 || Number(rating) > 5)) {
      ctx.status = 400; ctx.body = { error: "评分须在1-5之间" }; return;
    }
    if (nps != null && (Number(nps) < 0 || Number(nps) > 10)) {
      ctx.status = 400; ctx.body = { error: "NPS须在0-10之间" }; return;
    }
    await strapi.db.query(SIGNS_UID).update({
      where: { id: signup.id },
      data: {
        rating: rating != null ? Number(rating) : signup.rating,
        nps: nps != null ? Number(nps) : signup.nps,
        review: review != null ? String(review) : signup.review,
        reviewedAt: new Date(),
      },
    });
    ctx.body = wrap({ ok: true });
  },

  // POST /adm/activities/:documentId/close （管理员关闭活动并触发活动后 SOP）
  async adminClose(ctx: any) {
    try {
      const result = await activitySvc().closeActivity(ctx.params.documentId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /adm/activities/:documentId/archive      归档 ended 活动(幂等)
  async adminArchive(ctx: any) {
    try {
      const updated = await activitySvc().adminArchive(ctx.params.documentId);
      ctx.body = wrap(updated);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
  // POST /adm/activities/:documentId/unarchive    恢复 archived 活动(幂等)
  async adminUnarchive(ctx: any) {
    try {
      const updated = await activitySvc().adminUnarchive(ctx.params.documentId);
      ctx.body = wrap(updated);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activity-reviews （评价看板：列表 + 汇总；?activityDId= 可过滤）
  async adminReviews(ctx: any) {
    try {
      const { page = "1", pageSize = "20", activityDId } = ctx.query;
      const filter: any = {
        $or: [{ rating: { $notNull: true } }, { review: { $notNull: true } }],
      };
      if (activityDId) {
        const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDId });
        if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
        filter.activity = act.id;
      }
      const result = await strapi.db.query(SIGNS_UID).findPage({
        where: filter,
        populate: { user: true, activity: true },
        orderBy: { reviewedAt: "desc" },
        page: parseInt(page), pageSize: parseInt(pageSize),
      });
      const rows = result?.results ?? [];
      // 汇总
      const all = await strapi.db.query(SIGNS_UID).findMany({ where: filter });
      const count = all.length;
      const withRating = all.filter((r: any) => r.rating != null);
      const withNps = all.filter((r: any) => r.nps != null);
      const avgRating = withRating.length ? withRating.reduce((a: number, r: any) => a + r.rating, 0) / withRating.length : 0;
      const avgNps = withNps.length ? withNps.reduce((a: number, r: any) => a + r.nps, 0) / withNps.length : 0;
      const ratingDist = [0, 0, 0, 0, 0, 0];
      for (const r of withRating) ratingDist[Math.max(0, Math.min(5, r.rating))]++;
      const detractor = withNps.filter((r: any) => r.nps <= 6).length;
      const passive = withNps.filter((r: any) => r.nps >= 7 && r.nps <= 8).length;
      const promoter = withNps.filter((r: any) => r.nps >= 9).length;
      const npsScore = withNps.length ? Math.round(((promoter - detractor) / withNps.length) * 100) : 0;
      // 评分均值趋势：按 ISO 周聚合（最近 TREND_WEEKS 周，升序）；周一为一周起点
      const trend = withReviewedTrend(all);
      // 评价文本关键词：无新依赖的轻量词频（连续汉字/英文词切分 + 停用词过滤，取 TopN）
      const keywords = extractReviewKeywords(rows, 10);
      ctx.body = {
        rows: rows.map((r: any) => ({
          id: r.id,
          user: r.user ? { id: r.user.id, username: r.user.username } : null,
          rating: r.rating ?? null,
          nps: r.nps ?? null,
          review: r.review ?? null,
          reviewedAt: r.reviewedAt,
          activity: r.activity ? { id: r.activity.id, title: r.activity.title } : null,
        })),
        summary: { count, avgRating: Number(avgRating.toFixed(2)), avgNps: Number(avgNps.toFixed(2)), npsScore, ratingDist, detractor, passive, promoter, trend, keywords },
        pagination: result?.pagination ?? {},
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  /** 裂变榜：按 inviter 聚合奖励记录，可筛时间；返回带来报名数/发放积分/明细 */
  async fissionLeaderboard(ctx: any) {
    const { start, end } = ctx.query;
    const where: any = {};
    if (start) where.issuedAt = { $gte: new Date(start).toISOString() };
    if (end) where.issuedAt = { ...(where.issuedAt || {}), $lte: new Date(end).toISOString() };

    const rows = await strapi.db.query("plugin::zhao-point.activity-referral-reward").findMany({
      where,
      populate: { inviter: true, activity: true },
    });

    const map = new Map<number, any>();
    for (const r of rows) {
      const uid = r.inviter?.id ?? r.inviter;
      if (!map.has(uid)) {
        map.set(uid, { inviterId: uid, username: r.inviter?.username ?? `#${uid}`, inviteeCount: 0, totalPoints: 0, details: [] });
      }
      const agg = map.get(uid);
      agg.inviteeCount++;
      agg.totalPoints += r.points || 0;
      agg.details.push({ activity: r.activity?.title ?? `#${r.activity}`, points: r.points || 0, issuedAt: r.issuedAt });
    }

    ctx.body = {
      rows: Array.from(map.values()).sort((a, b) => b.inviteeCount - a.inviteeCount),
      total: rows.length,
    };
  },
  });
};

// ===== 评价看板辅助：评分趋势 + 文本关键词（无新依赖）=====

/** ISO 周号所在周的起始日期（周一） */
function mondayOfWeek(year: number, week: number): Date {
  // ISO 周1 的第一天是 1 月 4 日所在的周一
  const jan4 = new Date(`${year}-01-04T00:00:00`);
  const day = jan4.getDay() || 7; // Sun=0 -> 7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  return monday;
}

/** reviewedAt -> { year, isoWeek }（ISO 8601 周号） */
function isoWeekOf(d: Date): { year: number; week: number } {
  const date = new Date(d.getTime());
  const dayNum = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - dayNum); // 定位到该周周四
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getFullYear(), week };
}

const TREND_WEEKS = 12;

/** 按 ISO 周聚合评分均值/NPS/评价数，返回最近 TREND_WEEKS 周升序（空周补 0），label 为周一起始日期 YYYY-MM-DD */
function withReviewedTrend(all: any[]): { weekLabel: string; count: number; avgRating: number | null; avgNps: number | null }[] {
  const map = new Map<number, { count: number; ratingSum: number; ratingN: number; npsSum: number; npsN: number }>();
  let maxMonday = -Infinity;
  for (const r of all) {
    if (!r.reviewedAt) continue;
    const d = new Date(r.reviewedAt);
    if (isNaN(d.getTime())) continue;
    const { year, week } = isoWeekOf(d);
    const monday = mondayOfWeek(year, week).getTime();
    let agg = map.get(monday);
    if (!agg) { agg = { count: 0, ratingSum: 0, ratingN: 0, npsSum: 0, npsN: 0 }; map.set(monday, agg); }
    agg.count++;
    if (r.rating != null) { agg.ratingSum += r.rating; agg.ratingN++; }
    if (r.nps != null) { agg.npsSum += r.nps; agg.npsN++; }
    if (monday > maxMonday) maxMonday = monday;
  }
  if (map.size === 0) return [];

  const WEEK_MS = 7 * 86400000;
  const start = maxMonday - (TREND_WEEKS - 1) * WEEK_MS;
  const pad = (n: number) => String(n).padStart(2, "0");
  const out: { weekLabel: string; count: number; avgRating: number | null; avgNps: number | null }[] = [];
  for (let cur = start; cur <= maxMonday; cur += WEEK_MS) {
    const agg = map.get(cur);
    const d = new Date(cur);
    out.push({
      weekLabel: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      count: agg?.count || 0,
      avgRating: agg && agg.ratingN ? Number((agg.ratingSum / agg.ratingN).toFixed(2)) : null,
      avgNps: agg && agg.npsN ? Number((agg.npsSum / agg.npsN).toFixed(2)) : null,
    });
  }
  return out;
}

/** 常用中文停用词（精简表，覆盖高频虚词/指代/程度词） */
const REVIEW_STOP_WORDS = new Set([
  "的", "了", "和", "是", "在", "有", "我", "你", "他", "她", "它", "这", "那", "就", "都", "也",
  "很", "还", "会", "能", "被", "把", "给", "一个", "这个", "那个", "我们", "自己", "你们", "他们",
  "但是", "因为", "所以", "然后", "觉得", "感觉", "比较", "特别", "非常", "真的", "还是", "一下",
  "方面", "情况", "可以", "应该", "进行", "开始", "这些", "那些", "下", "中", "上", "为", "与", "及",
  "或", "不", "没", "对", "从", "到", "了也", "的了",
]);

/** 从评价文本提取关键词（连续中文片段 + 英文词，过滤停用词，按词频降序取 TopN） */
function extractReviewKeywords(rows: any[], top: number): { text: string; value: number }[] {
  const counts = new Map<string, number>();
  const add = (w: string) => { if (w && !REVIEW_STOP_WORDS.has(w)) counts.set(w, (counts.get(w) || 0) + 1); };
  for (const r of rows) {
    const t = r?.review;
    if (!t || typeof t !== "string") continue;
    for (const raw of t.match(/[a-zA-Z]{2,}/g) || []) add(raw.toLowerCase());
    // 连续中文片段整体作为候选（评价文本通常为短语，整段提取噪声可控）
    for (const seg of t.match(/[\u4e00-\u9fff]{2,12}/g) || []) add(seg);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
    .slice(0, top)
    .map(([text, value]) => ({ text, value }));
}
import type { Core } from "@strapi/strapi";

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

  return ({
  // ===== 公开 =====

  // GET /activities
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", ...rest } = ctx.query;
      const result = await strapi.documents(ACTIVITY_UID).findMany({
        ...rest,
        filters: { status: { $ne: "draft" } },
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

  // GET /activities/:documentId
  async detail(ctx: any) {
    try {
      const activity = await strapi.documents(ACTIVITY_UID).findOne({
        documentId: ctx.params.documentId,
        populate: "*",
      });
      if (!activity) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
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
      const activityId = ctx.request.body.activityId;
      const result = await activitySvc().signup({ userId, activityId });
      if (result?.ok === false && result.reason === "already_signed_up") {
        ctx.status = 200;
      }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 400;
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
        summary: { count, avgRating: Number(avgRating.toFixed(2)), avgNps: Number(avgNps.toFixed(2)), npsScore, ratingDist, detractor, passive, promoter },
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
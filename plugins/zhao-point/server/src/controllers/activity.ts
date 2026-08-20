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
        attendances = await strapi.db.query(ATT_UID).findMany({ where: { signup: { $in: ids } } });
      }
      for (const row of rows) {
        row.attendance = attendances.find((a: any) => a.signup === row.id) || null;
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
  });
};
import type { Core } from "@strapi/strapi";
import { FormValidationError } from "../services/form";
import { PROMO_MODULE_TYPES, PROMO_TEMPLATES } from "../services/activity";
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
  // 解析当前请求的真实 up_user id。
  // SSO 登录时 ctx.state.user 是 sso_user（含 uuid），需先桥接为业务 up_user 再用作落库
  // （activity_signups.user 关联 plugin::users-permissions.user）。本地登录则直接用 up_user。
  // 解析不到 up_user 时抛 400，避免写入错误 id / 外键失败。
  const getUserId = async (ctx: any) => {
    const u: any = ctx.state.user;
    if (u?.uuid) {
      const ssoProfile = strapi.plugin("zhao-sso")?.service("sso-profile");
      const up = ssoProfile && (await ssoProfile.resolveUpUserForSsoUser(u.id));
      if (!up?.id) {
        const e: any = new Error("未绑定业务账号，请先完善资料");
        e.status = 400;
        throw e;
      }
      return up.id;
    }
    return u.id || u.documentId;
  };
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

/** 宣传页模块归一化（复用 service 同名单逻辑，controller 内独立实现避免循环依赖） */
function normalizePromoModules(promoModules: any): any[] | undefined {
  if (promoModules === undefined || promoModules === null) return undefined;
  if (!Array.isArray(promoModules)) throw new Error("promoModules 必须为数组");
  const seen = new Set<number>();
  const out: any[] = [];
  for (const m of promoModules) {
    if (!m || typeof m !== "object") continue;
    if (!PROMO_MODULE_TYPES.includes(m.type)) continue;
    const sort = Number.isFinite(Number(m.sort)) ? Number(m.sort) : out.length;
    if (seen.has(sort)) continue;
    seen.add(sort);
    out.push({
      type: m.type,
      config: m.config && typeof m.config === "object" && !Array.isArray(m.config) ? m.config : {},
      sort,
    });
  }
  return out.sort((a, b) => a.sort - b.sort);
}

  return ({
  // ===== 公开 =====

  // GET /activities
  async list(ctx: any) {
    try {
      const { page = "1", pageSize = "20", category, search, ...rest } = ctx.query;
      const filters: any = { status: { $notIn: ["draft", "archived"] } };
      // 前端 URLSearchParams 会把 undefined 序列化为字符串 "undefined"，此处防御避免误按该分类过滤
      if (category && category !== "undefined") filters.category = { $eq: category };
      if (search && search !== "undefined") filters.title = { $contains: search };
      const docIds = parseDocumentIds(ctx.query.documentIds);
      if (docIds.length) filters.documentId = { $in: docIds };
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
      await activitySvc().ensureTransitions(ctx.params.documentId);
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
      // 口碑聚合（仅公开评价）
      const reviews = await strapi.db.query(SIGNS_UID).findMany({
        where: { activity: activity.id, status: "active", rating: { $notNull: true }, reviewHidden: { $ne: true } },
        select: ["rating", "review"],
      });
      const withText = reviews.filter((r: any) => r.review && String(r.review).trim());
      activity.ratingSummary = {
        count: reviews.length,
        avgRating: reviews.length ? Number((reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length).toFixed(2)) : 0,
        reviewCount: withText.length,
      };
      activity.archived = activity.status === "archived";
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
      const userId = await getUserId(ctx);
      const { activityId, formData, questionnaireData, chosenRewards } = ctx.request.body || {};
      const result = await activitySvc().signup({ userId, activityId, formData, questionnaireData, chosenRewards });
      if (result?.ok === false && result.reason === "already_signed_up") {
        ctx.status = 200;
        // 已报名：回传既有报名记录 signupId，前端据此渲染「领取更多权益」卡片区（v-if="signedUp && signupId"）
        if (result.signupId == null) {
          const existing = await strapi.db.query(SIGNS_UID).findOne({
            where: { user: userId, activity: { documentId: activityId }, status: "active" },
            select: ["id"],
          });
          if (existing?.id) result.signupId = existing.id;
        }
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

  // PUT /my/activity/signup/:signupId/questionnaire  补填问卷（解锁 survey 条件后可二次领取）
  async questionnaire(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const signupId = parseInt(ctx.params.signupId, 10);
      const { answers } = ctx.request.body || {};
      const result = await activitySvc().fillQuestionnaire({ userId, signupId, answers });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /my/activity/signup/:signupId/contact  补填联系方式（解锁 contact 条件 + 补发 +20）
  async contact(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const signupId = parseInt(ctx.params.signupId, 10);
      const { formData } = ctx.request.body || {};
      const result = await activitySvc().fillContact({ userId, signupId, formData });
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

  // PUT /my/activity/signup/:signupId/subscribe  补领关注（补发 +50，幂等）
  async subscribe(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const signupId = parseInt(ctx.params.signupId, 10);
      const result = await activitySvc().claimSubscribe({ userId, signupId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /my/activity/:documentId/follow-qrcode  用户关注公众号临时带参二维码
  async getFollowQrcode(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const documentId = ctx.params.documentId;
      if (!documentId) {
        ctx.status = 400;
        ctx.body = wrap({ ok: false, reason: "missing_documentId" });
        return;
      }
      const result = await activitySvc().getFollowQrcode({ userId, activityId: documentId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 500;
      ctx.body = { error: e.message || "生成关注二维码失败" };
    }
  },

  // GET /my/activity/signup/:signupId/unlock-status  报名后权益状态（卡片区三态）
  async signupUnlockStatus(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const signupId = parseInt(ctx.params.signupId, 10);
      const result = await activitySvc().signupUnlockStatus({ userId, signupId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/unlock-check  解锁状态探测（报名前/关注后刷新）
  async unlockCheck(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const { formData, questionnaireData } = ctx.request.body || {};
      const result = await activitySvc().unlockCheck({
        userId, activityDocumentId: ctx.params.documentId, formData, questionnaireData,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /promo/activity/:documentId  宣传页聚合（公开，可匿名；登录则带上报名状态）
  async promoDetail(ctx: any) {
    try {
      await activitySvc().ensureTransitions(ctx.params.documentId);
      const result = await activitySvc().promoDetail({
        activityDocumentId: ctx.params.documentId,
        userId: ctx.state.user?.id,
        siteDocumentId: ctx.state?.siteDocumentId,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/message  用户留言
  async sendMessage(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const { content } = ctx.request.body || {};
      const result = await activitySvc().sendMessage({ userId, activityDocumentId: ctx.params.documentId, content });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /my/activity/:documentId/messages  我的留言+回复
  async listMessages(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const result = await activitySvc().listMyMessages({ userId, activityDocumentId: ctx.params.documentId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /adm/activity-messages  运营端留言列表（?activity=&status=&page=&pageSize=）
  async adminListMessages(ctx: any) {
    try {
      const { activity, status, page = "1", pageSize = "20" } = ctx.query;
      const result = await activitySvc().adminListMessages({
        activity: activity as string | undefined,
        status: status as string | undefined,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /adm/activity-messages/:documentId/reply  运营回复
  async adminReplyMessage(ctx: any) {
    try {
      const { reply } = ctx.request.body || {};
      const result = await activitySvc().adminReplyMessage({
        messageDocumentId: ctx.params.documentId,
        reply: reply as string | undefined,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/cancel
  async cancel(ctx: any) {
    try {
      const userId = await getUserId(ctx);
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
      const userId = await getUserId(ctx);
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
      await activitySvc().drainDueActivities();
      const userId = await getUserId(ctx);
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
        if (row.status === "waiting") {
          row.position = await activitySvc().waitlistPositionOf(row.activity?.id ?? row.activity, row);
        }
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
      await activitySvc().drainDueActivities();
      const { page = "1", pageSize = "20", status, ...rest } = ctx.query;
      const filters: any = {};
      if (status) filters.status = status;
      const docIds = parseDocumentIds(ctx.query.documentIds);
      if (docIds.length) filters.documentId = { $in: docIds };
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
      // 宣传页配置校验与归一化（非法 type / sort 冲突自动过滤，不阻断合法字段保存）
      if (body.promoModules !== undefined) body.promoModules = normalizePromoModules(body.promoModules);
      if (body.promoTemplate !== undefined && !PROMO_TEMPLATES.includes(body.promoTemplate)) {
        throw new Error("promoTemplate 非法");
      }
      if (body.promoContact !== undefined && body.promoContact !== null) {
        if (typeof body.promoContact !== "object" || Array.isArray(body.promoContact)) {
          throw new Error("promoContact 必须为对象或 null");
        }
      }
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
      // 时间关系校验（报名结束晚于报名开始、活动结束晚于活动开始）
      if (body.signupStart && body.signupEnd && new Date(body.signupEnd) <= new Date(body.signupStart)) {
        ctx.status = 400; ctx.body = { error: "报名结束时间必须晚于报名开始时间" }; return;
      }
      if (body.startTime && body.endTime && new Date(body.endTime) <= new Date(body.startTime)) {
        ctx.status = 400; ctx.body = { error: "活动结束时间必须晚于活动开始时间" }; return;
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
      // 宣传页配置校验与归一化（非法 type / sort 冲突自动过滤，不阻断合法字段保存）
      if (body.promoModules !== undefined) body.promoModules = normalizePromoModules(body.promoModules);
      if (body.promoTemplate !== undefined && !PROMO_TEMPLATES.includes(body.promoTemplate)) {
        throw new Error("promoTemplate 非法");
      }
      if (body.promoContact !== undefined && body.promoContact !== null) {
        if (typeof body.promoContact !== "object" || Array.isArray(body.promoContact)) {
          throw new Error("promoContact 必须为对象或 null");
        }
      }
      const existing = await strapi.documents(ACTIVITY_UID).findOne({ documentId: ctx.params.documentId, populate: { lecturer: true, venue: true } });
      if (!existing) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
      const startTime = body.startTime ?? existing.startTime;
      const endTime = body.endTime ?? existing.endTime;
      const lecturerId = relId(body.lecturer) ?? relId(existing.lecturer);
      const venueId = relId(body.venue) ?? relId(existing.venue);
      // 时间关系校验（含 existing 兜底）
      const signupStart = body.signupStart ?? existing.signupStart;
      const signupEnd = body.signupEnd ?? existing.signupEnd;
      if (signupStart && signupEnd && new Date(signupEnd) <= new Date(signupStart)) {
        ctx.status = 400; ctx.body = { error: "报名结束时间必须晚于报名开始时间" }; return;
      }
      if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        ctx.status = 400; ctx.body = { error: "活动结束时间必须晚于活动开始时间" }; return;
      }
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
    const userId = await getUserId(ctx);
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

  // GET /activities/:documentId/reviews  C 端公开评价列表+聚合
  async listReviews(ctx: any) {
    try {
      const result = await activitySvc().listPublicReviews({
        activityDocumentId: ctx.params.documentId,
        page: parseInt(ctx.query.page || "1"),
        pageSize: parseInt(ctx.query.pageSize || "20"),
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // GET /my/activity/:documentId/learning  已解锁学习内容
  async learningContent(ctx: any) {
    try {
      const userId = await getUserId(ctx);
      const result = await activitySvc().getLearningContent({
        userId,
        activityDocumentId: ctx.params.documentId,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // PUT /adm/activity-reviews/:signupId/hidden  body:{hidden:boolean}  评价隐藏/恢复
  async adminToggleReviewHidden(ctx: any) {
    try {
      const { signupId } = ctx.params;
      const { hidden } = ctx.request.body || {};
      await strapi.db.query(SIGNS_UID).update({
        where: { id: Number(signupId) },
        data: { reviewHidden: !!hidden },
      });
      ctx.body = wrap({ ok: true, hidden: !!hidden });
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
          reviewHidden: r.reviewHidden ?? false,
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

function parseDocumentIds(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => parseDocumentIds(x));
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
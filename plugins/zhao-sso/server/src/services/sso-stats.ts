import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
const REPURCHASE_SIGNS_UID = "plugin::zhao-point.activity-signup";
const COURSE_ENROLL_UID = "plugin::zhao-course.course-enrollment";
const COURSE_PROGRESS_UID = "plugin::zhao-course.course-progress";
const DATE_MS = 86400000;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSopStats(opts: { from?: string; to?: string; scene?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const range = { createdAt: { $gte: from, $lte: to } };

    const rules = await strapi.db.query(SOP_RULE_UID).findMany({});
    const ruleByScene = new Map<string, any[]>();
    for (const r of rules) {
      if (!ruleByScene.has(r.scene)) ruleByScene.set(r.scene, []);
      ruleByScene.get(r.scene)!.push(r);
    }

    const sceneSet = new Set<string>([...ruleByScene.keys()]);
    if (opts.scene) {
      sceneSet.add(opts.scene);
    } else {
      // 无 scene 筛选时，补齐仅存在 job 的 scene（无对应 sop-rule 的独立场景也要进漏斗）
      const jobScenes = await strapi.db.query(MSG_JOB_UID).findMany({ select: ["scene"] });
      for (const s of jobScenes) sceneSet.add(s.scene);
    }
    const scenes = Array.from(sceneSet).filter((s) => (opts.scene ? s === opts.scene : true));

    const countBy = (scene: string, status?: string) =>
      status
        ? strapi.db.query(MSG_JOB_UID).count({ where: { scene, status, ...range } })
        : strapi.db.query(MSG_JOB_UID).count({ where: { scene, ...range } });

    const rows: any[] = [];
    const summary = { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, pending: 0, sentRate: 0 };

    for (const s of scenes) {
      const [total, sent, failed, quota, pending, cancelled] = await Promise.all([
        countBy(s), countBy(s, "sent"), countBy(s, "failed"), countBy(s, "quota_limited"), countBy(s, "pending"), countBy(s, "cancelled"),
      ]);

      let clicks = 0;
      const ruleList = ruleByScene.get(s) || [];
      for (const r of ruleList) {
        if (!r.templateCode) continue;
        const tpl = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { code: r.templateCode } });
        if (!tpl) continue;
        const vers = await strapi.db.query(MSG_VERSION_UID).findMany({ where: { template: tpl.id } });
        for (const v of vers) clicks += v.clickCount || 0;
      }

      const sentRate = total ? Math.round((sent / total) * 100) : 0;
      rows.push({
        scene: s,
        rules: ruleList.map((r) => ({ code: r.code, name: r.name ?? null, templateCode: r.templateCode ?? null, source: r.source ?? null })),
        total, sent, failed, quotaLimited: quota, pending, cancelled, sentRate, clicks,
      });
      summary.sceneCount += 1;
      summary.total += total; summary.sent += sent; summary.failed += failed;
      summary.quotaLimited += quota; summary.pending += pending;
    }
    summary.sentRate = summary.total ? Math.round((summary.sent / summary.total) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), summary, rows };
  },

  async getRepurchaseStats(opts: { from?: string; to?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    // 区间内送达的复购触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "activity.repurchase", status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } },
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = new Set<number>();
    let conversions = 0;

    for (const j of jobs) {
      // user 可能为 populate 返回的对象 {id}，或未被 populate 时的裸 id
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(REPURCHASE_SIGNS_UID).count({
        where: { user: userId, status: "active", signupAt: { $gt: from2, $lte: to2 } },
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },

  async getCourseD7Stats(opts: { from?: string; to?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    // 窗口天数：scene=course.d7 的 rule.conversionWindowDays ?? 7（D7）
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    // 区间内送达的课后 D7 触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "course.d7", status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } },
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = new Set<number>();
    let conversions = 0;

    for (const j of jobs) {
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      // 窗口内再报新课（status=enrolled）计为转化
      const cnt = await strapi.db.query(COURSE_ENROLL_UID).count({
        where: { user: userId, status: "enrolled", enrolledAt: { $gt: from2, $lte: to2 } },
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },

  async getCourseCompletionStats(opts: { from?: string; to?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    // 窗口天数：scene=course.d7 的 rule.conversionWindowDays ?? 7
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    // 区间内送达的课内/课后触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: { $in: ["course.d7", "course.activate"] }, status: "sent", sentAt: { $gte: from, $lte: to } },
      populate: { user: { select: ["id"] } },
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = new Set<number>();
    let conversions = 0;

    for (const j of jobs) {
      const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
      if (!ssoUserId) continue;
      const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      // 窗口内课程完课（isCompleted=true 且 completedAt 落在窗口内）计为转化
      const cnt = await strapi.db.query(COURSE_PROGRESS_UID).count({
        where: { user: userId, isCompleted: true, completedAt: { $gt: from2, $lte: to2 } },
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },

  async getRepurchaseLeads(opts: { from?: string; to?: string; page?: number; pageSize?: number; status?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const page = Number(opts.page) || 1;
    const pageSize = Number(opts.pageSize) || 20;
    // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    const base: any = { sentAt: { $gte: from, $lte: to } };
    let where: any = { scene: "activity.repurchase", ...base };
    if (opts.status) {
      if (opts.status === "none") {
        // none=未跟进: 本轮语境下指未标记 followed/deal 的记录(默认为 NULL 或 'none'), 用顶层 $or 兼容空值
        where = {
          $and: [{ scene: "activity.repurchase" }, base, { $or: [{ followStatus: "none" }, { followStatus: { $null: true } }] }],
        };
      } else {
        where.followStatus = opts.status;
      }
    }

    const result = await strapi.db.query(MSG_JOB_UID).findPage({
      where,
      populate: { user: true },
      orderBy: { sentAt: "desc" },
      page,
      pageSize,
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const summary = { total: 0, followed: 0, deal: 0 };

    const rows: any[] = [];
    for (const j of result?.results ?? []) {
      summary.total += 1;
      if (j.followStatus === "followed") summary.followed += 1;
      if (j.followStatus === "deal") summary.deal += 1;

      const userObj = typeof j.user === "object" && j.user ? j.user : null;
      const ssoUserId = userObj ? userObj.id : j.user;
      let upId: number | null = null;
      if (ssoUserId) {
        const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
        upId = up?.id ?? null;
      }
      let reorderedCount = 0;
      if (upId) {
        const touchTime = j.sentAt || j.scheduledAt || j.createdAt;
        if (touchTime) {
          reorderedCount = await strapi.db.query(REPURCHASE_SIGNS_UID).count({
            where: { user: upId, status: "active", signupAt: { $gte: new Date(touchTime), $lte: new Date(new Date(touchTime).getTime() + windowMs) } },
          });
        }
      }
      rows.push({
        id: j.id,
        status: j.status,
        followStatus: j.followStatus ?? "none",
        followRemark: j.followRemark ?? null,
        touchTime: j.sentAt || j.scheduledAt || j.createdAt || null,
        windowDays,
        reorderedCount,
        user: {
          id: userObj?.id ?? ssoUserId,
          upId,
          username: userObj?.username ?? null,
          mobile: userObj?.mobile ?? null,
          email: userObj?.email ?? null,
        },
      });
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      windowDays,
      summary,
      pagination: result?.pagination ?? {},
      rows,
    };
  },

  async updateRepurchaseFollow({ jobId, status, remark }: { jobId: number; status: string; remark?: string }) {
    if (!["none", "followed", "deal"].includes(status)) {
      const err: any = new Error("status 必须是 none/followed/deal 之一");
      err.status = 400;
      throw err;
    }
    const existing: any = await strapi.db.query(MSG_JOB_UID).findOne({ where: { id: jobId } });
    if (!existing) {
      const err: any = new Error("msg-job 不存在");
      err.status = 404;
      throw err;
    }
    const updated = await strapi.db.query(MSG_JOB_UID).update({
      where: { id: jobId },
      data: { followStatus: status, ...(remark !== undefined ? { followRemark: remark } : {}) },
    });
    return updated;
  },
});
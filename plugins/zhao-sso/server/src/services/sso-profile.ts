import type { Core } from "@strapi/strapi";

const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const UP_USER_UID = "plugin::users-permissions.user";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const VISIT_LOG_UID = "plugin::zhao-website.visit-log";
const ARTICLE_UID = "plugin::zhao-website.article";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const REDEMPTION_UID = "plugin::zhao-point.point-redemption";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** sso-user → up_user 反向桥接（按标识匹配；匹配不到返回 null） */
  async resolveUpUserForSsoUser(ssoUserId: number) {
    const sso = await strapi.db.query(SSO_USER_UID).findOne({
      where: { id: ssoUserId },
      select: ["id", "username", "email", "mobile"],
    });
    if (!sso) return null;
    const or: any[] = [];
    if (sso.username) or.push({ username: sso.username });
    if (sso.email) or.push({ email: String(sso.email).toLowerCase() });
    if (sso.mobile) or.push({ mobile: sso.mobile });
    if (!or.length) return null;
    return strapi.db.query(UP_USER_UID).findOne({ where: { $or: or } });
  },

  /** 实时聚合六维画像（不落库） */
  async calculateProfile(ssoUserId: number) {
    const up = await this.resolveUpUserForSsoUser(ssoUserId);
    const zero = { activity: 0, reading: 0, completion: 0, attendance: 0, payment: 0, interests: [] };
    if (!up) return { ...zero, user: ssoUserId, upUser: null, hasData: false };
    const userId = up.id;
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // 活跃度：近30天学习课时数 + 文章访问数
    const [lp30, visit30] = await Promise.all([
      strapi.db.query(LESSON_PROGRESS_UID).count({ where: { user: userId, lastStudyAt: { $gte: days30 } } }),
      strapi.db.query(VISIT_LOG_UID).count({ where: { userId, createdAt: { $gte: days30 } } }),
    ]);
    const activity = clamp(lp30 * 10 + visit30 * 3);

    // 阅读深度：article_view 次数 + 平均停留
    const reads = await strapi.db.query(VISIT_LOG_UID).findMany({
      where: { userId, type: "article_view" },
      select: ["id", "dwellTime", "scrollDepth"],
      limit: 200,
    });
    const avgDwell = reads.length ? reads.reduce((s: number, r: any) => s + (r.dwellTime || 0), 0) / reads.length : 0;
    const reading = clamp(Math.min(reads.length, 20) * 3 + (Math.min(avgDwell, 120) / 120) * 40);

    // 完课率：完成课时占比 + 答题正确率
    const allLp = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId },
      select: ["isCompleted", "isCorrect"],
      limit: 500,
    });
    const done = allLp.filter((r: any) => r.isCompleted).length;
    const correct = allLp.filter((r: any) => r.isCorrect === true).length;
    const completion = clamp((allLp.length ? done / allLp.length : 0) * 60 + (correct ? correct / Math.max(allLp.length, 1) : 0) * 40);

    // 到场意愿：报名数 + 到场率
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { user: userId },
      select: ["attendedAt", "status"],
      limit: 100,
    });
    const activeSigns = signs.filter((s: any) => s.status !== "cancelled");
    const attended = activeSigns.filter((s: any) => s.attendedAt).length;
    const attendance = clamp(activeSigns.length * 10 + (activeSigns.length ? (attended / activeSigns.length) * 50 : 0));

    // 付费潜力：付费/积分购课次数 + 兑换
    const [paid, points] = await Promise.all([
      strapi.db.query(ENROLL_UID).count({ where: { user: userId, enrollType: { $in: ["paid", "points"] } } }),
      strapi.db.query(REDEMPTION_UID).count({ where: { user: userId } }).catch(() => 0),
    ]);
    const payment = clamp(paid * 30 + points * 15);

    // 兴趣：近30天课程/文章分类 + 活动类型频次 top3
    const interests = await this.collectInterests(userId);

    return { activity, reading, completion, attendance, payment, interests, user: ssoUserId, upUser: up, hasData: true };
  },

  /** 兴趣标签：近30天 课程分类/文章分类/活动类型 频次 top3（跨来源同名合并） */
  async collectInterests(userId: number) {
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const counts: Record<string, number> = {};

    // 1) 课程分类：lesson-progress → course → category（去重：一课程计 1 次）
    const lps = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId, lastStudyAt: { $gte: days30 } },
      populate: { course: { select: ["id"], populate: { category: { select: ["name"] } } } },
      limit: 500,
    });
    const courseCats = new Map<number, string>();
    for (const lp of lps) {
      const c = lp.course;
      if (c?.id && c.category?.name) courseCats.set(c.id, c.category.name);
    }
    for (const name of courseCats.values()) counts[name] = (counts[name] || 0) + 1;

    // 2) 文章分类：visit-log(targetId=article documentId) → article → category（去重）
    const reads = await strapi.db.query(VISIT_LOG_UID).findMany({
      where: { userId, type: "article_view", createdAt: { $gte: days30 } },
      select: ["targetId"],
      limit: 300,
    });
    const docIds = [...new Set(reads.map((r: any) => r.targetId).filter(Boolean))].slice(0, 200);
    if (docIds.length) {
      const articles = await strapi.db.query(ARTICLE_UID).findMany({
        where: { documentId: { $in: docIds } },
        populate: { category: { select: ["name"] } },
        limit: 200,
      });
      console.log("[debug-interests] articles", articles.map((a: any) => ({ id: a.id, doc: a.documentId, cat: a.category?.name })));
      const seenCats = new Set<string>();
      for (const a of articles) {
        if (a.category?.name && !seenCats.has(a.category.name)) {
          seenCats.add(a.category.name);
          counts[a.category.name] = (counts[a.category.name] || 0) + 1;
        }
      }
    }

    // 3) 活动类型：activity-signup → activity.type（去重，忽略"其他"）
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { user: userId, signupAt: { $gte: days30 } },
      populate: { activity: { select: ["id", "type"] } },
      limit: 200,
    });
    const actTypes = new Map<number, string>();
    for (const s of signs) {
      const a = s.activity;
      if (a?.id && a.type && a.type !== "其他") actTypes.set(a.id, a.type);
    }
    for (const t of actTypes.values()) counts[t] = (counts[t] || 0) + 1;

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  },

  /** 加权打分 + 分层 */
  segmentOf(profile: any) {
    const score = clamp(
      (profile.completion || 0) * 0.25 + (profile.payment || 0) * 0.25
      + (profile.activity || 0) * 0.2 + (profile.attendance || 0) * 0.15 + (profile.reading || 0) * 0.15
    );
    const segment = score >= 80 ? "S" : score >= 60 ? "A" : score >= 40 ? "B" : "C";
    const reason = profile.hasData === false ? "无行为数据" : `综合分${score}（完课${profile.completion}/付费${profile.payment}/活跃${profile.activity}）`;
    return { segment, segmentScore: score, segmentReason: reason };
  },

  /** 详情：实时聚合 + 打分 + 落库 sso-user-profile */
  async getProfile(ssoUserId: number) {
    const profile = await this.calculateProfile(ssoUserId);
    const seg = this.segmentOf(profile);
    const existing = await strapi.db.query(PROFILE_UID).findOne({ where: { user: ssoUserId } });
    const data = {
      segment: seg.segment,
      segmentScore: seg.segmentScore,
      segmentReason: seg.segmentReason,
      dimensions: { ...profile },
      lastCalculatedAt: new Date(),
    };
    if (existing) await strapi.db.query(PROFILE_UID).update({ where: { id: existing.id }, data });
    else await strapi.db.query(PROFILE_UID).create({ data: { ...data, user: ssoUserId } });
    return { ...profile, ...seg };
  },

  /** 批量重算：遍历 up_users → sso-user → getProfile */
  async recalcAll(limit = 500) {
    const upUsers = await strapi.db.query(UP_USER_UID).findMany({
      select: ["id", "username", "email"],
      limit,
    });
    let n = 0;
    let sso = 0;
    for (const u of upUsers) {
      const ssoUser = await strapi.db.query(SSO_USER_UID).findOne({
        where: {
          $or: ([] as any[]).concat(
            u.username ? [{ username: u.username }] : [],
            u.email ? [{ email: String(u.email).toLowerCase() }] : [],
            u.mobile ? [{ mobile: u.mobile }] : []
          ),
        },
      });
      if (!ssoUser) continue;
      await this.getProfile(ssoUser.id);
      sso++;
      n++;
    }
    return { scanned: upUsers.length, calculated: n, matchedSso: sso };
  },
});

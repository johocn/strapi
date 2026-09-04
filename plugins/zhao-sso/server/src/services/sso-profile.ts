import type { Core } from "@strapi/strapi";

const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** 只读门面（隔离：不直查他域表，经对应插件 service 调用） */
function authGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-auth")?.service?.("auth")) || null;
}

function thirdGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-third")?.service?.("third-party-account")) || null;
}

function websiteGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-website")?.service?.("gate")) || null;
}

function courseGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-course")?.service?.("gate")) || null;
}

function pointGate(strapi: any): any {
  return (strapi.plugin && strapi.plugin("zhao-point")?.service?.("gate")) || null;
}

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
    if (or.length) {
      const hit = authGate(strapi)?.findUpUserByMatch ? await authGate(strapi).findUpUserByMatch(or) : null;
      if (hit) return hit;
    }
    // 兜底：SSO 生成的 username（wx_昵称_uuid）与三方登录 username 不一致，
    // 同一微信走 SSO/三方两条路径易被拆成多个 up_user。
    // 用微信 openid/union_id 反查三方登录账号，命中同一人即返回其 up_user。
    const bindings = await strapi.db.query(BINDING_UID).findMany({
      where: { user: ssoUserId },
      select: ["provider_user_id", "provider_union_id"],
    });
    for (const b of bindings) {
      const conds = [
        b.provider_user_id ? { openId: b.provider_user_id } : null,
        b.provider_union_id ? { unionId: b.provider_union_id } : null,
      ].filter(Boolean);
      if (!conds.length) continue;
      const matches: any[] = thirdGate(strapi)?.findAccounts
        ? (await thirdGate(strapi).findAccounts({ $or: conds })) || []
        : [];
      const acct = matches.find((a: any) => a.user) || matches[0];
      if (acct?.user?.id) return acct.user;
    }
    return null;
  },

  /** 实时聚合六维画像（不落库） */
  async calculateProfile(ssoUserId: number) {
    const up = await this.resolveUpUserForSsoUser(ssoUserId);
    const zero = { activity: 0, reading: 0, completion: 0, attendance: 0, payment: 0, interests: [] };
    if (!up) return { ...zero, user: ssoUserId, upUser: null, hasData: false };
    const userId = up.id;
    const days30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // 活跃度：近30天学习课时数 + 文章访问数（课时读经课程门面）
    const g = websiteGate(strapi);
    const cg = courseGate(strapi);
    const pg = pointGate(strapi);
    const lp30 = cg?.countActiveLessons ? await cg.countActiveLessons(userId, days30) : 0;
    const visit30 = g?.countActive ? await g.countActive(userId, days30) : 0;
    const activity = clamp(lp30 * 10 + visit30 * 3);

    // 阅读深度：article_view 次数 + 平均停留
    const reads = g?.listArticleReads ? await g.listArticleReads(userId, { limit: 200 }) : [];
    const avgDwell = reads.length ? reads.reduce((s: number, r: any) => s + (r.dwellTime || 0), 0) / reads.length : 0;
    const reading = clamp(Math.min(reads.length, 20) * 3 + (Math.min(avgDwell, 120) / 120) * 40);

    // 完课率：完成课时占比 + 答题正确率
    const allLp = cg?.listLessonProgress ? await cg.listLessonProgress(userId, { limit: 500 }) : [];
    const done = allLp.filter((r: any) => r.isCompleted).length;
    const correct = allLp.filter((r: any) => r.isCorrect === true).length;
    const completion = clamp((allLp.length ? done / allLp.length : 0) * 60 + (correct ? correct / Math.max(allLp.length, 1) : 0) * 40);

    // 到场意愿：报名数 + 到场率（经积分/活动门面）
    const signs = pg?.listSignups ? await pg.listSignups(userId, { limit: 100 }) : [];
    const activeSigns = signs.filter((s: any) => s.status !== "cancelled");
    const attended = activeSigns.filter((s: any) => s.attendedAt).length;
    const attendance = clamp(activeSigns.length * 10 + (activeSigns.length ? (attended / activeSigns.length) * 50 : 0));

    // 付费潜力：付费/积分购课次数 + 兑换
    const [paid, points] = await Promise.all([
      cg?.countPaidEnrolls ? cg.countPaidEnrolls(userId) : 0,
      pg?.countRedemptions ? pg.countRedemptions(userId) : 0,
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

    // 1) 课程分类：lesson-progress → course → category（去重：一课程计 1 次）——经课程门面
    const cg = courseGate(strapi);
    for (const name of cg?.collectCourseInterests ? await cg.collectCourseInterests(userId, { since: days30 }) : []) {
      counts[name] = (counts[name] || 0) + 1;
    }

    // 2) 文章分类：visit-log(targetId=article documentId) → article → category（去重）——经 zhao-website 门面
    const g2 = websiteGate(strapi);
    const cats = g2?.collectArticleCategories
      ? await g2.collectArticleCategories(userId, { since: days30 })
      : [];
    for (const name of cats) counts[name] = (counts[name] || 0) + 1;

    // 3) 活动类型：activity-signup → activity.type（去重，忽略"其他"）——经积分/活动门面
    const pg = pointGate(strapi);
    for (const t of pg?.collectActivityTypes ? await pg.collectActivityTypes(userId, { since: days30 }) : []) {
      counts[t] = (counts[t] || 0) + 1;
    }

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
    const g = authGate(strapi);
    const upUsers = g?.listUpUsers ? await g.listUpUsers({ select: ["id", "username", "email"], limit }) : [];
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

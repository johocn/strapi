import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const REWARD_UID = "plugin::zhao-point.activity-referral-reward";
const POINT_RECORD_UID = "plugin::zhao-point.point-record";

const STATUS_LIST = ["draft", "signup_open", "ongoing", "ended"];

const round2 = (n: number) => Math.round(n * 100) / 100;

// 按关联字段（可能为对象或 id）索引
function indexBy(rows: any[], key: string): Map<number, any[]> {
  const m = new Map<number, any[]>();
  for (const r of rows) {
    const k = r[key] && typeof r[key] === "object" ? r[key].id : r[key];
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 活动效果总览：报名-到场-评价漏斗 + 积分成本/收益 + 裂变转化。
   * 纯查询不落库；活动/系列双分组；status 过滤（all|draft|signup_open|ongoing|ended）。
   */
  async getOverview({ status }: { status?: string } = {}) {
    const statusFilter =
      status && status !== "all" && STATUS_LIST.includes(status) ? status : undefined;

    const acts = await strapi.db.query(ACTIVITY_UID).findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      populate: { belongsToSeries: true },
    });
    if (!acts.length) {
      return {
        summary: {
          activityCount: 0, signupCount: 0, attendedCount: 0, attendanceRate: 0,
          reviewCount: 0, avgRating: 0, avgNps: 0,
          pointsChargedSum: 0, referralPoints: 0, referralCount: 0, attendPointsGlobal: 0,
        },
        rows: [],
      };
    }

    const actIds = acts.map((a: any) => a.id);
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: { $in: actIds } },
      populate: { user: true },
    });
    const rewards = await strapi.db.query(REWARD_UID).findMany({
      where: { activity: { $in: actIds } },
      populate: { inviter: true },
    });
    const signByAct = indexBy(signs, "activity");
    const rewardByAct = indexBy(rewards, "activity");

    const computeStats = (signList: any[], rewardList: any[]) => {
      const active = signList.filter((s) => s.status === "active");
      const attended = active.filter((s) => !!s.attendedAt);
      const reviewed = signList.filter((s) => !!s.reviewedAt);
      const rated = reviewed.filter((s) => s.rating != null);
      const npsd = reviewed.filter((s) => s.nps != null);
      return {
        signupCount: active.length,
        attendedCount: attended.length,
        attendanceRate: active.length ? round2((attended.length / active.length) * 100) : 0,
        waitingCount: signList.filter((s) => s.status === "waiting").length,
        cancelledCount: signList.filter((s) => s.status === "cancelled").length,
        reviewCount: reviewed.length,
        avgRating: rated.length ? round2(rated.reduce((a, s) => a + s.rating, 0) / rated.length) : 0,
        avgNps: npsd.length ? round2(npsd.reduce((a, s) => a + s.nps, 0) / npsd.length) : 0,
        pointsChargedSum: active.reduce((a, s) => a + (s.pointsCharged || 0), 0),
        referralPoints: rewardList.reduce((a, r) => a + (r.points || 0), 0),
        referralCount: rewardList.length,
      };
    };

    // 活动/系列归组：有 belongsToSeries 的并入系列行；无系列独立成行
    const seriesMap = new Map<number, { series: any; items: any[] }>();
    const standalone: any[] = [];
    for (const a of acts) {
      const sid = a.belongsToSeries?.id;
      if (sid != null) {
        if (!seriesMap.has(sid)) seriesMap.set(sid, { series: a.belongsToSeries, items: [] });
        seriesMap.get(sid)!.items.push(a);
      } else {
        standalone.push(a);
      }
    }

    const sortByTimeDesc = (x: any, y: any) =>
      (new Date(y.startTime).getTime() || 0) - (new Date(x.startTime).getTime() || 0);

    const seriesRows: any[] = [];
    for (const { series, items } of seriesMap.values()) {
      const itemIds = new Set(items.map((i) => i.id));
      const signsList = signs.filter((s) => itemIds.has(s.activity));
      const rewardList = rewards.filter((r) => itemIds.has(r.activity));
      seriesRows.push({
        type: "series",
        documentId: series.documentId,
        title: series.title,
        status: null,
        startTime: items.map((i) => i.startTime).filter(Boolean).sort().pop() ?? null,
        ...computeStats(signsList, rewardList),
        detail: items.map((i) => {
          const st = computeStats(signByAct.get(i.id) || [], rewardByAct.get(i.id) || []);
          return {
            documentId: i.documentId,
            title: i.title,
            startTime: i.startTime,
            signupCount: st.signupCount,
            attendedCount: st.attendedCount,
            reviewCount: st.reviewCount,
            avgRating: st.avgRating,
            avgNps: st.avgNps,
            referralCount: st.referralCount,
          };
        }),
      });
    }
    seriesRows.sort(sortByTimeDesc);

    const actRows = standalone.map((a) => {
      const signList = signByAct.get(a.id) || [];
      const rewardList = rewardByAct.get(a.id) || [];
      const reviewed = signList.filter((s) => !!s.reviewedAt);
      // 裂变推荐按 inviter 聚合
      const referrerMap = new Map<number, any>();
      for (const r of rewardList) {
        const uid = r.inviter?.id ?? r.inviter;
        if (uid == null) continue;
        if (!referrerMap.has(uid)) {
          referrerMap.set(uid, { userName: r.inviter?.username ?? `#${uid}`, inviteeCount: 0, points: 0 });
        }
        const g = referrerMap.get(uid)!;
        g.inviteeCount++;
        g.points += r.points || 0;
      }
      const activeSigns = signList.filter((s) => s.status === "active");
      return {
        type: "activity",
        documentId: a.documentId,
        title: a.title,
        status: a.status,
        startTime: a.startTime,
        seriesId: null,
        ...computeStats(signList, rewardList),
        detail: {
          reviews: reviewed.map((s) => ({
            userName: s.user?.username ?? `#${s.user?.id ?? s.user}`,
            rating: s.rating ?? null,
            nps: s.nps ?? null,
            review: s.review ?? null,
            reviewedAt: s.reviewedAt,
          })),
          referrers: Array.from(referrerMap.values()).sort((x, y) => y.inviteeCount - x.inviteeCount),
          signups: activeSigns.slice(0, 50).map((s) => ({
            userName: s.user?.username ?? `#${s.user?.id ?? s.user}`,
            status: s.status,
            attendedAt: s.attendedAt,
          })),
          signupTotal: activeSigns.length,
        },
      };
    });
    actRows.sort(sortByTimeDesc);

    const allStats = computeStats(signs, rewards);
    const attendRecords = await strapi.db.query(POINT_RECORD_UID).findMany({
      where: { source: "activity", method: "activity_attend" },
    });

    return {
      summary: {
        activityCount: acts.length,
        signupCount: allStats.signupCount,
        attendedCount: allStats.attendedCount,
        attendanceRate: allStats.attendanceRate,
        reviewCount: allStats.reviewCount,
        avgRating: allStats.avgRating,
        avgNps: allStats.avgNps,
        pointsChargedSum: allStats.pointsChargedSum,
        referralPoints: allStats.referralPoints,
        referralCount: allStats.referralCount,
        attendPointsGlobal: attendRecords.reduce((a, r) => a + (r.points || 0), 0),
      },
      rows: [...seriesRows, ...actRows],
    };
  },
});

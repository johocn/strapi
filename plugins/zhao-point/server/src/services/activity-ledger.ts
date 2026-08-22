import type { Core } from "@strapi/strapi";

const LEDGER_UID = "plugin::zhao-point.activity-ledger";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";
const REF_UID = "plugin::zhao-point.activity-referral-reward";
const ACTIVITY_UID = "plugin::zhao-point.activity";

function userName(u: any): string {
  return u?.username || u?.phone || u?.email || String(u?.id ?? "");
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 计算一场活动的四项对账数值 + 明细。自动触发与手动触发共用。
   * @param activityId activity 的 documentId
   * @param source 'auto' | 'manual'
   */
  async generate(activityId: string, source: "auto" | "manual" = "manual") {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");

    // 四项口径
    // 1) 应收报名积分：active 报名 pointsCharged 求和
    const activeSigns = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active" },
      populate: { user: true },
    });
    const revenuePoints = (activeSigns || []).reduce((s, x) => s + (Number(x.pointsCharged) || 0), 0);

    // 3) 裂变奖励积分：activity_referral_rewards 本活动 points 求和
    const refs = await strapi.db.query(REF_UID).findMany({
      where: { activity: act.id },
      populate: { inviter: true, invitee: true },
    });
    const referralCostPoints = (refs || []).reduce((s, x) => s + (Number(x.points) || 0), 0);

    // 2) 签到发放积分：activity_attend 规则当前分值 × 到场 pointsGranted=true 人数
    const atts = await strapi.db.query(ATT_UID).findMany({
      where: { signup: { activity: act.id }, pointsGranted: true },
      populate: { signup: { populate: { user: true } } },
    });
    const attendeePoints = await (async () => {
      const pointSvc = strapi.plugin("zhao-point").service("point");
      const rule = pointSvc ? await pointSvc.getMergedRule("activity_attend") : null;
      return Number(rule?.points) || 0;
    })();
    // 若无规则，按到场数×0；detail 仍记录到场用户
    const signinCostPoints = (atts || []).length * attendeePoints;

    const netPoints = revenuePoints - signinCostPoints - referralCostPoints;

    // summary 快照冗余
    const canceledCount = await strapi.db.query(SIGNS_UID).count({ where: { activity: act.id, status: "cancelled" } });
    const waitingCount = await strapi.db.query(SIGNS_UID).count({ where: { activity: act.id, status: "waiting" } });

    const detail = {
      signups: (activeSigns || []).map((s: any) => ({
        userId: s.user?.id ?? s.user,
        userName: userName(s.user),
        pointsCharged: Number(s.pointsCharged) || 0,
      })),
      attendees: (atts || []).map((a: any) => {
        const u = a.signup?.user;
        return { userId: u?.id ?? a.signup?.user, userName: userName(u), points: attendeePoints };
      }),
      referrals: (refs || []).map((r: any) => ({
        inviterId: r.inviter?.id ?? r.inviter,
        inviteeId: r.invitee?.id ?? r.invitee,
        points: Number(r.points) || 0,
      })),
    };

    const summary = {
      signupCount: (activeSigns || []).length,
      attendedCount: (atts || []).length,
      cancelledCount: canceledCount,
      waitingCount: waitingCount,
    };

    // snapshotNo = 该活动已有快照数 + 1
    const prev = await strapi.db.query(LEDGER_UID).count({ where: { activity: act.id } });

    const ledger = await strapi.db.query(LEDGER_UID).create({
      data: {
        activity: act.id,
        activityDocumentId: act.documentId,
        activityTitle: act.title,
        snapshotNo: prev + 1,
        source,
        generatedAt: new Date(),
        revenuePoints,
        signinCostPoints,
        referralCostPoints,
        netPoints,
        summary,
        detail,
      },
    });
    return ledger;
  },

  /** 管理端列表：按活动列示全部快照（generatedAt desc）；可传 activityDocumentId 过滤状态（ended） */
  async list(params: { activityDocumentId?: string; page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 20, activityDocumentId } = params;
    const where: any = {};
    if (activityDocumentId) where.activityDocumentId = { $eq: activityDocumentId };
    const result = await strapi.db.query(LEDGER_UID).findPage({
      where,
      orderBy: { generatedAt: "desc" },
      page: Number(page),
      pageSize: Number(pageSize),
    });
    return { list: result.results, pagination: result.pagination };
  },

  /** 手动重归档：总是新增一张来源=manual 的快照 */
  async regenerate(activityId: string) {
    return this.generate(activityId, "manual");
  },

  /** 自动生成：活动无 auto 快照才生成（幂等），供 closeActivity 调用 */
  async generateAutoIfAbsent(activityId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId });
    if (!act) return null;
    const hasAuto = await strapi.db.query(LEDGER_UID).count({ where: { activity: act.id, source: "auto" } });
    if (hasAuto > 0) return null;
    return this.generate(activityId, "auto");
  },
});
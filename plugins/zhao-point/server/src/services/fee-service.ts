import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const SSO_PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
const REF_UID = "plugin::zhao-sso.sso-referral-relation";

function inRange(nowTs: number, win: any): boolean {
  if (!win) return true;
  if (win.start && nowTs < new Date(win.start).getTime()) return false;
  if (win.end && nowTs > new Date(win.end).getTime()) return false;
  return true;
}

function userTypeMatches(userType: string | undefined, profile: { segment: string; isPartner: boolean }): boolean {
  if (!userType || userType === "all") return true;
  if (userType === "partner") return !!profile.isPartner;
  if (typeof userType === "string" && userType.startsWith("segment:")) {
    const want = userType.split(":")[1];
    return !!want && profile.segment === want;
  }
  return false;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async resolveUserProfile(upUserId: number): Promise<{ segment: string; isPartner: boolean }> {
    let segment = "C";
    let isPartner = false;
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(upUserId);
        if (sso) {
          const profile = await strapi.db.query(SSO_PROFILE_UID).findOne({ where: { user: sso.id } });
          if (profile?.segment) segment = profile.segment;
          const rel = await strapi.db.query(REF_UID).findOne({ where: { inviter: sso.id } });
          isPartner = !!rel;
        }
      }
    } catch { /* 身份解析失败按最低档兜底 */ }
    return { segment, isPartner };
  },

  async tierUsage(activityId: number, tierId: string): Promise<number> {
    if (!tierId) return 0;
    return strapi.db.query(SIGNS_UID).count({ where: { activity: activityId, feeTierId: tierId, status: "active" } });
  },

  async resolveFee(activity: any, upUserId: number, opts: { now?: string; excludeTierId?: string } = {}) {
    const nowTs = opts.now ? new Date(opts.now).getTime() : Date.now();
    const mode = activity.pricingMode || "flat";

    if (mode === "tier") {
      const tiers = Array.isArray(activity.feeTiers) ? activity.feeTiers : [];
      const sorted = [...tiers].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      const profile = await this.resolveUserProfile(upUserId);
      for (const t of sorted) {
        if (opts.excludeTierId && t.id === opts.excludeTierId) continue;
        if (!inRange(nowTs, t.window)) continue;
        if (!userTypeMatches(t.userType, profile)) continue;
        const quota = Number(t.quota ?? 0);
        if (quota > 0) {
          const usage = await this.tierUsage(activity.id, t.id);
          if (usage >= quota) continue;
        }
        return { mode: "tier", cost: Number(t.pointsCost || 0), feeCollectAt: t.feeCollectAt || activity.feeCollectAt || "signup", tierId: t.id, tier: t };
      }
      return { mode: "tier", cost: Number(activity.pointsCost || 0), feeCollectAt: activity.feeCollectAt || "signup", tierId: null, tier: null };
    }

    if (mode === "factor") {
      const cfg = activity.feeFactors && typeof activity.feeFactors === "object" ? activity.feeFactors : {};
      let cost = Number(cfg.base ?? activity.pointsCost ?? 0);
      const profile = await this.resolveUserProfile(upUserId);
      for (const f of Array.isArray(cfg.factors) ? cfg.factors : []) {
        if (f.type === "window_discount" && f.until && nowTs < new Date(f.until).getTime()) {
          cost -= Number(f.amount || 0);
        } else if (f.type === "window_upcharge" && f.from && nowTs >= new Date(f.from).getTime()) {
          cost += Number(f.amount || 0);
        } else if (f.type === "segment_discount_percent" && f.minSegment && profile.segment === f.minSegment) {
          cost = cost * (100 - Number(f.percent || 0)) / 100;
        } else if (f.type === "flat_discount_amount") {
          cost -= Number(f.amount || 0);
        }
      }
      cost = Math.max(1, Math.round(cost));
      return { mode: "factor", cost, feeCollectAt: activity.feeCollectAt || "signup", tierId: null, tier: null, base: cfg.base };
    }

    return { mode: "flat", cost: Number(activity.pointsCost || 0), feeCollectAt: activity.feeCollectAt || "signup", tierId: null, tier: null };
  },
});
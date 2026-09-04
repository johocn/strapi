import type { Core } from "@strapi/strapi";

const ACTIVITY_UID = "plugin::zhao-point.activity";
const SIGNS_UID = "plugin::zhao-point.activity-signup";
const REDEMPTION_UID = "plugin::zhao-point.point-redemption";

/**
 * 只读门面：供 zhao-sso 跨插件调用，封装 activity / activity-signup /
 * point-redemption 的查询，使 zhao-sso 不再直接操作积分/活动域表
 * （遵循表隔离）。仅只读聚合，不产生副作用。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 报名/到场状态列表（到场意愿用） */
  async listSignups(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<any[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { user: userId };
    if (opts.since) where.signupAt = { $gte: opts.since };
    return strapi.db
      .query(SIGNS_UID)
      .findMany({ where, select: ["id", "attendedAt", "status"], limit: opts.limit ?? 100 })
      .catch(() => []);
  },

  /** 用户积分兑换次数（付费潜力用） */
  async countRedemptions(userId: number): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(REDEMPTION_UID)
      .count({ where: { user: userId } })
      .catch(() => 0);
  },

  /** 已报名活动 id（推荐排除用） */
  async listSignedActivityIds(userId: number): Promise<number[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const signs = await strapi.db
      .query(SIGNS_UID)
      .findMany({
        where: { user: userId },
        populate: { activity: { select: ["id"] } },
        limit: 500,
      })
      .catch(() => []);
    return signs.map((s: any) => s.activity?.id).filter((v: any) => Number.isInteger(v));
  },

  /** 近 since 报名过的活动类型名（activity-signup → activity.type，去重，忽略"其他"） */
  async collectActivityTypes(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<string[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { user: userId };
    if (opts.since) where.signupAt = { $gte: opts.since };
    const signs = await strapi.db
      .query(SIGNS_UID)
      .findMany({
        where,
        populate: { activity: { select: ["id", "type"] } },
        limit: opts.limit ?? 200,
      })
      .catch(() => []);
    const seen = new Map<number, string>();
    for (const s of signs) {
      const a = s.activity;
      if (a?.id && a.type && a.type !== "其他") seen.set(a.id, a.type);
    }
    return Array.from(seen.values());
  },

  /** 个性化推荐活动：兴趣类型内报名中的活动，或报名中兜底；返回已映射的推荐项 */
  async recommendActivities(
    interests: string[],
    excludeIds: number[],
    limit = 5
  ): Promise<any[]> {
    const exclude = new Set(excludeIds || []);
    let rows: any[] = [];
    try {
      if (interests?.length) {
        rows = await strapi.db.query(ACTIVITY_UID).findMany({
          where: { status: "signup_open", type: { $in: interests } },
          limit: 100,
        });
      }
      if (!rows.length) {
        rows = await strapi.db.query(ACTIVITY_UID).findMany({
          where: { status: "signup_open" },
          limit: 100,
        });
      }
    } catch {
      rows = [];
    }
    return rows
      .filter((a: any) => !exclude.has(a.id))
      .sort((a: any, b: any) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime())
      .slice(0, limit)
      .map((a: any) => ({
        documentId: a.documentId,
        id: a.id,
        title: a.title,
        type: a.type,
        startTime: a.startTime,
        endTime: a.endTime,
        venueName: a.venueName,
        capacity: a.capacity,
        usedCapacity: a.usedCapacity,
      }));
  },

  /** 窗口内有效报名数（复购统计） */
  async countActiveSignups(userId: number, from: Date, to: Date): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(SIGNS_UID)
      .count({ where: { user: userId, status: "active", signupAt: { $gt: from, $lte: to } } })
      .catch(() => 0);
  },
});
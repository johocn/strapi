import type { Core } from "@strapi/strapi";

const REFERRAL_UID = "plugin::zhao-logistics.referral";
const QUOTE_REQUEST_UID = "plugin::zhao-logistics.quote-request";
const INTENT_ORDER_UID = "plugin::zhao-logistics.intent-order";

export interface ReferralStats {
  totalReferrals: number;
  byStatus: Record<string, number>;
  totalConverted: number;
  totalRewardAmount: number;
  conversionRate: number;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 生成推荐码（格式：REF + 时间戳后 6 位 + 随机 2 位）
   */
  async generateCode(siteId: number, referrerInfo: { name: string; contact: string }): Promise<string> {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 90 + 10).toString();
    return `REF${ts}${rand}`;
  },

  /**
   * 应用推荐码
   * 1. 校验推荐码有效性（存在 + status != invalid）
   * 2. 创建 referral 记录（referee 信息）
   * 3. 若有 quoteRequestId，关联
   */
  async applyCode(
    siteId: number,
    code: string,
    refereeInfo: { name: string; contact: string; channel?: string; source?: string }
  ): Promise<any> {
    // 1. 查推荐码是否存在（找 referrer 侧记录）
    const existing = await strapi.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, referralCode: code, deletedAt: null },
    });

    if (!existing) throw new Error("推荐码无效");
    if (existing.status === "invalid") throw new Error("推荐码已失效");

    // 2. 创建新的 referral 记录（被推荐人侧）
    const referral = await strapi.db.query(REFERRAL_UID).create({
      data: {
        site: siteId,
        referralCode: code,
        referrerName: existing.referrerName,
        referrerContact: existing.referrerContact,
        referrerCustomerId: existing.referrerCustomerId,
        refereeName: refereeInfo.name,
        refereeContact: refereeInfo.contact,
        referralChannel: (refereeInfo.channel as any) || "friend",
        referralSource: refereeInfo.source || null,
        status: "pending",
        rewardType: "points",
        rewardStatus: "pending",
      },
    });

    return referral;
  },

  /**
   * 标记推荐转化
   * 1. 更新 referral.status=converted + conversionValue + convertedAt
   * 2. 若 rewardType=points 且 referrerCustomerId 存在，调 zhao-point 发放积分
   * 3. 更新 referral.rewardStatus=issued + rewardIssuedAt
   */
  async markConverted(
    siteId: number,
    referralId: string,
    intentOrderId: string,
    conversionValue: number
  ): Promise<void> {
    const referral = await strapi.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, documentId: referralId, deletedAt: null },
    });
    if (!referral) throw new Error("推荐记录不存在");

    // 1. 更新转化状态
    await strapi.db.query(REFERRAL_UID).update({
      where: { documentId: referralId },
      data: {
        status: "converted",
        intentOrderId,
        conversionValue,
        convertedAt: new Date().toISOString(),
      },
    });

    // 2. 发放积分奖励（仅 points 类型 + 推荐人是注册用户）
    if (referral.rewardType === "points" && referral.referrerCustomerId) {
      try {
        const userId = Number(referral.referrerCustomerId);
        const rewardAmount = Number(referral.rewardAmount) || 100; // 默认 100 积分

        await strapi.plugin("zhao-point").service("point").earnPoints({
          userId,
          action: "referral_convert",
          source: "zhao-logistics",
          remark: `推荐转化奖励 - 订单 ${intentOrderId}`,
          orderId: intentOrderId,
        });

        // 3. 更新奖励状态
        await strapi.db.query(REFERRAL_UID).update({
          where: { documentId: referralId },
          data: {
            rewardStatus: "issued",
            rewardIssuedAt: new Date().toISOString(),
            rewardAmount,
          },
        });

        strapi.log.info(`[referral-engine] 推荐奖励已发放: referral=${referralId}, user=${userId}`);
      } catch (err: any) {
        // 积分发放失败不阻塞转化流程，仅记日志
        strapi.log.error(`[referral-engine] 积分发放失败: ${err.message}`);
        await strapi.db.query(REFERRAL_UID).update({
          where: { documentId: referralId },
          data: { remark: `积分发放失败: ${err.message}` },
        });
      }
    }
  },

  /**
   * 验证推荐码有效性（不创建记录）
   */
  async validateCode(siteId: number, code: string): Promise<{ valid: boolean; referrerName?: string }> {
    const existing = await strapi.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, referralCode: code, deletedAt: null },
    });
    if (!existing) return { valid: false };
    if (existing.status === "invalid") return { valid: false };
    return { valid: true, referrerName: existing.referrerName };
  },

  /**
   * 查询推荐统计
   */
  async getStats(
    siteId: number,
    params: { dateFrom?: string; dateTo?: string; referrerCustomerId?: string }
  ): Promise<ReferralStats> {
    const where: any = { site: siteId, deletedAt: null };
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.$gte = params.dateFrom;
      if (params.dateTo) where.createdAt.$lte = params.dateTo;
    }
    if (params.referrerCustomerId) where.referrerCustomerId = params.referrerCustomerId;

    const all = await strapi.db.query(REFERRAL_UID).findMany({ where });

    const byStatus: Record<string, number> = {};
    let totalConverted = 0;
    let totalRewardAmount = 0;

    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === "converted" || r.status === "rewarded") {
        totalConverted++;
        totalRewardAmount += Number(r.rewardAmount) || 0;
      }
    }

    return {
      totalReferrals: all.length,
      byStatus,
      totalConverted,
      totalRewardAmount: Math.round(totalRewardAmount * 100) / 100,
      conversionRate: all.length > 0 ? Math.round((totalConverted / all.length) * 10000) / 100 : 0,
    };
  },
});

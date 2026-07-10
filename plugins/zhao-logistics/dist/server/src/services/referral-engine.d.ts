import { Core } from '@strapi/strapi';
export interface ReferralStats {
    totalReferrals: number;
    byStatus: Record<string, number>;
    totalConverted: number;
    totalRewardAmount: number;
    conversionRate: number;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 生成推荐码（格式：REF + 时间戳后 6 位 + 随机 2 位）
     */
    generateCode(siteId: number, referrerInfo: {
        name: string;
        contact: string;
    }): Promise<string>;
    /**
     * 应用推荐码
     * 1. 校验推荐码有效性（存在 + status != invalid）
     * 2. 创建 referral 记录（referee 信息）
     * 3. 若有 quoteRequestId，关联
     */
    applyCode(siteId: number, code: string, refereeInfo: {
        name: string;
        contact: string;
        channel?: string;
        source?: string;
    }): Promise<any>;
    /**
     * 标记推荐转化
     * 1. 更新 referral.status=converted + conversionValue + convertedAt
     * 2. 若 rewardType=points 且 referrerCustomerId 存在，调 zhao-point 发放积分
     * 3. 更新 referral.rewardStatus=issued + rewardIssuedAt
     */
    markConverted(siteId: number, referralId: string, intentOrderId: string, conversionValue: number): Promise<void>;
    /**
     * 验证推荐码有效性（不创建记录）
     */
    validateCode(siteId: number, code: string): Promise<{
        valid: boolean;
        referrerName?: string;
    }>;
    /**
     * 查询推荐统计
     */
    getStats(siteId: number, params: {
        dateFrom?: string;
        dateTo?: string;
        referrerCustomerId?: string;
    }): Promise<ReferralStats>;
};
export default _default;

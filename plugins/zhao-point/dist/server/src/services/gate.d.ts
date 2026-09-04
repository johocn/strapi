import { Core } from '@strapi/strapi';
/**
 * 只读门面：供 zhao-sso 跨插件调用，封装 activity / activity-signup /
 * point-redemption 的查询，使 zhao-sso 不再直接操作积分/活动域表
 * （遵循表隔离）。仅只读聚合，不产生副作用。
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 报名/到场状态列表（到场意愿用） */
    listSignups(userId: number, opts?: {
        since?: Date | string;
        limit?: number;
    }): Promise<any[]>;
    /** 用户积分兑换次数（付费潜力用） */
    countRedemptions(userId: number): Promise<number>;
    /** 已报名活动 id（推荐排除用） */
    listSignedActivityIds(userId: number): Promise<number[]>;
    /** 近 since 报名过的活动类型名（activity-signup → activity.type，去重，忽略"其他"） */
    collectActivityTypes(userId: number, opts?: {
        since?: Date | string;
        limit?: number;
    }): Promise<string[]>;
    /** 个性化推荐活动：兴趣类型内报名中的活动，或报名中兜底；返回已映射的推荐项 */
    recommendActivities(interests: string[], excludeIds: number[], limit?: number): Promise<any[]>;
    /** 窗口内有效报名数（复购统计） */
    countActiveSignups(userId: number, from: Date, to: Date): Promise<number>;
};
export default _default;

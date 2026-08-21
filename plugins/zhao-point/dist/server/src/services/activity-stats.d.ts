import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 活动效果总览：报名-到场-评价漏斗 + 积分成本/收益 + 裂变转化。
     * 纯查询不落库；活动/系列双分组；status 过滤（all|draft|signup_open|ongoing|ended）。
     */
    getOverview({ status }?: {
        status?: string;
    }): Promise<{
        summary: {
            activityCount: number;
            signupCount: number;
            attendedCount: number;
            attendanceRate: number;
            reviewCount: number;
            avgRating: number;
            avgNps: number;
            pointsChargedSum: any;
            referralPoints: any;
            referralCount: number;
            attendPointsGlobal: any;
        };
        rows: any[];
    }>;
};
export default _default;

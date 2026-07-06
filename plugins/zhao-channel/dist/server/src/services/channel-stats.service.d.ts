import { Core } from '@strapi/strapi';
export interface StatsResult {
    total: number;
    byChannel: Record<number, number>;
}
export interface DashboardResult {
    totalCourses: number;
    totalUsers: number;
    totalQuizzes: number;
    totalPoints: number;
    courseStats: StatsResult;
    userStats: StatsResult;
    quizStats: StatsResult;
    pointStats: StatsResult;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 按渠道统计课程数
     */
    getCourseStats(channelIds: number[]): Promise<StatsResult>;
    /**
     * 按渠道统计用户数
     */
    getUserStats(channelIds: number[]): Promise<StatsResult>;
    /**
     * 按渠道统计题库数
     */
    getQuizStats(channelIds: number[]): Promise<StatsResult>;
    /**
     * 按渠道统计积分发放量
     */
    getPointStats(channelIds: number[]): Promise<StatsResult>;
    /**
     * 汇总仪表盘
     */
    getDashboard(channelScope: {
        all: boolean;
        channelIds: number[];
    }): Promise<DashboardResult>;
    /**
     * 获取所有渠道ID（admin用）
     */
    getAllChannelIds(): Promise<number[]>;
};
export default _default;

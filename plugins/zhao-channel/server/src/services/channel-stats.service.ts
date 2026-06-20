import type { Core } from "@strapi/strapi";

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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 按渠道统计课程数
   */
  async getCourseStats(channelIds: number[]): Promise<StatsResult> {
    let total = 0;
    const byChannel: Record<number, number> = {};

    try {
      // 全渠道课程
      const allCourses = await strapi.documents("plugin::zhao-course.course").findMany({
        filters: { channelScope: "all" },
      });
      total += allCourses.length;

      // 指定渠道课程
      for (const channelId of channelIds) {
        const courses = await strapi.documents("plugin::zhao-course.course").findMany({
          filters: {
            channelScope: "specific",
            channelIds: { $contains: channelId },
          },
        });
        byChannel[channelId] = courses.length;
        total += courses.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 课程统计查询失败");
    }

    return { total, byChannel };
  },

  /**
   * 按渠道统计用户数
   */
  async getUserStats(channelIds: number[]): Promise<StatsResult> {
    let total = 0;
    const byChannel: Record<number, number> = {};

    try {
      for (const channelId of channelIds) {
        const members = await strapi.documents("plugin::zhao-channel.channel-member").findMany({
          filters: { channel: { id: channelId } },
        });
        byChannel[channelId] = members.length;
        total += members.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 用户统计查询失败");
    }

    return { total, byChannel };
  },

  /**
   * 按渠道统计题库数
   */
  async getQuizStats(channelIds: number[]): Promise<StatsResult> {
    let total = 0;
    const byChannel: Record<number, number> = {};

    try {
      const allQuizzes = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
        filters: { channelScope: "all" },
      });
      total += allQuizzes.length;

      for (const channelId of channelIds) {
        const quizzes = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
          filters: {
            channelScope: "specific",
            channelIds: { $contains: channelId },
          },
        });
        byChannel[channelId] = quizzes.length;
        total += quizzes.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 题库统计查询失败");
    }

    return { total, byChannel };
  },

  /**
   * 按渠道统计积分发放量
   */
  async getPointStats(channelIds: number[]): Promise<StatsResult> {
    let total = 0;
    const byChannel: Record<number, number> = {};

    try {
      for (const channelId of channelIds) {
        const records = await strapi.documents("plugin::zhao-point.point-record").findMany({
          filters: { channel: { id: channelId } },
        });
        byChannel[channelId] = records.length;
        total += records.length;
      }
    } catch {
      strapi.log.warn("[channel-stats] 积分统计查询失败");
    }

    return { total, byChannel };
  },

  /**
   * 汇总仪表盘
   */
  async getDashboard(channelScope: { all: boolean; channelIds: number[] }): Promise<DashboardResult> {
    const channelIds = channelScope.all ? await this.getAllChannelIds() : channelScope.channelIds;

    const [courseStats, userStats, quizStats, pointStats] = await Promise.all([
      this.getCourseStats(channelIds),
      this.getUserStats(channelIds),
      this.getQuizStats(channelIds),
      this.getPointStats(channelIds),
    ]);

    return {
      totalCourses: courseStats.total,
      totalUsers: userStats.total,
      totalQuizzes: quizStats.total,
      totalPoints: pointStats.total,
      courseStats,
      userStats,
      quizStats,
      pointStats,
    };
  },

  /**
   * 获取所有渠道ID（admin用）
   */
  async getAllChannelIds(): Promise<number[]> {
    try {
      const channels = await strapi.documents("plugin::zhao-channel.channel").findMany({});
      return channels.map((c: any) => c.id);
    } catch {
      return [];
    }
  },
});

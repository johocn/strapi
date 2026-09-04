import type { Core } from "@strapi/strapi";

const COURSE_UID = "plugin::zhao-course.course";
const COURSE_CAT_UID = "plugin::zhao-course.course-category";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const COURSE_PROGRESS_UID = "plugin::zhao-course.course-progress";

/**
 * 只读门面：供 zhao-sso 跨插件调用，封装 course / course-enrollment /
 * lesson-progress / course-progress 的查询，使 zhao-sso 不再直接操作课程域表
 * （遵循表隔离）。仅只读聚合，不产生副作用。
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 近 since 内学习的课时数（活跃度用） */
  async countActiveLessons(userId: number, since: Date | string): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(LESSON_PROGRESS_UID)
      .count({ where: { user: userId, lastStudyAt: { $gte: since } } })
      .catch(() => 0);
  },

  /** 课时学习记录（完课率计算用：isCompleted / isCorrect） */
  async listLessonProgress(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<any[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { user: userId };
    if (opts.since) where.lastStudyAt = { $gte: opts.since };
    return strapi.db
      .query(LESSON_PROGRESS_UID)
      .findMany({ where, select: ["id", "isCompleted", "isCorrect"], limit: opts.limit ?? 500 })
      .catch(() => []);
  },

  /** 付费/积分购课次数（付费潜力用） */
  async countPaidEnrolls(userId: number): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(ENROLL_UID)
      .count({ where: { user: userId, enrollType: { $in: ["paid", "points"] } } })
      .catch(() => 0);
  },

  /** 已购/已报名课程 id（推荐排除用） */
  async listEnrolledCourseIds(userId: number): Promise<number[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const ens = await strapi.db
      .query(ENROLL_UID)
      .findMany({
        where: { user: userId },
        populate: { course: { select: ["id"] } },
        limit: 500,
      })
      .catch(() => []);
    return ens.map((e: any) => e.course?.id).filter((v: any) => Number.isInteger(v));
  },

  /** 近 since 学习过的课程分类名（lesson-progress → course → category.name，去重） */
  async collectCourseInterests(
    userId: number,
    opts: { since?: Date | string; limit?: number } = {}
  ): Promise<string[]> {
    if (!Number.isInteger(userId) || userId <= 0) return [];
    const where: any = { user: userId };
    if (opts.since) where.lastStudyAt = { $gte: opts.since };
    const lps = await strapi.db
      .query(LESSON_PROGRESS_UID)
      .findMany({
        where,
        populate: { course: { select: ["id"], populate: { category: { select: ["name"] } } } },
        limit: opts.limit ?? 500,
      })
      .catch(() => []);
    const seen = new Map<number, string>();
    for (const lp of lps) {
      const c = lp.course;
      if (c?.id && c.category?.name) seen.set(c.id, c.category.name);
    }
    return Array.from(seen.values());
  },

  /** 个性化推荐课程：兴趣分类内，或最新兜底；返回已映射的推荐项 */
  async recommendCourses(
    interests: string[],
    excludeIds: number[],
    limit = 5
  ): Promise<any[]> {
    const exclude = new Set(excludeIds || []);
    let rows: any[] = [];
    try {
      if (interests?.length) {
        const cats = await strapi.db
          .query(COURSE_CAT_UID)
          .findMany({ where: { name: { $in: interests } }, select: ["id"] });
        const catIds = cats.map((c: any) => c.id);
        if (catIds.length) {
          rows = await strapi.db.query(COURSE_UID).findMany({
            where: { category: catIds },
            populate: { category: { select: ["name"] }, cover: true },
            limit: 100,
          });
        }
      }
      if (!rows.length) {
        rows = await strapi.db.query(COURSE_UID).findMany({
          populate: { category: { select: ["name"] }, cover: true },
          orderBy: { createdAt: "DESC" },
          limit: 100,
        });
      }
    } catch {
      rows = [];
    }
    return rows
      .filter((c: any) => !exclude.has(c.id))
      .sort((a: any, b: any) => (b.studentCount || 0) - (a.studentCount || 0))
      .slice(0, limit)
      .map((c: any) => ({
        documentId: c.documentId,
        id: c.id,
        title: c.title,
        category: c.category?.name ?? null,
        cover: c.cover ?? null,
        price: c.price,
        isFree: c.isFree ?? true,
        isPaid: c.isPaid,
        courseType: c.courseType,
        pointsPrice: c.pointsPrice,
        studentCount: c.studentCount,
      }));
  },

  /** 窗口内再报新课数（复购/D7 统计） */
  async countNewEnrolls(userId: number, from: Date, to: Date): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(ENROLL_UID)
      .count({ where: { user: userId, status: "enrolled", enrolledAt: { $gt: from, $lte: to } } })
      .catch(() => 0);
  },

  /** 窗口内课程完课数（完课统计） */
  async countCompletedProgress(userId: number, from: Date, to: Date): Promise<number> {
    if (!Number.isInteger(userId) || userId <= 0) return 0;
    return strapi.db
      .query(COURSE_PROGRESS_UID)
      .count({ where: { user: userId, isCompleted: true, completedAt: { $gt: from, $lte: to } } })
      .catch(() => 0);
  },
});
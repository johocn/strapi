import type { Core } from "@strapi/strapi";
import { calculateCoursePoints } from "../utils/points-calculator";

const UID = "plugin::zhao-course.course-progress";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";
const LESSON_UID = "plugin::zhao-course.course-lesson";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async findCourseProgressById(progressId: string) {
    return strapi.db.query(UID).findOne({
      where: { id: progressId },
      populate: { course: true },
    });
  },

  async find(query: any = {}) {
    const { filters, pagination } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        populate: { user: true, course: true },
        pagination: { page, pageSize },
      }),
      strapi.documents(UID).count({ filters: filters || {} }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { user: true, course: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({ data });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({ documentId, data });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },

  async getOrCreate(userId: number, courseId: number) {
    let progress = await strapi.db.query(UID).findOne({
      where: { user: userId, course: courseId },
    });

    if (!progress) {
      const totalLessons = await strapi.db.query(LESSON_UID).count({
        where: { course: courseId },
      });

      progress = await strapi.db.query(UID).create({
        data: {
          user: userId,
          course: courseId,
          completedLessons: 0,
          totalLessons,
          progress: 0,
          isCompleted: false,
          pointsEarned: 0,
          isPointsClaimed: false,
          lessonPointsSummary: {},
        },
      });
    }

    return progress;
  },

  async recalculate(userId: number, courseId: number) {
    const progress = await this.getOrCreate(userId, courseId);

    const completedCount = await strapi.db.query(LESSON_PROGRESS_UID).count({
      where: { user: userId, course: courseId, isCompleted: true },
    });

    const totalLessons = progress.totalLessons || 0;
    const percent = totalLessons > 0 ? Math.min(Math.round((completedCount / totalLessons) * 10000) / 100, 100) : 0;
    const isCompleted = completedCount >= totalLessons && totalLessons > 0;

    await strapi.db.query(UID).update({
      where: { id: progress.id },
      data: {
        completedLessons: completedCount,
        progress: percent,
        isCompleted,
        lastStudyAt: new Date(),
      },
    });

    return { ...progress, completedLessons: completedCount, progress: percent, isCompleted };
  },

  async claimPoints(userId: number, progressRecordId: string) {
    const progress = await strapi.db.query(UID).findOne({
      where: { id: progressRecordId },
      populate: { course: true },
    });

    if (!progress) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
      throwErr("PROGRESS_001", 404, msg);
    }

    const progressUserId = progress.user?.id ?? progress.user;
    if (progressUserId !== userId) {
      throwErr("PROGRESS_002", 403, "无权操作此进度记录");
    }

    if (progress.isPointsClaimed) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("COURSE_003") : "课程积分已领取";
      throwErr("COURSE_003", 409, msg);
    }

    const course = progress.course;
    if (!course?.enablePoints) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("COURSE_002") : "课程未启用积分";
      throwErr("COURSE_002", 400, msg);
    }

    if (!progress.isCompleted) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("COURSE_004") : "课程未完成，无法领取积分";
      throwErr("COURSE_004", 400, msg);
    }

    const { points: pointsToEarn, detail } = await calculateCoursePoints(strapi, course, userId, course.id);

    if (pointsToEarn <= 0) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("COURSE_008") : "无可领取课程积分";
      throwErr("COURSE_008", 400, msg);
    }

    try {
      const pointService = strapi.plugin("zhao-point")?.service("point");
      if (pointService?.earnPoints) {
        await pointService.earnPoints({
          userId,
          action: "complete_course",
          source: "zhao-course",
          method: course.pointsType,
          remark: `课程《${course.title ?? ""}》积分领取`,
        });
      }
    } catch (err) {
      strapi.log.warn(`[zhao-course] zhao-point 积分发放失败，回滚领取状态: ${err instanceof Error ? err.message : String(err)}`);
      throwErr("COURSE_009", 502, "积分发放失败，请稍后重试");
    }

    await strapi.db.query(UID).update({
      where: { id: progress.id },
      data: {
        pointsEarned: pointsToEarn,
        lessonPointsSummary: detail,
        isPointsClaimed: true,
      },
    });

    return { pointsEarned: pointsToEarn, claimed: true, detail };
  },

  async getUserProgresses(userId: number) {
    return strapi.db.query(UID).findMany({
      where: { user: userId },
      populate: { course: true },
    });
  },
  };
};

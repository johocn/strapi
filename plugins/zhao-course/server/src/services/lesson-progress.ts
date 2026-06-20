import type { Core } from "@strapi/strapi";
import { calculateLessonPoints, sumQuizPoints } from "../utils/points-calculator";

const UID = "plugin::zhao-course.lesson-progress";
const LESSON_UID = "plugin::zhao-course.course-lesson";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async findLessonById(lessonId: number) {
    return strapi.db.query(LESSON_UID).findOne({
      where: { id: lessonId },
      populate: { course: true },
    });
  },

  async findLessonProgressById(progressId: string | number) {
    return strapi.db.query(UID).findOne({
      where: { id: Number(progressId) },
      populate: { lesson: { populate: { course: true } }, user: true },
    });
  },

  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: { user: true, lesson: true, course: true },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { user: true, lesson: true, course: true },
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

  async reportProgress(userId: number, data: { lessonDocumentId: string; playPosition?: number; duration?: number; progress?: number }) {
    const lesson = await strapi.documents("plugin::zhao-course.course-lesson").findOne({
      documentId: data.lessonDocumentId,
      populate: { course: true },
    });

    if (!lesson) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("LESSON_001", { lessonId: data.lessonDocumentId }) : "课时不存在";
      throwErr("LESSON_001", 404, msg);
    }

    const courseId = lesson.course?.id || lesson.course;
    const lessonId = lesson.id;

    let progress = await strapi.db.query(UID).findOne({
      where: { user: userId, lesson: lessonId },
    });

    let progressPercent = Math.min(100, Math.max(0, data.progress ?? 0));

    if (progress) {
      if (progressPercent <= Number(progress.progress) || 0) {
        return progress;
      }

      if (data.duration && data.duration > 0 && data.playPosition !== undefined) {
        const serverProgress = Math.min(100, Math.round((data.playPosition / data.duration) * 100));
        progressPercent = Math.min(progressPercent, serverProgress + 5);
      }

      const isCompleted = progressPercent >= 100;
      const updateData: any = {
        progress: Math.max(Number(progress.progress) || 0, progressPercent),
        playPosition: data.playPosition ?? progress.playPosition,
        duration: data.duration ?? progress.duration,
        lastStudyAt: new Date(),
      };
      if (isCompleted && !progress.isCompleted) {
        updateData.isCompleted = true;
      }
      progress = await strapi.db.query(UID).update({
        where: { id: progress.id },
        data: updateData,
      });
    } else {
      const isCompleted = progressPercent >= 100;
      progress = await strapi.db.query(UID).create({
        data: {
          user: userId,
          lesson: lessonId,
          course: courseId,
          progress: Math.min(100, progressPercent),
          playPosition: data.playPosition ?? 0,
          duration: data.duration ?? 0,
          isCompleted,
          isAnswered: false,
          isCorrect: false,
          pointsEarned: 0,
          calculatedPoints: 0,
          quizPointsDetail: {},
          isPointsClaimed: false,
          lastStudyAt: new Date(),
        },
      });
    }

    if (progressPercent >= 100 && courseId) {
      await strapi.plugin("zhao-course").service("course-progress").recalculate(userId, courseId);
    }

    return progress;
  },

  async submitAnswer(userId: number, progressRecordId: string | number, isCorrect: boolean) {
    const progress = await strapi.db.query(UID).findOne({
      where: { id: Number(progressRecordId) },
      populate: { lesson: true, user: true },
    });

    if (!progress) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
      throwErr("PROGRESS_001", 404, msg);
    }

    const progressUserId = progress.user?.id ?? progress.user;
    if (Number(progressUserId) !== Number(userId)) {
      throwErr("PROGRESS_002", 403, "无权操作此进度记录");
    }

    const lesson = progress.lesson;
    const updateData: any = {
      isAnswered: true,
      isCorrect,
      lastStudyAt: new Date(),
    };
    if (isCorrect) {
      updateData.isCompleted = true;
      updateData.progress = 100;
    }

    if (isCorrect && lesson?.enablePoints && lesson.pointsType === "quiz_points") {
      const { total, detail } = await sumQuizPoints(strapi, userId, lesson.id);
      updateData.quizPointsDetail = detail;
      updateData.calculatedPoints = total;
    }

    const updated = await strapi.db.query(UID).update({
      where: { id: progress.id },
      data: updateData,
    });

    if (isCorrect && progress.course) {
      await strapi.plugin("zhao-course").service("course-progress").recalculate(userId, progress.course);
    }

    return updated;
  },

  async claimPoints(userId: number, progressRecordId: string | number, selectedChannelId?: number | string) {
    const progress = await strapi.db.query(UID).findOne({
      where: { id: Number(progressRecordId) },
      populate: { lesson: { populate: { course: { populate: { pointChannel: true } } } }, user: true },
    });

    if (!progress) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("PROGRESS_001") : "学习进度记录不存在";
      throwErr("PROGRESS_001", 404, msg);
    }

    const progressUserId = progress.user?.id ?? progress.user;
    if (Number(progressUserId) !== Number(userId)) {
      throwErr("PROGRESS_002", 403, "无权操作此进度记录");
    }

    if (progress.isPointsClaimed) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("LESSON_003") : "课时积分已领取";
      throwErr("LESSON_003", 409, msg);
    }

    const lesson = progress.lesson;
    if (!lesson?.enablePoints) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("LESSON_002") : "课时未启用积分";
      throwErr("LESSON_002", 400, msg);
    }

    if (lesson.pointsType === "lesson_points" && !progress.isCompleted) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("LESSON_004") : "课时未完成，无法领取积分";
      throwErr("LESSON_004", 400, msg);
    }

    if (lesson.pointsType === "quiz_points") {
      if (!progress.isAnswered) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_005") : "课时需答题才能获得积分";
        throwErr("LESSON_005", 400, msg);
      }
      if (!progress.isCorrect) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("LESSON_006") : "答题错误，无法获得积分";
        throwErr("LESSON_006", 400, msg);
      }
    }

    const { points: pointsToEarn, detail } = await calculateLessonPoints(strapi, lesson, progress);

    if (pointsToEarn <= 0) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("LESSON_007") : "无可领取课时积分";
      throwErr("LESSON_007", 400, msg);
    }

    try {
      const pointService = strapi.plugin("zhao-point")?.service("point");
      if (pointService?.earnPoints) {
        // 渠道决策：selected → course.pointChannel → 跨课程 channelIds 兜底校验
        const course = lesson.course;
        const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
        const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;

        let finalChannelId: number | string | null = selectedChannelId ?? pointChannelId;

        // specific 模式：必须从 channelIds 中选
        if (course?.channelScope === "specific" && finalChannelId) {
          const inScope = channelIds.some((id: any) => String(id) === String(finalChannelId));
          if (!inScope) {
            throwErr("LESSON_009", 400, "所选渠道不在课程所属渠道范围内");
          }
        }

        // 用户当前渠道（用于 userChannel 兜底与追溯）
        let userChannelId: number | null = null;
        try {
          const channelMemberService = strapi.plugin("zhao-channel")?.service("channel-member");
          if (channelMemberService?.getMyChannel) {
            const myCh = await channelMemberService.getMyChannel(userId);
            userChannelId = myCh?.id ?? null;
          }
        } catch {
          // ignore: userChannel 取不到时不影响主流程
        }

        await pointService.earnPoints({
          userId,
          action: lesson.pointsType === "quiz_points" ? "complete_quiz" : "complete_lesson",
          source: "zhao-course",
          method: lesson.pointsType,
          remark: `课时《${lesson.title ?? ""}》积分领取`,
          channelId: finalChannelId ?? undefined,
          userChannelId: userChannelId ?? undefined,
        });
      }
    } catch (err) {
      strapi.log.warn(`[zhao-course] zhao-point 课时积分发放失败: ${err instanceof Error ? err.message : String(err)}`);
      throwErr("LESSON_008", 502, "积分发放失败，请稍后重试");
    }

    await strapi.db.query(UID).update({
      where: { id: progress.id },
      data: {
        pointsEarned: pointsToEarn,
        calculatedPoints: pointsToEarn,
        quizPointsDetail: detail,
        isPointsClaimed: true,
      },
    });

    return { pointsEarned: pointsToEarn, claimed: true, detail };
  },
  };
};

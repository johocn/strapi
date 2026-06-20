import type { Core } from "@strapi/strapi";

const QUIZ_RECORD_UID = "plugin::zhao-quiz.quiz-record";
const LESSON_PROGRESS_UID = "plugin::zhao-course.lesson-progress";

export async function sumQuizPoints(
  strapi: Core.Strapi,
  userId: number,
  lessonId: number
): Promise<{ total: number; detail: Record<string, { points: number; isCorrect: boolean }> }> {
  const detail: Record<string, { points: number; isCorrect: boolean }> = {};
  let total = 0;

  try {
    const records = await strapi.db.query(QUIZ_RECORD_UID).findMany({
      where: { user: userId, lesson: lessonId, isCorrect: true },
      populate: { quiz: true },
    });

    for (const record of records) {
      const quiz = record.quiz;
      const points = quiz?.points ?? 0;
      const quizDocId = quiz?.documentId ?? quiz?.id ?? String(record.id);
      if (points > 0) {
        detail[quizDocId] = { points, isCorrect: true };
        total += points;
      }
    }
  } catch (err) {
    strapi.log.warn(`[zhao-course] sumQuizPoints 查询答题记录失败: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { total, detail };
}

export async function calculateLessonPoints(
  strapi: Core.Strapi,
  lesson: any,
  progress: any
): Promise<{ points: number; detail: Record<string, any> }> {
  if (!lesson?.enablePoints) {
    return { points: 0, detail: {} };
  }

  if (lesson.pointsType === "lesson_points") {
    if (!progress?.isCompleted) {
      return { points: 0, detail: {} };
    }
    return { points: lesson.points ?? 0, detail: {} };
  }

  if (lesson.pointsType === "quiz_points") {
    if (!progress?.isAnswered || !progress?.isCorrect) {
      return { points: 0, detail: {} };
    }
    const userId = progress.user?.id ?? progress.user;
    const lessonId = lesson.id;
    const { total, detail } = await sumQuizPoints(strapi, userId, lessonId);
    return { points: total, detail };
  }

  return { points: 0, detail: {} };
}

export async function calculateCoursePoints(
  strapi: Core.Strapi,
  course: any,
  userId: number,
  courseId: number
): Promise<{ points: number; detail: Record<string, any> }> {
  if (!course?.enablePoints) {
    return { points: 0, detail: {} };
  }

  if (course.pointsType === "course_points") {
    return { points: course.points ?? 0, detail: {} };
  }

  if (course.pointsType === "lesson_points") {
    const lessonProgresses = await strapi.db.query(LESSON_PROGRESS_UID).findMany({
      where: { user: userId, course: courseId, isPointsClaimed: true },
      populate: { lesson: { select: ["documentId", "title"] } },
    });

    let total = 0;
    const detail: Record<string, any> = {};

    for (const lp of lessonProgresses) {
      const earned = lp.pointsEarned ?? 0;
      if (earned > 0) {
        const lessonDocId = lp.lesson?.documentId ?? String(lp.lesson?.id ?? lp.id);
        detail[lessonDocId] = {
          title: lp.lesson?.title ?? "",
          pointsEarned: earned,
        };
        total += earned;
      }
    }

    return { points: total, detail };
  }

  return { points: 0, detail: {} };
}

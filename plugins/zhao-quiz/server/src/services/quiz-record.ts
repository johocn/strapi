import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz-record";
const QUIZ_UID = "plugin::zhao-quiz.quiz";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async find(query: any = {}) {
    const { filters, pagination } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        populate: { user: true, quiz: true, course: true, lesson: true, grader: true, ...(query.populate || {}) },
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
      populate: { user: true, quiz: true, course: true, lesson: true, grader: true },
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

  /**
   * 提交回答 - 自动判题或标记 essay 待评分
   */
  async submitAnswer(userId: number, quizDocumentId: string, answer: any, lessonDocId?: string) {
    const quiz = await strapi.documents(QUIZ_UID).findOne({
      documentId: quizDocumentId,
      populate: { course: true, lesson: true },
    });

    if (!quiz) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_001") : "题目不存在";
      throwErr("QUIZ_001", 404, msg);
    }

    const courseId = quiz.course?.id || quiz.course;
    const lessonId = lessonDocId
      ? quiz.lesson?.id || quiz.lesson
      : quiz.lesson?.id || quiz.lesson;

    const isEssay = quiz.type === "essay";
    let isCorrect = false;
    let score = 0;
    let scoringStatus = "auto_graded";

    if (isEssay) {
      // 问答题不自动判题
      scoringStatus = "pending";
    } else {
      // 自动判题：比较 answer
      isCorrect = String(answer).trim().toLowerCase() === String(quiz.answer).trim().toLowerCase();
      score = isCorrect ? (quiz.points || 0) : 0;
    }

    const record = await strapi.documents(UID).create({
      data: {
        user: userId,
        quiz: quiz.id || quiz.documentId,
        answer: typeof answer === "object" ? answer : { text: answer },
        isCorrect: isEssay ? undefined : isCorrect,
        score,
        teacherScore: 0,
        scoringStatus,
        totalPoints: quiz.points || 0,
        submittedAt: new Date(),
        course: courseId,
        lesson: lessonId,
      },
    });

    return record;
  },

  /**
   * 教师人工评分（仅限 essay 问答题）
   */
  async teacherGrade(recordDocumentId: string, teacherScore: number, graderUserId: number) {
    const record = await strapi.documents(UID).findOne({
      documentId: recordDocumentId,
      populate: { quiz: true },
    });

    if (!record) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_001") : "答题记录不存在";
      throwErr("QUIZ_001", 404, msg);
    }

    if (record.scoringStatus !== "pending") {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_012") : "该记录已完成评分";
      throwErr("QUIZ_012", 400, msg);
    }

    const result = await strapi.documents(UID).update({
      documentId: recordDocumentId,
      data: {
        teacherScore: Math.max(0, teacherScore),
        score: Math.max(0, teacherScore),
        scoringStatus: "manual_graded",
        grader: graderUserId,
        gradedAt: new Date(),
        isCorrect: teacherScore > 0,
      } as any,
    });

    return result;
  },

  /**
   * 查询用户的答题记录
   */
  async getUserRecords(userId: number, courseDocId?: string) {
    const filters: any = { user: { id: userId } };
    if (courseDocId) {
      filters.course = { documentId: courseDocId };
    }
    return strapi.documents(UID).findMany({
      filters,
      populate: { quiz: true, course: true, lesson: true, grader: true },
      sort: { submittedAt: "desc" },
    });
  },

  /**
   * 查询待评分的问答题记录
   */
  async getPendingGrading(courseDocId?: string) {
    const filters: any = { scoringStatus: "pending" };
    if (courseDocId) {
      filters.course = { documentId: courseDocId };
    }
    return strapi.documents(UID).findMany({
      filters,
      populate: { user: true, quiz: true, course: true, lesson: true },
      sort: { submittedAt: "asc" },
    });
  },
  };
};

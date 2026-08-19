import type { Core } from "@strapi/strapi";
import { resolveUserRoles, hasGrantedRole, parseQuizExamRoles } from "../utils/role-gate";

const UID = "plugin::zhao-quiz.quiz-exam-attempt";
const EXAM_UID = "plugin::zhao-quiz.quiz-exam";

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
        populate: { user: true, exam: true, ...(query.populate || {}) },
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
      populate: { user: true, exam: true },
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
   * 开始考试
   */
  async startExam(userId: number, examDocumentId: string) {
    const exam = await strapi.documents(EXAM_UID).findOne({
      documentId: examDocumentId,
      populate: { course: true },
    });

    if (!exam) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_004") : "考试不存在";
      throwErr("QUIZ_004", 404, msg);
    }

    // 考试角色门控：课程配置了 quiz.examRoles 时，未授权角色抛 403
    const userRoles = await resolveUserRoles(strapi, userId);
    if (!hasGrantedRole(userRoles, parseQuizExamRoles(exam.course))) {
      throwErr("QUIZ_403", 403, "无权进行该考试");
    }

    // 检查剩余次数（使用 strapi.db.query 按 id 查询）
    if (!exam.allowRetry) {
      const existing = await strapi.db.query(UID).findMany({ where: { user: userId, exam: exam.id } });
      if (existing.length > 0) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("QUIZ_005") : "该考试不允许重试";
        throwErr("QUIZ_005", 400, msg);
      }
    } else if (exam.maxAttempts > 0) {
      const count = await strapi.db.query(UID).count({ where: { user: userId, exam: exam.id } });
      if (count >= exam.maxAttempts) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("QUIZ_005") : "考试次数已达上限";
        throwErr("QUIZ_005", 400, msg);
      }
    }

    // 查询已有次数
    const existing = await strapi.db.query(UID).findMany({ where: { user: userId, exam: exam.id } });

    const attempt = await strapi.db.query(UID).create({
      data: {
        user: userId,
        exam: exam.id,
        answers: [],
        totalScore: 0,
        isPassed: false,
        startedAt: new Date(),
        attemptNumber: (existing?.length || 0) + 1,
        duration: 0,
      },
    });

    return attempt;
  },

  /**
   * 提交答卷
   */
  async submitExam(attemptDocumentId: string, answers: any[]) {
    // 先用 documents API 查，获取完整 exam 数据
    const attempt = await strapi.documents(UID).findOne({
      documentId: attemptDocumentId,
      populate: { exam: { populate: { questions: true } } },
    });

    if (!attempt) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_004") : "考试记录不存在";
      throwErr("QUIZ_004", 404, msg);
    }

    const exam = attempt.exam;
    if (!exam) throwErr("QUIZ_010", 404, "关联考试不存在");

    // 计算总分
    const questionPoints = exam.questionPoints || {};
    // 判分依据：优先用考试固定题集；规则组卷时该集合为空，则按提交答案逐题拉取（兼容 group 卷）
    const fixedMap = new Map(
      (exam.questions || []).map((q: any) => [q.id, q]).concat((exam.questions || []).map((q: any) => [q.documentId, q]))
    );
    let totalScore = 0;
    const results: { quizId: number | string; courseId?: number | string; isCorrect: boolean }[] = [];

    for (const answer of answers) {
      const quizDocumentId = answer?.quizDocumentId;
      if (!quizDocumentId) continue;
      // 已在固定题集内 → 直接用缓存；否则（规则组卷）拉取题目实际答案参与判分
      let question: any = fixedMap.get(quizDocumentId);
      let fetchedCourse: any;
      if (!question) {
        question = await strapi.documents("plugin::zhao-quiz.quiz").findOne({
          documentId: quizDocumentId,
          populate: { course: { fields: ["id", "name"] } },
        });
        fetchedCourse = question?.course;
      }
      if (question && question.type !== "essay") {
        const maxPoints = questionPoints[question.documentId] || question.points || 0;
        const isCorrect =
          String(answer?.answer ?? "").trim().toLowerCase() === String(question.answer).trim().toLowerCase();
        results.push({
          quizId: question.id || question.documentId,
          courseId: question.course?.id || fetchedCourse?.id || undefined,
          isCorrect,
        });
        if (isCorrect) {
          totalScore += maxPoints;
        }
      }
    }

    const duration = attempt.startedAt
      ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    const passScore = Number(exam.passScore) || 60;
    const isPassed = totalScore >= passScore;

    const result = await strapi.db.query(UID).update({
      where: { id: attempt.id },
      data: {
        answers,
        totalScore,
        isPassed,
        submittedAt: new Date(),
        duration,
      },
    });

    // 判完即回流错题集
    const wrongService = strapi.plugin("zhao-quiz").service("wrong-quiz");
    for (const r of results) {
      try {
        if (r.isCorrect) {
          await wrongService.onCorrect(attempt.user as number, r.quizId);
        } else {
          await wrongService.onWrong({
            userId: attempt.user as number,
            quizId: r.quizId,
            courseId: r.courseId as any,
          });
        }
      } catch {
        // 错题回流失败不阻断交卷主流程
      }
    }

    return result;
  },

  /**
   * 查询用户的考试记录
   */
  async getUserAttempts(userId: number, examDocumentId: string) {
    return strapi.documents(UID).findMany({
      filters: { user: { id: userId }, exam: { documentId: examDocumentId } },
      populate: { exam: true },
      sort: { startedAt: "desc" },
    });
  },
  };
};

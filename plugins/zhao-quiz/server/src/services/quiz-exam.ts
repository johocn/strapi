import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz-exam";

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
        populate: { course: true, lesson: true, questions: true, ...(query.populate || {}) },
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
      populate: { course: true, lesson: true, questions: true },
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
   * 获取考试题目（支持随机排序）
   */
  async getQuestions(examDocumentId: string) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true },
    });

    if (!exam) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_004") : "考试不存在";
      throwErr("QUIZ_004", 404, msg);
    }

    let questions = exam.questions || [];

    if (exam.randomOrder) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    const questionPoints = exam.questionPoints || {};

    // 返回题目时隐藏答案（考试模式）
    return questions.map((q: any) => ({
      ...q,
      answer: undefined,
      points: questionPoints[q.documentId] || q.points || 0,
    }));
  },

  /**
   * 计算考试总分
   */
  async calculateTotalPoints(examDocumentId: string) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true },
    });

    if (!exam) return 0;

    const questionPoints = exam.questionPoints || {};
    const total = (exam.questions || []).reduce((sum: number, q: any) => {
      return sum + (questionPoints[q.documentId] || q.points || 0);
    }, 0);

    return total;
  },
  };
};

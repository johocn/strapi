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

  /**
   * 组卷：fixed 固定题 或 rule 规则抽题；返回隐藏答案的题目与缺额提示
   */
  async generatePaper(examDocumentId: string) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true },
    });

    if (!exam) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      throwErr("QUIZ_004", 404, i18n ? i18n.t("QUIZ_004") : "考试不存在");
    }

    if (exam.paperType !== "rule") {
      return { documentId: examDocumentId, questions: this._hideAnswers(exam.questions || [], exam), shortages: [] };
    }

    const rules: any[] = Array.isArray(exam.paperRule) ? exam.paperRule : [];
    const scope: any[] = Array.isArray(exam.knowledgeScope) ? exam.knowledgeScope : [];
    const picked: any[] = [];
    const shortages: string[] = [];

    for (const rule of rules) {
      const filters: any = { isPublished: true };
      if (rule.type) filters.type = rule.type;
      if (rule.difficulty) filters.difficulty = rule.difficulty;
      if (scope.length) filters.course = { documentId: scope };

      const pool = await strapi.documents("plugin::zhao-quiz.quiz").findMany({
        filters,
        pagination: { page: 1, pageSize: 300 },
      });

      const needed = Number(rule.count) || 0;
      const sampled = [...pool].sort(() => Math.random() - 0.5).slice(0, needed);
      if (sampled.length < needed) {
        shortages.push(`[${rule.type || "任意"}] 缺 ${needed - sampled.length} 题`);
      }
      picked.push(...sampled.map((q: any) => ({ ...q, points: Number(rule.points) || q.points || 0 })));
    }

    return { documentId: examDocumentId, questions: this._hideAnswers(picked, exam), shortages };
  },

  /** 随机排序并隐藏答案/赋予分值 */
  _hideAnswers(questions: any[], exam: any) {
    const questionPoints = exam.questionPoints || {};
    const qs = exam.shuffle === false ? questions : [...questions].sort(() => Math.random() - 0.5);
    return qs.map((q: any) => ({
      ...q,
      answer: undefined,
      points: questionPoints[q.documentId] || q.points || 0,
    }));
  },
  };
};

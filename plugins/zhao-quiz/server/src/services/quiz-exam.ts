import type { Core } from "@strapi/strapi";
import { resolveUserRoles, hasGrantedRole, parseQuizExamRoles } from "../utils/role-gate";
import { isRoleGateEnabled, mayAccessVisibleToRoles } from "../../../../zhao-common/server/src/utils/role-gate";

const UID = "plugin::zhao-quiz.quiz-exam";

type RoleGateOpts = { userId?: number; isAdmin?: boolean; siteDocId?: string };

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async find(query: any = {}, options?: RoleGateOpts) {
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

    // 考试角色门控：非 admin 列表只保留当前用户可考的考试
    let resultList: any[] = list;
    if (!options?.isAdmin) {
      const userRoles = await resolveUserRoles(strapi, options?.userId);
      resultList = list.filter((exam: any) =>
        hasGrantedRole(userRoles, parseQuizExamRoles(exam.course))
      );
      // 强角色门控：租户开启 roleGate 且考试配置了 visibleToRoles 时，仅授权角色可见
      const roleGateEnabled = await isRoleGateEnabled(strapi, options?.siteDocId);
      if (roleGateEnabled) {
        resultList = resultList.filter((exam: any) =>
          mayAccessVisibleToRoles(userRoles, exam.visibleToRoles)
        );
      }
    }

    return {
      list: resultList,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async findOne(documentId: string, options?: RoleGateOpts) {
    const exam = await strapi.documents(UID).findOne({
      documentId,
      populate: { course: true, lesson: true, questions: true },
    });
    await this._assertExamRole(exam, options);
    return exam;
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
  async getQuestions(examDocumentId: string, options?: RoleGateOpts) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true, course: true },
    });

    if (!exam) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      const msg = i18n ? i18n.t("QUIZ_004") : "考试不存在";
      throwErr("QUIZ_004", 404, msg);
    }
    await this._assertExamRole(exam, options);

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
  async generatePaper(examDocumentId: string, options?: RoleGateOpts) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true, course: true },
    });

    if (!exam) {
      const i18n = strapi.plugin("zhao-common")?.service("i18n");
      throwErr("QUIZ_004", 404, i18n ? i18n.t("QUIZ_004") : "考试不存在");
    }
    await this._assertExamRole(exam, options);

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

  /** 考试角色门控：非 admin 且课程配置了 quiz.examRoles 时，未授权角色抛 403 */
  async _assertExamRole(exam: any, options?: RoleGateOpts) {
    if (!exam) return;
    if (options?.isAdmin) return;
    const userRoles = await resolveUserRoles(strapi, options?.userId);
    if (!hasGrantedRole(userRoles, parseQuizExamRoles(exam.course))) {
      throwErr("QUIZ_403", 403, "无权进行该考试");
    }
    // 强角色门控：租户开启 roleGate 且考试配置了 visibleToRoles 时，未授权角色抛 403
    const roleGateEnabled = await isRoleGateEnabled(strapi, options?.siteDocId);
    if (roleGateEnabled && !mayAccessVisibleToRoles(userRoles, exam.visibleToRoles)) {
      throwErr("QUIZ_403", 403, "无权进行该考试");
    }
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

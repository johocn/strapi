import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.wrong-quiz";
const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15]; // 索引=reviewLevel，单位天
const PASS_LEVEL = 5;        // 达到该层级且连续答对 => 出集
const NEED_CONSECUTIVE = 3;  // 单层内连续答对次数

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 判错时调用：入库或累加计数、等级归 1 */
  async onWrong(input: {
    userId: number; quizId: number; courseId?: number | string;
    lessonId?: number | string; knowledgePointName?: string;
  }) {
    const existing = await this.findActive(input.userId, input.quizId);
    const base = {
      user: input.userId, quiz: input.quizId,
      course: input.courseId, lesson: input.lessonId,
      knowledgePointName: input.knowledgePointName,
    };
    if (existing) {
      return strapi.documents(UID).update({
        documentId: existing.documentId,
        data: {
          status: "active", reviewLevel: 1, consecutiveCorrect: 0,
          wrongCount: (existing.wrongCount || 0) + 1,
          dueAt: this._dueAt(1), lastWrongAt: new Date(),
        } as any,
      });
    }
    return strapi.documents(UID).create({
      data: {
        ...base, status: "active", wrongCount: 1,
        reviewLevel: 1, consecutiveCorrect: 0,
        dueAt: this._dueAt(1), lastWrongAt: new Date(),
      } as any,
    });
  },

  /** 答对时调用：按间隔重复升级；达到 PASS_LEVEL 者出集 */
  async onCorrect(userId: number, quizId: number) {
    const item = await this.findActive(userId, quizId);
    if (!item) return null;
    const level = (item.reviewLevel || 1);
    if (level >= PASS_LEVEL) {
      return strapi.documents(UID).update({
        documentId: item.documentId,
        data: { status: "archived", consecutiveCorrect: 0, lastCorrectAt: new Date() } as any,
      });
    }
    const consec = (item.consecutiveCorrect || 0) + 1;
    if (consec >= NEED_CONSECUTIVE) {
      const nextLevel = Math.min(level + 1, PASS_LEVEL);
      return strapi.documents(UID).update({
        documentId: item.documentId,
        data: {
          reviewLevel: nextLevel, consecutiveCorrect: 0,
          dueAt: this._dueAt(nextLevel), lastCorrectAt: new Date(),
        } as any,
      });
    }
    return strapi.documents(UID).update({
      documentId: item.documentId,
      data: { consecutiveCorrect: consec, lastCorrectAt: new Date() } as any,
    });
  },

  async findActive(userId: number, quizId: number) {
    const [r] = await strapi.documents(UID).findMany({
      filters: { user: { id: userId }, quiz: { id: quizId }, status: "active" },
      populate: { quiz: true, course: true, lesson: true },
      pagination: { page: 1, pageSize: 1 },
    });
    return r || null;
  },

  /** 待复习错题（dueAt <= now，用于错题重练） */
  async dueList(userId: number, limit = 30) {
    const today = new Date();
    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        filters: { user: { id: userId }, status: "active", dueAt: { $lte: today } },
        populate: { quiz: { populate: { course: true, lesson: true } } },
        sort: { dueAt: "asc" },
        pagination: { page: 1, pageSize: limit },
      }),
      strapi.documents(UID).count({ filters: { user: { id: userId }, status: "active", dueAt: { $lte: today } } }),
    ]);
    return { list, total };
  },

  async listByUser(userId: number, status = "active", pagination = { page: 1, pageSize: 20 }) {
    const filters: any = { user: { id: userId } };
    if (status) filters.status = status;
    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        filters, populate: { quiz: { populate: { course: true, lesson: true } } },
        sort: { lastWrongAt: "desc" }, pagination,
      }),
      strapi.documents(UID).count({ filters }),
    ]);
    return { list, total };
  },

  _dueAt(level: number) {
    const days = REVIEW_INTERVALS[Math.min(level, REVIEW_INTERVALS.length - 1)] || 1;
    return new Date(Date.now() + days * 86400 * 1000);
  },
});
import os

root = r"e:\code\plugins\zhao-quiz"
files = {}

# ===== Services =====

# services/index.ts
files[r"server\src\services\index.ts"] = """import quiz from "./quiz";
import quizRecord from "./quiz-record";
import quizExam from "./quiz-exam";
import quizBatch from "./quiz-batch";

export default {
  quiz,
  "quiz-record": quizRecord,
  "quiz-exam": quizExam,
  "quiz-batch": quizBatch,
};
"""

# services/quiz.ts
files[r"server\src\services\quiz.ts"] = """import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: {
        course: true,
        lesson: true,
        knowledgePoints: true,
        ...(query.populate || {}),
      },
      orderBy: { sort: "asc" },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { course: true, lesson: true, knowledgePoints: true },
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
});
"""

# services/quiz-record.ts
files[r"server\src\services\quiz-record.ts"] = """import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz-record";

/**
 * 答题评分逻辑
 */
function calculateScore(quizType: string, correctAnswer: string, userAnswer: any, points: number): { isCorrect: boolean; score: number } {
  if (!userAnswer || userAnswer === "") {
    return { isCorrect: false, score: 0 };
  }

  switch (quizType) {
    case "single_choice":
    case "true_false": {
      const isCorrect = String(userAnswer).trim() === String(correctAnswer).trim();
      return { isCorrect, score: isCorrect ? points : 0 };
    }
    case "multiple_choice": {
      const correct = JSON.parse(correctAnswer || "[]");
      const user = Array.isArray(userAnswer) ? userAnswer.sort() : [];
      const sortedCorrect = [...correct].sort();
      const allCorrect = user.length === sortedCorrect.length && user.every((v: any, i: number) => String(v) === String(sortedCorrect[i]));
      if (allCorrect) return { isCorrect: true, score: points };
      // 部分正确：没有选错的情况下给一半分
      const hasWrong = user.some((v: any) => !sortedCorrect.includes(String(v)));
      if (!hasWrong && user.length > 0) return { isCorrect: false, score: points * 0.5 };
      return { isCorrect: false, score: 0 };
    }
    case "fill_blank": {
      if (!Array.isArray(userAnswer)) return { isCorrect: false, score: 0 };
      const blanks = JSON.parse(correctAnswer || "[]");
      if (blanks.length === 0) return { isCorrect: false, score: 0 };
      const pointPerBlank = points / blanks.length;
      let correctCount = 0;
      for (let i = 0; i < blanks.length; i++) {
        if (i < userAnswer.length) {
          const userVal = String(userAnswer[i]).trim().toLowerCase();
          const matched = blanks[i].answers?.some((a: string) => String(a).trim().toLowerCase() === userVal);
          if (matched) correctCount++;
        }
      }
      return { isCorrect: correctCount === blanks.length, score: correctCount * pointPerBlank };
    }
    case "short_answer": {
      // 简答需要人工评分，自动检查默认为待批改
      return { isCorrect: false, score: 0 };
    }
    case "matching": {
      const correct = JSON.parse(correctAnswer || "{}");
      const user = userAnswer || {};
      const keys = Object.keys(correct);
      if (keys.length === 0) return { isCorrect: false, score: 0 };
      let correctCount = 0;
      for (const key of keys) {
        if (String(user[key] || "") === String(correct[key])) correctCount++;
      }
      const allCorrect = correctCount === keys.length;
      return { isCorrect: allCorrect, score: allCorrect ? points : (correctCount / keys.length) * points };
    }
    case "ordering": {
      const correct = JSON.parse(correctAnswer || "[]");
      const user = userAnswer || [];
      if (correct.length !== user.length) return { isCorrect: false, score: 0 };
      const isCorrect = correct.every((v: any, i: number) => Number(user[i]) === Number(v));
      return { isCorrect, score: isCorrect ? points : 0 };
    }
    default:
      return { isCorrect: false, score: 0 };
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: { user: true, quiz: true, course: true, lesson: true },
      orderBy: { submittedAt: "desc" },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { user: true, quiz: true, course: true, lesson: true },
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
   * 提交单题答案并自动评分
   */
  async submitAnswer(userId: number, quizId: string, answer: any, courseId?: string, lessonId?: string) {
    const quiz = await strapi.documents("plugin::zhao-quiz.quiz").findOne({ documentId: quizId });
    if (!quiz) {
      const err: any = new Error("题目不存在");
      err.code = "QUIZ_001";
      throw err;
    }

    const { isCorrect, score } = calculateScore(quiz.type, quiz.answer, answer, quiz.points || 0);

    return strapi.documents(UID).create({
      data: {
        user: userId,
        quiz: quiz.id || quiz.documentId,
        answer,
        isCorrect,
        score,
        totalPoints: quiz.points || 0,
        submittedAt: new Date(),
        duration: 0,
        course: courseId || undefined,
        lesson: lessonId || undefined,
      },
    });
  },

  /**
   * 批量提交答案（考试模式）
   */
  async batchSubmitAnswers(userId: number, answers: Array<{ quizId: string; answer: any }>, courseId?: string, lessonId?: string) {
    const results = [];
    for (const item of answers) {
      try {
        const record = await this.submitAnswer(userId, item.quizId, item.answer, courseId, lessonId);
        results.push({ quizId: item.quizId, success: true, record });
      } catch (err: any) {
        results.push({ quizId: item.quizId, success: false, error: err.message });
      }
    }
    return results;
  },
});
"""

# services/quiz-exam.ts
files[r"server\src\services\quiz-exam.ts"] = """import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz-exam";
const ATTEMPT_UID = "plugin::zhao-quiz.quiz-exam-attempt";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: {
        course: true,
        lesson: true,
        questions: true,
        ...(query.populate || {}),
      },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { course: true, lesson: true, questions: { populate: { knowledgePoints: true } } },
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
   * 用户开始考试 - 组卷
   */
  async startExam(userId: number, examDocumentId: string) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true },
    });
    if (!exam) {
      const err: any = new Error("考试不存在");
      err.code = "QUIZ_004";
      throw err;
    }

    // 检查次数限制
    if (exam.maxAttempts > 0) {
      const attempts = await strapi.documents(ATTEMPT_UID).findMany({
        filters: { user: userId, exam: exam.id },
      });
      if (attempts.length >= exam.maxAttempts) {
        const err: any = new Error("考试次数已达上限");
        err.code = "QUIZ_005";
        throw err;
      }
    }

    // 组卷
    let questions = exam.questions || [];
    if (exam.randomOrder) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    return {
      exam: {
        id: exam.documentId,
        title: exam.title,
        description: exam.description,
        timeLimit: exam.timeLimit,
        totalPoints: exam.totalPoints,
        questionCount: exam.questionCount || questions.length,
        showResult: exam.showResult,
      },
      questions: questions.map((q: any) => ({
        id: q.documentId || q.id,
        title: q.title,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        points: q.points,
        sort: q.sort,
      })),
      attemptNumber: 1,
    };
  },

  /**
   * 用户交卷 - 自动评分
   */
  async submitExam(userId: number, examDocumentId: string, answers: Array<{ quizId: string; answer: any }>, duration: number) {
    const exam = await strapi.documents(UID).findOne({
      documentId: examDocumentId,
      populate: { questions: true },
    });
    if (!exam) {
      const err: any = new Error("考试不存在");
      err.code = "QUIZ_004";
      throw err;
    }

    // 逐题评分
    const scoredAnswers: Record<string, any> = {};
    let totalScore = 0;

    for (const item of answers) {
      const question = (exam.questions || []).find(
        (q: any) => String(q.documentId || q.id) === String(item.quizId)
      );
      if (!question) continue;

      const quizService = strapi.plugin("zhao-quiz").service("quiz-record");
      const { isCorrect, score } = (quizService as any).calculateScore
        ? await (quizService as any).calculateScore(question.type, question.answer, item.answer, question.points || 0)
        : { isCorrect: false, score: 0 };

      scoredAnswers[item.quizId] = { answer: item.answer, isCorrect, score };
      totalScore += score;
    }

    const isPassed = totalScore >= (exam.passScore || 60);

    return strapi.documents(ATTEMPT_UID).create({
      data: {
        user: userId,
        exam: exam.id,
        answers: scoredAnswers,
        totalScore,
        isPassed,
        startedAt: new Date(Date.now() - duration * 1000),
        submittedAt: new Date(),
        duration,
        attemptNumber: 1,
      },
    });
  },

  /**
   * 获取用户考试记录
   */
  async getUserExamAttempts(userId: number) {
    return strapi.documents(ATTEMPT_UID).findMany({
      filters: { user: userId },
      populate: { exam: { populate: { course: true } } },
      orderBy: { submittedAt: "desc" },
    });
  },
});
"""

# services/quiz-batch.ts
files[r"server\src\services\quiz-batch.ts"] = """import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz-batch";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      populate: { file: true, course: true, lesson: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { file: true, course: true, lesson: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({ data });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },

  /**
   * 解析 CSV 内容并批量创建题目
   * CSV 格式: title,type,options,answer,explanation,difficulty,points,sort
   */
  async parseAndImport(batchId: string, csvContent: string, courseId?: string, lessonId?: string) {
    const lines = csvContent.split("\\n").filter((l) => l.trim());
    if (lines.length < 2) {
      const err: any = new Error("CSV 格式错误：至少需要标题行和一行数据");
      err.code = "QUIZ_007";
      throw err;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const errors: any[] = [];
    let successCount = 0;
    const requiredFields = ["title", "type"];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          if (h === "options" || h === "answer") {
            try { row[h] = JSON.parse(values[idx]); }
            catch { row[h] = values[idx]; }
          } else {
            row[h] = values[idx];
          }
        });

        // 校验必填字段
        const missing = requiredFields.filter((f) => !row[f]);
        if (missing.length > 0) {
          errors.push({ row: i + 1, message: `缺少必填字段: ${missing.join(", ")}` });
          continue;
        }

        const validTypes = ["single_choice", "multiple_choice", "true_false", "fill_blank", "short_answer", "matching", "ordering"];
        if (!validTypes.includes(row.type)) {
          errors.push({ row: i + 1, message: `无效题型: ${row.type}` });
          continue;
        }

        const data: any = {
          title: row.title,
          type: row.type,
          options: row.options || null,
          answer: row.answer ? (typeof row.answer === "string" ? row.answer : JSON.stringify(row.answer)) : "",
          explanation: row.explanation || "",
          difficulty: row.difficulty || "medium",
          points: parseInt(row.points) || 0,
          sort: parseInt(row.sort) || 0,
          isPublished: false,
        };
        if (courseId) data.course = courseId;
        if (lessonId) data.lesson = lessonId;

        await strapi.documents("plugin::zhao-quiz.quiz").create({ data });
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, message: err.message || "解析错误" });
      }
    }

    // 更新批次状态
    await strapi.documents(UID).update({
      documentId: batchId,
      data: {
        totalCount: lines.length - 1,
        successCount,
        errorCount: errors.length,
        errors,
        status: errors.length === 0 ? "completed" : errors.length === lines.length - 1 ? "failed" : "completed",
      },
    });

    return { totalCount: lines.length - 1, successCount, errorCount: errors.length, errors };
  },
});
"""

# ===== Controllers =====

# controllers/index.ts
files[r"server\src\controllers\index.ts"] = """import quiz from "./quiz";
import quizRecord from "./quiz-record";
import quizExam from "./quiz-exam";
import quizBatch from "./quiz-batch";

export default {
  quiz,
  "quiz-record": quizRecord,
  "quiz-exam": quizExam,
  "quiz-batch": quizBatch,
};
"""

# controllers/quiz.ts
files[r"server\src\controllers\quiz.ts"] = """import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz").find(ctx.query);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz").findOne(documentId);
      if (!result) return ctx.notFound("题目不存在");
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async create(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-quiz").service("quiz").create(ctx.request.body);
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz").update(documentId, ctx.request.body);
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz").delete(documentId);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
});
"""

# controllers/quiz-record.ts
files[r"server\src\controllers\quiz-record.ts"] = """import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-record").find(ctx.query);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-record").findOne(documentId);
      if (!result) return ctx.notFound("答题记录不存在");
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async create(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-quiz").service("quiz-record").create(ctx.request.body);
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-record").update(documentId, ctx.request.body);
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-record").delete(documentId);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Content API: 用户提交单题答案
   */
  async submitAnswer(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("未认证");

      const { quizId, answer, courseId, lessonId } = ctx.request.body;
      if (!quizId) return ctx.badRequest("缺少 quizId");

      const result = await strapi.plugin("zhao-quiz").service("quiz-record").submitAnswer(
        userId, quizId, answer, courseId, lessonId
      );
      ctx.status = 201;
      ctx.body = result;
    } catch (err: any) {
      ctx.throw(err.status || 400, err.message || err);
    }
  },

  /**
   * Content API: 用户批量提交答案
   */
  async batchSubmit(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("未认证");

      const { answers, courseId, lessonId } = ctx.request.body;
      if (!answers || !Array.isArray(answers)) return ctx.badRequest("answers 必须是数组");

      const results = await strapi.plugin("zhao-quiz").service("quiz-record").batchSubmitAnswers(
        userId, answers, courseId, lessonId
      );
      ctx.body = results;
    } catch (err: any) {
      ctx.throw(err.status || 400, err.message || err);
    }
  },
});
"""

# controllers/quiz-exam.ts
files[r"server\src\controllers\quiz-exam.ts"] = """import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-exam").find(ctx.query);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam").findOne(documentId);
      if (!result) return ctx.notFound("测验不存在");
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async create(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam").create(ctx.request.body);
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-exam").update(documentId, ctx.request.body);
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-exam").delete(documentId);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Content API: 开始考试（组卷）
   */
  async startExam(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("未认证");

      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam").startExam(userId, documentId);
      ctx.body = result;
    } catch (err: any) {
      ctx.throw(err.status || 400, err.message || err);
    }
  },

  /**
   * Content API: 交卷
   */
  async submitExam(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("未认证");

      const { documentId } = ctx.params;
      const { answers, duration } = ctx.request.body;
      if (!answers || !Array.isArray(answers)) return ctx.badRequest("answers 必须是数组");

      const result = await strapi.plugin("zhao-quiz").service("quiz-exam").submitExam(
        userId, documentId, answers, duration || 0
      );
      ctx.status = 201;
      ctx.body = result;
    } catch (err: any) {
      ctx.throw(err.status || 400, err.message || err);
    }
  },

  /**
   * Content API: 我的考试记录
   */
  async myAttempts(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) return ctx.unauthorized("未认证");

      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-exam").getUserExamAttempts(userId);
    } catch (err: any) {
      ctx.throw(500, err);
    }
  },
});
"""

# controllers/quiz-batch.ts
files[r"server\src\controllers\quiz-batch.ts"] = """import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-batch").find(ctx.query);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-batch").findOne(documentId);
      if (!result) return ctx.notFound("导入批次不存在");
      ctx.body = result;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async create(ctx: any) {
    try {
      const result = await strapi.plugin("zhao-quiz").service("quiz-batch").create(ctx.request.body);
      ctx.status = 201;
      ctx.body = result;
    } catch (err) {
      ctx.throw(400, err);
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-quiz").service("quiz-batch").delete(documentId);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  /**
   * Admin API: 解析并导入 CSV
   */
  async parseAndImport(ctx: any) {
    try {
      const { batchId, csvContent, courseId, lessonId } = ctx.request.body;
      if (!batchId || !csvContent) return ctx.badRequest("缺少 batchId 或 csvContent");

      const result = await strapi.plugin("zhao-quiz").service("quiz-batch").parseAndImport(
        batchId, csvContent, courseId, lessonId
      );
      ctx.body = result;
    } catch (err: any) {
      ctx.throw(400, err.message || err);
    }
  },
});
"""

# ===== Routes =====

# routes/index.ts
files[r"server\src\routes\index.ts"] = """import admin from "./admin";
import contentApi from "./content-api";

export default {
  admin,
  "content-api": contentApi,
};
"""

# routes/admin.ts
files[r"server\src\routes\admin.ts"] = """export default () => ({
  type: "admin" as const,
  routes: [
    // ═══ 题目 CRUD ═══
    { method: "GET" as const, path: "/quizzes", handler: "quiz.find", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz.read" }] } }] } },
    { method: "GET" as const, path: "/quizzes/:documentId", handler: "quiz.findOne", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz.read" }] } }] } },
    { method: "POST" as const, path: "/quizzes", handler: "quiz.create", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz.create" }] } }] } },
    { method: "PUT" as const, path: "/quizzes/:documentId", handler: "quiz.update", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz.update" }] } }] } },
    { method: "DELETE" as const, path: "/quizzes/:documentId", handler: "quiz.delete", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz.delete" }] } }] } },

    // ═══ 答题记录 CRUD ═══
    { method: "GET" as const, path: "/quiz-records", handler: "quiz-record.find", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-record.read" }] } }] } },
    { method: "GET" as const, path: "/quiz-records/:documentId", handler: "quiz-record.findOne", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-record.read" }] } }] } },
    { method: "POST" as const, path: "/quiz-records", handler: "quiz-record.create", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-record.create" }] } }] } },
    { method: "PUT" as const, path: "/quiz-records/:documentId", handler: "quiz-record.update", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-record.update" }] } }] } },
    { method: "DELETE" as const, path: "/quiz-records/:documentId", handler: "quiz-record.delete", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-record.delete" }] } }] } },

    // ═══ 测验配置 CRUD ═══
    { method: "GET" as const, path: "/quiz-exams", handler: "quiz-exam.find", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam.read" }] } }] } },
    { method: "GET" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.findOne", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam.read" }] } }] } },
    { method: "POST" as const, path: "/quiz-exams", handler: "quiz-exam.create", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam.create" }] } }] } },
    { method: "PUT" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.update", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam.update" }] } }] } },
    { method: "DELETE" as const, path: "/quiz-exams/:documentId", handler: "quiz-exam.delete", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam.delete" }] } }] } },

    // ═══ 考试记录 CRUD ═══
    { method: "GET" as const, path: "/quiz-exam-attempts", handler: "quiz-exam.myAttempts", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam-attempt.read" }] } }] } },
    { method: "DELETE" as const, path: "/quiz-exam-attempts/:documentId", handler: "quiz-exam-attempt.delete", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-exam-attempt.delete" }] } }] } },

    // ═══ 批量导入 CRUD ═══
    { method: "GET" as const, path: "/quiz-batches", handler: "quiz-batch.find", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-batch.read" }] } }] } },
    { method: "GET" as const, path: "/quiz-batches/:documentId", handler: "quiz-batch.findOne", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-batch.read" }] } }] } },
    { method: "POST" as const, path: "/quiz-batches", handler: "quiz-batch.create", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-batch.create" }] } }] } },
    { method: "DELETE" as const, path: "/quiz-batches/:documentId", handler: "quiz-batch.delete", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-batch.delete" }] } }] } },

    // ═══ 批量导入解析 ═══
    { method: "POST" as const, path: "/quiz-batches/parse-and-import", handler: "quiz-batch.parseAndImport", config: { middlewares: ["plugin::zhao-auth.authenticate", { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "has-permission", action: "quiz-batch.create" }] } }] } },
  ],
});
"""

# routes/content-api.ts
files[r"server\src\routes\content-api.ts"] = """export default () => ({
  type: "content-api" as const,
  routes: [
    // ── 公开接口 ──
    { method: "GET" as const, path: "/quizzes", handler: "quiz.find" },
    { method: "GET" as const, path: "/quizzes/:documentId", handler: "quiz.findOne" },

    // ── 用户认证接口 ──
    // 提交单题答案
    {
      method: "POST" as const,
      path: "/my/submit-answer",
      handler: "quiz-record.submitAnswer",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // 批量提交答案
    {
      method: "POST" as const,
      path: "/my/batch-submit",
      handler: "quiz-record.batchSubmit",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // 我的答题记录
    {
      method: "GET" as const,
      path: "/my/quiz-records",
      handler: "quiz-record.find",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // 开始考试（组卷）
    {
      method: "POST" as const,
      path: "/my/exam/:documentId/start",
      handler: "quiz-exam.startExam",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // 交卷
    {
      method: "POST" as const,
      path: "/my/exam/:documentId/submit",
      handler: "quiz-exam.submitExam",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
    // 我的考试记录
    {
      method: "GET" as const,
      path: "/my/exam-attempts",
      handler: "quiz-exam.myAttempts",
      config: {
        middlewares: [
          "plugin::zhao-auth.authenticate",
          { name: "plugin::zhao-auth.authorize", config: { policies: [{ name: "is-authenticated" }] } },
        ],
      },
    },
  ],
});
"""

# Write all files
for rel_path, content in files.items():
    full_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.lstrip("\\n"))
    print(f"Created: {rel_path}")

print("Done! All services, controllers, routes written successfully.")

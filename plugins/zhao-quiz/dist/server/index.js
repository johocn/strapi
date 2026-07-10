"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const XLSX__namespace = /* @__PURE__ */ _interopNamespace(XLSX);
const path__namespace = /* @__PURE__ */ _interopNamespace(path);
const fs__namespace = /* @__PURE__ */ _interopNamespace(fs);
const register = ({ strapi }) => {
  try {
    const i18n = strapi.plugin("zhao-common").service("i18n");
    i18n.setMessages({
      QUIZ_001: "题目不存在",
      QUIZ_002: "无权访问该题目",
      QUIZ_003: "答题参数错误",
      QUIZ_004: "考试不存在",
      QUIZ_005: "考试次数已达上限",
      QUIZ_006: "考试已超时",
      QUIZ_007: "批量导入格式错误",
      QUIZ_008: "文件解析失败",
      QUIZ_009: "用户答案错误格式",
      QUIZ_010: "积分领取成功",
      QUIZ_011: "问答题待评分",
      QUIZ_012: "该记录已完成评分",
      QUIZ_013: "无权进行评分操作",
      QUIZ_016: "课时不存在",
      QUIZ_017: "请先完成课时内容再答题",
      QUIZ_020: "必须选择积分充值渠道",
      QUIZ_021: "所选渠道不存在"
    });
  } catch {
  }
};
const bootstrap = ({ strapi }) => {
  strapi.log.info("zhao-quiz: 插件已加载");
};
const destroy = ({ strapi: _strapi }) => {
};
const config = {
  default: {
    scoring: {
      difficultyMultiplier: {
        easy: 1,
        medium: 1.2,
        hard: 1.5
      },
      partialScore: {
        multipleChoice: 0.5,
        matching: true
      }
    },
    batch: {
      maxFileSize: 10485760,
      allowedFormats: [".csv", ".xlsx"]
    },
    exam: {
      defaultPassScore: 60,
      defaultTimeLimit: 0
    }
  },
  validator: (config2) => {
    if (config2.scoring && typeof config2.scoring !== "object") {
      throw new Error("scoring 配置必须是对象");
    }
  }
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_quizzes";
const info$4 = { "singularName": "quiz", "pluralName": "quizzes", "displayName": "题目" };
const options$4 = { "draftAndPublish": false };
const attributes$4 = { "title": { "type": "richtext", "required": true }, "type": { "type": "enumeration", "enum": ["single_choice", "multiple_choice", "true_false", "fill_blank", "short_answer", "essay", "matching", "ordering"], "required": true }, "options": { "type": "json" }, "answer": { "type": "text" }, "explanation": { "type": "richtext" }, "difficulty": { "type": "enumeration", "enum": ["easy", "medium", "hard"], "default": "medium" }, "points": { "type": "integer", "default": 0 }, "sort": { "type": "integer", "default": 0 }, "isPublished": { "type": "boolean", "default": false }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course", "inversedBy": "quizzes" }, "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson", "inversedBy": "quizzes" }, "tags": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-tag.tag" }, "exams": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-quiz.quiz-exam", "mappedBy": "questions" }, "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" }, "channelIds": { "type": "json", "default": "[]" }, "deletedAt": { "type": "datetime", "default": null } };
const quiz$2 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_quiz_records";
const info$3 = { "singularName": "quiz-record", "pluralName": "quiz-records", "displayName": "答题记录" };
const options$3 = { "draftAndPublish": false };
const attributes$3 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "quiz": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-quiz.quiz" }, "answer": { "type": "json" }, "isCorrect": { "type": "boolean" }, "score": { "type": "decimal", "precision": 5, "scale": 2, "default": 0 }, "teacherScore": { "type": "decimal", "precision": 5, "scale": 2, "default": 0 }, "scoringStatus": { "type": "enumeration", "enum": ["pending", "auto_graded", "manual_graded"], "default": "pending" }, "grader": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "gradedAt": { "type": "datetime" }, "totalPoints": { "type": "integer", "default": 0 }, "submittedAt": { "type": "datetime" }, "duration": { "type": "integer", "default": 0 }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" }, "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson" } };
const quizRecord$2 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_quiz_exams";
const info$2 = { "singularName": "quiz-exam", "pluralName": "quiz-exams", "displayName": "考试配置" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "title": { "type": "string", "required": true }, "description": { "type": "text" }, "timeLimit": { "type": "integer", "default": 0 }, "passScore": { "type": "decimal", "precision": 5, "scale": 2, "default": 60 }, "totalPoints": { "type": "integer", "default": 0 }, "questionCount": { "type": "integer", "default": 0 }, "randomOrder": { "type": "boolean", "default": false }, "allowRetry": { "type": "boolean", "default": true }, "maxAttempts": { "type": "integer", "default": 0 }, "showResult": { "type": "boolean", "default": true }, "questionPoints": { "type": "json" }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course", "inversedBy": "exams" }, "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson", "inversedBy": "exams" }, "questions": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-quiz.quiz", "inversedBy": "exams" }, "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" }, "channelIds": { "type": "json", "default": "[]" }, "deletedAt": { "type": "datetime", "default": null } };
const quizExam$2 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_quiz_exam_attempts";
const info$1 = { "singularName": "quiz-exam-attempt", "pluralName": "quiz-exam-attempts", "displayName": "考试记录" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "exam": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-quiz.quiz-exam" }, "answers": { "type": "json" }, "totalScore": { "type": "decimal", "precision": 5, "scale": 2, "default": 0 }, "isPassed": { "type": "boolean" }, "startedAt": { "type": "datetime" }, "submittedAt": { "type": "datetime" }, "duration": { "type": "integer", "default": 0 }, "attemptNumber": { "type": "integer", "default": 1 } };
const quizExamAttempt$2 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_quiz_batches";
const info = { "singularName": "quiz-batch", "pluralName": "quiz-batches", "displayName": "批量导入" };
const options = { "draftAndPublish": false };
const attributes = { "name": { "type": "string", "required": true }, "file": { "type": "media", "multiple": false }, "templateFile": { "type": "media", "multiple": false }, "totalCount": { "type": "integer", "default": 0 }, "successCount": { "type": "integer", "default": 0 }, "errorCount": { "type": "integer", "default": 0 }, "errors": { "type": "json" }, "status": { "type": "enumeration", "enum": ["pending", "processing", "completed", "failed"], "default": "pending" }, "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" }, "lesson": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course-lesson" }, "deletedAt": { "type": "datetime", "default": null } };
const quizBatch$2 = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const contentTypes = {
  quiz: { schema: quiz$2 },
  "quiz-record": { schema: quizRecord$2 },
  "quiz-exam": { schema: quizExam$2 },
  "quiz-exam-attempt": { schema: quizExamAttempt$2 },
  "quiz-batch": { schema: quizBatch$2 }
};
const wrap$4 = (data, meta = {}) => ({ data, meta });
const wrapList$4 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const quiz$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$4(await strapi.plugin("zhao-quiz").service("quiz").find(ctx.query, ctx.state.channelScope));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "题目不存在" };
        return;
      }
      ctx.body = wrap$4(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$4(await strapi.plugin("zhao-quiz").service("quiz").create(body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$4(await strapi.plugin("zhao-quiz").service("quiz").update(documentId, ctx.request.body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$4(await strapi.plugin("zhao-quiz").service("quiz").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async startQuiz(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { lessonDocumentId, count } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").startQuiz(userId, lessonDocumentId, count);
      ctx.body = wrap$4(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  },
  async claimQuizPoints(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId, totalEarnedPoints, lessonDocumentId, selectedChannelId } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").claimQuizPoints(
        userId,
        courseDocumentId,
        totalEarnedPoints,
        lessonDocumentId,
        selectedChannelId
      );
      ctx.body = wrap$4(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  },
  async checkAnswer(ctx) {
    try {
      const { quizDocumentId, userAnswer } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").checkAnswer(quizDocumentId, userAnswer);
      ctx.body = wrap$4(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  }
});
const wrap$3 = (data, meta = {}) => ({ data, meta });
const wrapList$3 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const quizRecord$1 = ({ strapi }) => ({
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilterDeep(ctx, path2) {
    return this._scopeSvc()?.buildChannelFilterDeep?.(ctx.state?.channelScope, path2) ?? null;
  },
  _assertInScope(ctx, record, field) {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },
  async find(ctx) {
    try {
      const query = { ...ctx.query };
      const cf = this._channelFilterDeep(ctx, ["course", "channel"]);
      if (cf) {
        query.filters = { ...query.filters ?? {}, ...cf };
      }
      ctx.body = wrapList$3(await strapi.plugin("zhao-quiz").service("quiz-record").find(query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-record").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "答题记录不存在" };
        return;
      }
      if (result.course != null) {
        const courseDocId = typeof result.course === "object" ? result.course?.documentId : result.course;
        if (courseDocId) {
          const course = await strapi.db.query("plugin::zhao-course.course").findOne({
            where: { documentId: courseDocId },
            populate: { channel: { select: ["id"] } }
          });
          if (course?.channel) {
            this._assertInScope(ctx, course, "channel");
          }
        }
      }
      ctx.body = wrap$3(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      ctx.body = wrap$3(await strapi.plugin("zhao-quiz").service("quiz-record").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$3(await strapi.plugin("zhao-quiz").service("quiz-record").update(documentId, body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$3(await strapi.plugin("zhao-quiz").service("quiz-record").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async submitAnswer(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { quizDocumentId, answer, lessonDocumentId } = ctx.request.body;
      ctx.body = wrap$3(await strapi.plugin("zhao-quiz").service("quiz-record").submitAnswer(userId, quizDocumentId, answer, lessonDocumentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  async teacherGrade(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { teacherScore } = body;
      const graderUserId = ctx.state.user?.id;
      ctx.body = wrap$3(await strapi.plugin("zhao-quiz").service("quiz-record").teacherGrade(documentId, teacherScore, graderUserId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  async getUserRecords(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId } = ctx.query;
      ctx.body = wrapList$3(await strapi.plugin("zhao-quiz").service("quiz-record").getUserRecords(userId, courseDocumentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async getPendingGrading(ctx) {
    try {
      const { courseDocumentId } = ctx.query;
      ctx.body = wrapList$3(await strapi.plugin("zhao-quiz").service("quiz-record").getPendingGrading(courseDocumentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const wrap$2 = (data, meta = {}) => ({ data, meta });
const wrapList$2 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const quizExam$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$2(await strapi.plugin("zhao-quiz").service("quiz-exam").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "考试不存在" };
        return;
      }
      ctx.body = wrap$2(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      ctx.body = wrap$2(await strapi.plugin("zhao-quiz").service("quiz-exam").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$2(await strapi.plugin("zhao-quiz").service("quiz-exam").update(documentId, body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$2(await strapi.plugin("zhao-quiz").service("quiz-exam").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async getQuestions(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$2(await strapi.plugin("zhao-quiz").service("quiz-exam").getQuestions(documentId));
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message || err };
      return;
    }
  }
});
const wrap$1 = (data, meta = {}) => ({ data, meta });
const wrapList$1 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const quizExamAttempt$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "考试记录不存在" };
        return;
      }
      ctx.body = wrap$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      ctx.body = wrap$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").update(documentId, ctx.request.body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async startExam(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { examDocumentId } = ctx.request.body;
      ctx.body = wrap$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").startExam(userId, examDocumentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  async submitExam(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { answers } = body;
      ctx.body = wrap$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").submitExam(documentId, answers));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  async getUserAttempts(ctx) {
    try {
      const userId = ctx.state.user?.id;
      const { examDocumentId } = ctx.query;
      ctx.body = wrapList$1(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").getUserAttempts(userId, examDocumentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const quizBatch$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-batch").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-batch").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "批量导入记录不存在" };
        return;
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async create(ctx) {
    try {
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-batch").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-batch").update(documentId, body));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-batch").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  },
  async importFile(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-batch").importFromFile(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
      return;
    }
  },
  async downloadTemplate(ctx) {
    try {
      const buffer = await strapi.plugin("zhao-quiz").service("quiz-batch").downloadTemplate();
      ctx.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      ctx.set("Content-Disposition", "attachment; filename=quiz_import_template.xlsx");
      ctx.body = buffer;
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
      return;
    }
  }
});
const controllers = {
  quiz: quiz$1,
  "quiz-record": quizRecord$1,
  "quiz-exam": quizExam$1,
  "quiz-exam-attempt": quizExamAttempt$1,
  "quiz-batch": quizBatch$1
};
const publicRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"]
  }
});
const userRoute = (method, path2, handler) => ({
  method,
  path: `/v1${path2}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const channelScopeRoute = (method, path2, handler, permission) => ({
  method,
  path: `/v1/admin${path2}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    publicRoute("GET", "/quizzes", "quiz.find"),
    publicRoute("GET", "/quizzes/:documentId", "quiz.findOne"),
    publicRoute("GET", "/quiz-exams", "quiz-exam.find"),
    publicRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne"),
    userRoute("POST", "/my/quiz-records/submit", "quiz-record.submitAnswer"),
    userRoute("GET", "/my/quiz-records", "quiz-record.getUserRecords"),
    userRoute("POST", "/my/quiz/start", "quiz.startQuiz"),
    userRoute("POST", "/my/quiz/check-answer", "quiz.checkAnswer"),
    userRoute("POST", "/my/quiz/claim-points", "quiz.claimQuizPoints"),
    userRoute("POST", "/my/quiz-exam-attempts/start", "quiz-exam-attempt.startExam"),
    userRoute("POST", "/my/quiz-exam-attempts/:documentId/submit", "quiz-exam-attempt.submitExam"),
    userRoute("GET", "/my/exam-attempts", "quiz-exam-attempt.getUserAttempts"),
    userRoute("GET", "/my/quiz-exams/:documentId/questions", "quiz-exam.getQuestions"),
    channelScopeRoute("GET", "/quizzes", "quiz.find", "quiz.read"),
    channelScopeRoute("GET", "/quizzes/:documentId", "quiz.findOne", "quiz.read"),
    channelScopeRoute("POST", "/quizzes", "quiz.create", "quiz.create"),
    channelScopeRoute("PUT", "/quizzes/:documentId", "quiz.update", "quiz.update"),
    channelScopeRoute("DELETE", "/quizzes/:documentId", "quiz.delete", "quiz.delete"),
    channelScopeRoute("GET", "/quiz-exams", "quiz-exam.find", "exam.read"),
    channelScopeRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne", "exam.read"),
    channelScopeRoute("POST", "/quiz-exams", "quiz-exam.create", "exam.create"),
    channelScopeRoute("PUT", "/quiz-exams/:documentId", "quiz-exam.update", "exam.update"),
    channelScopeRoute("DELETE", "/quiz-exams/:documentId", "quiz-exam.delete", "exam.delete"),
    channelScopeRoute("GET", "/quiz-exams/:documentId/questions", "quiz-exam.getQuestions", "exam.read"),
    channelScopeRoute("GET", "/quiz-records", "quiz-record.find", "quiz-record.read"),
    channelScopeRoute("GET", "/quiz-records/:documentId", "quiz-record.findOne", "quiz-record.read"),
    channelScopeRoute("PUT", "/quiz-records/:documentId/grade", "quiz-record.teacherGrade", "quiz-record.read"),
    channelScopeRoute("GET", "/quiz-records/pending-grading", "quiz-record.getPendingGrading", "quiz-record.read"),
    channelScopeRoute("GET", "/quiz-exam-attempts", "quiz-exam-attempt.find", "exam.read"),
    channelScopeRoute("GET", "/quiz-exam-attempts/:documentId", "quiz-exam-attempt.findOne", "exam.read"),
    channelScopeRoute("GET", "/quiz-batches", "quiz-batch.find", "quiz.read"),
    channelScopeRoute("GET", "/quiz-batches/:documentId", "quiz-batch.findOne", "quiz.read"),
    channelScopeRoute("POST", "/quiz-batches", "quiz-batch.create", "quiz.create"),
    channelScopeRoute("PUT", "/quiz-batches/:documentId", "quiz-batch.update", "quiz.update"),
    channelScopeRoute("DELETE", "/quiz-batches/:documentId", "quiz-batch.delete", "quiz.delete"),
    channelScopeRoute("POST", "/quiz-batches/:documentId/import", "quiz-batch.importFile", "quiz.create"),
    channelScopeRoute("GET", "/quiz-batches/template/download", "quiz-batch.downloadTemplate", "quiz.read")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApi().routes
  }
};
const UID$4 = "plugin::zhao-quiz.quiz";
const LESSON_UID = "plugin::zhao-course.course-lesson";
const quiz = ({ strapi }) => {
  const getFeatureFlagsMap = async () => {
    try {
      const flagService = strapi.plugin("zhao-common")?.service("feature-flag");
      if (!flagService?.findByKey) return {};
      const flag = await flagService.findByKey("channel_cross_points");
      return { channel_cross_points: !!(flag && (flag.flagValue === true || flag.enabled === true)) };
    } catch {
      return {};
    }
  };
  return {
    async find(query = {}, channelScope) {
      const mergedFilters = { ...query.filters || {} };
      if (channelScope && !channelScope.all && channelScope.channelIds.length > 0) {
        mergedFilters.$or = [
          { channelScope: "all" },
          ...channelScope.channelIds.map((id) => ({ channelScope: "specific", channelIds: { $contains: id } }))
        ];
      }
      const page = Number(query.pagination?.page) || 1;
      const pageSize = Number(query.pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID$4).findMany({
          ...query,
          filters: mergedFilters,
          populate: { course: true, lesson: true, ...query.populate || {} },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID$4).count({ filters: mergedFilters })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID$4).findOne({
        documentId,
        populate: { course: true, lesson: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$4).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$4).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$4).delete({ documentId });
    },
    async findByType(type, query = {}) {
      return strapi.documents(UID$4).findMany({
        ...query,
        filters: { type, ...query.filters || {} },
        populate: { course: true, lesson: true }
      });
    },
    async findByDifficulty(difficulty, query = {}) {
      return strapi.documents(UID$4).findMany({
        ...query,
        filters: { difficulty, ...query.filters || {} }
      });
    },
    async findByCourse(courseDocumentId, query = {}) {
      return strapi.documents(UID$4).findMany({
        ...query,
        filters: { course: { documentId: courseDocumentId }, ...query.filters || {} },
        populate: { course: true, lesson: true }
      });
    },
    async findByLesson(lessonDocumentId, query = {}) {
      return strapi.documents(UID$4).findMany({
        ...query,
        filters: { lesson: { documentId: lessonDocumentId }, ...query.filters || {} },
        populate: { course: true, lesson: true }
      });
    },
    /**
     * C端开始答题：随机抽取题目 + 积分配置
     * 前置校验：课时内容必须完成才能答题
     */
    async startQuiz(userId, lessonDocumentId, count = 2) {
      const lesson = await strapi.documents(LESSON_UID).findOne({
        documentId: lessonDocumentId,
        populate: { course: true }
      });
      if (!lesson) {
        const e = new Error("课时不存在");
        e.code = "QUIZ_016";
        e.status = 404;
        throw e;
      }
      if (userId) {
        const PROGRESS_UID = "plugin::zhao-course.lesson-progress";
        const progress = await strapi.db.query(PROGRESS_UID).findOne({
          where: { user: userId, lesson: lesson.id }
        });
        if (!progress || !progress.isCompleted) {
          const e = new Error("请先完成课时内容再答题");
          e.code = "QUIZ_017";
          e.status = 403;
          throw e;
        }
      }
      const allQuestions = await strapi.documents(UID$4).findMany({
        filters: { lesson: { documentId: lessonDocumentId }, isPublished: true },
        populate: { course: true, lesson: true }
      });
      const questions = Array.isArray(allQuestions) ? allQuestions : [];
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
      const safeQuestions = selected.map((q) => ({
        documentId: q.documentId,
        title: q.title,
        type: q.type,
        options: q.options,
        points: q.points || 0
      }));
      const course = lesson?.course || null;
      const actualCount = selected.length || 1;
      let pointsConfig = { enabled: false, perQuestionPoints: 0, pointsType: "none", totalQuestions: actualCount };
      if (course?.enablePoints) {
        if (lesson?.enablePoints && lesson.pointsType === "quiz_points") {
          pointsConfig = { enabled: true, perQuestionPoints: 0, pointsType: "quiz_points", totalQuestions: actualCount };
        } else if (lesson?.enablePoints) {
          const perQ = Math.floor((lesson.points || 0) / actualCount);
          pointsConfig = { enabled: true, perQuestionPoints: perQ, pointsType: "lesson_points", totalQuestions: actualCount };
        } else {
          const perQ = Math.floor((course.points || 0) / actualCount);
          pointsConfig = { enabled: true, perQuestionPoints: perQ, pointsType: "course_points", totalQuestions: actualCount };
        }
      }
      return {
        questions: safeQuestions,
        pointsConfig,
        courseDocumentId: course?.documentId || null,
        channelConfig: course ? {
          channelScope: course.channelScope || "all",
          channelIds: Array.isArray(course.channelIds) ? course.channelIds : [],
          pointChannelId: course.pointChannel?.id ?? course.pointChannel ?? null,
          pointChannelName: course.pointChannel?.name || "",
          allowCrossChannel: course.allowCrossChannel !== false
        } : null,
        featureFlags: await getFeatureFlagsMap()
      };
    },
    /**
     * C端判题：验证答案是否正确
     */
    async checkAnswer(quizDocumentId, userAnswer) {
      const quiz2 = await strapi.documents(UID$4).findOne({ documentId: quizDocumentId });
      if (!quiz2) {
        const e = new Error("题目不存在");
        e.code = "QUIZ_015";
        e.status = 404;
        throw e;
      }
      const correctAnswer = quiz2.answer || "";
      const normalize = (ans) => ans.split(",").map((s) => s.trim()).filter(Boolean).sort().join(",");
      const isCorrect = normalize(userAnswer) === normalize(correctAnswer);
      return {
        isCorrect,
        correctAnswer,
        explanation: quiz2.explanation || ""
      };
    },
    /**
     * C端领取答题积分
     */
    async claimQuizPoints(userId, courseDocumentId, totalEarnedPoints, lessonDocumentId, selectedChannelId) {
      const RECORD_UID = "plugin::zhao-point.point-record";
      const dedupeSource = lessonDocumentId || courseDocumentId;
      const existing = await strapi.db.query(RECORD_UID).findOne({
        where: { user: userId, action: "quiz_pass", source: dedupeSource }
      });
      if (existing) {
        const e = new Error("该课时答题积分已领取");
        e.code = "QUIZ_013";
        e.status = 400;
        throw e;
      }
      const totalPoints = totalEarnedPoints;
      if (totalPoints <= 0) {
        return { pointsEarned: 0 };
      }
      const course = await strapi.documents("plugin::zhao-course.course").findOne({
        documentId: courseDocumentId,
        populate: { pointChannel: true }
      });
      const channelIds = Array.isArray(course?.channelIds) ? course.channelIds : [];
      const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
      const finalChannelRaw = selectedChannelId ?? pointChannelId;
      if (!finalChannelRaw) {
        const e = new Error("必须选择积分充值渠道");
        e.code = "QUIZ_020";
        e.status = 400;
        throw e;
      }
      if (course?.channelScope === "specific" && finalChannelRaw) {
        const inScope = channelIds.some((id) => String(id) === String(finalChannelRaw));
        if (!inScope) {
          const e = new Error("所选渠道不在课程所属渠道范围内");
          e.code = "QUIZ_018";
          e.status = 400;
          throw e;
        }
      }
      const resolveChannelNumericId = async (channelId) => {
        const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
          where: {
            $or: [
              { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
              { documentId: String(channelId) }
            ]
          },
          select: ["id"]
        });
        return ch?.id ?? null;
      };
      const finalChannelId = await resolveChannelNumericId(finalChannelRaw);
      if (!finalChannelId) {
        const e = new Error("所选渠道不存在");
        e.code = "QUIZ_021";
        e.status = 400;
        throw e;
      }
      let userChannelId = null;
      try {
        const channelMemberService = strapi.plugin("zhao-channel")?.service("channel-member");
        if (channelMemberService?.getMyChannel) {
          const myCh = await channelMemberService.getMyChannel(userId);
          userChannelId = myCh?.channel?.id ?? null;
        }
      } catch {
      }
      try {
        const pointService = strapi.plugin("zhao-point")?.service("point");
        if (pointService?.earnCustomPoints) {
          await pointService.earnCustomPoints({
            userId,
            action: "quiz_pass",
            points: totalPoints,
            source: dedupeSource,
            remark: `答题获得${totalPoints}积分`,
            channelId: finalChannelId,
            userChannelId: userChannelId ?? void 0
          });
        }
      } catch (e) {
        const err = new Error(e.message || "积分发放失败");
        err.code = "QUIZ_014";
        err.status = 400;
        throw err;
      }
      return { pointsEarned: totalPoints };
    }
  };
};
const UID$3 = "plugin::zhao-quiz.quiz-record";
const QUIZ_UID$1 = "plugin::zhao-quiz.quiz";
const quizRecord = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async find(query = {}) {
      const { filters, pagination } = query;
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID$3).findMany({
          ...query,
          populate: { user: true, quiz: true, course: true, lesson: true, grader: true, ...query.populate || {} },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID$3).count({ filters: filters || {} })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID$3).findOne({
        documentId,
        populate: { user: true, quiz: true, course: true, lesson: true, grader: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$3).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$3).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$3).delete({ documentId });
    },
    /**
     * 提交回答 - 自动判题或标记 essay 待评分
     */
    async submitAnswer(userId, quizDocumentId, answer, lessonDocId) {
      const quiz2 = await strapi.documents(QUIZ_UID$1).findOne({
        documentId: quizDocumentId,
        populate: { course: true, lesson: true }
      });
      if (!quiz2) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("QUIZ_001") : "题目不存在";
        throwErr("QUIZ_001", 404, msg);
      }
      const courseId = quiz2.course?.id || quiz2.course;
      const lessonId = lessonDocId ? quiz2.lesson?.id || quiz2.lesson : quiz2.lesson?.id || quiz2.lesson;
      const isEssay = quiz2.type === "essay";
      let isCorrect = false;
      let score = 0;
      let scoringStatus = "auto_graded";
      if (isEssay) {
        scoringStatus = "pending";
      } else {
        isCorrect = String(answer).trim().toLowerCase() === String(quiz2.answer).trim().toLowerCase();
        score = isCorrect ? quiz2.points || 0 : 0;
      }
      const record = await strapi.documents(UID$3).create({
        data: {
          user: userId,
          quiz: quiz2.id || quiz2.documentId,
          answer: typeof answer === "object" ? answer : { text: answer },
          isCorrect: isEssay ? void 0 : isCorrect,
          score,
          teacherScore: 0,
          scoringStatus,
          totalPoints: quiz2.points || 0,
          submittedAt: /* @__PURE__ */ new Date(),
          course: courseId,
          lesson: lessonId
        }
      });
      return record;
    },
    /**
     * 教师人工评分（仅限 essay 问答题）
     */
    async teacherGrade(recordDocumentId, teacherScore, graderUserId) {
      const record = await strapi.documents(UID$3).findOne({
        documentId: recordDocumentId,
        populate: { quiz: true }
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
      const result = await strapi.documents(UID$3).update({
        documentId: recordDocumentId,
        data: {
          teacherScore: Math.max(0, teacherScore),
          score: Math.max(0, teacherScore),
          scoringStatus: "manual_graded",
          grader: graderUserId,
          gradedAt: /* @__PURE__ */ new Date(),
          isCorrect: teacherScore > 0
        }
      });
      return result;
    },
    /**
     * 查询用户的答题记录
     */
    async getUserRecords(userId, courseDocId) {
      const filters = { user: { id: userId } };
      if (courseDocId) {
        filters.course = { documentId: courseDocId };
      }
      return strapi.documents(UID$3).findMany({
        filters,
        populate: { quiz: true, course: true, lesson: true, grader: true },
        sort: { submittedAt: "desc" }
      });
    },
    /**
     * 查询待评分的问答题记录
     */
    async getPendingGrading(courseDocId) {
      const filters = { scoringStatus: "pending" };
      if (courseDocId) {
        filters.course = { documentId: courseDocId };
      }
      return strapi.documents(UID$3).findMany({
        filters,
        populate: { user: true, quiz: true, course: true, lesson: true },
        sort: { submittedAt: "asc" }
      });
    }
  };
};
const UID$2 = "plugin::zhao-quiz.quiz-exam";
const quizExam = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async find(query = {}) {
      const { filters, pagination } = query;
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID$2).findMany({
          ...query,
          populate: { course: true, lesson: true, questions: true, ...query.populate || {} },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID$2).count({ filters: filters || {} })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID$2).findOne({
        documentId,
        populate: { course: true, lesson: true, questions: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$2).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$2).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$2).delete({ documentId });
    },
    /**
     * 获取考试题目（支持随机排序）
     */
    async getQuestions(examDocumentId) {
      const exam = await strapi.documents(UID$2).findOne({
        documentId: examDocumentId,
        populate: { questions: true }
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
      return questions.map((q) => ({
        ...q,
        answer: void 0,
        points: questionPoints[q.documentId] || q.points || 0
      }));
    },
    /**
     * 计算考试总分
     */
    async calculateTotalPoints(examDocumentId) {
      const exam = await strapi.documents(UID$2).findOne({
        documentId: examDocumentId,
        populate: { questions: true }
      });
      if (!exam) return 0;
      const questionPoints = exam.questionPoints || {};
      const total = (exam.questions || []).reduce((sum, q) => {
        return sum + (questionPoints[q.documentId] || q.points || 0);
      }, 0);
      return total;
    }
  };
};
const UID$1 = "plugin::zhao-quiz.quiz-exam-attempt";
const EXAM_UID = "plugin::zhao-quiz.quiz-exam";
const quizExamAttempt = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async find(query = {}) {
      const { filters, pagination } = query;
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID$1).findMany({
          ...query,
          populate: { user: true, exam: true, ...query.populate || {} },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID$1).count({ filters: filters || {} })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID$1).findOne({
        documentId,
        populate: { user: true, exam: true }
      });
    },
    async create(data) {
      return strapi.documents(UID$1).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID$1).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID$1).delete({ documentId });
    },
    /**
     * 开始考试
     */
    async startExam(userId, examDocumentId) {
      const exam = await strapi.documents(EXAM_UID).findOne({ documentId: examDocumentId });
      if (!exam) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("QUIZ_004") : "考试不存在";
        throwErr("QUIZ_004", 404, msg);
      }
      if (!exam.allowRetry) {
        const existing2 = await strapi.db.query(UID$1).findMany({ where: { user: userId, exam: exam.id } });
        if (existing2.length > 0) {
          const i18n = strapi.plugin("zhao-common")?.service("i18n");
          const msg = i18n ? i18n.t("QUIZ_005") : "该考试不允许重试";
          throwErr("QUIZ_005", 400, msg);
        }
      } else if (exam.maxAttempts > 0) {
        const count = await strapi.db.query(UID$1).count({ where: { user: userId, exam: exam.id } });
        if (count >= exam.maxAttempts) {
          const i18n = strapi.plugin("zhao-common")?.service("i18n");
          const msg = i18n ? i18n.t("QUIZ_005") : "考试次数已达上限";
          throwErr("QUIZ_005", 400, msg);
        }
      }
      const existing = await strapi.db.query(UID$1).findMany({ where: { user: userId, exam: exam.id } });
      const attempt = await strapi.db.query(UID$1).create({
        data: {
          user: userId,
          exam: exam.id,
          answers: [],
          totalScore: 0,
          isPassed: false,
          startedAt: /* @__PURE__ */ new Date(),
          attemptNumber: (existing?.length || 0) + 1,
          duration: 0
        }
      });
      return attempt;
    },
    /**
     * 提交答卷
     */
    async submitExam(attemptDocumentId, answers) {
      const attempt = await strapi.documents(UID$1).findOne({
        documentId: attemptDocumentId,
        populate: { exam: { populate: { questions: true } } }
      });
      if (!attempt) {
        const i18n = strapi.plugin("zhao-common")?.service("i18n");
        const msg = i18n ? i18n.t("QUIZ_004") : "考试记录不存在";
        throwErr("QUIZ_004", 404, msg);
      }
      const exam = attempt.exam;
      if (!exam) throwErr("QUIZ_010", 404, "关联考试不存在");
      const questionPoints = exam.questionPoints || {};
      const questions = exam.questions || [];
      let totalScore = 0;
      for (const answer of answers) {
        const question = questions.find(
          (q) => q.documentId === answer.quizDocumentId || q.id === answer.quizId
        );
        if (question && question.type !== "essay") {
          const maxPoints = questionPoints[question.documentId] || question.points || 0;
          const isCorrect = String(answer.answer).trim().toLowerCase() === String(question.answer).trim().toLowerCase();
          if (isCorrect) {
            totalScore += maxPoints;
          }
        }
      }
      const duration = attempt.startedAt ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1e3) : 0;
      const passScore = Number(exam.passScore) || 60;
      const isPassed = totalScore >= passScore;
      const result = await strapi.db.query(UID$1).update({
        where: { id: attempt.id },
        data: {
          answers,
          totalScore,
          isPassed,
          submittedAt: /* @__PURE__ */ new Date(),
          duration
        }
      });
      return result;
    },
    /**
     * 查询用户的考试记录
     */
    async getUserAttempts(userId, examDocumentId) {
      return strapi.documents(UID$1).findMany({
        filters: { user: { id: userId }, exam: { documentId: examDocumentId } },
        populate: { exam: true },
        sort: { startedAt: "desc" }
      });
    }
  };
};
const UID = "plugin::zhao-quiz.quiz-batch";
const QUIZ_UID = "plugin::zhao-quiz.quiz";
const quizBatch = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  return {
    async find(query = {}) {
      const { filters, pagination } = query;
      const page = Number(pagination?.page) || 1;
      const pageSize = Number(pagination?.pageSize) || 25;
      const [list, total] = await Promise.all([
        strapi.documents(UID).findMany({
          ...query,
          populate: { course: true, lesson: true, file: true, templateFile: true, ...query.populate || {} },
          pagination: { page, pageSize }
        }),
        strapi.documents(UID).count({ filters: filters || {} })
      ]);
      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    },
    async findOne(documentId) {
      return strapi.documents(UID).findOne({
        documentId,
        populate: { course: true, lesson: true, file: true, templateFile: true }
      });
    },
    async create(data) {
      return strapi.documents(UID).create({ data });
    },
    async update(documentId, data) {
      return strapi.documents(UID).update({ documentId, data });
    },
    async delete(documentId) {
      return strapi.documents(UID).delete({ documentId });
    },
    _getFilePath(fileInfo) {
      if (!fileInfo) return null;
      const uploadDir = strapi.dirs?.static?.public || path__namespace.join(process.cwd(), "public", "uploads");
      const fileName = fileInfo.hash || fileInfo.name;
      const ext = fileInfo.ext || "";
      const filePath = path__namespace.join(uploadDir, fileName + ext);
      if (fs__namespace.existsSync(filePath)) return filePath;
      const altPath = path__namespace.join(uploadDir, fileInfo.url?.replace("/uploads/", "") || "");
      if (fs__namespace.existsSync(altPath)) return altPath;
      return null;
    },
    async importFromFile(batchDocumentId) {
      const batch = await strapi.documents(UID).findOne({
        documentId: batchDocumentId,
        populate: { file: true, course: true, lesson: true }
      });
      if (!batch) {
        throwErr("QUIZ_007", 404, "批量导入记录不存在");
      }
      await strapi.documents(UID).update({
        documentId: batchDocumentId,
        data: { status: "processing" }
      });
      const results = { total: 0, success: 0, errors: [] };
      const courseDocId = batch.course?.documentId;
      const lessonDocId = batch.lesson?.documentId;
      try {
        const filePath = this._getFilePath(batch.file);
        if (!filePath) {
          throwErr("QUIZ_008", 400, "无法找到上传的文件");
        }
        const workbook = XLSX__namespace.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throwErr("QUIZ_009", 400, "工作簿中无工作表");
        const data = XLSX__namespace.utils.sheet_to_json(workbook.Sheets[sheetName]);
        results.total = data.length;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2;
          try {
            const type = (row.题型 || row.type || "").toString().trim();
            const title = (row.题目 || row.title || "").toString().trim();
            const answer = (row.答案 || row.answer || "").toString().trim();
            const points = parseInt(row.分值 || row.points || "0", 10) || 0;
            const difficulty = (row.难度 || row.difficulty || "medium").toString().trim();
            const explanation = (row.解析 || row.explanation || "").toString().trim();
            const sort = parseInt(row.排序 || row.sort || "0", 10) || 0;
            const validTypes = ["single_choice", "multiple_choice", "true_false", "fill_blank", "short_answer", "essay", "matching", "ordering"];
            if (!validTypes.includes(type)) {
              results.errors.push(`第${rowNum}行: 题型 "${type}" 无效`);
              continue;
            }
            if (!title) {
              results.errors.push(`第${rowNum}行: 题目内容不能为空`);
              continue;
            }
            if (!answer && type !== "essay") {
              results.errors.push(`第${rowNum}行: 答案不能为空（问答题除外）`);
              continue;
            }
            let options2 = null;
            if (row.选项 || row.options) {
              const optStr = (row.选项 || row.options).toString();
              try {
                options2 = JSON.parse(optStr);
              } catch {
                options2 = optStr;
              }
            }
            const quizData = {
              title,
              type,
              answer: answer || "",
              points,
              difficulty,
              explanation,
              sort,
              isPublished: true
            };
            if (options2) quizData.options = options2;
            if (courseDocId) quizData.course = courseDocId;
            if (lessonDocId) quizData.lesson = lessonDocId;
            await strapi.documents(QUIZ_UID).create({ data: quizData });
            results.success++;
          } catch (rowErr) {
            results.errors.push(`第${rowNum}行: ${rowErr.message}`);
          }
        }
      } catch (err) {
        results.errors.push(err.message);
      }
      const status = results.errors.length === 0 ? "completed" : results.success > 0 ? "completed" : "failed";
      await strapi.documents(UID).update({
        documentId: batchDocumentId,
        data: {
          status,
          totalCount: results.total,
          successCount: results.success,
          errorCount: results.errors.length,
          errors: results.errors
        }
      });
      return results;
    },
    async generateTemplate(_courseDocId, _lessonDocId) {
      const headers = ["题型", "题目", "选项(JSON)", "答案", "分值", "难度", "解析", "排序"];
      const example = [
        ["single_choice", "中国的首都是哪里？", '["北京","上海","广州","深圳"]', "北京", 5, "easy", "这是地理常识题", 1],
        ["multiple_choice", "以下哪些是编程语言？", '["JavaScript","HTML","Python","CSS"]', "JavaScript,Python", 10, "medium", "HTML和CSS不是编程语言", 2],
        ["true_false", "地球是圆的", "", "true", 3, "easy", "", 3],
        ["fill_blank", "1+1=___", "", "2", 3, "easy", "", 4],
        ["short_answer", "请简述MVC模式", "", "MVC是模型-视图-控制器", 8, "hard", "", 5],
        ["essay", "请论述AI的未来发展", "", "", 15, "hard", "参考答案：从技术进步角度论述", 6]
      ];
      const ws = XLSX__namespace.utils.aoa_to_sheet([headers, ...example]);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX__namespace.utils.book_new();
      XLSX__namespace.utils.book_append_sheet(wb, ws, "题目导入");
      const buffer = XLSX__namespace.write(wb, { type: "buffer", bookType: "xlsx" });
      return buffer;
    },
    async downloadTemplate() {
      return this.generateTemplate();
    }
  };
};
const services = {
  quiz,
  "quiz-record": quizRecord,
  "quiz-exam": quizExam,
  "quiz-exam-attempt": quizExamAttempt,
  "quiz-batch": quizBatch
};
const policies = {};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies
};
exports.default = index;

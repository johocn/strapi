import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "考试记录不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").update(documentId, ctx.request.body));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async startExam(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { examDocumentId } = ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").startExam(userId, examDocumentId));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  async submitExam(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { answers } = body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").submitExam(documentId, answers));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  async getUserAttempts(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { examDocumentId } = ctx.query;
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-exam-attempt").getUserAttempts(userId, examDocumentId));
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});

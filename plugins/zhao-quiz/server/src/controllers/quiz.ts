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
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz").find(ctx.query, ctx.state.channelScope));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "题目不存在" };
        return;
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async create(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz").create(body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz").update(documentId, ctx.request.body));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async startQuiz(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { lessonDocumentId, count } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").startQuiz(userId, lessonDocumentId, count);
      ctx.body = wrap(result);
    } catch (err: any) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  },

  async claimQuizPoints(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId, totalEarnedPoints, lessonDocumentId, selectedChannelId } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").claimQuizPoints(
        userId, courseDocumentId, totalEarnedPoints, lessonDocumentId, selectedChannelId
      );
      ctx.body = wrap(result);
    } catch (err: any) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  },

  async checkAnswer(ctx: any) {
    try {
      const { quizDocumentId, userAnswer } = ctx.request.body;
      const result = await strapi.plugin("zhao-quiz").service("quiz").checkAnswer(quizDocumentId, userAnswer);
      ctx.body = wrap(result);
    } catch (err: any) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message || err };
    }
  },
});

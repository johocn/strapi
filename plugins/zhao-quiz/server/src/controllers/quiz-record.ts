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
  // 渠道范围过滤工具
  _scopeSvc() {
    return strapi.plugin("zhao-auth")?.service("channel-scope");
  },
  _channelFilterDeep(ctx: any, path: string[]): Record<string, any> | null {
    return this._scopeSvc()?.buildChannelFilterDeep?.(ctx.state?.channelScope, path) ?? null;
  },
  _assertInScope(ctx: any, record: any, field: string): void {
    this._scopeSvc()?.assertRecordInScope?.(ctx.state?.channelScope, record, field);
  },

  async find(ctx: any) {
    try {
      const query = { ...ctx.query };
      // quiz-record 无直接 channel 字段，通过 course 间接过滤
      const cf = this._channelFilterDeep(ctx, ["course", "channel"]);
      if (cf) {
        query.filters = { ...(query.filters ?? {}), ...cf };
      }
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-record").find(query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-quiz").service("quiz-record").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "答题记录不存在" }; return; }
      // 校验渠道归属：通过 course.channel 间接校验
      // course 可能是数字 id 或对象，需 populate 后才能拿到 channel
      if (result.course != null) {
        const courseDocId = typeof result.course === "object" ? result.course?.documentId : result.course;
        if (courseDocId) {
          const course = await strapi.db.query("plugin::zhao-course.course").findOne({
            where: { documentId: courseDocId },
            populate: { channel: { select: ["id"] } },
          });
          if (course?.channel) {
            this._assertInScope(ctx, course, "channel");
          }
        }
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-record").create(ctx.request.body));
      ctx.status = 201;
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-record").update(documentId, body));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-record").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async submitAnswer(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { quizDocumentId, answer, lessonDocumentId } = ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-record").submitAnswer(userId, quizDocumentId, answer, lessonDocumentId));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  async teacherGrade(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { teacherScore } = body;
      const graderUserId = ctx.state.user?.id;
      ctx.body = wrap(await strapi.plugin("zhao-quiz").service("quiz-record").teacherGrade(documentId, teacherScore, graderUserId));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  async getUserRecords(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { courseDocumentId } = ctx.query;
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-record").getUserRecords(userId, courseDocumentId));
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async getPendingGrading(ctx: any) {
    try {
      const { courseDocumentId } = ctx.query;
      ctx.body = wrapList(await strapi.plugin("zhao-quiz").service("quiz-record").getPendingGrading(courseDocumentId));
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});

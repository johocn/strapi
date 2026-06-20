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
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("lesson-progress").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("lesson-progress").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "课时进度不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("lesson-progress").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("lesson-progress").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-course").service("lesson-progress").delete(documentId);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 查询当前用户的课时进度列表
   */
  async myProgresses(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }
      const { course } = ctx.query;
      const filters: any = { user: { id: userId } };
      if (course) {
        filters.course = { documentId: course };
      }

      const results = await strapi.documents("plugin::zhao-course.lesson-progress").findMany({
        filters,
        populate: { lesson: true, course: true },
      });
      ctx.body = wrapList(results);
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  /**
   * 上报课时进度
   */
  async reportProgress(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { lessonDocumentId, lessonId } = ctx.request.body;
      const effectiveLessonId = lessonDocumentId || lessonId;

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      if (!effectiveLessonId) {
        ctx.status = 400; ctx.body = { error: "缺少课时 ID" }; return;
      }

      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lesson = await strapi.documents("plugin::zhao-course.course-lesson").findOne({
        documentId: effectiveLessonId,
        populate: { course: true },
      });

      if (!lesson) {
        ctx.status = 404; ctx.body = { error: "课时不存在" }; return;
      }

      const authResult = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, lesson.course.documentId);
      if (!authResult.authorized) {
        ctx.status = 403; ctx.body = { error: "未授权访问该课程" }; return;
      }

      ctx.body = wrap(await lessonProgressService.reportProgress(userId, ctx.request.body));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  /**
   * 提交课时答题
   */
  async submitAnswer(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;
      const { isCorrect } = ctx.request.body;

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      if (!documentId) {
        ctx.status = 400; ctx.body = { error: "缺少课时进度 ID" }; return;
      }

      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lessonProgress = await lessonProgressService.findLessonProgressById(documentId);

      if (!lessonProgress) {
        ctx.status = 404; ctx.body = { error: "课时进度不存在" }; return;
      }

      if (Number(lessonProgress.user?.id ?? lessonProgress.user) !== Number(userId)) {
        ctx.status = 403; ctx.body = { error: "只能操作自己的课时进度" }; return;
      }

      ctx.body = wrap(await lessonProgressService.submitAnswer(userId, documentId, isCorrect));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },

  /**
   * 领取课时积分
   */
  async claimPoints(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;
      const { selectedChannelId } = ctx.request.body || {};

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      if (!documentId) {
        ctx.status = 400; ctx.body = { error: "缺少课时进度 ID" }; return;
      }

      const lessonProgressService = strapi.plugin("zhao-course").service("lesson-progress");
      const lessonProgress = await lessonProgressService.findLessonProgressById(documentId);

      if (!lessonProgress) {
        ctx.status = 404; ctx.body = { error: "课时进度不存在" }; return;
      }

      if (Number(lessonProgress.user?.id ?? lessonProgress.user) !== Number(userId)) {
        ctx.status = 403; ctx.body = { error: "只能领取自己的课时积分" }; return;
      }

      ctx.body = wrap(await lessonProgressService.claimPoints(userId, documentId, selectedChannelId));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },
});

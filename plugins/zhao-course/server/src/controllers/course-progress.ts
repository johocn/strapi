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
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("course-progress").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-progress").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "进度记录不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("course-progress").create(data);
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
      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-progress").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-progress").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 获取我的课程进度
   */
  async myProgresses(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("course-progress").getUserProgresses(userId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /**
   * 领取课程积分
   */
  async claimPoints(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const { documentId } = ctx.params;

      if (!userId) {
        ctx.status = 401; ctx.body = { error: "用户未登录" }; return;
      }

      if (!documentId) {
        ctx.status = 400; ctx.body = { error: "缺少课程进度 ID" }; return;
      }

      const courseProgressService = strapi.plugin("zhao-course").service("course-progress");
      const courseProgress = await courseProgressService.findCourseProgressById(documentId);

      if (!courseProgress) {
        ctx.status = 404; ctx.body = { error: "课程进度不存在" }; return;
      }

      if (courseProgress.user.id !== userId) {
        ctx.status = 403; ctx.body = { error: "只能领取自己的课程积分" }; return;
      }

      const authResult = await strapi.plugin("zhao-course").service("user-course-auth").checkAuth(userId, courseProgress.course.documentId);
      if (!authResult.authorized) {
        ctx.status = 403; ctx.body = { error: "未授权访问该课程" }; return;
      }

      ctx.body = wrap(await courseProgressService.claimPoints(userId, documentId));
    } catch (err: any) {
      ctx.status = err.status || 400; ctx.body = { error: err.message || err }; return;
    }
  },
});

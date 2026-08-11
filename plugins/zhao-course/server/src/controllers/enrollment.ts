import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (Array.isArray(result)) return { data: result, meta: {} };
  if (result && typeof result === "object" && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("enrollment").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) { ctx.status = 400; ctx.body = { error: "缺少报名记录 ID" }; return; }
      const result = await strapi.plugin("zhao-course").service("enrollment").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "报名记录不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 查询当前用户对某课程的报名状态
   * GET /v1/enrollments/me?course=xxx
   */
  async myEnrollment(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "用户未登录" }; return; }
      const { course: courseDocumentId } = ctx.query;
      if (!courseDocumentId) { ctx.status = 400; ctx.body = { error: "缺少课程 ID" }; return; }
      const result = await strapi.plugin("zhao-course").service("enrollment").findMyEnrollment(userId, courseDocumentId);
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 查询当前用户的报名列表
   * GET /v1/enrollments
   */
  async myEnrollments(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "用户未登录" }; return; }
      const result = await strapi.plugin("zhao-course").service("enrollment").findMyEnrollments(userId, ctx.query);
      ctx.body = wrapList(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 创建报名（C 端用户）
   * POST /v1/enrollments
   * body: { course, enrollType, voucherUrl?, voucherNote?, accessCode? }
   */
  async create(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "用户未登录" }; return; }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { ctx.status = 400; ctx.body = { error: "无效的 JSON 数据" }; return; }
      }
      const { course: courseDocumentId, enrollType, voucherUrl, voucherNote, accessCode } = data || {};
      if (!courseDocumentId) { ctx.status = 400; ctx.body = { error: "缺少课程 ID" }; return; }
      if (!enrollType) { ctx.status = 400; ctx.body = { error: "缺少报名类型" }; return; }

      const result = await strapi.plugin("zhao-course").service("enrollment").createEnrollment(userId, {
        courseDocumentId,
        enrollType,
        voucherUrl,
        voucherNote,
        accessCode,
      });
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 管理员审核通过
   * PUT /v1/admin/enrollments/:documentId/approve
   */
  async approve(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const reviewerId = ctx.state.user?.id;
      if (!reviewerId) { ctx.status = 401; ctx.body = { error: "管理员未登录" }; return; }
      ctx.body = wrap(await strapi.plugin("zhao-course").service("enrollment").approve(documentId, reviewerId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 管理员驳回
   * PUT /v1/admin/enrollments/:documentId/reject
   * body: { reviewNote }
   */
  async reject(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const reviewerId = ctx.state.user?.id;
      if (!reviewerId) { ctx.status = 401; ctx.body = { error: "管理员未登录" }; return; }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = {}; } }
      const reviewNote = data?.reviewNote || data?.note || "";
      ctx.body = wrap(await strapi.plugin("zhao-course").service("enrollment").reject(documentId, reviewerId, reviewNote));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 管理员撤销已开通权限
   * PUT /v1/admin/enrollments/:documentId/revoke
   * body: { reviewNote }
   */
  async revoke(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const reviewerId = ctx.state.user?.id;
      if (!reviewerId) { ctx.status = 401; ctx.body = { error: "管理员未登录" }; return; }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = {}; } }
      const reviewNote = data?.reviewNote || data?.note || "";
      ctx.body = wrap(await strapi.plugin("zhao-course").service("enrollment").revoke(documentId, reviewerId, reviewNote));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});

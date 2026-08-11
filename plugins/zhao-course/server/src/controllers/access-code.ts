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
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("access-code").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) { ctx.status = 400; ctx.body = { error: "缺少开通码 ID" }; return; }
      const result = await strapi.plugin("zhao-course").service("access-code").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "开通码不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 批量生成开通码
   * POST /v1/admin/access-codes/batch
   * body: { courseDocumentId, count, totalQuota?, expireAt?, batchNote? }
   */
  async batchGenerate(ctx: any) {
    try {
      const creatorId = ctx.state.user?.id;
      if (!creatorId) { ctx.status = 401; ctx.body = { error: "管理员未登录" }; return; }
      let data = ctx.request.body?.data || ctx.request.body;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { ctx.status = 400; ctx.body = { error: "无效的 JSON 数据" }; return; }
      }
      const result = await strapi.plugin("zhao-course").service("access-code").batchGenerate(creatorId, {
        courseDocumentId: data?.courseDocumentId || data?.course,
        count: data?.count,
        totalQuota: data?.totalQuota,
        expireAt: data?.expireAt,
        batchNote: data?.batchNote,
      });
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  /**
   * 禁用开通码
   * PUT /v1/admin/access-codes/:documentId/disable
   */
  async disable(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("access-code").disable(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = await strapi.plugin("zhao-course").service("access-code").delete(documentId);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});

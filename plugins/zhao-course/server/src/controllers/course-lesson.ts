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
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("course-lesson").find(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-lesson").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "课时不存在" }; return; }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async create(ctx: any) {
    try {
      let data = ctx.request.body?.data || ctx.request.body;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = (parseErr as any).status || 400; ctx.body = { error: "无效的 JSON 数据" }; return;
        }
      }

      if (!data?.title) {
        ctx.status = 400; ctx.body = { error: "缺少课时名称" }; return;
      }

      const result = await strapi.plugin("zhao-course").service("course-lesson").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        ctx.status = 400; ctx.body = { error: "缺少课时 ID" }; return;
      }

      let data = ctx.request.body?.data || ctx.request.body;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          ctx.status = (parseErr as any).status || 400; ctx.body = { error: "无效的 JSON 数据" }; return;
        }
      }

      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-lesson").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-lesson").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});

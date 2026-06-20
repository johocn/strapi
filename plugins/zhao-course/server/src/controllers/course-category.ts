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
      ctx.body = wrapList(await strapi.plugin("zhao-course").service("course-category").find(ctx.query, ctx.state.channelScope));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async findOne(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-course").service("course-category").findOne(documentId);
      if (!result) { ctx.status = 404; ctx.body = { error: "分类不存在" }; return; }
      
      // 检查渠道访问权限（非管理员接口）
      if (!ctx.path?.includes("/admin/") && ctx.state.publicOnly !== false) {
        const ch = result as any;
        // 全渠道分类无需权限检查
        if (ch.channelScope === "all") {
          ctx.body = wrap(result);
          return;
        }
        // 允许跨渠道访问的分类无需权限检查
        if (ch.channelScope === "specific" && ch.allowCrossChannel === true) {
          ctx.body = wrap(result);
          return;
        }
        // 指定渠道且不允许跨渠道：检查用户渠道权限
        if (ch.channelScope === "specific" && ch.allowCrossChannel === false) {
          const userChannelIds = ctx.state.channelScope?.channelIds || [];
          const categoryChannelIds = Array.isArray(ch.channelIds) ? ch.channelIds : [];
          const hasAccess = userChannelIds.some(uid => categoryChannelIds.some(cid => String(uid) === String(cid)));
          if (!hasAccess) {
            ctx.status = 403;
            ctx.body = { error: "无权访问此分类" };
            return;
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
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-course").service("course-category").create(data);
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
      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-category").update(documentId, data));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-course").service("course-category").delete(documentId));
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});

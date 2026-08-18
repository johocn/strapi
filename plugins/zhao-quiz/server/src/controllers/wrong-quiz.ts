import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

const wrapList = (result: { list?: any[]; total?: number }) => {
  if (result && Array.isArray(result.list)) {
    return { data: result.list, meta: { pagination: { total: result.total || 0 } } };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 我的错题列表（默认 active） */
  async listMy(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "未登录" }; return; }
      const status = ctx.query?.status || "active";
      const page = Number(ctx.query?.page) || 1;
      const pageSize = Number(ctx.query?.pageSize) || 20;
      const result = await strapi.plugin("zhao-quiz").service("wrong-quiz").listByUser(userId, status, { page, pageSize });
      ctx.body = wrapList(result);
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },

  /** 待复习错题（错题重练队列） */
  async dueMine(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "未登录" }; return; }
      const limit = Number(ctx.query?.limit) || 30;
      const result = await strapi.plugin("zhao-quiz").service("wrong-quiz").dueList(userId, limit);
      ctx.body = wrapList(result);
    } catch (err: any) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message }; return;
    }
  },
});
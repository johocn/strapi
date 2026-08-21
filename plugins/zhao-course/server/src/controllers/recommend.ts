import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async related(ctx: any) {
    try {
      const { documentId } = ctx.params;
      if (!documentId) { ctx.status = 400; ctx.body = { error: "缺少课程 ID" }; return; }
      const limit = Math.min(Math.max(Number(ctx.query?.limit) || 6, 1), 20);
      const data = await strapi.plugin("zhao-course").service("recommend").relatedFor(documentId, limit);
      ctx.body = { data };
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message };
    }
  },

  async suggestions(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) { ctx.status = 401; ctx.body = { error: "用户未登录" }; return; }
      const limit = Math.min(Math.max(Number(ctx.query?.limit) || 6, 1), 20);
      const data = await strapi.plugin("zhao-course").service("recommend").suggestionsFor(userId, limit);
      ctx.body = { data };
    } catch (err) {
      ctx.status = (err as any).status || 400; ctx.body = { error: (err as Error).message };
    }
  },
});
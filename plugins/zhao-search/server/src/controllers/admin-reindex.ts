import type { Core } from "@strapi/strapi";

// 服务间调用鉴权：请求头 x-zhao-secret == ZHAO_SEARCH_SHARED_SECRET（未配置时一律 401，fail-closed）
const isAuthorized = (ctx: any) => {
  const secret = process.env.ZHAO_SEARCH_SHARED_SECRET;
  return !!secret && ctx.request.headers["x-zhao-secret"] === secret;
};

const unauthorized = (ctx: any) => {
  ctx.status = 401;
  ctx.body = { error: "unauthorized" };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async reindex(ctx: any) {
    if (!isAuthorized(ctx)) return unauthorized(ctx);
    try {
      const contentSync = strapi.plugin("zhao-search").service("content-sync");
      ctx.body = await contentSync.fullReindex();
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { ok: false, error: e?.message || String(e) };
    }
  },

  async health(ctx: any) {
    if (!isAuthorized(ctx)) return unauthorized(ctx);
    try {
      const meili = strapi.plugin("zhao-search").service("meili");
      const healthy = await meili.healthCheck();
      const indexes = healthy ? await meili.getStats() : [];
      ctx.body = { ok: true, meili: healthy, indexes };
    } catch (e: any) {
      ctx.body = { ok: true, meili: false, error: e?.message || String(e) };
    }
  },
});

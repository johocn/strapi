import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async get(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("site-config");
      const config = await service.getConfig();
      ctx.body = { data: config };
    } catch (e: any) {
      ctx.status = (e as any).status ?? 400;
      ctx.body = { error: e.message };
    }
  },

  async update(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const service = strapi.plugin("zhao-common").service("site-config");
      const config = await service.updateConfig(body);
      ctx.body = { data: config };
    } catch (e: any) {
      ctx.status = (e as any).status ?? 400;
      ctx.body = { error: e.message };
    }
  },

  async getPublic(ctx: any) {
    try {
      const service = strapi.plugin("zhao-common").service("site-config");
      const config = await service.getPublicConfig();
      ctx.body = { data: config };
    } catch (e: any) {
      ctx.status = (e as any).status ?? 400;
      ctx.body = { error: e.message };
    }
  },
});

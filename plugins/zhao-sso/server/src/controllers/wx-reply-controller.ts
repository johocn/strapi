import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-reply");

  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  return {
    async list(ctx: any) {
      await wrap(ctx, () => svc().list(ctx.query));
    },

    async create(ctx: any) {
      await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row: any) => ({ data: row })));
    },

    async update(ctx: any) {
      await wrap(ctx, () => svc().update(Number(ctx.params.id), ctx.request.body || {}).then((row: any) => ({ data: row })));
    },

    async delete(ctx: any) {
      await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },
  };
};
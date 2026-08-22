import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-article");

  async function wrap(ctx: any, fn: () => Promise<any>) {
    try {
      ctx.body = await fn();
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  }

  return {
    /** 创建图文草稿 */
    async create(ctx: any) {
      await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row: any) => ({ data: row })));
    },

    async list(ctx: any) {
      await wrap(ctx, () => svc().list(ctx.query));
    },

    async findOne(ctx: any) {
      await wrap(ctx, () => svc().findOne(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /** 更新 + 重提草稿 */
    async update(ctx: any) {
      await wrap(ctx, () => svc().update(Number(ctx.params.id), ctx.request.body || {}).then((row: any) => ({ data: row })));
    },

    /** 发布草稿 */
    async publish(ctx: any) {
      await wrap(ctx, () => svc().publish(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /** 发布状态刷新 */
    async status(ctx: any) {
      await wrap(ctx, () => svc().status(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /** 删除草稿 */
    async delete(ctx: any) {
      await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },
  };
};
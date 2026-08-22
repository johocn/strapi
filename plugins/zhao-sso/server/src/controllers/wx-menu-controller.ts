import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-menu");

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

    /** 一键下发菜单 */
    async publish(ctx: any) {
      await wrap(ctx, () => svc().publish(Number(ctx.params.id)).then((row: any) => ({ data: row })));
    },

    /** 删除线上菜单 */
    async deleteRemote(ctx: any) {
      await wrap(ctx, () => svc().deleteRemote().then((row: any) => ({ data: row })));
    },

    /** 获取线上菜单信息 */
    async getRemote(ctx: any) {
      await wrap(ctx, () => svc().getRemote().then((row: any) => ({ data: row })));
    },

    /** 公众号已添加模板只读列表 */
    async listTemplates(ctx: any) {
      await wrap(ctx, () => svc().listTemplates().then((row: any) => ({ data: row })));
    },
  };
};
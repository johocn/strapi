import type { Core } from "@strapi/strapi";

const RULE_UID = "plugin::zhao-sso.sop-rule";

export default ({ strapi }: { strapi: Core.Strapi }) => {
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
      await wrap(ctx, async () => {
        const results = await strapi.db.query(RULE_UID).findMany({
          orderBy: { id: "ASC" },
        });
        const total = await strapi.db.query(RULE_UID).count();
        return { data: results, meta: { total } };
      });
    },

    async create(ctx: any) {
      await wrap(ctx, async () => {
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(RULE_UID).create({ data });
        return { data: row };
      });
    },

    async update(ctx: any) {
      await wrap(ctx, async () => {
        const { id } = ctx.params;
        const data = ctx.request?.body || {};
        const row = await strapi.db.query(RULE_UID).update({ where: { id: Number(id) }, data });
        return { data: row };
      });
    },

    async delete(ctx: any) {
      await wrap(ctx, async () => {
        const { id } = ctx.params;
        await strapi.db.query(RULE_UID).delete({ where: { id: Number(id) } });
        return { data: { id: Number(id) } };
      });
    },
  };
};
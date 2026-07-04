import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: any) {
    try {
      ctx.body = wrapList(await strapi.documents("plugin::zhao-tag.tag-index").findMany(ctx.query));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
  async search(ctx: any) {
    try {
      const { tagId, targetType } = ctx.query;
      if (!tagId) { ctx.status = 400; ctx.body = { error: "tagId 必填" }; return; }
      const result = await strapi.plugin("zhao-tag").service("tag-index").searchByTag(tagId, targetType);
      ctx.body = wrapList(result);
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});

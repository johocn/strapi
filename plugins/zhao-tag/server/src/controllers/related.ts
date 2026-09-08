import type { Core } from "@strapi/strapi";

const wrapList = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByTags(ctx: any) {
    try {
      const { tags, types, limit = "3", exclude = "" } = ctx.query;
      if (!tags) { ctx.status = 400; ctx.body = { error: "tags 必填（逗号分隔 tag documentId）" }; return; }
      const tagIds = String(tags).split(",").map((s: string) => s.trim()).filter(Boolean);
      const svc = strapi.plugin("zhao-tag").service("related");
      const typeList = types ? String(types).split(",").map((s: string) => s.trim()).filter(Boolean) : svc.defaultTypes();
      const numLimit = Math.max(1, Math.min(20, parseInt(String(limit), 10) || 3));
      ctx.body = wrapList(await svc.findByTags(tagIds, typeList, numLimit, String(exclude)));
    } catch (err) {
      ctx.status = (err as any).status || 400;
      ctx.body = { error: (err as Error).message };
    }
  },
});

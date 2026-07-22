// server/src/controllers/permission-check.ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async check(ctx: any) {
    const { userId, action } = ctx.request.body;
    if (!userId || !action) {
      return ctx.throw(400, "userId and action are required");
    }
    const result = await strapi
      .plugin("zhao-auth")
      .service("permission-check")
      .checkPermission(userId, action);
    ctx.send({ data: result });
  },
});

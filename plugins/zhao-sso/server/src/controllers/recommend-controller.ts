import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** C 端"猜你喜欢"：基于 sso-user 画像兴趣标签推荐 课程/文章/活动 */
  async my(ctx: any) {
    try {
      const ssoUser = ctx.state?.ssoUser;
      if (!ssoUser?.sub) { ctx.status = 401; return { error: "未登录" }; }
      const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
      if (!user?.id) { ctx.status = 401; return { error: "未登录" }; }
      const limit = Math.min(Number(ctx.query?.limit) || 5, 10);
      const svc = strapi.plugin("zhao-sso").service("sso-recommend");
      ctx.body = { data: await svc.recommendFor(user.id, limit) };
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message, code: (e as any).code || null };
    }
  },
});

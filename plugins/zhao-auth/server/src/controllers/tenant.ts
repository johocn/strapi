import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getMyTenants(ctx: any) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = { error: "未登录" };
        return;
      }
      // 优先级：roles > zhaoRoles（与 has-tenant-access 保持一致）
      const roles: string[] =
        Array.isArray(user.roles) && user.roles.length > 0
          ? user.roles
          : Array.isArray(user.zhaoRoles)
          ? user.zhaoRoles
          : [];
      const tenants = await strapi
        .plugin("zhao-auth")
        .service("tenant")
        .getMyTenants(user.id, roles);
      ctx.body = { data: tenants };
    } catch (err: any) {
      strapi.log.error(`[zhao-auth] Get my tenants failed: ${err.message}`);
      ctx.status = err.status || 400;
      ctx.body = { error: err.message, code: err.code };
    }
  },
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async getMyTenants(ctx) {
        try {
            const user = ctx.state.user;
            if (!user) {
                ctx.status = 401;
                ctx.body = { error: "未登录" };
                return;
            }
            // 优先级：roles > zhaoRoles（与 has-tenant-access 保持一致）
            const roles = Array.isArray(user.roles) && user.roles.length > 0
                ? user.roles
                : Array.isArray(user.zhaoRoles)
                    ? user.zhaoRoles
                    : [];
            const tenants = await strapi
                .plugin("zhao-auth")
                .service("tenant")
                .getMyTenants(user.id, roles);
            ctx.body = { data: tenants };
        }
        catch (err) {
            strapi.log.error(`[zhao-auth] Get my tenants failed: ${err.message}`);
            ctx.status = err.status || 400;
            ctx.body = { error: err.message, code: err.code };
        }
    },
});

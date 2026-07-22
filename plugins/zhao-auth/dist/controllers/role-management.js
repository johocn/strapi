"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async findUsers(ctx) {
        try {
            const { page = 1, pageSize = 20, 'pagination[page]': paginationPage, 'pagination[pageSize]': paginationPageSize, ...filters } = ctx.query;
            const actualPage = parseInt(paginationPage || page, 10);
            const actualPageSize = parseInt(paginationPageSize || pageSize, 10);
            const operatorId = ctx.state.user?.id;
            const tenantDocumentId = ctx.state.siteDocumentId;
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .findUsers(filters, actualPage, actualPageSize, operatorId, tenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Find users failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async assignRole(ctx) {
        try {
            const { userId, role, reason } = ctx.request.body;
            const operatorId = ctx.state.user?.id;
            const operatorTenantDocumentId = ctx.state.siteDocumentId;
            if (!userId || !role) {
                ctx.status = 400;
                ctx.body = { error: "缺少必要参数: userId 和 role" };
                return;
            }
            if (!operatorId) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .assignRole(userId, role, operatorId, reason, operatorTenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Assign role failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async revokeRole(ctx) {
        try {
            const { userId, role, reason } = ctx.request.body;
            const operatorId = ctx.state.user?.id;
            const operatorTenantDocumentId = ctx.state.siteDocumentId;
            if (!userId || !role) {
                ctx.status = 400;
                ctx.body = { error: "缺少必要参数: userId 和 role" };
                return;
            }
            if (!operatorId) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .revokeRole(userId, role, operatorId, reason, operatorTenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Revoke role failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getUserRoles(ctx) {
        try {
            const userId = parseInt(ctx.params.id, 10);
            if (isNaN(userId)) {
                ctx.status = 400;
                ctx.body = { error: "无效的用户ID" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .getUserRoles(userId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get user roles failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async batchAssignRoles(ctx) {
        try {
            const body = ctx.request.body?.data || ctx.request.body;
            const { userIds, role, reason } = body;
            const operatorId = ctx.state.user?.id;
            const operatorTenantDocumentId = ctx.state.siteDocumentId;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                ctx.status = 400;
                ctx.body = { error: "缺少必要参数: userIds 必须是非空数组" };
                return;
            }
            if (!role) {
                ctx.status = 400;
                ctx.body = { error: "缺少必要参数: role" };
                return;
            }
            if (!operatorId) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .batchAssignRoles(userIds, role, operatorId, reason, operatorTenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Batch assign roles failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getActionLogs(ctx) {
        try {
            const { userId, operatorId, page = 1, pageSize = 20, 'pagination[page]': paginationPage, 'pagination[pageSize]': paginationPageSize, } = ctx.query;
            const actualPage = parseInt(paginationPage || page, 10);
            const actualPageSize = parseInt(paginationPageSize || pageSize, 10);
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .getActionLogs(userId ? parseInt(userId, 10) : undefined, operatorId ? parseInt(operatorId, 10) : undefined, actualPage, actualPageSize);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get action logs failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getMyRoles(ctx) {
        try {
            const userId = ctx.state.user?.id;
            if (!userId) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .getUserRoles(userId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get my roles failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getMyPermissions(ctx) {
        try {
            const user = ctx.state.user;
            if (!user?.id) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const roles = user.roles || [];
            ctx.body = strapi.plugin("zhao-auth").service("role-management").computePermissions(roles);
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get my permissions failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getUserDetail(ctx) {
        try {
            const userId = parseInt(ctx.params.id, 10);
            if (isNaN(userId)) {
                ctx.status = 400;
                ctx.body = { error: "无效的用户ID" };
                return;
            }
            const operatorId = ctx.state.user?.id;
            const tenantDocumentId = ctx.state.siteDocumentId;
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .getUserDetail(userId, operatorId, tenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get user detail failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
    async getAssignableRoles(ctx) {
        try {
            const operatorId = ctx.state.user?.id;
            const tenantDocumentId = ctx.state.siteDocumentId;
            if (!operatorId) {
                ctx.status = 401;
                ctx.body = { error: "未认证" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-management")
                .getAssignableRoles(operatorId, tenantDocumentId);
            ctx.body = result;
        }
        catch (error) {
            strapi.log.error(`[zhao-auth] Get assignable roles failed: ${error.message}`);
            ctx.status = error.status || 400;
            ctx.body = { error: error.message, code: error.code };
        }
    },
});

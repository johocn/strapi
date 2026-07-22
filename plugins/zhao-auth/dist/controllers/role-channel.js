"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    /**
     * GET /admin/role-channels — 列表
     */
    async list(ctx) {
        try {
            const { page = 1, pageSize = 20, role } = ctx.query;
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-channel")
                .listRoleChannels(parseInt(page, 10), parseInt(pageSize, 10), { role });
            ctx.body = result;
        }
        catch (error) {
            ctx.status = error.status || 400;
            ctx.body = { error: error.message };
        }
    },
    /**
     * POST /admin/role-channels — 授权角色渠道（单个）
     */
    async grant(ctx) {
        try {
            const { role, channelId, grantedBy } = ctx.request.body;
            if (!role || !channelId) {
                ctx.status = 400;
                ctx.body = { error: "role 和 channelId 必填" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-channel")
                .grant({ role, channelId: parseInt(channelId, 10), grantedBy });
            ctx.body = result;
        }
        catch (error) {
            ctx.status = error.status || 400;
            ctx.body = { error: error.message };
        }
    },
    /**
     * POST /admin/role-channels/batch — 批量授权
     */
    async batchGrant(ctx) {
        try {
            const body = ctx.request.body?.data || ctx.request.body;
            const { role, channelIds, grantedBy } = body;
            if (!role || !channelIds) {
                ctx.status = 400;
                ctx.body = { error: "role 和 channelIds 必填" };
                return;
            }
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-channel")
                .batchGrant({ role, channelIds, grantedBy });
            ctx.body = result;
        }
        catch (error) {
            ctx.status = error.status || 400;
            ctx.body = { error: error.message };
        }
    },
    /**
     * DELETE /admin/role-channels/:id — 撤销授权
     */
    async revoke(ctx) {
        try {
            const { id } = ctx.params;
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-channel")
                .revoke(parseInt(id, 10));
            ctx.body = result;
        }
        catch (error) {
            ctx.status = error.status || 400;
            ctx.body = { error: error.message };
        }
    },
    /**
     * DELETE /admin/role-channels/role/:role — 按角色删除所有渠道授权
     */
    async revokeByRole(ctx) {
        try {
            const { role } = ctx.params;
            const result = await strapi
                .plugin("zhao-auth")
                .service("role-channel")
                .revokeByRole(role);
            ctx.body = result;
        }
        catch (error) {
            ctx.status = error.status || 400;
            ctx.body = { error: error.message };
        }
    },
});

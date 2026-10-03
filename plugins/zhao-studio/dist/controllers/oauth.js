"use strict";
// server/src/controllers/oauth.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async getAuthorizeUrl(ctx) {
        try {
            const { accountId } = ctx.params;
            const manager = strapi.plugin('zhao-studio').service('oauth-manager');
            const url = await manager.getAuthorizeUrl(accountId);
            ctx.redirect(url); // 302 到平台授权页
        }
        catch (e) {
            ctx.status = 400;
            ctx.body = { ok: false, error: e.message };
        }
    },
    async handleCallback(ctx) {
        const { platformType } = ctx.params;
        const { code, state, error, error_description } = ctx.query;
        if (error) {
            ctx.body = { ok: false, error, error_description: error_description || '' };
            ctx.status = 400;
            return;
        }
        if (!code) {
            ctx.body = { ok: false, error: 'missing_code' };
            ctx.status = 400;
            return;
        }
        try {
            const manager = strapi.plugin('zhao-studio').service('oauth-manager');
            const result = await manager.handleCallback(platformType, code, state);
            ctx.body = { ok: true, ...result };
        }
        catch (e) {
            ctx.status = 400;
            ctx.body = { ok: false, error: e.message };
        }
    },
    async getStatus(ctx) {
        try {
            const { accountId } = ctx.params;
            const manager = strapi.plugin('zhao-studio').service('oauth-manager');
            const status = await manager.getStatus(accountId);
            ctx.body = { ok: true, data: status };
        }
        catch (e) {
            ctx.status = 400;
            ctx.body = { ok: false, error: e.message };
        }
    },
    async revoke(ctx) {
        try {
            const { accountId } = ctx.params;
            const manager = strapi.plugin('zhao-studio').service('oauth-manager');
            await manager.revokeAuthorization(accountId);
            ctx.body = { ok: true };
        }
        catch (e) {
            ctx.status = 400;
            ctx.body = { ok: false, error: e.message };
        }
    },
});
//# sourceMappingURL=oauth.js.map
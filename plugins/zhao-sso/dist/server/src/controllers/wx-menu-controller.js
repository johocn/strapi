"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    const svc = () => strapi.plugin("zhao-sso").service("sso-wx-menu");
    async function wrap(ctx, fn) {
        try {
            ctx.body = await fn();
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message, code: e.code || null };
        }
    }
    return {
        async list(ctx) {
            await wrap(ctx, () => svc().list(ctx.query));
        },
        async create(ctx) {
            await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row) => ({ data: row })));
        },
        async update(ctx) {
            await wrap(ctx, () => svc().update(Number(ctx.params.id), ctx.request.body || {}).then((row) => ({ data: row })));
        },
        async delete(ctx) {
            await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 一键下发菜单 */
        async publish(ctx) {
            await wrap(ctx, () => svc().publish(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 删除线上菜单 */
        async deleteRemote(ctx) {
            await wrap(ctx, () => svc().deleteRemote().then((row) => ({ data: row })));
        },
        /** 获取线上菜单信息 */
        async getRemote(ctx) {
            await wrap(ctx, () => svc().getRemote().then((row) => ({ data: row })));
        },
        /** 公众号已添加模板只读列表 */
        async listTemplates(ctx) {
            await wrap(ctx, () => svc().listTemplates().then((row) => ({ data: row })));
        },
    };
};
//# sourceMappingURL=wx-menu-controller.js.map
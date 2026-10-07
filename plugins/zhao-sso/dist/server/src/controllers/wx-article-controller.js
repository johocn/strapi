"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    const svc = () => strapi.plugin("zhao-sso").service("sso-wx-article");
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
        /** 创建图文草稿 */
        async create(ctx) {
            await wrap(ctx, () => svc().create(ctx.request.body || {}).then((row) => ({ data: row })));
        },
        async list(ctx) {
            await wrap(ctx, () => svc().list(ctx.query));
        },
        async findOne(ctx) {
            await wrap(ctx, () => svc().findOne(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 更新 + 重提草稿 */
        async update(ctx) {
            await wrap(ctx, () => svc().update(Number(ctx.params.id), ctx.request.body || {}).then((row) => ({ data: row })));
        },
        /** 发布草稿 */
        async publish(ctx) {
            await wrap(ctx, () => svc().publish(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 发布状态刷新 */
        async status(ctx) {
            await wrap(ctx, () => svc().status(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
        /** 删除草稿 */
        async delete(ctx) {
            await wrap(ctx, () => svc().remove(Number(ctx.params.id)).then((row) => ({ data: row })));
        },
    };
};
//# sourceMappingURL=wx-article-controller.js.map
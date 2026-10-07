"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => {
    const svc = () => strapi.plugin("zhao-sso").service("sso-wx-reply");
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
    };
};
//# sourceMappingURL=wx-reply-controller.js.map
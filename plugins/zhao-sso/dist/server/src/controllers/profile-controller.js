"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PROFILE_UID = "plugin::zhao-sso.sso-user-profile";
exports.default = ({ strapi }) => {
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
            await wrap(ctx, async () => {
                const { page = 1, pageSize = 20, segment } = ctx.query;
                const limit = Math.min(Number(pageSize) || 20, 100);
                const start = (Number(page) - 1) * limit;
                const where = {};
                if (segment)
                    where.segment = { $eq: segment };
                const results = await strapi.db.query(PROFILE_UID).findMany({
                    where, populate: { user: true }, orderBy: { segmentScore: "DESC" }, limit, offset: start,
                });
                const total = await strapi.db.query(PROFILE_UID).count({ where });
                return { data: results, meta: { pagination: { page: Number(page), pageSize: limit, total } } };
            });
        },
        async detail(ctx) {
            await wrap(ctx, async () => {
                const svc = strapi.plugin("zhao-sso").service("sso-profile");
                return { data: await svc.getProfile(Number(ctx.params.id)) };
            });
        },
        async recalcAll(ctx) {
            await wrap(ctx, async () => {
                const svc = strapi.plugin("zhao-sso").service("sso-profile");
                return { data: await svc.recalcAll(Number(ctx.query.limit) || 500) };
            });
        },
    };
};
//# sourceMappingURL=profile-controller.js.map
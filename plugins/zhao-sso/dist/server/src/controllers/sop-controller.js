"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RULE_UID = "plugin::zhao-sso.sop-rule";
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
                const results = await strapi.db.query(RULE_UID).findMany({
                    orderBy: { id: "ASC" },
                });
                const total = await strapi.db.query(RULE_UID).count();
                return { data: results, meta: { total } };
            });
        },
        async create(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const data = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
                const row = await strapi.db.query(RULE_UID).create({ data });
                return { data: row };
            });
        },
        async update(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const { id } = ctx.params;
                const data = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
                const row = await strapi.db.query(RULE_UID).update({ where: { id: Number(id) }, data });
                return { data: row };
            });
        },
        async delete(ctx) {
            await wrap(ctx, async () => {
                const { id } = ctx.params;
                await strapi.db.query(RULE_UID).delete({ where: { id: Number(id) } });
                return { data: { id: Number(id) } };
            });
        },
    };
};
//# sourceMappingURL=sop-controller.js.map
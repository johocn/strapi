"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-sso.sso-invite-code";
exports.default = ({ strapi }) => ({
    async list(ctx) {
        try {
            const { page = 1, pageSize = 20, ...filters } = ctx.query;
            const pageNum = Number(page);
            const pageSizeNum = Number(pageSize);
            const results = await strapi.documents(UID).findMany({
                filters,
                populate: "*",
                sort: { createdAt: "desc" },
                limit: pageSizeNum,
                start: (pageNum - 1) * pageSizeNum,
            });
            const total = await strapi.db.query(UID).count({ where: filters });
            ctx.body = {
                data: results,
                meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
            };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async create(ctx) {
        var _a;
        try {
            const data = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const result = await strapi.documents(UID).create({ data, populate: "*" });
            ctx.body = { data: result };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async delete(ctx) {
        try {
            const { id } = ctx.params;
            const result = await strapi.documents(UID).delete({ documentId: id });
            ctx.body = { data: result };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
    async validate(ctx) {
        try {
            const { id } = ctx.params;
            const code = await strapi.documents(UID).findOne({ documentId: id });
            if (!code) {
                ctx.body = { valid: false, reason: "邀请码不存在" };
                return;
            }
            if (!code.is_active) {
                ctx.body = { valid: false, reason: "邀请码未启用" };
                return;
            }
            const now = new Date();
            if (code.valid_from && new Date(code.valid_from) > now) {
                ctx.body = { valid: false, reason: "邀请码尚未生效" };
                return;
            }
            if (code.valid_until && new Date(code.valid_until) < now) {
                ctx.body = { valid: false, reason: "邀请码已过期" };
                return;
            }
            if (code.max_uses != null && code.use_count >= code.max_uses) {
                ctx.body = { valid: false, reason: "邀请码已达使用上限" };
                return;
            }
            ctx.body = { valid: true };
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message };
        }
    },
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-sso.sso-user-app-role";
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
    async findOne(ctx) {
        try {
            const { id } = ctx.params;
            const result = await strapi.documents(UID).findOne({ documentId: id, populate: "*" });
            if (!result) {
                ctx.status = 404;
                ctx.body = { error: "用户应用角色不存在" };
                return;
            }
            ctx.body = { data: result };
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
    async update(ctx) {
        var _a;
        try {
            const { id } = ctx.params;
            const data = ((_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) || ctx.request.body;
            const result = await strapi.documents(UID).update({ documentId: id, data, populate: "*" });
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
});

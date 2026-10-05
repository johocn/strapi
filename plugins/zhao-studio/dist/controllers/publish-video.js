"use strict";
// server/src/controllers/publish-video.ts
Object.defineProperty(exports, "__esModule", { value: true });
const UID = 'plugin::zhao-studio.publish-video';
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const query = { ...ctx.query };
        const page = Number(query.pagination?.page) || 1;
        const pageSize = Number(query.pagination?.pageSize) || 10;
        const findManyRes = await strapi.documents(UID).findMany({
            ...query,
            pagination: { page, pageSize },
            sort: { createdAt: 'desc' },
        });
        const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);
        const total = await strapi.documents(UID).count({ filters: query.filters || {} });
        ctx.body = {
            data: records,
            meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
        };
    },
    async findOne(ctx) {
        const record = await strapi.documents(UID).findOne({ documentId: ctx.params.id });
        ctx.body = { data: record };
    },
    async create(ctx) {
        const { data } = ctx.request.body;
        const record = await strapi.documents(UID).create({ data });
        ctx.body = { data: record };
    },
    async update(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;
        const record = await strapi.documents(UID).update({ documentId: id, data });
        ctx.body = { data: record };
    },
    async delete(ctx) {
        await strapi.documents(UID).delete({ documentId: ctx.params.id });
        ctx.body = { data: { success: true } };
    },
});
//# sourceMappingURL=publish-video.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    async list(ctx) {
        const user = ctx.state.user;
        const hasTenantPermission = user?.permissions?.some((p) => typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant') ?? false;
        const query = { ...ctx.query };
        if (!hasTenantPermission) {
            query.filters = { ...(query.filters || {}), scope: 'current' };
        }
        const drafts = await strapi
            .documents('plugin::zhao-studio.article-draft')
            .findMany(query);
        ctx.body = { data: drafts };
    },
    async findOne(ctx) {
        const { id } = ctx.params;
        const draft = await strapi
            .documents('plugin::zhao-studio.article-draft')
            .findOne({ documentId: id });
        ctx.body = { data: draft };
    },
    async create(ctx) {
        const user = ctx.state.user;
        const hasTenantPermission = user?.permissions?.some((p) => typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant') ?? false;
        const data = { ...ctx.request.body.data };
        if (!hasTenantPermission) {
            data.scope = 'current';
            delete data.scopeTenantId;
        }
        const draft = await strapi
            .documents('plugin::zhao-studio.article-draft')
            .create({ data });
        ctx.body = { data: draft };
    },
    async update(ctx) {
        const { id } = ctx.params;
        const user = ctx.state.user;
        const hasTenantPermission = user?.permissions?.some((p) => typeof p === 'string' ? p === 'menu.tenant' : p?.action === 'menu.tenant') ?? false;
        const data = { ...ctx.request.body.data };
        if (!hasTenantPermission) {
            data.scope = 'current';
            delete data.scopeTenantId;
        }
        const draft = await strapi
            .documents('plugin::zhao-studio.article-draft')
            .update({ documentId: id, data });
        ctx.body = { data: draft };
    },
    async delete(ctx) {
        const { id } = ctx.params;
        await strapi
            .documents('plugin::zhao-studio.article-draft')
            .delete({ documentId: id });
        ctx.body = { data: { success: true } };
    },
});
//# sourceMappingURL=draft.js.map
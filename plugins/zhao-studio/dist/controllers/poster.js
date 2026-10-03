"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    // Public: Get template by code
    async getTemplate(ctx) {
        const { code } = ctx.params;
        const posterService = strapi.plugin('zhao-studio').service('poster');
        const template = await posterService.getTemplate(code);
        if (!template) {
            ctx.status = 404;
            ctx.body = { error: { code: 'POSTER_001', message: 'Template not found' } };
            return;
        }
        ctx.body = { data: template };
    },
    // Public: Resolve template with variables
    async resolveTemplate(ctx) {
        const { templateCode, variables } = ctx.request.body;
        const posterService = strapi.plugin('zhao-studio').service('poster');
        try {
            const result = await posterService.resolveTemplate(templateCode, variables || {});
            if (!result) {
                ctx.status = 404;
                ctx.body = { error: { code: 'POSTER_001', message: 'Template not found' } };
                return;
            }
            ctx.body = { data: result };
        }
        catch (err) {
            if (err.code === 'POSTER_002') {
                ctx.status = 400;
                ctx.body = { error: { code: err.code, message: err.message, details: err.details } };
            }
            else {
                ctx.status = 500;
                ctx.body = { error: { code: 'POSTER_500', message: 'Internal error' } };
            }
        }
    },
    // Public: Manually trigger seed (for debugging/fixing)
    async seedTemplates(ctx) {
        try {
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const result = await posterService.seedDefaultTemplate();
            ctx.body = { data: result };
        }
        catch (err) {
            strapi.log.error('[zhao-studio] Seed error:', err);
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message, stack: err.stack } };
        }
    },
    // Admin: Template CRUD
    async listTemplates(ctx) {
        try {
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const templates = await posterService.listTemplates(ctx.query.filters || {});
            ctx.body = { data: templates };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
    async createTemplate(ctx) {
        try {
            const { data } = ctx.request.body;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const template = await posterService.createTemplate(data);
            ctx.body = { data: template };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'POSTER_400', message: err.message } };
        }
    },
    async findOneTemplate(ctx) {
        try {
            const { id } = ctx.params;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const template = await posterService.findOneTemplate(id);
            if (!template) {
                ctx.status = 404;
                ctx.body = { error: { code: 'POSTER_001', message: 'Template not found' } };
                return;
            }
            ctx.body = { data: template };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
    async updateTemplate(ctx) {
        try {
            const { id } = ctx.params;
            const { data } = ctx.request.body;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const template = await posterService.updateTemplate(id, data);
            ctx.body = { data: template };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'POSTER_400', message: err.message } };
        }
    },
    async deleteTemplate(ctx) {
        try {
            const { id } = ctx.params;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            await posterService.deleteTemplate(id);
            ctx.body = { data: { success: true } };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
    async cloneTemplate(ctx) {
        try {
            const { id } = ctx.params;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const cloned = await posterService.cloneTemplate(id);
            ctx.body = { data: cloned };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'POSTER_400', message: err.message } };
        }
    },
    // Admin: Batch save elements
    async batchSaveElements(ctx) {
        try {
            const { id } = ctx.params;
            const { elements } = ctx.request.body;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const saved = await posterService.batchSaveElements(id, elements || []);
            ctx.body = { data: saved };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
    // Admin: Element CRUD
    async listElements(ctx) {
        try {
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const elements = await posterService.listElements(ctx.query.filters || {});
            ctx.body = { data: elements };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
    async createElement(ctx) {
        try {
            const { data } = ctx.request.body;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const element = await posterService.createElement(data);
            ctx.body = { data: element };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'POSTER_400', message: err.message } };
        }
    },
    async updateElement(ctx) {
        try {
            const { id } = ctx.params;
            const { data } = ctx.request.body;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            const element = await posterService.updateElement(id, data);
            ctx.body = { data: element };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'POSTER_400', message: err.message } };
        }
    },
    async deleteElement(ctx) {
        try {
            const { id } = ctx.params;
            const posterService = strapi.plugin('zhao-studio').service('poster');
            await posterService.deleteElement(id);
            ctx.body = { data: { success: true } };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'POSTER_500', message: err.message } };
        }
    },
});
//# sourceMappingURL=poster.js.map
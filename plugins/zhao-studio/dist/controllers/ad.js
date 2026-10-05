"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    // Public: Get ad zone by position
    async getZoneByPosition(ctx) {
        try {
            const { position } = ctx.params;
            const { site } = ctx.query;
            // 优先使用 site-resolver 中间件识别的 siteDocumentId（基于 host 域名）
            // 兼容：显式传 ?site=domain 时仍按 domain 查 site-config
            const adService = strapi.plugin('zhao-studio').service('ad');
            const result = await adService.getZoneByPosition(position, site, ctx.state?.siteDocumentId);
            ctx.body = { data: result };
        }
        catch (err) {
            console.error('[AD_DIAG]', err?.name, err?.message, err?.stack);
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: 'Internal error: ' + (err?.message || err) } };
        }
    },
    // Public: Get all active zones
    async getAllZones(ctx) {
        try {
            const { site } = ctx.query;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const zones = await adService.getAllZones(site, ctx.state?.siteDocumentId);
            ctx.body = { data: zones };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: 'Internal error' } };
        }
    },
    // Admin: Zone CRUD
    async listZones(ctx) {
        try {
            const adService = strapi.plugin('zhao-studio').service('ad');
            const result = await adService.listZones(ctx.query);
            ctx.body = { data: result.records, meta: result.meta };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
    async createZone(ctx) {
        try {
            const { data } = ctx.request.body;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const zone = await adService.createZone(data);
            ctx.body = { data: zone };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'AD_400', message: err.message } };
        }
    },
    async findOneZone(ctx) {
        try {
            const { id } = ctx.params;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const zone = await adService.findOneZone(id);
            if (!zone) {
                ctx.status = 404;
                ctx.body = { error: { code: 'AD_001', message: 'Zone not found' } };
                return;
            }
            ctx.body = { data: zone };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
    async updateZone(ctx) {
        try {
            const { id } = ctx.params;
            const { data } = ctx.request.body;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const zone = await adService.updateZone(id, data);
            ctx.body = { data: zone };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'AD_400', message: err.message } };
        }
    },
    async deleteZone(ctx) {
        try {
            const { id } = ctx.params;
            const adService = strapi.plugin('zhao-studio').service('ad');
            await adService.deleteZone(id);
            ctx.body = { data: { success: true } };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
    // Admin: Content CRUD
    async listContents(ctx) {
        try {
            const adService = strapi.plugin('zhao-studio').service('ad');
            const result = await adService.listContents(ctx.query);
            ctx.body = { data: result.records, meta: result.meta };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
    async createContent(ctx) {
        try {
            const { data } = ctx.request.body;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const content = await adService.createContent(data);
            ctx.body = { data: content };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'AD_400', message: err.message } };
        }
    },
    async findOneContent(ctx) {
        try {
            const { id } = ctx.params;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const content = await adService.findOneContent(id);
            if (!content) {
                ctx.status = 404;
                ctx.body = { error: { code: 'AD_002', message: 'Content not found' } };
                return;
            }
            ctx.body = { data: content };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
    async updateContent(ctx) {
        try {
            const { id } = ctx.params;
            const { data } = ctx.request.body;
            const adService = strapi.plugin('zhao-studio').service('ad');
            const content = await adService.updateContent(id, data);
            ctx.body = { data: content };
        }
        catch (err) {
            ctx.status = 400;
            ctx.body = { error: { code: 'AD_400', message: err.message } };
        }
    },
    async deleteContent(ctx) {
        try {
            const { id } = ctx.params;
            const adService = strapi.plugin('zhao-studio').service('ad');
            await adService.deleteContent(id);
            ctx.body = { data: { success: true } };
        }
        catch (err) {
            ctx.status = 500;
            ctx.body = { error: { code: 'AD_500', message: err.message } };
        }
    },
});
//# sourceMappingURL=ad.js.map
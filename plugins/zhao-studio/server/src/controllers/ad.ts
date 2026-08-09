import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Public: Get ad zone by position
  async getZoneByPosition(ctx: any) {
    try {
      const { position } = ctx.params;
      const { site } = ctx.query;
      
      const adService = strapi.plugin('zhao-studio').service('ad');
      const result = await adService.getZoneByPosition(position, site);
      
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: 'Internal error' } };
    }
  },

  // Public: Get all active zones
  async getAllZones(ctx: any) {
    try {
      const { site } = ctx.query;
      
      const adService = strapi.plugin('zhao-studio').service('ad');
      const zones = await adService.getAllZones(site);
      
      ctx.body = { data: zones };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: 'Internal error' } };
    }
  },

  // Admin: Zone CRUD
  async listZones(ctx: any) {
    try {
      const adService = strapi.plugin('zhao-studio').service('ad');
      const zones = await adService.listZones(ctx.query.filters || {});
      ctx.body = { data: zones };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },

  async createZone(ctx: any) {
    try {
      const { data } = ctx.request.body;
      const adService = strapi.plugin('zhao-studio').service('ad');
      const zone = await adService.createZone(data);
      ctx.body = { data: zone };
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = { error: { code: 'AD_400', message: err.message } };
    }
  },

  async findOneZone(ctx: any) {
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
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },

  async updateZone(ctx: any) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      const adService = strapi.plugin('zhao-studio').service('ad');
      const zone = await adService.updateZone(id, data);
      ctx.body = { data: zone };
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = { error: { code: 'AD_400', message: err.message } };
    }
  },

  async deleteZone(ctx: any) {
    try {
      const { id } = ctx.params;
      const adService = strapi.plugin('zhao-studio').service('ad');
      await adService.deleteZone(id);
      ctx.body = { data: { success: true } };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },

  // Admin: Content CRUD
  async listContents(ctx: any) {
    try {
      const adService = strapi.plugin('zhao-studio').service('ad');
      const contents = await adService.listContents(ctx.query.filters || {});
      ctx.body = { data: contents };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },

  async createContent(ctx: any) {
    try {
      const { data } = ctx.request.body;
      const adService = strapi.plugin('zhao-studio').service('ad');
      const content = await adService.createContent(data);
      ctx.body = { data: content };
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = { error: { code: 'AD_400', message: err.message } };
    }
  },

  async findOneContent(ctx: any) {
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
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },

  async updateContent(ctx: any) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      const adService = strapi.plugin('zhao-studio').service('ad');
      const content = await adService.updateContent(id, data);
      ctx.body = { data: content };
    } catch (err: any) {
      ctx.status = 400;
      ctx.body = { error: { code: 'AD_400', message: err.message } };
    }
  },

  async deleteContent(ctx: any) {
    try {
      const { id } = ctx.params;
      const adService = strapi.plugin('zhao-studio').service('ad');
      await adService.deleteContent(id);
      ctx.body = { data: { success: true } };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: { code: 'AD_500', message: err.message } };
    }
  },
});

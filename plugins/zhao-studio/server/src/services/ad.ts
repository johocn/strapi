import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Public: Get active ad zone by position with its active contents
  async getZoneByPosition(position: string, siteDomain?: string, siteDocumentId?: string) {
    // Find zone by position and site
    const filters: any = { position, isActive: true };

    // 优先使用 site-resolver 中间件识别的 siteDocumentId（基于 host 域名）
    // 兼容：显式传 siteDomain 时仍按 domain 查 site-config
    // 注意：strapi.documents 对关系字段按被关联记录筛选时必须使用 documentId 子过滤
    // （直接传整型 FK id 或 documentId 字符串都会导致 SQL 类型错误）
    if (siteDocumentId) {
      filters.site = { documentId: { $eq: siteDocumentId } };
    } else if (siteDomain) {
      const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
        where: { domain: siteDomain }
      });
      if (siteConfig) filters.site = { documentId: { $eq: siteConfig.documentId } };
    }

    const zones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
      filters,
      populate: { adContents: true, site: true },
      limit: 1,
    });

    if (!zones || zones.length === 0) return { zone: null, contents: [] };

    const zone = zones[0];

    // Filter active contents within date range
    const now = new Date();
    let contents = (zone.adContents || []).filter((c: any) => {
      if (!c.isActive) return false;
      if (c.startAt && new Date(c.startAt) > now) return false;
      if (c.endAt && new Date(c.endAt) < now) return false;
      return true;
    });

    // Sort by priority desc, sortOrder asc
    contents.sort((a: any, b: any) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.sortOrder - b.sortOrder;
    });

    // Apply displayMode
    if (zone.displayMode === 'single') {
      contents = contents.slice(0, 1);
    } else if (zone.displayMode === 'rotation' && contents.length > 0) {
      const idx = Math.floor(Math.random() * contents.length);
      contents = [contents[idx]];
    }
    // slideshow and stack return all

    return { zone, contents };
  },

  // Public: Get all active zones for a site (with filtered contents)
  async getAllZones(siteDomain?: string, siteDocumentId?: string) {
    const filters: any = { isActive: true };

    if (siteDocumentId) {
      filters.site = { documentId: { $eq: siteDocumentId } };
    } else if (siteDomain) {
      const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
        where: { domain: siteDomain }
      });
      if (siteConfig) filters.site = { documentId: { $eq: siteConfig.documentId } };
    }

    const zones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
      filters,
      populate: { adContents: true },
      sort: { sortOrder: 'asc' },
    });

    if (!zones || zones.length === 0) return [];
    
    // Filter active contents within date range for each zone
    const now = new Date();
    return zones.map((zone: any) => {
      let contents = (zone.adContents || []).filter((c: any) => {
        if (!c.isActive) return false;
        if (c.startAt && new Date(c.startAt) > now) return false;
        if (c.endAt && new Date(c.endAt) < now) return false;
        return true;
      });
      
      contents.sort((a: any, b: any) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.sortOrder - b.sortOrder;
      });
      
      // Apply displayMode
      if (zone.displayMode === 'single') {
        contents = contents.slice(0, 1);
      } else if (zone.displayMode === 'rotation' && contents.length > 0) {
        const idx = Math.floor(Math.random() * contents.length);
        contents = [contents[idx]];
      }
      
      return { ...zone, adContents: contents };
    });
  },

  // Admin CRUD for zones
  async listZones(filters: any = {}) {
    return await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
      filters,
      populate: { adContents: true, site: true },
      sort: { sortOrder: 'asc' },
    });
  },

  async createZone(data: any) {
    return await strapi.documents('plugin::zhao-studio.ad-zone').create({ data });
  },

  async findOneZone(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.ad-zone').findOne({
      documentId,
      populate: { adContents: true, site: true },
    });
  },

  async updateZone(documentId: string, data: any) {
    return await strapi.documents('plugin::zhao-studio.ad-zone').update({ documentId, data });
  },

  async deleteZone(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.ad-zone').delete({ documentId });
  },

  // Admin CRUD for contents
  async listContents(filters: any = {}) {
    return await strapi.documents('plugin::zhao-studio.ad-content').findMany({
      filters,
      populate: { adZone: true, site: true },
      sort: { priority: 'desc', sortOrder: 'asc' },
    });
  },

  async createContent(data: any) {
    return await strapi.documents('plugin::zhao-studio.ad-content').create({ data });
  },

  async findOneContent(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.ad-content').findOne({
      documentId,
      populate: { adZone: true, site: true },
    });
  },

  async updateContent(documentId: string, data: any) {
    return await strapi.documents('plugin::zhao-studio.ad-content').update({ documentId, data });
  },

  async deleteContent(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.ad-content').delete({ documentId });
  },
});

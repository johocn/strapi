"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ strapi }) => ({
    // Public: Get active ad zone by position with its active contents
    async getZoneByPosition(position, siteDomain, siteDocumentId) {
        // Find zone by position and site
        const filters = { position, isActive: true };
        // 优先使用 site-resolver 中间件识别的 siteDocumentId（基于 host 域名）
        // 兼容：显式传 siteDomain 时仍按 domain 查 site-config
        // 注意：strapi.documents 对关系字段按被关联记录筛选时必须使用 documentId 子过滤
        // （直接传整型 FK id 或 documentId 字符串都会导致 SQL 类型错误）
        if (siteDocumentId) {
            filters.site = { documentId: { $eq: siteDocumentId } };
        }
        else if (siteDomain) {
            const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
                where: { domain: siteDomain }
            });
            if (siteConfig)
                filters.site = { documentId: { $eq: siteConfig.documentId } };
        }
        const zones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
            filters,
            populate: { adContents: true, site: true },
            limit: 1,
        });
        if (!zones || zones.length === 0)
            return { zone: null, contents: [] };
        const zone = zones[0];
        // Filter active contents within date range
        const now = new Date();
        let contents = (zone.adContents || []).filter((c) => {
            if (!c.isActive)
                return false;
            if (c.startAt && new Date(c.startAt) > now)
                return false;
            if (c.endAt && new Date(c.endAt) < now)
                return false;
            return true;
        });
        // Sort by priority desc, sortOrder asc
        contents.sort((a, b) => {
            if (b.priority !== a.priority)
                return b.priority - a.priority;
            return a.sortOrder - b.sortOrder;
        });
        // Apply displayMode
        if (zone.displayMode === 'single') {
            contents = contents.slice(0, 1);
        }
        else if (zone.displayMode === 'rotation' && contents.length > 0) {
            const idx = Math.floor(Math.random() * contents.length);
            contents = [contents[idx]];
        }
        // slideshow and stack return all
        return { zone, contents };
    },
    // Public: Get all active zones for a site (with filtered contents)
    async getAllZones(siteDomain, siteDocumentId) {
        const filters = { isActive: true };
        if (siteDocumentId) {
            filters.site = { documentId: { $eq: siteDocumentId } };
        }
        else if (siteDomain) {
            const siteConfig = await strapi.db.query('plugin::zhao-common.site-config').findOne({
                where: { domain: siteDomain }
            });
            if (siteConfig)
                filters.site = { documentId: { $eq: siteConfig.documentId } };
        }
        const zones = await strapi.documents('plugin::zhao-studio.ad-zone').findMany({
            filters,
            populate: { adContents: true },
            sort: { sortOrder: 'asc' },
        });
        if (!zones || zones.length === 0)
            return [];
        // Filter active contents within date range for each zone
        const now = new Date();
        return zones.map((zone) => {
            let contents = (zone.adContents || []).filter((c) => {
                if (!c.isActive)
                    return false;
                if (c.startAt && new Date(c.startAt) > now)
                    return false;
                if (c.endAt && new Date(c.endAt) < now)
                    return false;
                return true;
            });
            contents.sort((a, b) => {
                if (b.priority !== a.priority)
                    return b.priority - a.priority;
                return a.sortOrder - b.sortOrder;
            });
            // Apply displayMode
            if (zone.displayMode === 'single') {
                contents = contents.slice(0, 1);
            }
            else if (zone.displayMode === 'rotation' && contents.length > 0) {
                const idx = Math.floor(Math.random() * contents.length);
                contents = [contents[idx]];
            }
            return { ...zone, adContents: contents };
        });
    },
    // Admin CRUD for zones
    async listZones(query = {}) {
        const defaults = { page: 1, pageSize: 20 };
        const pagination = { ...defaults, ...(query.pagination || {}) };
        const findManyOpts = {
            filters: query.filters || {},
            populate: query.populate || { adContents: true, site: true },
            sort: query.sort || { sortOrder: 'asc' },
            pagination,
        };
        // Strapi 5 documents.findMany 带 pagination 时返回 { records, meta }
        const findManyRes = await strapi.documents('plugin::zhao-studio.ad-zone').findMany(findManyOpts);
        const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);
        const total = await strapi.documents('plugin::zhao-studio.ad-zone').count({ filters: findManyOpts.filters });
        const page = Number(pagination.page);
        const pageSize = Number(pagination.pageSize);
        return {
            records,
            meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
        };
    },
    async createZone(data) {
        return await strapi.documents('plugin::zhao-studio.ad-zone').create({ data });
    },
    async findOneZone(documentId) {
        return await strapi.documents('plugin::zhao-studio.ad-zone').findOne({
            documentId,
            populate: { adContents: true, site: true },
        });
    },
    async updateZone(documentId, data) {
        return await strapi.documents('plugin::zhao-studio.ad-zone').update({ documentId, data });
    },
    async deleteZone(documentId) {
        return await strapi.documents('plugin::zhao-studio.ad-zone').delete({ documentId });
    },
    // Admin CRUD for contents
    async listContents(query = {}) {
        const defaults = { page: 1, pageSize: 20 };
        const pagination = { ...defaults, ...(query.pagination || {}) };
        const findManyOpts = {
            filters: query.filters || {},
            populate: query.populate || { adZone: true, site: true },
            sort: query.sort || { priority: 'desc', sortOrder: 'asc' },
            pagination,
        };
        // Strapi 5 documents.findMany 带 pagination 时返回 { records, meta }
        const findManyRes = await strapi.documents('plugin::zhao-studio.ad-content').findMany(findManyOpts);
        const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);
        const total = await strapi.documents('plugin::zhao-studio.ad-content').count({ filters: findManyOpts.filters });
        const page = Number(pagination.page);
        const pageSize = Number(pagination.pageSize);
        return {
            records,
            meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
        };
    },
    async createContent(data) {
        return await strapi.documents('plugin::zhao-studio.ad-content').create({ data });
    },
    async findOneContent(documentId) {
        return await strapi.documents('plugin::zhao-studio.ad-content').findOne({
            documentId,
            populate: { adZone: true, site: true },
        });
    },
    async updateContent(documentId, data) {
        return await strapi.documents('plugin::zhao-studio.ad-content').update({ documentId, data });
    },
    async deleteContent(documentId) {
        return await strapi.documents('plugin::zhao-studio.ad-content').delete({ documentId });
    },
});
//# sourceMappingURL=ad.js.map
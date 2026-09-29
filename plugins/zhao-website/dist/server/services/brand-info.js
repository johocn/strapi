"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.brand-info";
exports.default = ({ strapi }) => ({
    async ensureDefault(siteId) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, deletedAt: null },
        });
        if (existing)
            return existing;
        return strapi.db.query(UID).create({
            data: {
                site: siteId,
                companyName: "",
            },
        });
    },
    async find(siteId) {
        return this.ensureDefault(siteId);
    },
    async get(siteId) {
        return this.find(siteId);
    },
    async update(siteId, data) {
        const existing = await this.ensureDefault(siteId);
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data,
        });
    },
    async findPublic(siteId) {
        return this.ensureDefault(siteId);
    },
});
//# sourceMappingURL=brand-info.js.map
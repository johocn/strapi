"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.author";
exports.default = ({ strapi }) => ({
    async findAdmin(siteId) {
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null },
            orderBy: { id: "DESC" },
        });
    },
    async findOneAdmin(siteId, documentId) {
        return strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
    },
    async create(siteId, data) {
        return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
    },
    async update(siteId, documentId, data) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing) {
            const e = new Error("Author not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({ where: { id: existing.id }, data });
    },
    async softDelete(siteId, documentId) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing)
            return null;
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { deletedAt: new Date().toISOString() },
        });
    },
});
//# sourceMappingURL=author.js.map
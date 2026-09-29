"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.article-category";
exports.default = ({ strapi }) => ({
    async find(siteId) {
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null, status: true },
            orderBy: { order: "ASC" },
            populate: ["parent", "children"],
        });
    },
    async findTree(siteId) {
        const all = await this.find(siteId);
        return buildTree(all);
    },
    async findAdmin(siteId) {
        return strapi.db.query(UID).findMany({
            where: { site: siteId, deletedAt: null },
            orderBy: { order: "ASC" },
            populate: ["parent", "children"],
        });
    },
    async findOneAdmin(siteId, documentId) {
        return strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
            populate: ["parent", "children"],
        });
    },
    async create(siteId, data) {
        return strapi.db.query(UID).create({
            data: { ...data, site: siteId },
        });
    },
    async update(siteId, documentId, data) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing) {
            const e = new Error("Category not found");
            e.status = 404;
            throw e;
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data,
        });
    },
    async softDelete(siteId, documentId) {
        const existing = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (!existing)
            return null;
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { deletedAt: new Date().toISOString() },
        });
    },
});
function buildTree(items, parentId = null) {
    return items
        .filter((item) => {
        const pid = item.parent ? item.parent.id : null;
        return pid === parentId;
    })
        .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
    }));
}
//# sourceMappingURL=article-category.js.map
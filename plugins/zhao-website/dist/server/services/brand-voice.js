"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.brand-voice";
exports.default = ({ strapi }) => ({
    // ===== 查询 =====
    async findAdmin(siteId, query = {}) {
        const { category, status, page = 1, pageSize = 20 } = query;
        const filters = {
            $or: [
                { site: siteId, deletedAt: null },
                { site: null, deletedAt: null },
            ],
        };
        if (category) {
            filters.$or[0].category = category;
            filters.$or[1].category = category;
        }
        if (status !== undefined) {
            filters.$or[0].status = status;
            filters.$or[1].status = status;
        }
        return strapi.db.query(UID).findMany({
            where: filters,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { updatedAt: "DESC" },
        });
    },
    async findOneAdmin(siteId, documentId) {
        // 两步查询：租户优先，全局 fallback
        const tenant = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
        });
        if (tenant)
            return tenant;
        return strapi.db.query(UID).findOne({
            where: { site: null, documentId, deletedAt: null },
        });
    },
    // ===== 写入 =====
    async create(siteId, data) {
        return strapi.db.query(UID).create({
            data: { ...data, site: siteId },
        });
    },
    async update(siteId, documentId, data) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing)
            throw new Error("Brand voice not found");
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data,
        });
    },
    async softDelete(siteId, documentId) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing)
            throw new Error("Brand voice not found");
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { deletedAt: new Date() },
        });
    },
    // ===== 类目查询 =====
    async listByCategory(siteId, category) {
        return strapi.db.query(UID).findMany({
            where: {
                $or: [
                    { site: siteId, category, status: true, deletedAt: null },
                    { site: null, category, status: true, deletedAt: null },
                ],
            },
            orderBy: { name: "ASC" },
        });
    },
    // ===== 变量替换 =====
    async resolveVariables(siteId, documentId, variables) {
        const voice = await this.findOneAdmin(siteId, documentId);
        if (!voice)
            throw new Error("Brand voice not found");
        let content = voice.content || "";
        const varDefs = voice.variables || [];
        for (const v of varDefs) {
            const value = variables[v.name] ?? v.defaultValue ?? `{{${v.name}}}`;
            content = content.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, "g"), value);
        }
        return content;
    },
    // ===== 参考内容 =====
    async getRefContent(siteId, category) {
        const voices = await strapi.db.query(UID).findMany({
            where: {
                $or: [
                    { site: siteId, category, status: true, deletedAt: null },
                    { site: null, category, status: true, deletedAt: null },
                ],
            },
            orderBy: { name: "ASC" },
        });
        return voices.map((v) => `- ${v.name}: ${v.content}`).join("\n");
    },
});
//# sourceMappingURL=brand-voice.js.map
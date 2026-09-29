"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slug_1 = require("./utils/slug");
const status_1 = require("./utils/status");
const first_truth_validate_1 = require("./utils/first-truth-validate");
const category_filter_1 = require("./utils/category-filter");
const UID = "plugin::zhao-website.faq";
exports.default = ({ strapi }) => ({
    async find(siteId, query = {}) {
        const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
        const extra = {};
        if (status)
            extra.status = status;
        if (category)
            extra.category = await (0, category_filter_1.resolveCategoryFilter)(strapi, siteId, category);
        if (isFeatured !== undefined)
            extra.isFeatured = isFeatured === "true" || isFeatured === true;
        const filterService = strapi.plugin("zhao-website").service("content-filter");
        const where = await filterService.buildWhere(siteId, UID, extra);
        return strapi.db.query(UID).findMany({
            where,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { publishedAt: "DESC" },
            populate: ["category", "tags", "mainEntity", "mentionedEntities"],
        });
    },
    async findOne(siteId, slug) {
        const filterService = strapi.plugin("zhao-website").service("content-filter");
        const where = await filterService.buildWhere(siteId, UID, { slug });
        return strapi.db.query(UID).findOne({
            where,
            populate: ["category", "tags", "mainEntity", "mentionedEntities"],
        });
    },
    async findFeatured(siteId, limit = 5) {
        const filterService = strapi.plugin("zhao-website").service("content-filter");
        const where = await filterService.buildWhere(siteId, UID, { isFeatured: true });
        return strapi.db.query(UID).findMany({
            where,
            limit,
            orderBy: { publishedAt: "DESC" },
            populate: ["category"],
        });
    },
    async search(siteId, keyword, page = 1, pageSize = 20) {
        if (!keyword || keyword.length < 2) {
            return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
        }
        const filterService = strapi.plugin("zhao-website").service("content-filter");
        const where = await filterService.buildWhere(siteId, UID, {
            $or: [
                { question: { $containsi: keyword } },
                { answer: { $containsi: keyword } },
            ],
        });
        const items = await strapi.db.query(UID).findMany({
            where,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { publishedAt: "DESC" },
            populate: ["category"],
        });
        return {
            data: items,
            meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } },
        };
    },
    // ===== 管理端 =====
    async findAdmin(siteId, query = {}) {
        const { page = 1, pageSize = 20, status, category, tagGroup } = query;
        const filters = { site: siteId, deletedAt: null };
        if (status)
            filters.status = status;
        if (category)
            filters.category = await (0, category_filter_1.resolveCategoryFilter)(strapi, siteId, category);
        // tagGroup 筛选：knex 查 join 表拿 faq_id 列表
        if (tagGroup) {
            const knex = strapi.db.connection;
            const groupRow = await knex('zhao_tag_groups').where('slug', tagGroup).first()
                || await knex('zhao_tag_groups').where('document_id', tagGroup).first();
            if (groupRow?.id) {
                const tagRows = await knex('zhao_tags_tag_group_lnk').where('tag_group_id', groupRow.id).select('tag_id');
                const tagIds = tagRows.map((r) => r.tag_id);
                if (tagIds.length > 0) {
                    const faqRows = await knex('zhao_website_faqs_tags_lnk')
                        .whereIn('tag_id', tagIds).select('faq_id');
                    const faqIds = [...new Set(faqRows.map((r) => r.faq_id))];
                    if (faqIds.length === 0)
                        return [];
                    filters.id = { $in: faqIds };
                }
                else {
                    return [];
                }
            }
        }
        return strapi.db.query(UID).findMany({
            where: filters,
            limit: Number(pageSize),
            offset: (Number(page) - 1) * Number(pageSize),
            orderBy: { updatedAt: "DESC" },
            populate: ["category", { tags: { populate: { tagGroup: true } } }],
        });
    },
    async findOneAdmin(siteId, documentId) {
        return strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
            populate: ["category", { tags: { populate: { tagGroup: true } } },
                "mainEntity", "mentionedEntities"],
        });
    },
    async create(siteId, data) {
        const slug = data.slug || await (0, slug_1.generateUniqueSlug)(strapi, UID, siteId, data.question || "untitled");
        // 真值校验（warning 级允许）
        const validation = await (0, first_truth_validate_1.firstTruthValidate)(siteId, data);
        if (validation.hasError) {
            const e = new Error("内容与第一真值冲突（error 级）");
            e.status = 409;
            e.code = "FIRST_TRUTH_CONFLICT";
            e.details = validation.conflicts;
            throw e;
        }
        return strapi.db.query(UID).create({
            data: { ...data, site: siteId, slug, status: data.status || status_1.STATUS.DRAFT },
        });
    },
    async update(siteId, documentId, data) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing) {
            const e = new Error("FAQ not found");
            e.status = 404;
            throw e;
        }
        let updateData = { ...data };
        if (data.slug && data.slug !== existing.slug) {
            updateData.slug = await (0, slug_1.generateUniqueSlug)(strapi, UID, siteId, data.slug, documentId);
        }
        if (data.status && (0, status_1.isValidStatus)(data.status)) {
            updateData = (0, status_1.applyStatusChange)(updateData, data.status);
        }
        // 真值校验（仅当 status 变为 published 时强制）
        if (updateData.status === status_1.STATUS.PUBLISHED) {
            const validation = await (0, first_truth_validate_1.firstTruthValidate)(siteId, { ...existing, ...updateData });
            if (validation.hasError) {
                const e = new Error("内容与第一真值冲突（error 级），无法发布");
                e.status = 409;
                e.code = "FIRST_TRUTH_CONFLICT";
                e.details = validation.conflicts;
                throw e;
            }
        }
        return strapi.db.query(UID).update({
            where: { id: existing.id },
            data: updateData,
        });
    },
    async publish(siteId, documentId) {
        return this.update(siteId, documentId, { status: status_1.STATUS.PUBLISHED });
    },
    async unpublish(siteId, documentId) {
        return this.update(siteId, documentId, { status: status_1.STATUS.DRAFT });
    },
    async archive(siteId, documentId) {
        return this.update(siteId, documentId, { status: status_1.STATUS.ARCHIVED });
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
    async incrementViewCount(siteId, documentId) {
        const existing = await this.findOneAdmin(siteId, documentId);
        if (!existing)
            return;
        await strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { viewCount: (existing.viewCount || 0) + 1 },
        });
    },
});
//# sourceMappingURL=faq.js.map
import type { Core } from "@strapi/strapi";
import { generateUniqueSlug } from "./utils/slug";
import { applyStatusChange, STATUS, isValidStatus } from "./utils/status";
import { firstTruthValidate } from "./utils/first-truth-validate";

const UID = "plugin::zhao-website.compliance";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, category, tag, status, isFeatured, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    else filters.status = "published"; // 默认只查 published
    if (category) filters.category = category;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true" || isFeatured === true;

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags"],
    });
  },

  async findOne(siteId: number, slug: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["tags"],
    });
  },

  async search(siteId: number, keyword: string, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const items = await strapi.db.query(UID).findMany({
      where: {
        site: siteId,
        deletedAt: null,
        status: "published",
        $or: [
          { title: { $containsi: keyword } },
          { content: { $containsi: keyword } },
        ],
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["tags"],
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } },
    };
  },

  // ===== 管理端 =====
  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;

    // tagGroup 筛选：knex 查 join 表拿 compliance_id 列表
    if (tagGroup) {
      const knex = strapi.db.connection;
      const groupRow = await knex('zhao_tag_groups').where('slug', tagGroup).first()
        || await knex('zhao_tag_groups').where('document_id', tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex('zhao_tags_tag_group_lnk').where('tag_group_id', groupRow.id).select('tag_id');
        const tagIds = tagRows.map((r: any) => r.tag_id);
        if (tagIds.length > 0) {
          const complianceRows = await knex('zhao_website_compliances_tags_lnk')
            .whereIn('tag_id', tagIds).select('compliance_id');
          const complianceIds = [...new Set(complianceRows.map((r: any) => r.compliance_id))];
          if (complianceIds.length === 0) return [];
          filters.id = { $in: complianceIds };
        } else {
          return [];
        }
      }
    }

    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["tags", "tags.tagGroup"],
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["tags", "tags.tagGroup"],
    });
  },

  async create(siteId: number, data: any) {
    const slug = data.slug || await generateUniqueSlug(strapi, UID, siteId, data.title || "untitled");
    // 真值校验（warning 级允许）
    const validation = await firstTruthValidate(siteId, data);
    if (validation.hasError) {
      const e: any = new Error("内容与第一真值冲突（error 级）");
      e.status = 409;
      e.code = "FIRST_TRUTH_CONFLICT";
      e.details = validation.conflicts;
      throw e;
    }
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId, slug, status: data.status || STATUS.DRAFT },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Compliance not found");
      e.status = 404;
      throw e;
    }
    let updateData = { ...data };
    if (data.slug && data.slug !== existing.slug) {
      updateData.slug = await generateUniqueSlug(strapi, UID, siteId, data.slug, documentId);
    }
    if (data.status && isValidStatus(data.status)) {
      updateData = applyStatusChange(updateData, data.status);
    }
    // 真值校验（仅当 status 变为 published 时强制）
    if (updateData.status === STATUS.PUBLISHED) {
      const validation = await firstTruthValidate(siteId, { ...existing, ...updateData });
      if (validation.hasError) {
        const e: any = new Error("内容与第一真值冲突（error 级），无法发布");
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

  async publish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.PUBLISHED });
  },

  async unpublish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.DRAFT });
  },

  async archive(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: STATUS.ARCHIVED });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  async incrementViewCount(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return;
    await strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { viewCount: (existing.viewCount || 0) + 1 },
    });
  },
});

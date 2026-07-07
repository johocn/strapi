import type { Core } from "@strapi/strapi";
import { generateUniqueSlug } from "./utils/slug";
import { applyStatusChange, STATUS, isValidStatus } from "./utils/status";
import { firstTruthValidate } from "./utils/first-truth-validate";

const UID = "plugin::zhao-website.article";

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
      populate: ["coverImage", "category", "tags", "mainEntity"],
    });
  },

  async findOne(siteId: number, slug: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: "published" },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities", "ogImage"],
    });
  },

  async findFeatured(siteId: number, limit = 5) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: "published", isFeatured: true },
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"],
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
          { excerpt: { $containsi: keyword } },
          { content: { $containsi: keyword } },
        ],
      },
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"],
    });
    return {
      data: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total: items.length, pageCount: 1 } },
    };
  },

  // ===== 管理端 =====
  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, category } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = category;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["coverImage", "category", "tags"],
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities",
                 "ogImage", "sourceArticleDraft", "structuredData"],
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
      const e: any = new Error("Article not found");
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

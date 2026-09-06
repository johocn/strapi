import type { Core } from "@strapi/strapi";
import { generateUniqueSlug } from "./utils/slug";
import { applyStatusChange, STATUS, isValidStatus } from "./utils/status";
import { firstTruthValidate } from "./utils/first-truth-validate";
import { resolveCategoryFilter } from "./utils/category-filter";

const UID = "plugin::zhao-website.article";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, category, tag, exclude, status, isFeatured, q, locale } = query;
    const extra: any = {};
    if (status) extra.status = status;
    if (category) extra.category = await resolveCategoryFilter(strapi, siteId, category);
    if (isFeatured !== undefined) extra.isFeatured = isFeatured === "true" || isFeatured === true;

    // tag 过滤：knex 查 join 表拿 article_id 列表（OR 语义）
    if (tag) {
      const tagIds = String(tag).split(",").map((s) => s.trim()).filter(Boolean);
      if (tagIds.length > 0) {
        try {
          const db = strapi.db.connection;
          const rows = await db
            .select("article_id")
            .from("zhao_website_articles_tags_lnk")
            .whereIn("tag_id", tagIds);
          const articleIds = [...new Set(rows.map((r: any) => r.article_id))];
          if (articleIds.length === 0) return []; // 短路，避免 IN () 报错
          extra.id = { $in: articleIds };
        } catch (err) {
          strapi.log.warn("[zhao-website] tag filter knex failed, fallback to no-tag:", (err as Error).message);
        }
      }
    }

    // exclude 过滤：排除指定 documentId 对应的 article
    if (exclude) {
      const excludeIds = String(exclude).split(",").map((s) => s.trim()).filter(Boolean);
      if (excludeIds.length > 0) {
        const excludeRows = await strapi.db.query(UID).findMany({
          where: { documentId: { $in: excludeIds } },
          select: ["id"],
        });
        const excludeNumericIds = excludeRows.map((r: any) => r.id);
        if (excludeNumericIds.length > 0) {
          extra.id = { ...(extra.id || {}), $notIn: excludeNumericIds };
        }
      }
    }

    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, extra, locale);
    return strapi.db.query(UID).findMany({
      where,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags", "mainEntity"],
    });
  },

  async findOne(siteId: number, slug: string, locale?: string) {
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, { slug }, locale);
    return strapi.db.query(UID).findOne({
      where,
      populate: ["coverImage", "category", "tags", "mainEntity", "mentionedEntities", "ogImage"],
    });
  },

  async findFeatured(siteId: number, limit = 5, locale?: string) {
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, { isFeatured: true }, locale);
    return strapi.db.query(UID).findMany({
      where,
      limit,
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category"],
    });
  },

  async search(siteId: number, keyword: string, page = 1, pageSize = 20) {
    if (!keyword || keyword.length < 2) {
      return { data: [], meta: { pagination: { page, pageSize, total: 0, pageCount: 0 } } };
    }
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, {
      $or: [
        { title: { $containsi: keyword } },
        { excerpt: { $containsi: keyword } },
        { content: { $containsi: keyword } },
      ],
    });
    const items = await strapi.db.query(UID).findMany({
      where,
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
    const { page = 1, pageSize = 20, status, category, tagGroup } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (category) filters.category = await resolveCategoryFilter(strapi, siteId, category);

    // tagGroup 筛选：knex 查 join 表拿 article_id 列表
    if (tagGroup) {
      const knex = strapi.db.connection;
      const groupRow = await knex('zhao_tag_groups').where('slug', tagGroup).first()
        || await knex('zhao_tag_groups').where('document_id', tagGroup).first();
      if (groupRow?.id) {
        const tagRows = await knex('zhao_tags_tag_group_lnk').where('tag_group_id', groupRow.id).select('tag_id');
        const tagIds = tagRows.map((r: any) => r.tag_id);
        if (tagIds.length > 0) {
          const articleRows = await knex('zhao_website_articles_tags_lnk')
            .whereIn('tag_id', tagIds).select('article_id');
          const articleIds = [...new Set(articleRows.map((r: any) => r.article_id))];
          if (articleIds.length === 0) return [];
          filters.id = { $in: articleIds };
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
      populate: { coverImage: true, category: true, tags: { populate: { tagGroup: true } } },
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: {
        coverImage: true,
        category: true,
        tags: { populate: { tagGroup: true } },
        mainEntity: true,
        mentionedEntities: true,
        ogImage: true,
        sourceArticleDraft: true,
        structuredData: true,
      },
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

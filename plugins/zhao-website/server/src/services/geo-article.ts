import type { Core } from "@strapi/strapi";
import { generateUniqueSlug } from "./utils/slug";

const UID = "plugin::zhao-website.geo-article";
const MANY_TO_ONE = ["author", "editor", "reviewer", "category"];
const MANY_TO_MANY = ["tags", "truthBasis", "mentionedEntities"];
const ADMIN_POPULATE = ["author", "editor", "reviewer", "category", "tags", "truthBasis", "mentionedEntities", "coverImage"];

function badRequest(msg: string) {
  const e: any = new Error(msg);
  e.status = 400;
  return e;
}

function notFound(msg = "GeoArticle not found") {
  const e: any = new Error(msg);
  e.status = 404;
  return e;
}

/** 关系入参宽容解析：manyToOne 收数字/数字字符串标量，manyToMany 收数字 id 数组；非法值 400 而非 500 */
function coerceRelationIds(data: any): any {
  const out = { ...data };
  for (const f of MANY_TO_ONE) {
    if (out[f] === undefined || out[f] === null || out[f] === "") continue;
    const n = Number(out[f]);
    if (!Number.isInteger(n)) throw badRequest(`关系字段 ${f} 必须为数字 id`);
    out[f] = n;
  }
  for (const f of MANY_TO_MANY) {
    if (out[f] === undefined || out[f] === null) continue;
    const arr = Array.isArray(out[f]) ? out[f] : [out[f]];
    out[f] = arr.map((v: any) => {
      const n = Number(v);
      if (!Number.isInteger(n)) throw badRequest(`关系字段 ${f} 必须为数字 id 数组`);
      return n;
    });
  }
  return out;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, q, locale } = query;
    const extra: any = {};
    if (type) extra.type = type;
    if (q) extra.title = { $containsi: q };
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, extra, locale);
    const items = await strapi.db.query(UID).findMany({
      where,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { publishedAt: "DESC" },
      populate: ["coverImage", "category", "tags"],
    });
    const total = await strapi.db.query(UID).count({ where });
    return { results: items, meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) } } };
  },

  async findOne(siteId: number, slug: string, locale?: string) {
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, { slug }, locale);
    const doc = await strapi.db.query(UID).findOne({
      where,
      populate: ["coverImage", "category", "tags", "author", "truthBasis", "mentionedEntities"],
    });
    if (!doc) return null;
    const siblings = await strapi.db.query(UID).findMany({
      where: { site: siteId, documentId: doc.documentId, status: "published", deletedAt: null, locale: { $ne: doc.locale } },
      select: ["id", "locale", "slug", "title"],
    });
    return { ...doc, localizations: siblings };
  },

  async findFeatured(siteId: number, limit = 5, locale?: string, type?: string) {
    const extra: any = {};
    if (type) extra.type = type;
    const filterService = strapi.plugin("zhao-website").service("content-filter");
    const where = await filterService.buildWhere(siteId, UID, extra, locale);
    return strapi.db.query(UID).findMany({ where, limit, orderBy: { publishedAt: "DESC" }, populate: ["coverImage", "category"] });
  },

  // ===== 管理端 =====
  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, status, type, q } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (q) filters.title = { $containsi: q };
    const items = await strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ADMIN_POPULATE,
    });
    const total = await strapi.db.query(UID).count({ where: filters });
    return {
      results: items,
      meta: { pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) } },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ADMIN_POPULATE,
    });
  },

  async create(siteId: number, data: any) {
    // slug 未传时按标题生成唯一 slug；locale 未传时注入 zh-CN（防 locale=NULL 前端页不生成）
    const slug = data.slug || (await generateUniqueSlug(strapi, UID, siteId, data.title || "untitled"));
    // 双层防护第 1 层：创建阶段强制非 published（published 只能经 publish 端点触发门禁）
    const status = data.status && data.status !== "published" ? data.status : "draft";
    const payload = coerceRelationIds({ ...data, site: siteId, slug, status, locale: data.locale || "zh-CN" });
    return strapi.db.query(UID).create({ data: payload });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw notFound();
    // status 变更（转 published）由 lifecycle beforeUpdate 门禁拦截
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: coerceRelationIds(data),
    });
  },

  async publish(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: "published" });
  },

  async archive(siteId: number, documentId: string) {
    return this.update(siteId, documentId, { status: "archived" });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  async batch(siteId: number, body: any = {}) {
    const { action, documentIds } = body;
    if (!["publish", "archive", "delete"].includes(action) || !Array.isArray(documentIds)) {
      const e: any = new Error("batch 参数错误：action ∈ publish/archive/delete，documentIds 为数组");
      e.status = 400;
      throw e;
    }
    const results: any[] = [];
    for (const documentId of documentIds) {
      try {
        if (action === "publish") await this.publish(siteId, documentId);
        else if (action === "archive") await this.archive(siteId, documentId);
        else await this.softDelete(siteId, documentId);
        results.push({ documentId, ok: true });
      } catch (err: any) {
        results.push({ documentId, ok: false, error: err.message });
      }
    }
    return { results };
  },
});

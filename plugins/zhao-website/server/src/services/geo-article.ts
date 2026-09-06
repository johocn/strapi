import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.geo-article";

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
      populate: ["coverImage", "category", "tags"],
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
});

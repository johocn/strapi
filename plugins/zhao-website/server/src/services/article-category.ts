import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.article-category";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, status: true },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"],
    });
  },

  async findTree(siteId: number) {
    const all = await this.find(siteId);
    return buildTree(all);
  },

  async findAdmin(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { order: "ASC" },
      populate: ["parent", "children"],
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["parent", "children"],
    });
  },

  async create(siteId: number, data: any) {
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Category not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});

function buildTree(items: any[], parentId: number | null = null): any[] {
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

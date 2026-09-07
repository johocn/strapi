import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.author";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null },
      orderBy: { id: "DESC" },
    });
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
  },

  async create(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Author not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({ where: { id: existing.id }, data });
  },

  async softDelete(siteId: number, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },
});

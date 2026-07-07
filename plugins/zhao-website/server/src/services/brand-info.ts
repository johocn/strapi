import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.brand-info";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async ensureDefault(siteId: number): Promise<any> {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null },
    });
    if (existing) return existing;

    return strapi.db.query(UID).create({
      data: {
        site: siteId,
        companyName: "",
      },
    });
  },

  async find(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },

  async update(siteId: number, data: any): Promise<any> {
    const existing = await this.ensureDefault(siteId);
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async findPublic(siteId: number): Promise<any> {
    return this.ensureDefault(siteId);
  },
});

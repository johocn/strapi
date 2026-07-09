import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.customer-profile";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, customerType, lifecycleStage, country, name, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (customerType) filters.customerType = customerType;
    if (lifecycleStage) filters.lifecycleStage = lifecycleStage;
    if (country) filters.country = country;
    if (name) filters.name = { $containsi: name };

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { assignedTo: true },
      }),
      strapi.db.query(UID).count({ where: filters }),
    ]);

    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) },
    };
  },

  async findOneAdmin(siteId: number, documentId: string) {
    return strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { assignedTo: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});

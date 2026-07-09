import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-logistics.tracking-shipment";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAdmin(siteId: number, query: any) {
    const { page = 1, pageSize = 10, status, trackingNo, customerName, sort = "createdAt:desc" } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (trackingNo) filters.trackingNo = { $containsi: trackingNo };
    if (customerName) filters.customerName = { $containsi: customerName };

    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const [rows, total] = await Promise.all([
      strapi.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { syncProvider: true },
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
      populate: { syncProvider: true },
    });
  },

  async createAdmin(siteId: number, data: any) {
    // 校验 trackingNo 唯一性
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null },
    });
    if (existing) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    return strapi.db.query(UID).create({ data: { ...data, site: siteId } });
  },

  async updateAdmin(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("运单不存在或已删除");
    // 若修改 trackingNo，校验唯一性
    if (data.trackingNo && data.trackingNo !== existing.trackingNo) {
      const dup = await strapi.db.query(UID).findOne({
        where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null },
      });
      if (dup) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    }
    return strapi.db.query(UID).update({ where: { documentId }, data });
  },

  async deleteAdmin(siteId: number, documentId: string) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) throw new Error("运单不存在或已删除");
    return strapi.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: new Date() },
    });
  },
});

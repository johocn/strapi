import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.interaction";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async toggle(siteId: number, data: { type: string; targetType: string; targetId: string; visitorId: string; userId?: number; ctx?: any }) {
    // 查询是否已存在
    const existing = await strapi.db.query(UID).findOne({
      where: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        deletedAt: null,
      },
    });
    if (existing) {
      // 已存在 → 取消（软删除）
      await strapi.db.query(UID).update({
        where: { id: existing.id },
        data: { deletedAt: new Date().toISOString() },
      });
      return { action: "removed" };
    }
    // 不存在 → 创建
    await strapi.db.query(UID).create({
      data: {
        site: siteId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        visitorId: data.visitorId,
        userId: data.userId,
        ipAddress: data.ctx?.request?.ip,
        userAgent: data.ctx?.request?.headers?.["user-agent"],
      },
    });
    return { action: "created" };
  },

  async check(siteId: number, params: { type: string; targetType: string; targetId: string; visitorId: string }) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, deletedAt: null, ...params },
    });
    return { liked: !!existing };
  },

  async findAdmin(siteId: number, query: any = {}) {
    const { page = 1, pageSize = 20, type, targetType, targetId } = query;
    const filters: any = { site: siteId, deletedAt: null };
    if (type) filters.type = type;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { createdAt: "DESC" },
    });
  },

  async stats(siteId: number, targetType: string, targetId: string) {
    const counts: any = {};
    for (const type of ["like", "collect", "share"]) {
      const items = await strapi.db.query(UID).findMany({
        where: { site: siteId, type, targetType, targetId, deletedAt: null },
      });
      counts[type] = items.length;
    }
    return counts;
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

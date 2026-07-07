import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.ai-content-summary";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByTarget(siteId: number, targetType: string, targetId: string, summaryType?: string) {
    const filters: any = { site: siteId, targetType, targetId, deletedAt: null, status: true };
    if (summaryType) filters.summaryType = summaryType;
    return strapi.db.query(UID).findMany({ where: filters });
  },

  async findPublic(siteId: number, query: any = {}) {
    const { targetType, targetId, summaryType } = query;
    return this.findByTarget(siteId, targetType, targetId, summaryType);
  },

  async findAdmin(siteId: number, query: any = {}) {
    return strapi.db.query(UID).findMany({
      where: { site: siteId, deletedAt: null, ...query },
      orderBy: { updatedAt: "DESC" },
    });
  },

  async create(siteId: number, data: any) {
    // 唯一约束：(site, targetType, targetId, summaryType, language)
    const existing = await strapi.db.query(UID).findOne({
      where: {
        site: siteId,
        targetType: data.targetType,
        targetId: data.targetId,
        summaryType: data.summaryType,
        language: data.language || "zh-CN",
        deletedAt: null,
      },
    });
    if (existing) {
      // version + 1
      return strapi.db.query(UID).update({
        where: { id: existing.id },
        data: { ...data, version: (existing.version || 0) + 1 },
      });
    }
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId, language: data.language || "zh-CN", version: 1 },
    });
  },

  async update(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { ...data, version: (existing.version || 1) + 1 },
    });
  },

  async regenerate(siteId: number, documentId: string): Promise<any> {
    // 一期桩：标记为 pending，实际生成由二期 AI 接入
    const existing = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Summary not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: {
        verificationStatus: "pending",
        generatedAt: null,
      },
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

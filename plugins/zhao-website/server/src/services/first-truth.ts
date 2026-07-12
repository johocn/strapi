import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.first-truth-policy";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(siteId: number | null, query: any = {}) {
    const { claimCategory, verificationStatus } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (claimCategory) { filters.$or[0].claimCategory = claimCategory; filters.$or[1].claimCategory = claimCategory; }
    if (verificationStatus) { filters.$or[0].verificationStatus = verificationStatus; filters.$or[1].verificationStatus = verificationStatus; }
    return strapi.db.query(UID).findMany({
      where: filters,
      orderBy: { priority: "DESC", updatedAt: "DESC" },
      populate: ["canonicalEntity"],
    });
  },

  async findOne(siteId: number | null, documentId: string) {
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, documentId, deletedAt: null },
      populate: ["canonicalEntity"],
    });
  },

  async findByClaimKey(siteId: number | null, claimKey: string) {
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, claimKey, deletedAt: null },
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, claimKey, deletedAt: null },
    });
  },

  async create(siteId: number | null, data: any) {
    const existing = await this.findByClaimKey(siteId, data.claimKey);
    if (existing) {
      const e: any = new Error(`claimKey "${data.claimKey}" 已存在`);
      e.status = 409;
      e.code = "CLAIM_KEY_EXISTS";
      throw e;
    }
    return strapi.db.query(UID).create({
      data: {
        ...data,
        site: siteId,
        lastVerifiedAt: new Date().toISOString(),
        verificationStatus: data.verificationStatus || "verified",
      },
    });
  },

  async update(siteId: number | null, documentId: string, data: any) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    // 真值更新 → 关联 entity verificationStatus=pending
    if (data.canonicalValue && data.canonicalValue !== existing.canonicalValue) {
      await this._markRelatedEntitiesPending(siteId, existing.canonicalEntity);
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: {
        ...data,
        lastVerifiedAt: new Date().toISOString(),
        verificationStatus: data.verificationStatus || "verified",
      },
    });
  },

  async _markRelatedEntitiesPending(siteId: number | null, canonicalEntity: any) {
    if (!canonicalEntity) return;
    const entityId = canonicalEntity.documentId || canonicalEntity;
    const entity = await strapi.db.query("plugin::zhao-website.knowledge-entity").findOne({
      where: { site: siteId, documentId: entityId, deletedAt: null },
    });
    if (entity) {
      await strapi.db.query("plugin::zhao-website.knowledge-entity").update({
        where: { id: entity.id },
        data: { verificationStatus: "pending" },
      });
    }
  },

  async verify(siteId: number | null, documentId: string) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) {
      const e: any = new Error("Truth not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { verificationStatus: "verified", lastVerifiedAt: new Date().toISOString() },
    });
  },

  async softDelete(siteId: number | null, documentId: string) {
    const existing = await this.findOne(siteId, documentId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 冲突检测 =====
  async detectConflicts(siteId: number | null) {
    const truths = await strapi.db.query(UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
    });
    const byKey: Record<string, any[]> = {};
    for (const t of truths) {
      const key = `${t.claimKey}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    }
    const conflicts: any[] = [];
    for (const [key, items] of Object.entries(byKey)) {
      if (items.length > 1) {
        const values = new Set(items.map((i) => i.canonicalValue));
        if (values.size > 1) {
          conflicts.push({
            claimKey: key,
            severity: "error",
            values: items.map((i) => ({
              value: i.canonicalValue,
              sourceUrl: i.canonicalSourceUrl,
              sourceType: i.canonicalSourceType,
            })),
          });
        }
      }
    }
    return conflicts;
  },
});

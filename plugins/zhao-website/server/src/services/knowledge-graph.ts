import type { Core } from "@strapi/strapi";
import { HIERARCHICAL_PREDICATES, isValidPredicate } from "./utils/predicate-dictionary";

const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== 实体 =====
  async findEntities(siteId: number, query: any = {}) {
    const { entityType, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (entityType) {
      filters.$or[0].entityType = entityType;
      filters.$or[1].entityType = entityType;
    }
    return strapi.db.query(ENTITY_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
      populate: ["image"],
    });
  },

  async findEntityBySlug(siteId: number, slug: string) {
    const tenant = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
    if (tenant) return tenant;
    return strapi.db.query(ENTITY_UID).findOne({
      where: { site: null, slug, deletedAt: null, status: true },
      populate: ["image"],
    });
  },

  async findEntityByRef(params: { refTargetType: string; refTargetId: string }) {
    return strapi.db.query(ENTITY_UID).findOne({
      where: { refTargetType: params.refTargetType, refTargetId: params.refTargetId, deletedAt: null },
    });
  },

  async upsertEntityFromContent(params: {
    siteId: number;
    entityType: string;
    name: string;
    refTargetType: string;
    refTargetId: string;
  }) {
    const existing = await this.findEntityByRef({
      refTargetType: params.refTargetType,
      refTargetId: params.refTargetId,
    });
    if (existing) {
      return strapi.db.query(ENTITY_UID).update({
        where: { id: existing.id },
        data: { name: params.name, entityType: params.entityType },
      });
    }
    return strapi.db.query(ENTITY_UID).create({
      data: {
        site: params.siteId,
        entityType: params.entityType,
        name: params.name,
        refTargetType: params.refTargetType,
        refTargetId: params.refTargetId,
        sourceType: "derived",
      },
    });
  },

  async createEntity(siteId: number | null, data: any) {
    return strapi.db.query(ENTITY_UID).create({
      data: { ...data, site: siteId },
    });
  },

  async updateEntity(siteId: number | null, documentId: string, data: any) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Entity not found");
      e.status = 404;
      throw e;
    }
    return strapi.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async deleteEntity(siteId: number | null, documentId: string) {
    const existing = await strapi.db.query(ENTITY_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(ENTITY_UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 关系 =====
  async findRelations(siteId: number, query: any = {}) {
    const { subjectEntityId, predicate, objectEntityId, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (subjectEntityId) { filters.$or[0].subjectEntity = subjectEntityId; filters.$or[1].subjectEntity = subjectEntityId; }
    if (predicate) { filters.$or[0].predicate = predicate; filters.$or[1].predicate = predicate; }
    if (objectEntityId) { filters.$or[0].objectEntity = objectEntityId; filters.$or[1].objectEntity = objectEntityId; }
    return strapi.db.query(RELATION_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      populate: ["subjectEntity", "objectEntity"],
    });
  },

  async addRelation(params: {
    siteId: number;
    subjectEntityId: string;
    predicate: string;
    objectEntityId?: string;
    objectValue?: any;
    objectText?: string;
    sourceType?: string;
  }) {
    // 校验自引用
    if (params.objectEntityId && params.subjectEntityId === params.objectEntityId) {
      const e: any = new Error("Self-relation not allowed");
      e.status = 400;
      e.code = "SELF_RELATION";
      throw e;
    }
    // 校验客体互斥
    const hasEntity = !!params.objectEntityId;
    const hasValue = params.objectValue !== undefined && params.objectValue !== null;
    const hasText = !!params.objectText;
    if (hasEntity && (hasValue || hasText)) {
      const e: any = new Error("objectEntity 与 objectValue/objectText 互斥");
      e.status = 400;
      e.code = "OBJECT_MUTEX";
      throw e;
    }
    if (!hasEntity && !hasValue && !hasText) {
      const e: any = new Error("客体不能为空");
      e.status = 400;
      e.code = "OBJECT_EMPTY";
      throw e;
    }
    // 层级关系循环引用检测
    if (params.objectEntityId && HIERARCHICAL_PREDICATES.has(params.predicate)) {
      const hasCycle = await this._detectCycle(params.subjectEntityId, params.objectEntityId, params.predicate);
      if (hasCycle) {
        const e: any = new Error("循环引用 not allowed for hierarchical predicate");
        e.status = 400;
        e.code = "CYCLE_DETECTED";
        throw e;
      }
    }
    // 谓词字典 warning（不阻止）
    // 查询 subjectEntity 获取 entityType
    const subjectEntity = await strapi.db.query(ENTITY_UID).findOne({
      where: { documentId: params.subjectEntityId },
    });
    if (subjectEntity && !isValidPredicate(subjectEntity.entityType, params.predicate)) {
      strapi.log.warn(`[kg] predicate "${params.predicate}" 不在 ${subjectEntity.entityType} 字典中`);
    }

    // 幂等 upsert（同 S+P+O）
    if (params.objectEntityId) {
      const existing = await strapi.db.query(RELATION_UID).findOne({
        where: {
          subjectEntity: params.subjectEntityId,
          predicate: params.predicate,
          objectEntity: params.objectEntityId,
          deletedAt: null,
        },
      });
      if (existing) return existing;
    }

    return strapi.db.query(RELATION_UID).create({
      data: {
        site: params.siteId,
        subjectEntity: params.subjectEntityId,
        predicate: params.predicate,
        objectEntity: params.objectEntityId || null,
        objectValue: params.objectValue || null,
        objectText: params.objectText || null,
        sourceType: params.sourceType || "manual",
      },
    });
  },

  async _detectCycle(subjectId: string, objectId: string, predicate: string, visited = new Set<string>()): Promise<boolean> {
    if (subjectId === objectId) return true;
    if (visited.has(subjectId)) return false;
    visited.add(subjectId);
    // 查询 object 的所有同 predicate 出边
    const outRelations = await strapi.db.query(RELATION_UID).findMany({
      where: { subjectEntity: objectId, predicate, deletedAt: null },
      populate: ["objectEntity"],
    });
    for (const rel of outRelations) {
      if (rel.objectEntity && rel.objectEntity.documentId) {
        if (await this._detectCycle(subjectId, rel.objectEntity.documentId, predicate, visited)) {
          return true;
        }
      }
    }
    return false;
  },

  async deleteRelation(siteId: number, documentId: string) {
    const existing = await strapi.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) return null;
    return strapi.db.query(RELATION_UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date().toISOString() },
    });
  },

  // ===== 消歧 =====
  async disambiguate(siteId: number, params: { name: string; entityType?: string }): Promise<any | null> {
    const baseFilter = {
      name: { $containsi: params.name },
      deletedAt: null,
      ...(params.entityType ? { entityType: params.entityType } : {}),
    };
    const candidates = await strapi.db.query(ENTITY_UID).findMany({
      where: {
        $or: [
          { ...baseFilter, site: siteId },
          { ...baseFilter, site: null },
        ],
      },
    });
    if (candidates.length === 0) return null;
    // 精确匹配优先
    const exact = candidates.find((c: any) => c.name === params.name);
    if (exact) return { entity: exact, confidence: 1.0 };
    // 否则最高 confidence（这里简化为第一个）
    const top = candidates[0];
    const confidence = top.name.length / params.name.length;
    if (confidence < 0.7) return null;
    return { entity: top, confidence };
  },

  // ===== 同步与校验 =====
  async syncFromContent(targetType: string, content: any): Promise<void> {
    // 委托给 utils/kg-sync
    const { knowledgeGraphSync } = await import("./utils/kg-sync");
    return knowledgeGraphSync(targetType, content);
  },

  async verifyAll(siteId: number): Promise<{ total: number; conflicts: number; report: any[] }> {
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }] },
    });
    let conflicts = 0;
    const report: any[] = [];
    for (const entity of entities) {
      // 简化：检查是否有冲突的 first-truth
      const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: { $or: [{ site: siteId, canonicalEntity: entity.documentId, verificationStatus: "conflict" }, { site: null, canonicalEntity: entity.documentId, verificationStatus: "conflict" }] },
      });
      if (truths.length > 0) {
        conflicts += 1;
        report.push({ entityId: entity.documentId, conflictCount: truths.length });
        await strapi.db.query(ENTITY_UID).update({
          where: { id: entity.id },
          data: { verificationStatus: "conflict" },
        });
      }
    }
    return { total: entities.length, conflicts, report };
  },

  // ===== JSON-LD 导出 =====
  async exportGraph(siteId: number): Promise<any> {
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
      populate: ["image"],
    });
    const relations = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
      populate: ["subjectEntity", "objectEntity"],
    });
    const graph = entities.map((e: any) => this._entityToJsonLd(e, relations.filter((r: any) => r.subjectEntity?.id === e.id)));
    return { "@context": "https://schema.org", "@graph": graph };
  },

  async exportEntity(siteId: number, slug: string): Promise<any | null> {
    const entity = await this.findEntityBySlug(siteId, slug);
    if (!entity) return null;
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, subjectEntity: entity.documentId, deletedAt: null }, { site: null, subjectEntity: entity.documentId, deletedAt: null }] },
      populate: ["objectEntity"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, objectEntity: entity.documentId, deletedAt: null }, { site: null, objectEntity: entity.documentId, deletedAt: null }] },
      populate: ["subjectEntity"],
    });
    return this._entityToJsonLd(entity, outgoing, incoming);
  },

  _entityToJsonLd(entity: any, outgoing: any[] = [], incoming: any[] = []): any {
    const jsonLd: any = {
      "@type": entity.entityType,
      "@id": entity.slug || entity.documentId,
      "name": entity.name,
    };
    if (entity.description) jsonLd.description = entity.description;
    if (entity.url) jsonLd.url = entity.url;
    if (entity.image) jsonLd.image = entity.url; // 简化
    if (entity.properties) Object.assign(jsonLd, entity.properties);
    for (const rel of outgoing) {
      if (rel.objectEntity) {
        jsonLd[rel.predicate] = { "@id": rel.objectEntity.slug || rel.objectEntity.documentId };
      } else if (rel.objectValue) {
        jsonLd[rel.predicate] = rel.objectValue;
      } else if (rel.objectText) {
        jsonLd[rel.predicate] = rel.objectText;
      }
    }
    return jsonLd;
  },

  async exportFacts(siteId: number): Promise<any[]> {
    const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
      where: { $or: [{ site: siteId, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } }, { site: null, deletedAt: null, status: true, verificationStatus: { $in: ["verified", "pending", "outdated"] } }] },
    });
    return truths.map((t: any) => ({
      claimKey: t.claimKey,
      claim: t.claim,
      value: t.canonicalValue,
      valueType: t.canonicalValueType,
      sourceUrl: t.canonicalSourceUrl,
      sourceType: t.canonicalSourceType,
      category: t.claimCategory,
      priority: t.priority,
      lastVerifiedAt: t.lastVerifiedAt,
      verificationStatus: t.verificationStatus,
    }));
  },
});

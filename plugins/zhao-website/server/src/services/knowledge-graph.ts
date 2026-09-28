import type { Core } from "@strapi/strapi";
import { HIERARCHICAL_PREDICATES, isValidPredicate } from "./utils/predicate-dictionary";
import { knowledgeGraphSync } from "./utils/kg-sync";

const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";
const TRUTH_UID = "plugin::zhao-website.first-truth-policy";

/** 文本归一：全角→半角、空白压缩、trim、小写（只用于 text 类型比对，不做模糊匹配） */
function normalizeText(v: any): string {
  return String(v ?? "")
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** JSON 稳定序列化：对象键排序，保证键序不同不误判为差异 */
function stableJson(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
    .join(",")}}`;
}

/** 取出关系客体中的标量值：objectEntity 型关系不参与真值比对 */
function relationScalarValue(relation: any): { kind: "value" | "text"; value: any } | null {
  if (relation?.objectValue !== undefined && relation?.objectValue !== null) {
    return { kind: "value", value: relation.objectValue };
  }
  if (relation?.objectText !== undefined && relation?.objectText !== null && relation.objectText !== "") {
    return { kind: "text", value: relation.objectText };
  }
  return null;
}

/**
 * 按 canonicalValueType 比较实际值与规范值。
 * comparisonMode=contains 时，文本只判「包含」——表述型真值的规范值是长句，
 * 实际值是整段正文，全等必然误报。
 */
function valuesMatch(valueType: string, actual: any, expected: any, comparisonMode = "exact"): boolean {
  if (comparisonMode === "contains" && valueType === "text") {
    return normalizeText(actual).includes(normalizeText(expected));
  }
  switch (valueType) {
    case "number": {
      const a = Number(actual);
      const b = Number(expected);
      return Number.isFinite(a) && Number.isFinite(b) && a === b;
    }
    case "date": {
      const a = Date.parse(String(actual));
      const b = Date.parse(String(expected));
      if (Number.isNaN(a) || Number.isNaN(b)) return normalizeText(actual) === normalizeText(expected);
      return a === b;
    }
    case "url":
      return normalizeText(actual).replace(/\/+$/, "") === normalizeText(expected).replace(/\/+$/, "");
    case "json":
      return stableJson(actual) === stableJson(typeof expected === "string" ? safeJsonParse(expected) : expected);
    default:
      return normalizeText(actual) === normalizeText(expected);
  }
}

function safeJsonParse(v: string): any {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

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
    // 派生实体是内容 CT 的内部节点，不对外提供实体页
    const where = { slug, deletedAt: null, status: true, sourceType: { $ne: "derived" } };
    const tenant = await strapi.db.query(ENTITY_UID).findOne({
      where: { ...where, site: siteId },
      populate: ["image"],
    });
    if (tenant) return tenant;
    return strapi.db.query(ENTITY_UID).findOne({
      where: { ...where, site: null },
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
    slug?: string;
    refTargetType: string;
    refTargetId: string;
  }) {
    const existing: any = await this.findEntityByRef({
      refTargetType: params.refTargetType,
      refTargetId: params.refTargetId,
    });
    // slug 为 uid(targetField=name)，中文标题自动生成结果为空串，须显式给出
    const slug = params.slug || `${params.refTargetType}-${params.refTargetId}`;
    if (existing) {
      return strapi.db.query(ENTITY_UID).update({
        where: { id: existing.id },
        data: {
          name: params.name,
          entityType: params.entityType,
          // 只在遗留空 slug 时补写，不覆盖人工设定
          ...(existing.slug ? {} : { slug }),
        },
      });
    }
    return strapi.db.query(ENTITY_UID).create({
      data: {
        site: params.siteId,
        entityType: params.entityType,
        name: params.name,
        slug,
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
    const { subjectEntityId, predicate, objectEntityId, documentId, page = 1, pageSize = 20 } = query;
    // 支持 filters[documentId]（前端编辑页按 documentId 拉详情）与裸 documentId
    const docId = query.filters?.documentId ?? documentId;
    const filters: any = {
      $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
    };
    if (docId) { filters.$or[0].documentId = docId; filters.$or[1].documentId = docId; }
    if (subjectEntityId) {
      const sid = await this._resolveEntityId(subjectEntityId);
      // 过滤条件解析不到实体时返回空集，避免静默退化为全量返回
      if (!sid) return [];
      filters.$or[0].subjectEntity = sid;
      filters.$or[1].subjectEntity = sid;
    }
    if (predicate) { filters.$or[0].predicate = predicate; filters.$or[1].predicate = predicate; }
    if (objectEntityId) {
      const oid = await this._resolveEntityId(objectEntityId);
      if (!oid) return [];
      filters.$or[0].objectEntity = oid;
      filters.$or[1].objectEntity = oid;
    }
    return strapi.db.query(RELATION_UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      populate: ["subjectEntity", "objectEntity", "truthPolicy"],
    });
  },

  /** documentId/数字 id → 实体数字 id（关系过滤必须用数字 id） */
  async _resolveEntityId(ref: string | number): Promise<number | null> {
    if (typeof ref === "number" && Number.isInteger(ref)) return ref;
    if (/^\d+$/.test(String(ref))) return Number(ref);
    const ent = await strapi.db.query(ENTITY_UID).findOne({ where: { documentId: String(ref) } });
    return ent ? ent.id : null;
  },

  /**
   * 统一归一入口：lnk 列只接受数字 id，解析失败直接 400。
   * 所有指向 subjectEntity/objectEntity/canonicalEntity 的过滤与写入都必须走这里。
   */
  async _requireEntityId(ref: string | number, label = "entityId"): Promise<number> {
    const id = await this._resolveEntityId(ref);
    if (!id) {
      const e: any = new Error(`${label} 无效`);
      e.status = 400;
      e.code = "ENTITY_NOT_FOUND";
      throw e;
    }
    return id;
  },

  /** documentId/数字 id → 真值数字 id */
  async _resolveTruthId(ref: string | number): Promise<number | null> {
    if (typeof ref === "number" && Number.isInteger(ref)) return ref;
    if (/^\d+$/.test(String(ref))) return Number(ref);
    const truth = await strapi.db.query(TRUTH_UID).findOne({ where: { documentId: String(ref) } });
    return truth ? truth.id : null;
  },

  /** 归一入口：truthPolicy 也是 lnk 列，只接受数字 id，解析失败 400 */
  async _requireTruthId(ref: string | number, label = "truthPolicyId"): Promise<number> {
    const id = await this._resolveTruthId(ref);
    if (!id) {
      const e: any = new Error(`${label} 无效`);
      e.status = 400;
      e.code = "TRUTH_NOT_FOUND";
      throw e;
    }
    return id;
  },

  /**
   * 关系值 vs 真值 canonicalValue 一致性校验 + 反向证据链落点。
   * - 无绑定 / 真值停用或软删 / 客体为 objectEntity 指针 → 跳过，返回 null（不写标记）
   * - 命中 → relation.verificationStatus = verified；不一致 → conflict
   */
  async compareRelationWithTruth(relation: any): Promise<"verified" | "conflict" | null> {
    const truthRef = relation?.truthPolicy;
    const truthId = truthRef && typeof truthRef === "object" ? truthRef.id : truthRef;
    if (!truthId) return null;

    const truth = await strapi.db.query(TRUTH_UID).findOne({
      where: { id: Number(truthId), deletedAt: null, status: true },
    });
    if (!truth) return null;

    const expected = truth.canonicalValue;
    if (expected === undefined || expected === null || expected === "") return null;

    const actual = relationScalarValue(relation);
    if (!actual) return null;

    const matched = valuesMatch(
      truth.canonicalValueType || "text",
      actual.value,
      expected,
      truth.comparisonMode || "exact"
    );
    const status = matched ? "verified" : "conflict";
    await strapi.db.query(RELATION_UID).update({
      where: { id: relation.id },
      data: { verificationStatus: status, lastVerifiedAt: new Date().toISOString() },
    });
    if (!matched) {
      strapi.log.warn(
        `[kg] 关系值偏离真值「${truth.claimKey}」: actual=${JSON.stringify(actual.value)} expected=${JSON.stringify(expected)}`
      );
    }
    return status;
  },

  /** 比对失败不阻塞写入，只告警 */
  async _safeCompareWithTruth(relation: any) {
    if (!relation?.id) return null;
    try {
      return await this.compareRelationWithTruth(relation);
    } catch (err: any) {
      strapi.log.warn(`[kg] 真值比对失败: ${err?.message}`);
      return null;
    }
  },

  async addRelation(params: {
    siteId: number;
    subjectEntityId: string;
    predicate: string;
    objectEntityId?: string;
    objectValue?: any;
    objectText?: string;
    sourceType?: string;
    truthPolicyId?: string;
  }) {
    // 自引用（documentId 层先拦一次，避免多余查询）
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
    // 统一归一为数字 id（lnk 列铁律）
    const subjectId = await this._requireEntityId(params.subjectEntityId, "subjectEntityId");
    const objectId = params.objectEntityId
      ? await this._requireEntityId(params.objectEntityId, "objectEntityId")
      : null;
    if (objectId && subjectId === objectId) {
      const e: any = new Error("Self-relation not allowed");
      e.status = 400;
      e.code = "SELF_RELATION";
      throw e;
    }
    // 层级关系循环引用检测
    if (objectId && HIERARCHICAL_PREDICATES.has(params.predicate)) {
      const hasCycle = await this._detectCycle(params.subjectEntityId, params.objectEntityId as string, params.predicate);
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
      where: { id: subjectId },
    });
    if (subjectEntity && !isValidPredicate(subjectEntity.entityType, params.predicate)) {
      strapi.log.warn(`[kg] predicate "${params.predicate}" 不在 ${subjectEntity.entityType} 字典中`);
    }

    // 真值绑定（lnk 列，只接受归一后的数字 id）
    const truthId = params.truthPolicyId ? await this._requireTruthId(params.truthPolicyId) : null;

    // 幂等 upsert（同 site + S + P + O；objectText 型关系以文本作为客体键）
    const idempotentWhere: any = {
      site: params.siteId,
      subjectEntity: subjectId,
      predicate: params.predicate,
      deletedAt: null,
    };
    if (objectId) {
      idempotentWhere.objectEntity = objectId;
    } else if (hasText) {
      idempotentWhere.objectText = params.objectText;
    }
    if (objectId || hasText) {
      const existing: any = await strapi.db.query(RELATION_UID).findOne({ where: idempotentWhere });
      if (existing) {
        // 幂等命中时补绑真值（原关系可能未绑定）
        if (truthId && Number(existing.truthPolicy) !== Number(truthId)) {
          existing.truthPolicy = truthId;
          await strapi.db.query(RELATION_UID).update({
            where: { id: existing.id },
            data: { truthPolicy: truthId },
          });
        }
        await this._safeCompareWithTruth(existing);
        return existing;
      }
    }

    const created: any = await strapi.db.query(RELATION_UID).create({
      data: {
        site: params.siteId,
        subjectEntity: subjectId,
        predicate: params.predicate,
        objectEntity: objectId,
        objectValue: params.objectValue || null,
        objectText: params.objectText || null,
        sourceType: params.sourceType || "manual",
        truthPolicy: truthId,
      },
    });
    await this._safeCompareWithTruth(truthId ? { ...created, truthPolicy: truthId } : created);
    return created;
  },

  async _detectCycle(subjectId: string, objectId: string, predicate: string, visited = new Set<string>()): Promise<boolean> {
    if (subjectId === objectId) return true;
    if (visited.has(subjectId)) return false;
    visited.add(subjectId);
    // 查询 object 的所有同 predicate 出边（关系过滤需数字 id）
    const objectNumId = await this._resolveEntityId(objectId);
    const outRelations = await strapi.db.query(RELATION_UID).findMany({
      where: { subjectEntity: objectNumId, predicate, deletedAt: null },
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

  async updateRelation(siteId: number, documentId: string, data: any) {
    const existing = await strapi.db.query(RELATION_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (!existing) {
      const e: any = new Error("Relation not found");
      e.status = 404;
      throw e;
    }
    const payload: any = {};
    if (data.subjectEntityId !== undefined && data.subjectEntityId !== null && data.subjectEntityId !== "") {
      payload.subjectEntity = await this._requireEntityId(data.subjectEntityId, "subjectEntityId");
    }
    if (data.predicate !== undefined) payload.predicate = data.predicate;
    if (data.objectText !== undefined) payload.objectText = data.objectText;
    if (data.objectValue !== undefined) payload.objectValue = data.objectValue;
    if (data.confidence !== undefined) payload.confidence = Number(data.confidence);
    if (data.verificationStatus !== undefined) payload.verificationStatus = data.verificationStatus;
    if (data.status !== undefined) payload.status = data.status === true || data.status === "true";
    // 可选：更新指向实体的客体（数字 id / 数字字符串 / documentId 均可，经 _requireEntityId 归一）
    if (data.objectEntityId !== undefined && data.objectEntityId !== null && data.objectEntityId !== "") {
      payload.objectEntity = await this._requireEntityId(data.objectEntityId, "objectEntityId");
    }
    // 真值绑定/解绑（truthPolicyId=null 或 "" 表示解绑）
    if (data.truthPolicyId !== undefined) {
      if (data.truthPolicyId === null || data.truthPolicyId === "") {
        payload.truthPolicy = null;
        // 解绑即复位校验标记，避免残留假 conflict（与未绑定关系的默认态一致）
        if (data.verificationStatus === undefined) payload.verificationStatus = "verified";
        payload.lastVerifiedAt = null;
      } else {
        payload.truthPolicy = await this._requireTruthId(data.truthPolicyId);
      }
    }
    // 自引用校验（主体与客体同时更新且相同）
    if (payload.subjectEntity && payload.objectEntity && payload.subjectEntity === payload.objectEntity) {
      const e: any = new Error("Self-relation not allowed");
      e.status = 400;
      e.code = "SELF_RELATION";
      throw e;
    }
    const updated: any = await strapi.db.query(RELATION_UID).update({ where: { id: existing.id }, data: payload });
    // 绑定或客体值变更 → 重比真值（解绑后无客体可比，跳过）
    const valueTouched =
      payload.objectValue !== undefined ||
      payload.objectText !== undefined ||
      payload.objectEntity !== undefined;
    if ((payload.truthPolicy !== undefined && payload.truthPolicy !== null) || valueTouched) {
      await this._safeCompareWithTruth({ ...existing, ...updated, ...payload, id: existing.id });
    }
    return updated;
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
    return knowledgeGraphSync(targetType, content);
  },

  async verifyAll(siteId: number): Promise<{ total: number; conflicts: number; report: any[] }> {
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }] },
    });
    let conflicts = 0;
    const report: any[] = [];
    for (const entity of entities) {
      // canonicalEntity 是 lnk 列，必须用实体数字 id（documentId 字符串会类型不匹配）
      const truths = await strapi.db.query("plugin::zhao-website.first-truth-policy").findMany({
        where: {
          $or: [
            { site: siteId, canonicalEntity: entity.id, verificationStatus: "conflict" },
            { site: null, canonicalEntity: entity.id, verificationStatus: "conflict" },
          ],
        },
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
    // 派生实体是内容 CT 的内部节点，不进公开图谱
    const scope = { deletedAt: null, status: true, sourceType: { $ne: "derived" } };
    const entities = await strapi.db.query(ENTITY_UID).findMany({
      where: { $or: [{ site: siteId, ...scope }, { site: null, ...scope }] },
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
    // 关系过滤必须用实体数字 id（documentId 是字符串，直接过滤 lnk 列会报 integer 类型错误）
    const entityId = await this._resolveEntityId(entity.documentId);
    const outgoing = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, subjectEntity: entityId, deletedAt: null }, { site: null, subjectEntity: entityId, deletedAt: null }] },
      populate: ["objectEntity", "truthPolicy"],
    });
    const incoming = await strapi.db.query(RELATION_UID).findMany({
      where: { $or: [{ site: siteId, objectEntity: entityId, deletedAt: null }, { site: null, objectEntity: entityId, deletedAt: null }] },
      populate: ["subjectEntity", "truthPolicy"],
    });
    const articles = await this.findArticlesByEntity(siteId, entityId);
    return {
      ...this._entityToJsonLd(entity, outgoing, incoming),
      // 前端实体页按 outgoing/incoming 数组渲染「知识关系」
      outgoing: outgoing.map((r: any) => ({
        predicate: r.predicate,
        objectEntity: r.objectEntity ? { slug: r.objectEntity.slug, name: r.objectEntity.name, "@id": r.objectEntity.slug || r.objectEntity.documentId } : undefined,
        objectValue: r.objectValue,
        objectText: r.objectText,
        sourceType: r.sourceType,
        verificationStatus: r.verificationStatus,
        // 证据链：该关系绑定到哪条第一真值
        truthClaimKey: r.truthPolicy?.claimKey,
      })),
      incoming: incoming.map((r: any) => ({
        predicate: r.predicate,
        subjectEntity: r.subjectEntity ? { slug: r.subjectEntity.slug, name: r.subjectEntity.name, "@id": r.subjectEntity.slug || r.subjectEntity.documentId } : undefined,
        sourceType: r.sourceType,
        verificationStatus: r.verificationStatus,
        truthClaimKey: r.truthPolicy?.claimKey,
      })),
      articles,
    };
  },

  /** 实体 → 提及该实体的已发布 GEO 文章（entityId 为实体数字 id） */
  async findArticlesByEntity(siteId: number, entityId: number, limit = 20): Promise<any[]> {
    return strapi.db.query("plugin::zhao-website.geo-article").findMany({
      where: { site: siteId, status: "published", deletedAt: null, mentionedEntities: entityId },
      select: ["slug", "title", "type", "publishedAt"],
      limit,
    });
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
      let value: any;
      if (rel.objectEntity) {
        value = { "@id": rel.objectEntity.slug || rel.objectEntity.documentId };
      } else if (rel.objectValue) {
        value = rel.objectValue;
      } else if (rel.objectText) {
        value = rel.objectText;
      } else {
        continue;
      }
      // 同谓词多值合并为数组：直接赋值会让后一条覆盖前一条（mentions 等多值关系丢失）
      const current = jsonLd[rel.predicate];
      if (current === undefined) {
        jsonLd[rel.predicate] = value;
      } else if (Array.isArray(current)) {
        current.push(value);
      } else {
        jsonLd[rel.predicate] = [current, value];
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

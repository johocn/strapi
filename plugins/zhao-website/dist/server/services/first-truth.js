"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stable_json_1 = require("./utils/stable-json");
const knowledge_audit_1 = require("./knowledge-audit");
const review_actions_1 = require("./utils/review-actions");
const UID = "plugin::zhao-website.first-truth-policy";
const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
exports.default = ({ strapi }) => ({
    async find(siteId, query = {}) {
        const { claimCategory, verificationStatus } = query;
        const filters = {
            $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
        };
        if (claimCategory) {
            filters.$or[0].claimCategory = claimCategory;
            filters.$or[1].claimCategory = claimCategory;
        }
        if (verificationStatus) {
            filters.$or[0].verificationStatus = verificationStatus;
            filters.$or[1].verificationStatus = verificationStatus;
        }
        return strapi.db.query(UID).findMany({
            where: filters,
            orderBy: { priority: "DESC", updatedAt: "DESC" },
            populate: ["canonicalEntity"],
        });
    },
    async findOne(siteId, documentId) {
        const tenant = await strapi.db.query(UID).findOne({
            where: { site: siteId, documentId, deletedAt: null },
            populate: ["canonicalEntity", "evidenceRelations"],
        });
        if (tenant)
            return tenant;
        return strapi.db.query(UID).findOne({
            where: { site: null, documentId, deletedAt: null },
            populate: ["canonicalEntity", "evidenceRelations"],
        });
    },
    async findByClaimKey(siteId, claimKey) {
        const tenant = await strapi.db.query(UID).findOne({
            where: { site: siteId, claimKey, deletedAt: null },
        });
        if (tenant)
            return tenant;
        return strapi.db.query(UID).findOne({
            where: { site: null, claimKey, deletedAt: null },
        });
    },
    async create(siteId, data, actor) {
        const existing = await this.findByClaimKey(siteId, data.claimKey);
        if (existing) {
            const e = new Error(`claimKey "${data.claimKey}" 已存在`);
            e.status = 409;
            e.code = "CLAIM_KEY_EXISTS";
            throw e;
        }
        const created = await strapi.db.query(UID).create({
            data: {
                ...data,
                site: siteId,
                lastVerifiedAt: new Date().toISOString(),
                verificationStatus: data.verificationStatus || "verified",
            },
        });
        await (0, knowledge_audit_1.auditSafe)(strapi, {
            siteId,
            targetType: "first-truth",
            targetId: created.documentId,
            action: "create",
            actor,
            changedFields: (0, stable_json_1.diffFields)({}, created),
            version: created.version ?? 1,
        });
        return created;
    },
    async update(siteId, documentId, data, actor) {
        const existing = await this.findOne(siteId, documentId);
        if (!existing) {
            const e = new Error("Truth not found");
            e.status = 404;
            throw e;
        }
        // 真值更新 → 关联 entity verificationStatus=pending
        const valueChanged = !!data.canonicalValue && data.canonicalValue !== existing.canonicalValue;
        const version = (Number(existing.version) || 1) + 1;
        const payload = {
            ...data,
            version,
            lastVerifiedAt: new Date().toISOString(),
            verificationStatus: data.verificationStatus || "verified",
        };
        const updated = await strapi.db.query(UID).update({ where: { id: existing.id }, data: payload });
        await (0, knowledge_audit_1.auditSafe)(strapi, {
            siteId,
            targetType: "first-truth",
            targetId: documentId,
            action: "update",
            actor,
            changedFields: (0, stable_json_1.diffFields)(existing, { ...existing, ...payload }),
            version,
        });
        if (valueChanged) {
            await this._markRelatedEntitiesPending(siteId, existing.canonicalEntity);
            // 证据链反向传导：重比所有绑定到本条真值的关系值
            await this._revalidateEvidenceRelations(existing.id);
        }
        return updated;
    },
    /** 真值变更 → 重比绑定到它的关系（单条失败不阻塞） */
    async _revalidateEvidenceRelations(truthId) {
        const relations = await strapi.db.query("plugin::zhao-website.knowledge-relation").findMany({
            where: { truthPolicy: truthId, deletedAt: null },
            limit: 500,
        });
        const kg = strapi.plugin("zhao-website").service("knowledge-graph");
        for (const relation of relations) {
            await kg._safeCompareWithTruth(relation);
        }
    },
    async _markRelatedEntitiesPending(siteId, canonicalEntity) {
        if (!canonicalEntity)
            return;
        const entityId = canonicalEntity.documentId || canonicalEntity;
        // 租户真值 → 优先租户实体，兜底全局实体；全局真值（siteId=null）只查全局实体
        const entity = siteId === null
            ? await strapi.db.query(ENTITY_UID).findOne({
                where: { site: null, documentId: entityId, deletedAt: null },
            })
            : (await strapi.db.query(ENTITY_UID).findOne({
                where: { site: siteId, documentId: entityId, deletedAt: null },
            })) ||
                (await strapi.db.query(ENTITY_UID).findOne({
                    where: { site: null, documentId: entityId, deletedAt: null },
                }));
        if (entity && entity.verificationStatus !== "pending") {
            const before = entity.verificationStatus ?? null;
            await strapi.db.query(ENTITY_UID).update({
                where: { id: entity.id },
                data: { verificationStatus: "pending", version: (Number(entity.version) || 1) + 1 },
            });
            await (0, knowledge_audit_1.auditSafe)(strapi, {
                siteId,
                targetType: "entity",
                targetId: entity.documentId,
                action: "recheck",
                actor: null,
                actorLabel: "system",
                changedFields: { verificationStatus: { before, after: "pending" } },
            });
        }
    },
    /** 兼容旧契约：verify = approve 的别名 */
    async verify(siteId, documentId, actor, reason) {
        return this.approve(siteId, documentId, actor, reason);
    },
    async submit(siteId, documentId, actor, reason) {
        return (0, review_actions_1.applyReview)(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "submit", actor, reason });
    },
    async approve(siteId, documentId, actor, reason) {
        return (0, review_actions_1.applyReview)(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "approve", actor, reason });
    },
    async reject(siteId, documentId, actor, reason) {
        return (0, review_actions_1.applyReview)(strapi, { uid: UID, targetType: "first-truth", siteId, documentId, action: "reject", actor, reason });
    },
    async softDelete(siteId, documentId, actor) {
        const existing = await this.findOne(siteId, documentId);
        if (!existing)
            return null;
        const deletedAt = new Date().toISOString();
        const updated = await strapi.db.query(UID).update({
            where: { id: existing.id },
            data: { deletedAt },
        });
        await (0, knowledge_audit_1.auditSafe)(strapi, {
            siteId,
            targetType: "first-truth",
            targetId: documentId,
            action: "delete",
            actor,
            changedFields: (0, stable_json_1.diffFields)(existing, { ...existing, deletedAt }),
        });
        return updated;
    },
    // ===== 冲突检测 =====
    async detectConflicts(siteId) {
        const truths = await strapi.db.query(UID).findMany({
            where: { $or: [{ site: siteId, deletedAt: null, status: true }, { site: null, deletedAt: null, status: true }] },
        });
        const byKey = {};
        for (const t of truths) {
            const key = `${t.claimKey}`;
            if (!byKey[key])
                byKey[key] = [];
            byKey[key].push(t);
        }
        const conflicts = [];
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
//# sourceMappingURL=first-truth.js.map